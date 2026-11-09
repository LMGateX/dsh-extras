import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRuntime, load, llm, runTurn, startChild} from '../modules/retry/runtime.ts';
import * as policy from '../../src/modules/model-policy/index.ts';
import { nativeProfileFixture } from '../native-profile-fixture.ts';

async function fixture(t: any, raw: any) {
 const directory = await mkdtemp(join(tmpdir(),'extras-model-policy-'));
 const runtime = await createRuntime({product:false,retry:false,persistent:true,subagents:true});
 t.after(async()=>{await runtime.dispose();await rm(directory,{recursive:true,force:true});});
 (await nativeProfileFixture(t, { home: join(directory, 'home') })).provide(runtime.ctx);
 for(const [name,config] of [['dsh-storage',{}],['dsh-storage-json',{root:join(directory,'storage')}],['dsh-storage-domain',{backend:'json'}],['dsh-workspace',{}]] as const) {
  const m = await load<any>(name); await runtime.ctx.plugin(m.default ?? m,config).await();
 }
 const a = join(directory,'a'), b = join(directory,'b'); await mkdir(a); await mkdir(b);
 const wa = await runtime.ctx.workspaceRegistry.create(a); const wb = await runtime.ctx.workspaceRegistry.create(b);
 const calls: any[]=[];
 class Adapter extends llm.LlmAdapter {
  async resolveModel(provider:string,model:string){return {provider,id:model,name:model,context:{contextWindow:100000},reasoning:{efforts:[{id:'opaque-hi',name:'High'}]}};}
  async *stream(options:any){calls.push(options);yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'offline'};yield {type:'block-end',index:0,block:{type:'text',text:'offline'}};yield {type:'finish',reason:{kind:'stop'}};}
 }
 runtime.ctx.llm.registerAdapter(['native','policy','child','human'],new Adapter());
 const config = typeof raw === 'function' ? raw(wa,wb) : raw;
 const input = Object.fromEntries(['enabled','root','descendants','workspaceOverrides','compactionReasoning'].map(key=>[key,{get:()=>config[key]}]));
 const fiber = runtime.ctx.plugin({name:policy.name,apply:policy.apply},input); await fiber.await();
 const create = async(id:string,cwd:string,extra:any={}) => {const h = await runtime.ctx.agents.create({sessionId:id,meta:{cwd},agentOptions:{provider:'native',model:'base'},...extra});t.after(()=>h.dispose());return {...h,state:{events:[],frames:[],requests:[]}};};
 return {runtime,ctx:runtime.ctx,a,b,wa,wb,calls,config,fiber,create};
}

test('awaited native creation chooses workspace root before first provider dispatch, later explicit native selection wins',async t=>{
 const f=await fixture(t,(a:any,b:any)=>({enabled:true,root:{provider:'policy',model:'root',reasoningEffort:'opaque-hi'},workspaceOverrides:[{workspaceId:b.id,root:null}]}));
 const root=await f.create('root-a',f.a); const other=await f.create('root-b',f.b);
 assert.deepEqual(root.agent.model.current(),{provider:'policy',model:'root',reasoningEffort:'opaque-hi'});
 assert.deepEqual(other.agent.model.current(),{provider:'native',model:'base'});
 assert.equal(policy.runtimeStatus(f.fiber.ctx).capabilities.modelPolicy.phase,'active');
 await runTurn(root,'synthetic prompt'); assert.equal(f.calls[0].provider,'policy');assert.equal(f.calls[0].reasoningEffort,'opaque-hi');
 root.agent.model.select({provider:'human',model:'chosen'}); await runTurn(root,'second'); assert.equal(f.calls.at(-1).provider,'human');
});

for(const kind of ['spawn','fork']) test('native '+kind+' and deeper resident descendants follow immutable root workspace, ordinary forks remain roots',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'policy',model:'root'},descendants:{provider:'child',model:'all-depths',reasoningEffort:'opaque-hi'}});
 const parent=await f.create(kind+'-parent',f.a);await runTurn(parent,'fork seed history');
 const run=await startChild(f.ctx,{provider:kind,label:'offline child',childId:kind+'-child',signal:new AbortController().signal,request:{parent:parent.agent,prompt:[{type:'text',text:'offline delegated prompt'}]}},'continuable');t.after(()=>run.dispose());
 assert.equal((await run.result)?.stopReason,'completed');
 assert.equal(f.calls.at(-1).provider,'child');assert.equal(f.calls.at(-1).model,'all-depths');
 const resumed=await f.ctx.agents.resume({resumeSessionId:run.childId,parentAgent:parent.agent,agentOptions:{provider:'native',model:'base'}});t.after(()=>resumed.dispose());
 const child=resumed.agent;assert.deepEqual(child.model.current(),{provider:'child',model:'all-depths',reasoningEffort:'opaque-hi'});
 // Native mutable cwd moves across workspace boundaries; provenance still belongs to A.
 await f.ctx.workingDirectory.set(child,f.b);
 const deeper=await startChild(f.ctx,{provider:kind,label:'offline grandchild',childId:kind+'-grandchild',signal:new AbortController().signal,request:{parent:child,prompt:[{type:'text',text:'depth two offline prompt'}]}},'continuable');t.after(()=>deeper.dispose());
 assert.equal((await deeper.result)?.stopReason,'completed');assert.equal(f.calls.at(-1).model,'all-depths');
 const deepHeader=(await f.ctx.sessionQuery.readSession(deeper.childId)).session;assert.equal(deepHeader.origin,'subagent');assert.equal(deepHeader.delegationDepth,2);
 child.model.select({provider:'human',model:'resident-choice'});await runTurn({agent:child,state:{}},'resident wake');assert.equal(f.calls.at(-1).model,'resident-choice');
 const seed=parent.agent.session.snapshotEvents();
 const ordinary=await f.create(kind+'-ordinary-fork',f.b,{meta:{cwd:f.b,parentSession:parent.agent.id,isSeeded:true},seed,inheritedEventCount:seed.length});
 assert.equal(ordinary.agent.model.current().provider,'policy');assert.equal(ordinary.agent.model.current().model,'root');
});

test('accepted config updates existing live agents; enable after off is not lost; disable never restores a past choice',async t=>{
 const f=await fixture(t,{enabled:false,root:{provider:'policy',model:'same'}});
 const root=await f.create('live-update',f.a);assert.equal(root.agent.model.current().provider,'native');
 f.config.enabled=true;await f.ctx.parallel('loader/volatile-update');
 assert.deepEqual(root.agent.model.current(),{provider:'policy',model:'same'});
 f.config.root={provider:'policy',model:'new'};await f.ctx.parallel('loader/volatile-update');assert.equal(root.agent.model.current().model,'new');
 root.agent.model.select({provider:'human',model:'leave-me'});f.config.enabled=false;await f.ctx.parallel('loader/volatile-update');assert.equal(root.agent.model.current().model,'leave-me');
 f.config.root={provider:'policy',model:'off-change'};await f.ctx.parallel('loader/volatile-update');assert.equal(root.agent.model.current().model,'leave-me');
});

test('standalone model-policy supplies exact native compaction reasoning without model defaults or compact tools',async t=>{
 const f=await fixture(t,{enabled:true,compactionReasoning:{enabled:true,rules:[{scope:'all',mode:'fixed',effort:'opaque-hi'}]}});
 for(const [name,options] of [['dsh-token-meter',{}],['dsh-compaction-basic',{auto:false,retainTokens:0,maxTokens:100,compactionRetries:0}],['dsh-commands',{}],['dsh-command-compact',{}]] as const){const m=await load<any>(name);await f.ctx.plugin(m.default??m,options).await();}
 const {openSharedCompactionStore}=await import('../../src/shared-compaction/index.ts');const store=await openSharedCompactionStore(f.ctx);
 const saved=store.read();await store.write({expectedRevision:saved.revision,defaults:{enabled:true,rules:[{scope:'all',mode:'fixed',effort:'opaque-hi'}]},workspaceOverrides:{}});
 const root=await f.create('standalone-compaction',f.a);const history='Synthetic implementation history and decisions. '.repeat(4000);await runTurn(root,history);await runTurn(root,history);
 assert.equal(f.ctx.tools.get('compact_context',root.agent),undefined);
 const before=f.calls.length;const result=await f.ctx.commands.execute(root.agent,'/compact',[],new AbortController().signal);
 assert.equal(result.result.kind,'success');const summaries=f.calls.slice(before).filter((call:any)=>call.purpose==='compaction');
 assert.equal(summaries.length,1);assert.equal(summaries[0].reasoningEffort,'opaque-hi');assert.equal(summaries[0].provider,'native');assert.equal(root.agent.model.current().provider,'native');
});

test('unknown provenance and unsupported exact effort remain unavailable without policy selection or dispatch',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'policy',model:'root',reasoningEffort:'invented'}});
 const root=await f.create('unsupported',f.a);assert.equal(root.agent.model.current().provider,'native');assert.equal(f.calls.length,0);
 assert.equal(policy.runtimeStatus(f.fiber.ctx).capabilities.modelPolicy.phase,'unavailable');
 const unknown=await f.create('unknown',f.a,{meta:{cwd:f.a,origin:'subagent',parentSession:'missing-parent',delegationDepth:1}});
 assert.equal(unknown.agent.model.current().provider,'native');assert.equal(f.calls.length,0);
});

test('an unrelated isolated LLM never lends capabilities to an Agent outside that native world',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'scoped-only',model:'scoped-model',reasoningEffort:'scoped-effort'}});
 class ScopedAdapter extends llm.LlmAdapter {
  async resolveModel(provider:string,model:string){return {provider,id:model,name:model,reasoning:{efforts:[{id:'scoped-effort',name:'Scoped'}]}};}
 }
 const scope=f.ctx.isolate('llm');await scope.plugin(llm.default).await();scope.llm.registerAdapter(['scoped-only'],new ScopedAdapter());
 const root=await scope.agents.create({sessionId:'scoped-world',meta:{cwd:f.a},agentOptions:{provider:'native',model:'base'}});t.after(()=>root.dispose());
 assert.deepEqual(root.agent.model.current(),{provider:'native',model:'base'});
 assert.equal(policy.runtimeStatus(f.fiber.ctx).capabilities.modelPolicy.phase,'unavailable');
});

test('cold native resume preserves durable human model choice while fresh fork still receives defaults',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'policy',model:'root'},descendants:{provider:'child',model:'default-child'}});
 const root=await f.create('durable-human-root',f.a);root.agent.model.select({provider:'human',model:'durable-human',reasoningEffort:'opaque-hi'});await runTurn(root,'persist exact native human selection');
 await root.dispose();
 const resumed=await f.ctx.agents.resume({resumeSessionId:'durable-human-root',agentOptions:{provider:'native',model:'base'}});t.after(()=>resumed.dispose());
 assert.deepEqual(resumed.agent.model.current(),{provider:'human',model:'durable-human',reasoningEffort:'opaque-hi'});
 const fork=await startChild(f.ctx,{provider:'fork',label:'fresh policy child',childId:'after-human-fork',signal:new AbortController().signal,request:{parent:resumed.agent,prompt:[{type:'text',text:'fresh child'}]}},'continuable');t.after(()=>fork.dispose());await fork.result;
 assert.equal(f.calls.at(-1).provider,'child');assert.equal(f.calls.at(-1).model,'default-child');
});

test('accepted model update never changes an in-flight prepared native call, only a future safe step',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'blocked-offline',model:'first'}});
 let begin!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});t.after(()=>release());const requests:any[]=[];
 class BlockAdapter extends llm.LlmAdapter {
  async resolveModel(provider:string,model:string){return {provider,id:model,name:model};}
  async *stream(options:any){requests.push(options);if(requests.length===1){begin();await gate;}yield {type:'finish',reason:{kind:'stop'}};}
 }
 f.ctx.llm.registerAdapter(['blocked-offline'],new BlockAdapter());const root=await f.create('inflight-native',f.a);
 const turn=runTurn(root,'prepared offline step');await started;f.config.root={provider:'blocked-offline',model:'second'};await f.ctx.parallel('loader/volatile-update');
 assert.equal(root.agent.model.current().model,'second');assert.equal(requests[0].model,'first');release();await turn;await runTurn(root,'future safe step');assert.equal(requests[1].model,'second');
});

test('disabling during awaited native capability resolution fences stale selection',async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'slow-metadata',model:'policy'}});
 let begin!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});t.after(()=>release());
 class SlowAdapter extends llm.LlmAdapter {async resolveModel(provider:string,model:string){begin();await gate;return {provider,id:model,name:model};}}
 f.ctx.llm.registerAdapter(['slow-metadata'],new SlowAdapter());const pending=f.create('slow-created',f.a);await started;
 f.config.enabled=false;await f.ctx.parallel('loader/volatile-update');release();const root=await pending;assert.deepEqual(root.agent.model.current(),{provider:'native',model:'base'});
 assert.equal(root.agent.session.snapshotEvents().filter((e:any)=>e.type==='model/selection').length,0);
});

test('disabled model-policy has no compaction participation even when its nested intent was saved enabled',async t=>{
 const f=await fixture(t,{enabled:false,compactionReasoning:{enabled:true,rules:[]}});
 assert.equal(policy.runtimeStatus(f.fiber.ctx).capabilities.compactionReasoning.phase,'disabled');
});

for(const mode of ['creation','live-update']) test('unrelated accepted edit does not discard pending native '+mode+' selection',{timeout:10000},async t=>{
 const target={provider:'deferred-policy',model:'wanted'};
 const f=await fixture(t,{enabled:true,root:mode==='creation'?target:null});
 let begin!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});t.after(()=>release());
 class DeferredAdapter extends llm.LlmAdapter {async resolveModel(provider:string,model:string){begin();await gate;return {provider,id:model,name:model};}}
 f.ctx.llm.registerAdapter(['deferred-policy'],new DeferredAdapter());
 let root=mode==='live-update'?await f.create('deferred-'+mode,f.a):undefined;
 let pending:Promise<any>;
 if(root){f.config.root=target;pending=f.ctx.parallel('loader/volatile-update');}else pending=f.create('deferred-'+mode,f.a);
 await started;
 f.config.workspaceOverrides=[{workspaceId:f.wb.id,root:null}];f.config.compactionReasoning={enabled:false,rules:[]};
 await f.ctx.parallel('loader/volatile-update');release();const result=await pending;if(!root)root=result;
 assert.deepEqual(root!.agent.model.current(),target);
 assert.equal(root!.agent.session.snapshotEvents().filter((event:any)=>event.type==='model/selection').length,1);
});

for(const boundary of ['enable-lifetime','target-cycle','explicit-native-selection']) test('pending metadata respects '+boundary+' invalidation',{timeout:10000},async t=>{
 const f=await fixture(t,{enabled:true,root:null});const root=await f.create('boundary-'+boundary,f.a);
 const gates:{started:Promise<void>;gate:Promise<void>;begin:()=>void;release:()=>void}[]=Array.from({length:3},()=>{let begin!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});return {started,gate,begin,release};});t.after(()=>gates.forEach(gate=>gate.release()));let calls=0;
 class BoundaryAdapter extends llm.LlmAdapter {async resolveModel(provider:string,model:string){const gate=gates[calls++]!;gate.begin();await gate.gate;return {provider,id:model,name:model};}}
 f.ctx.llm.registerAdapter(['boundary-offline'],new BoundaryAdapter());const a={provider:'boundary-offline',model:'a'};f.config.root=a;
 const first=f.ctx.parallel('loader/volatile-update');await gates[0]!.started;
 let second:Promise<any>|undefined,third:Promise<any>|undefined;
 if(boundary==='explicit-native-selection')root.agent.model.select({provider:'native',model:'base'});
 else if(boundary==='enable-lifetime'){f.config.enabled=false;await f.ctx.parallel('loader/volatile-update');f.config.enabled=true;second=f.ctx.parallel('loader/volatile-update');await gates[1]!.started;}
 else {f.config.root={provider:'boundary-offline',model:'b'};second=f.ctx.parallel('loader/volatile-update');await gates[1]!.started;f.config.root=a;third=f.ctx.parallel('loader/volatile-update');await gates[2]!.started;}
 gates[0]!.release();await first;assert.deepEqual(root.agent.model.current(),{provider:'native',model:'base'});
 if(second){gates[1]!.release();await second;if(third)assert.deepEqual(root.agent.model.current(),{provider:'native',model:'base'});}
 if(third){gates[2]!.release();await third;}
 if(boundary!=='explicit-native-selection')assert.deepEqual(root.agent.model.current(),a);
});

test('awaited creation joins the newest accepted pending selection before publishing its return',{timeout:10000},async t=>{
 const f=await fixture(t,{enabled:true,root:{provider:'join-offline',model:'a'}});
 const gates:{started:Promise<void>;gate:Promise<void>;begin:()=>void;release:()=>void}[]=Array.from({length:2},()=>{let begin!:()=>void,release!:()=>void;const started=new Promise<void>(resolve=>{begin=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});return {started,gate,begin,release};});t.after(()=>gates.forEach(gate=>gate.release()));let calls=0;
 class JoinAdapter extends llm.LlmAdapter {async resolveModel(provider:string,model:string){const gate=gates[calls++]!;gate.begin();await gate.gate;return {provider,id:model,name:model};}}
 f.ctx.llm.registerAdapter(['join-offline'],new JoinAdapter());let returned=false;
 const creation=f.create('join-created',f.a).then(root=>{returned=true;return root;});await gates[0]!.started;
 f.config.root={provider:'join-offline',model:'b'};const update=f.ctx.parallel('loader/volatile-update');await gates[1]!.started;
 gates[0]!.release();await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(returned,false,'awaited creation must not release work while a newer accepted selection is pending');
 gates[1]!.release();const root=await creation;await update;assert.deepEqual(root.agent.model.current(),{provider:'join-offline',model:'b'});
});
