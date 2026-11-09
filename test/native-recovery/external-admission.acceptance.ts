/** Explicit isolated compatibility probe; never part of the default .test.ts inventory.
 * HOME="$T/home" DSH_HOME="$T/dsh" DSH_PROFILE=isolated TMPDIR="$T"
 * DSH_RECOVERY_CANDIDATE_ANCHOR=/tmp/.../node_modules/@deepseek-ai/dsh/package.json
 * DSH_EXTERNAL_PLUGIN_ROOT=/explicit/read-only/plugin-package
 * node --experimental-strip-types --test test/native-recovery/external-admission.acceptance.ts
 * Copies only installed plugin code into a disposable root. Never imports its live-profile entry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,cp,copyFile,symlink,readFile,realpath} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const installed=process.env.DSH_EXTERNAL_PLUGIN_ROOT;
const hash=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
test('actual external host/runtime pre-step composition with native terminal recovery',{timeout:60000},async t=>{
 const anchor=process.env.DSH_RECOVERY_CANDIDATE_ANCHOR;
 assert.ok(anchor?.startsWith('/tmp/'),'explicit isolated candidate anchor required');
 assert.ok(installed,'explicit read-only external plugin package root required');
 const previousFetch=globalThis.fetch;globalThis.fetch=async()=>{throw Error('external admission acceptance forbids network fetch');};t.after(()=>{globalThis.fetch=previousFetch;});
 assert.ok(process.env.HOME?.startsWith('/tmp/'));assert.ok(process.env.DSH_HOME?.startsWith('/tmp/'));assert.equal(process.env.DSH_PROFILE,'isolated');
 const require=createRequire(anchor!);const load=async(n:string)=>import(pathToFileURL(require.resolve('@deepseek-ai/'+n)).href);
 const root=await mkdtemp(join(tmpdir(),'external-recovery-probe-'));
 const plugin=join(root,'plugin');await mkdir(plugin);
 await cp(join(installed,'lib'),join(plugin,'lib'),{recursive:true});await copyFile(join(installed,'package.json'),join(plugin,'package.json'));
 await symlink(join(dirname(anchor!),'node_modules'),join(plugin,'node_modules'),'dir');
 const externalRequire=createRequire(join(plugin,'package.json'));
 assert.equal(externalRequire.resolve('@deepseek-ai/cordis'),require.resolve('@deepseek-ai/cordis'),'external and candidate share exactly one native Context');
 assert.equal(hash(await readFile(join(plugin,'lib/host.js'))),hash(await readFile(join(installed,'lib/host.js'))));
 assert.equal(hash(await readFile(join(plugin,'lib/runtime.js'))),hash(await readFile(join(installed,'lib/runtime.js'))));
 for(const name of ['cordis','dsh-agent','dsh-agent-loop','dsh-llm','dsh-session','dsh-subagent','dsh-storage-domain'])assert.ok((await realpath(externalRequire.resolve('@deepseek-ai/'+name))).startsWith('/tmp/'));
 const {Context}=await load('cordis');const ctx=new Context();t.after(()=>ctx.fiber.dispose());
 const mount=async(n:string,config:any={})=>{const m=await load(n);await ctx.plugin(m.default??m,config).await();};
 for(const n of ['dsh-llm','dsh-session','dsh-session-projection','dsh-system-prompt','dsh-tools','dsh-tool-executor-native','dsh-agent','dsh-llm-retry'])await mount(n);
 await mount('dsh-agent-loop',{agents:[]});
 await mount('dsh-session-persistence-jsonl',{root:join(root,'sessions')});
 await mount('dsh-session-query-sqlite',{path:':memory:',openAt:'never'});
 await mount('dsh-fs-local');await mount('dsh-working-directory',{defaultDirectory:root});await mount('dsh-subagent');
 await mount('dsh-storage');await mount('dsh-storage-json',{root:join(root,'storage')});await mount('dsh-storage-domain',{backend:'json'});
 await mount('dsh-workspace');await mount('dsh-typert-registry');
 ctx.reflect.provide('webServer',{register(){return()=>{};}});
 const credentials=new Map();ctx.reflect.provide('credentials',{async modifyRecord(key:string,edit:any){const value=await edit(credentials.get(key));if(value!==undefined)credentials.set(key,value);return credentials.get(key);}});
 await mount('dsh-client-connection');
 const workspace=await ctx.workspaceRegistry.create(root);
 const host=await import(pathToFileURL(join(plugin,'lib/host.js')).href);
 const runtimeModule=await import(pathToFileURL(join(plugin,'lib/runtime.js')).href);
 let runtime:any;const preSteps:any[]=[];
 // The decorator only observes the real public facade result; listener and prepare implementation remain untouched.
 const mounted=await host.mountHost(ctx,{createRuntime:async(ports:any)=>{
  runtime=await runtimeModule.createRuntime(ports,{consumptionTimeoutMs:2000});
  const actual=runtime.preStep.bind(runtime);
  runtime.preStep=async(...args:any[])=>{const value=await actual(...args);preSteps.push({sessionId:args[0].sessionId,step:args[3],inputCount:args[2]?.length??0,resultCount:value.length,text:value.map((m:any)=>m.content.map((b:any)=>b.text??'').join('')).join('')});return value;};
  return runtime;
 }});
 t.after(()=>mounted.dispose());
 assert.equal(mounted.ports.capabilities.allNativeWakeAdmission,'supported');
 const user={kind:'user',principalId:mounted.ports.operatorPrincipal,sessionId:null};const signal=new AbortController().signal;
 await runtime.savePolicy(user,{extensionEnabled:true,defaults:{workspace:{enabled:false}},workspaceOverrides:{}},0,signal);
 const llm=await load('dsh-llm');
 async function failedSession(id:string){
  class Offline extends llm.LlmAdapter{
   requests:any[]=[];
   async resolveModel(provider:string,model:string){return{provider,id:model,name:model};}
   providerRetryPolicy(){return llm.resolveRetryPolicy({mode:'normal',maxRetries:0,backoff:{initialDelayMs:1,maxDelayMs:1,jitterRatio:0}});}
   async *stream(options:any){this.requests.push(options);if(this.requests.length===1)yield{type:'finish',reason:{kind:'error',failure:{code:'SERVER',message:'offline failure'}}};else yield{type:'finish',reason:{kind:'stop'}};}
  }
  const adapter=new Offline();ctx.llm.registerAdapter([id],adapter);
  const owned=await ctx.agents.create({sessionId:id,meta:{cwd:root},agentOptions:{provider:id,model:'offline'}});t.after(()=>owned.dispose());
  owned.agent.followup(llm.createUserMessage({source:{kind:'user'},content:[{type:'text',text:'synthetic isolated test input'}]}));await owned.agent.whenIdle();
  assert.equal(adapter.requests.length,1);assert.equal(owned.agent.recovery.read().status,'available');
  const state=await runtime.readSession(host.agentCaller(ctx,owned.agent),owned.agent.id,signal);assert.equal(state.policy.workspaceEnabled,false);
  return{agent:owned.agent,adapter};
 }
 const s=await failedSession('external-management-off');
 const checkpoint=s.agent.recovery.read().checkpoint;const boundary=s.agent.session.seq;
 const receipt=await s.agent.recovery.retry({sessionId:s.agent.id,checkpointId:checkpoint.checkpointId,expectedRevision:checkpoint.revision,operationId:'external-retry'});await s.agent.whenIdle();
 const attempt=preSteps.filter(p=>p.sessionId===s.agent.id).at(-1);assert.ok(attempt);assert.equal(attempt.inputCount,0);
 assert.deepEqual(s.agent.session.snapshotEvents(boundary).filter((e:any)=>['user/message','developer/message','system/message'].includes(e.type)),[]);
 assert.equal(attempt.resultCount,0,'unchanged visible snapshot must not be injected again');
 assert.equal(receipt.status,'accepted');assert.equal(s.adapter.requests.length,2);
 const{signal:_a,...before}=s.adapter.requests[0];const{signal:_b,...after}=s.adapter.requests[1];assert.deepEqual(after,before);
 const changed=await failedSession('external-changed-snapshot');
 const changedCheckpoint=changed.agent.recovery.read().checkpoint;const changedBoundary=changed.agent.session.seq;
 const policy=await runtime.readPolicy(user,signal);
 await runtime.savePolicy(user,{extensionEnabled:true,defaults:{workspace:{enabled:false},display:{inputSummary:true}},workspaceOverrides:{}},policy.revision,signal);
 assert.equal(changed.agent.recovery.read().status,'available','external policy storage does not fabricate a native Session mutation');
 const changedReceipt=await changed.agent.recovery.retry({sessionId:changed.agent.id,checkpointId:changedCheckpoint.checkpointId,expectedRevision:changedCheckpoint.revision,operationId:'external-changed-retry'});await changed.agent.whenIdle();
 const changedAttempt=preSteps.filter(p=>p.sessionId===changed.agent.id).at(-1);
 assert.ok(changedAttempt);assert.equal(changedAttempt.inputCount,0);assert.ok(changedAttempt.resultCount>0,'actual management-OFF prepare still returns a changed snapshot');
 assert.equal(changedReceipt.status,'rejected');assert.equal(changedReceipt.reason,'recovery-policy-rejected');assert.equal(changed.adapter.requests.length,1);
 assert.deepEqual(changed.agent.session.snapshotEvents(changedBoundary).filter((e:any)=>['user/message','developer/message','system/message'].includes(e.type)),[]);
 console.log(JSON.stringify({kind:'actual-external-native-recovery',workspaceId:workspace.id,managementOff:true,capability:mounted.ports.capabilities.allNativeWakeAdmission,external:JSON.parse(await readFile(join(plugin,'package.json'),'utf8')).version,hostSha256:hash(await readFile(join(plugin,'lib/host.js'))),runtimeSha256:hash(await readFile(join(plugin,'lib/runtime.js'))),preSteps:preSteps.map(({text,...row})=>row),receipt,requests:s.adapter.requests.length,changedReceipt,changedRequests:changed.adapter.requests.length,root}));
});
