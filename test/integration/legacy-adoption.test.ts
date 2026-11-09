import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {Context} from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as Json from '@deepseek-ai/dsh-storage-json';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as compact from '../../src/modules/compact-context/index.ts';
import {openSharedCompactionStore} from '../../src/shared-compaction/store.ts';
import {join} from 'node:path';
import * as retry from '../../src/modules/retry/index.ts';
import type {Distribution,LegacyAdoptionReceipt} from '../../src/types.ts';
import {profilePaths} from '../../src/migration/storage.ts';
import {loaderFixture,until,loadHost,response} from './loader-harness.ts';

test('real native imported journal calls the selected settings owner once, never fresh/status/ordinary updates', {timeout:15000},async t=>{
 let owner:any;const received:{ctx:any;config:any;receipt:LegacyAdoptionReceipt}[]=[];
 const feature={name:'receipt-observer',Config:retry.Config,inject:[],apply(){},mountSettings(ctx:any){owner=ctx;},onLegacyAdopted(ctx:any,config:any,receipt:LegacyAdoptionReceipt){received.push({ctx,config,receipt});}};
 const distribution:Distribution={name:'dsh-extras-retry',moduleIds:['retry'],modulePlugins:{retry:feature}};
 const initial={migration:{auto:false},modules:{retry:{enabled:false}}};
 const f=await loaderFixture(t,distribution,initial);await f.ready();assert.equal(received.length,0);
 // The embedding launcher commits readiness only after actual initial root admission.
 (await loadHost('dsh-cmdline')).provideCmdline(f.ctx,{args:[],exit(){},ready:{onReady(listener:()=>void){listener();return()=>{};}}});
 await f.ctx.plugin((await loadHost('cordis-plugin-timer')).default).await();
 await f.ctx.plugin((await loadHost('dsh-hmr')).default,{base:f.root,root:[],ignored:[],debounce:0}).await();
 const pkg=join(f.profile,'node_modules/dsh-stream-retry');await mkdir(pkg,{recursive:true});
 await writeFile(join(pkg,'package.json'),JSON.stringify({name:'dsh-stream-retry',version:'0.1.9',main:'index.js'}));
 await writeFile(join(pkg,'index.js'),'export function apply(){throw Error("disabled legacy must not activate")}');
 const source={id:'late-retry',name:'dsh-stream-retry',disabled:true,config:{errorCodes:[],providers:[],retryEmptyResponse:false}};
 await f.save([{id:distribution.name,name:distribution.name,config:initial},source]);
 await f.update({...initial,migration:{auto:true}});
 await until(()=>f.status(),state=>state.report?.modules.retry?.phase==='applied','native source teardown and config adoption');
 assert.equal(received.length,1,'real imported journal creates one root-to-selected-feature handoff');
 assert.equal(received[0]!.ctx.fiber,owner.fiber,'handoff belongs to settings root, never feature apply child');
 assert.equal(received[0]!.config.retryEmptyResponse,false);assert.equal(received[0]!.config.enabled,false);
 const paths=await profilePaths({profileContext:f.ctx.get('profileContext')} as any,distribution.name);const journal=JSON.parse(await readFile(paths.journal,'utf8'));
 assert.equal(journal.phase,'saved');assert.ok(journal.steps.every((step:any)=>step.done));
 assert.deepEqual(received[0]!.receipt,{operationId:journal.operationId,sourceModuleId:'retry'});
 for(let i=0;i<4;i++)f.status();assert.equal(received.length,1,'status reads carry no adoption side effects');
 await f.update({migration:{auto:false},modules:{retry:received[0]!.config}});await f.update({migration:{auto:true},modules:{retry:received[0]!.config}});
 await until(()=>f.status(),state=>state.report?.modules.retry?.phase==='applied','same real retry journal reobserved');
 assert.equal(await readFile(f.ctx.get('profileContext').patchPath,'utf8'),journal.steps[1].after,'same durable after-image proves this is the same eligible operation');
 assert.equal(received.length,1,'same eligible operation is delivered once to this settings owner');
 const next={migration:{auto:true},modules:{retry:{...received[0]!.config,retryEmptyResponse:true}}};
 await f.update(next);assert.equal(received.length,1,'ordinary edits are not a new import');
});

const policy=(effort:string)=>({enabled:true,rules:[{scope:'all' as const,mode:'fixed' as const,effort}]});
async function canonical(f:any,method='GET',body?:unknown){const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]) as any;req.method=method;req.headers={host:f.host,cookie:f.ownerCookie};const res=response();await f.routes.get('/extras/'+f.entry.options.id+'/shared-compaction').handler(req,res);assert.equal(res.code,200,res.body);return JSON.parse(res.body);}
for(const edited of [false,true])test('default-sealed native bootstrap accepts only real late adoption; canonical existing wins='+edited,{timeout:15000},async t=>{
 const ctx=new Context();await ctx.plugin(Storage).await();await ctx.plugin(Json,{root:await mkdtemp('/tmp/extras-adopted-policy-store-')}).await();await ctx.plugin(Domain,{backend:'json'}).await();
 t.after(()=>ctx.fiber.dispose());
 const distribution:Distribution={name:'dsh-extras-compact-context',moduleIds:['compact-context'],modulePlugins:{'compact-context':compact}};
 const initial={migration:{auto:false},modules:{'compact-context':{enabled:false,compactTool:false}}};
 const f=await loaderFixture(t,distribution,initial,ctx);await f.ready();
 const baseline=await canonical(f);assert.equal(baseline.revision,0);assert.equal(baseline.defaults.enabled,false);
 (await loadHost('dsh-cmdline')).provideCmdline(ctx,{args:[],exit(){},ready:{onReady(listener:()=>void){listener();return()=>{};}}});
 await ctx.plugin((await loadHost('cordis-plugin-timer')).default).await();await ctx.plugin((await loadHost('dsh-hmr')).default,{base:f.root,root:[],ignored:[],debounce:0}).await();
 const late={migration:{auto:false},modules:{'compact-context':{enabled:false,compactTool:false,compactionReasoning:policy('journal-late')}}};
 await f.update(late);
 const ordinary=await canonical(f);assert.equal(ordinary.revision,0);assert.deepEqual(ordinary.defaults,baseline.defaults);assert.deepEqual(ordinary.workspaceOverrides,baseline.workspaceOverrides,'same bytes without a real import never become a seed');
 if(edited)await canonical(f,'PUT',{expectedRevision:0,defaults:policy('accepted-canonical'),workspaceOverrides:{}});
 const pkg=join(f.profile,'node_modules/dsh-tool-compact-context');await mkdir(pkg,{recursive:true});await writeFile(join(pkg,'package.json'),JSON.stringify({name:'dsh-tool-compact-context',version:'0.4.7',main:'index.js'}));await writeFile(join(pkg,'index.js'),'export function apply(){throw Error("disabled legacy must not activate")}');
 await f.save([{id:distribution.name,name:distribution.name,config:late},{id:'late-compact',name:'dsh-tool-compact-context',disabled:true,config:{compactTool:false}}]);
 await f.update({...late,migration:{auto:true}});
 await until(()=>f.status(),state=>state.report?.modules['compact-context']?.phase==='applied','real late compaction import adopted');
 const applied=await canonical(f);assert.equal(applied.revision,1);assert.deepEqual(applied.defaults,policy(edited?'accepted-canonical':'journal-late'));
 assert.equal(applied.legacyImport.sources[0].provenance,'migration-operation');assert.equal(applied.legacyImport.sources[0].operationId,f.status().report.operationId);
 const paths=await profilePaths({profileContext:ctx.get('profileContext')} as any,distribution.name);const journal=JSON.parse(await readFile(paths.journal,'utf8'));assert.equal(journal.phase,'saved');assert.ok(journal.steps.every((step:any)=>step.done));
 const imported=journal.plan.decisions.find((decision:any)=>decision.moduleId==='compact-context').config;
 await f.update({migration:{auto:false},modules:{'compact-context':imported}});await f.update({migration:{auto:true},modules:{'compact-context':imported}});
 await until(()=>f.status(),state=>state.report?.modules['compact-context']?.phase==='applied','same real journal reobserved');
 const repeated=await canonical(f);assert.equal(repeated.revision,1);assert.deepEqual(repeated.defaults,applied.defaults,'same operation does not create another canonical edit');
 if(edited){const store=await openSharedCompactionStore(ctx);const recovered=await store.recoverLegacy('compact-context',1);assert.deepEqual(recovered.defaults,policy('journal-late'),'real imported nested original remains recoverable despite accepted canonical winner');}
});

