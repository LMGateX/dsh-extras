import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { parseDocument } from 'yaml';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { dryRunMigration, runMigration, inspectMigration, rollbackMigration } from '../../src/migration/index.ts';
import type { NativeMigrationHost, Distribution } from '../../src/migration/types.ts';

const anchor = process.env.DSH_TEST_INSTALL_ANCHOR ?? createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json');
const hostRequire = createRequire(anchor);
const load = (name: string) => import(pathToFileURL(hostRequire.resolve(name)).href);
const target: Distribution = {rowId:'dsh-extras',packageName:'dsh-extras',moduleIds:['goalWait']};
async function fixture(t: TestContext) {
  const root=await mkdtemp(join(tmpdir(),'ex-goal-'));
  const home=join(root,'home'),dir=join(root,'profile');
  await mkdir(home,{recursive:true}); await mkdir(dir,{recursive:true});
  const host: NativeMigrationHost={profileContext:{dir,patchPath:join(dir,'cordis.patch.yml'),home,installAnchor:anchor},loader:{entries:()=>[]}};
  const pkg=async(name:string,version:string,patches:unknown[])=>{
    const path=join(dir,'node_modules',name); await mkdir(path,{recursive:true});
    await writeFile(join(path,'package.json'),JSON.stringify({name,version,type:'module',exports:'./index.js',dsh:{bundle:{patch:'./cordis.patch.yml'}}}));
    await writeFile(join(path,'cordis.patch.yml'),JSON.stringify(patches));
  };
  await pkg('dsh-extras','0.3.0',[{insert:[{id:'dsh-extras',name:'dsh-extras',config:{modules:{}}}]}]);
  await writeFile(join(dir,'package.json'),JSON.stringify({dependencies:{'dsh-extras':'*'},dsh:{profile:{bundles:['dsh-extras']}}}));
  await writeFile(host.profileContext.patchPath,'[]\n');
  t.after(async()=>{assert.ok(root.startsWith(join(tmpdir(),'ex-goal-')));await rm(root,{recursive:true,force:true});});
  return {root,home,dir,host,pkg};
}
test('latest bundle suppression is recorded as an owned composition delta, not a native profile edit',async t=>{
  const f=await fixture(t);
  const {createRuntime}=await import('../modules/retry/runtime.ts');
  const runtime=await createRuntime({product:false,retry:false}); const {ctx}=runtime;
  t.after(()=>runtime.dispose()); f.host.continuationContext=ctx;
  await ctx.plugin((await load('@deepseek-ai/dsh-goal')).default).await();
  const targetFiber=ctx.plugin({name:'migration-goal-target-proof',apply(){}}); await targetFiber.await();
  f.host.loader.entries=()=>[{id:'include:dsh-extras',options:{id:'dsh-extras',name:'dsh-extras'},fiber:targetFiber}];
  await f.pkg('native-base','1.0.0',[{insert:[{id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}]}]);
  await f.pkg('dsh-goal-wait-gate','0.4.23',[{insert:[{id:'goal-wait-gate',name:'dsh-goal-wait-gate',config:{strategy:'off'}}]},{id:'goal-round-driver',disabled:true}]);
  await writeFile(join(f.dir,'package.json'),JSON.stringify({dependencies:{'dsh-extras':'*','dsh-goal-wait-gate':'*'},dsh:{profile:{bundles:['native-base','dsh-goal-wait-gate','dsh-extras']}}}));
  const input=await inspectMigration(f.host,target);
  assert.deepEqual(input.sources[0].nativeDriverDelta,{rowId:'goal-round-driver',moduleName:'@deepseek-ai/dsh-goal-round-driver',restored:{id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}});
  const report=await runMigration(f.host,target);
  assert.equal(report.modules.goalWait?.ready,false);
  f.host.moduleConfig=()=>({enabled:true,strategy:'off',waitForJobs:true,waitForSubagents:true,maxHoldMs:0});
  f.host.handoverAcknowledged=()=>true; f.host.get=()=>({});
  const unverified=await runMigration(f.host,target);
  assert.equal(unverified.modules.goalWait?.ready,false);
  assert.match(unverified.modules.goalWait?.reason??'',/native.*driver.*restor|stock.*callback/);
  const stock=ctx.plugin(await load('@deepseek-ai/dsh-goal-round-driver')); await stock.await();
  assert.equal(stock.state,2);
  const verified=await runMigration(f.host,target);
  assert.equal(verified.modules.goalWait?.ready,true);
  const {Context}=await load('@deepseek-ai/cordis');const otherRoot=new Context();
  try {
    f.host.continuationContext=otherRoot;
    assert.equal((await runMigration(f.host,target)).modules.goalWait?.ready,false,'a same-process different root cannot reuse native verification');
  } finally {f.host.continuationContext=ctx;await otherRoot.fiber.dispose();}
  const after=await inspectMigration(f.host,target);
  assert.equal(after.rows.find(row=>row.id==='goal-round-driver')?.disabled,undefined);
  assert.ok(!(await readFile(f.host.profileContext.patchPath,'utf8')).includes('id: goal-round-driver'));
  const later=parseDocument(await readFile(f.host.profileContext.patchPath,'utf8'));
  later.add({id:'goal-round-driver',config:{laterNativeEdit:true}});
  await writeFile(f.host.profileContext.patchPath,String(later));
  const recovery=await rollbackMigration(f.host,target,{operationId:report.operationId,modules:['goalWait']});
  assert.equal(recovery.modules.goalWait?.phase,'conflict');
  assert.match(recovery.modules.goalWait?.reason??'',/native.*changed|native.*provenance/);
  assert.ok((await readFile(f.host.profileContext.patchPath,'utf8')).includes('laterNativeEdit: true'));
});
test('latest recovery restores only owned bundle delta and cannot claim live success offline',async t=>{
  const f=await fixture(t);
  await f.pkg('native-base','1.0.0',[{insert:[{id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}]}]);
  await f.pkg('dsh-goal-wait-gate','0.4.23',[{insert:[{id:'goal-wait-gate',name:'dsh-goal-wait-gate',config:{strategy:'native'}}]},{id:'goal-round-driver',disabled:true}]);
  await writeFile(join(f.dir,'package.json'),JSON.stringify({dependencies:{'dsh-extras':'*','dsh-goal-wait-gate':'*'},dsh:{profile:{bundles:['native-base','dsh-goal-wait-gate','dsh-extras']}}}));
  const engine=new URL('../../src/migration/index.ts',import.meta.url).href;
  const cordis=pathToFileURL(hostRequire.resolve('@deepseek-ai/cordis')).href;
  const script='import {Context} from '+JSON.stringify(cordis)+';import {runMigration,rollbackMigration} from '+JSON.stringify(engine)+';const ctx=new Context();const host={profileContext:'+JSON.stringify(f.host.profileContext)+',loader:{entries:()=>[]},continuationContext:ctx};const target='+JSON.stringify(target)+';const report=await runMigration(host,target);await rollbackMigration(host,target,{operationId:report.operationId,modules:["goalWait"]});console.log(JSON.stringify(report));await ctx.fiber.dispose();';
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{...process.env,HOME:f.home,DSH_HOME:f.home,TMPDIR:tmpdir()}});
  assert.equal(child.status,0,child.stderr);
  const {operationId}=JSON.parse(child.stdout);
  const {Context}=await load('@deepseek-ai/cordis');const ctx=new Context();t.after(()=>ctx.fiber.dispose());f.host.continuationContext=ctx;
  const recovery=await rollbackMigration(f.host,target,{operationId,modules:['goalWait']});
  assert.equal(recovery.modules.goalWait?.phase,'restart-required');
  assert.match(recovery.modules.goalWait?.reason??'',/legacy.*native|native.*restor|runtime.*verif/);
  const input=await inspectMigration(f.host,target);
  assert.equal(input.rows.find(row=>row.id==='goal-round-driver')?.disabled,true);
  assert.equal(input.sources[0].bundleSelected,true);
  assert.ok(!(await readFile(f.host.profileContext.patchPath,'utf8')).includes('id: goal-round-driver'));
  // Native Loader evidence: default uses an explicit legacy-row adapter around the
  // real official callback. An external audited source entry can replace that adapter.
  const nativePath=hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver');
  await mkdir(join(f.dir,'node_modules','@deepseek-ai'),{recursive:true});
  await symlink(dirname(dirname(nativePath)),join(f.dir,'node_modules','@deepseek-ai','dsh-goal-round-driver'),'dir');
  await writeFile(join(f.dir,'node_modules','dsh-extras','index.js'),"export const name='recovery-extras-fixture';export function apply(){}");
  const legacyEntry=process.env.DSH_TEST_LEGACY_GOAL_ENTRY;
  const legacySource=legacyEntry ? 'export * from '+JSON.stringify(pathToFileURL(legacyEntry).href)+';' : 'import * as native from '+JSON.stringify(pathToFileURL(nativePath).href)+';export const name="goal-wait-gate";export const inject=["agents","goals","sessions"];export function apply(ctx){ctx.plugin(native);}';
  await writeFile(join(f.dir,'node_modules','dsh-goal-wait-gate','index.js'),legacySource);
  const {createRuntime}=await import('../modules/retry/runtime.ts');
  const runtime=await createRuntime({product:false,retry:false});
  try {
    const {ctx}=runtime;
    ctx.baseUrl=pathToFileURL(f.dir).href+'/';
    await ctx.plugin((await load('@deepseek-ai/dsh-goal')).default).await();
    await ctx.plugin((await load('@deepseek-ai/cordis-plugin-loader')).default).await();
    await ctx.plugin((await load('@deepseek-ai/cordis-plugin-timer')).default).await();
    await ctx.plugin((await load('@deepseek-ai/dsh-hmr')).default,{base:f.dir,root:[],ignored:[],debounce:0}).await();
    const boot=await load('@deepseek-ai/dsh-app-boot');
    const baseFile=join(f.dir,'cordis.yml'); await writeFile(baseFile,'[]\n');
    const manifest=JSON.parse(await readFile(join(f.dir,'package.json'),'utf8'));
    const patches=manifest.dsh.profile.bundles.flatMap((name:string)=>boot.loadOverlayPatches('goal-recovery-proof',join(boot.resolveBundleDir('goal-recovery-proof',name,anchor,f.dir),'cordis.patch.yml')));
    patches.push(...boot.loadOverlayPatches('goal-recovery-proof',f.host.profileContext.patchPath));
    await ctx.hmr.runExclusive(async()=>{await boot.mountRootInclude(ctx,baseFile,patches);await ctx.loader.await();await boot.auditStartupEntries(ctx,'goal-recovery-proof');});
    f.host.loader=ctx.loader;f.host.continuationContext=ctx;
    const observed=await runMigration(f.host,target);
    const runtimeInput=await inspectMigration(f.host,target);
    t.diagnostic(JSON.stringify({report:observed.modules.goalWait,owner:runtimeInput.goalOwner,sources:runtimeInput.sources.map(source=>({active:source.active,disabled:source.disabled,problem:source.problem})),entries:[...ctx.loader.entries()].map((entry:any)=>({id:entry.options.id,state:entry.fiber?.state}))}));
    assert.equal(observed.modules.goalWait?.phase,'rolled-back');
    assert.equal(observed.modules.goalWait?.ready,false);
    assert.equal([...ctx.loader.entries()].find((entry:any)=>entry.options.id==='goal-round-driver')?.fiber,undefined);
    assert.equal([...ctx.loader.entries()].find((entry:any)=>entry.options.id==='goal-wait-gate')?.fiber?.state,2);
    // A new split is a distinct migration operation. Exercise the reverse
    // handover from this actually restored, running legacy row back to stock.
    const split:Distribution={rowId:'dsh-extras-goal-wait',packageName:'dsh-extras-goal-wait',moduleIds:['goalWait']};
    await f.pkg(split.rowId,'0.3.0',[{insert:[{id:split.rowId,name:split.rowId,config:{modules:{}}}]}]);
    await writeFile(join(f.dir,'node_modules',split.rowId,'index.js'),"export const name='split-target-proof';export function apply(){}");
    const manifestFile=join(f.dir,'package.json');
    const selected=JSON.parse(await readFile(manifestFile,'utf8'));selected.dependencies[split.rowId]='*';selected.dsh.profile.bundles.push(split.rowId);await writeFile(manifestFile,JSON.stringify(selected));
    const retired=parseDocument(await readFile(f.host.profileContext.patchPath,'utf8'));retired.add({id:target.rowId,disabled:true});await writeFile(f.host.profileContext.patchPath,String(retired));
    const reload=async()=>{
      const current=JSON.parse(await readFile(manifestFile,'utf8'));
      const patches=current.dsh.profile.bundles.flatMap((name:string)=>boot.loadOverlayPatches('goal-handover-proof',join(boot.resolveBundleDir('goal-handover-proof',name,anchor,f.dir),'cordis.patch.yml')));
      patches.push(...boot.loadOverlayPatches('goal-handover-proof',f.host.profileContext.patchPath));
      await ctx.hmr.runExclusive(()=>boot.reconcileProfilePatches(ctx,patches,'goal-handover-proof'));
    };
    await reload();
    f.host.get=name=>ctx.get(name);
    f.host.handoverAcknowledged=(_id,source)=>![...ctx.loader.entries()].some((entry:any)=>entry.options.id===source.rowId&&entry.fiber);
    const preparing=await runMigration(f.host,split);assert.equal(preparing.modules.goalWait?.ready,false);
    await reload();
    const applied=await runMigration(f.host,split);
    assert.equal(applied.modules.goalWait?.ready,true,JSON.stringify(applied.modules.goalWait));
    assert.equal([...ctx.loader.entries()].find((entry:any)=>entry.options.id==='goal-wait-gate')?.fiber,undefined);
    assert.equal([...ctx.loader.entries()].find((entry:any)=>entry.options.id==='goal-round-driver')?.fiber?.state,2);
    t.diagnostic(legacyEntry?'native Loader recovery + handover with explicitly supplied legacy source':'native Loader recovery + handover with explicit legacy-row adapter (not original source execution)');
  } finally {await runtime.dispose();}
});
test('latest manual row without a bundle suppression delta still requires a verified stock slot',async t=>{
  const f=await fixture(t); const {Context}=await load('@deepseek-ai/cordis'); const ctx=new Context();
  t.after(()=>ctx.fiber.dispose()); f.host.continuationContext=ctx;
  await f.pkg('dsh-goal-wait-gate','0.4.23',[]);
  const manifest=JSON.parse(await readFile(join(f.dir,'package.json'),'utf8'));manifest.dependencies['dsh-goal-wait-gate']='*';await writeFile(join(f.dir,'package.json'),JSON.stringify(manifest));
  await writeFile(f.host.profileContext.patchPath,JSON.stringify([{insert:[{id:'manual-goal',name:'dsh-goal-wait-gate',config:{strategy:'native'}}]}]));
  f.host.moduleConfig=()=>({enabled:true,strategy:'native',waitForJobs:true,waitForSubagents:true,maxHoldMs:0});f.host.handoverAcknowledged=()=>true;f.host.get=()=>({});
  const report=await runMigration(f.host,target);
  assert.equal(report.modules.goalWait?.ready,false);
  assert.match(report.modules.goalWait?.reason??'',/native.*driver.*restor|stock.*callback/);
});
test('actual official native callback identity is recognized without trusting its display name',async t=>{
  const f=await fixture(t); const {Context}=await load('@deepseek-ai/cordis'); const ctx=new Context();
  t.after(()=>ctx.fiber.dispose()); f.host.continuationContext=ctx;
  const driver=await load('@deepseek-ai/dsh-goal-round-driver');
  await ctx.plugin(driver);
  const input=await inspectMigration(f.host,target);
  assert.equal(input.moduleProblems?.goalWait,undefined);
});
test('known continuation callback outside verified profile ownership blocks native discovery',async t=>{
  const f=await fixture(t); const {Context}=await load('@deepseek-ai/cordis'); const ctx=new Context();
  t.after(()=>ctx.fiber.dispose()); f.host.continuationContext=ctx;
  await ctx.plugin({name:'goal-wait-owned-replacement-driver',apply(){}});
  assert.match((await inspectMigration(f.host,target)).moduleProblems?.goalWait?.join(';')??'',/unverified.*continuation|foreign.*owner/);
});
test('actual registered startup-marked callback is refused without profile evidence',async t=>{
  const f=await fixture(t); const {Context}=await load('@deepseek-ai/cordis'); const ctx=new Context();
  t.after(()=>ctx.fiber.dispose()); f.host.continuationContext=ctx;
  function apply() {}
  Object.defineProperty(apply,Symbol.for('goal-wait-startup.owner-callback.v1'),{value:true});
  await ctx.plugin({name:'a-cooperating-copy',apply});
  assert.match((await inspectMigration(f.host,target)).moduleProblems?.goalWait?.join(';')??'',/startup.*callback/);
});
test('actual Cordis root startup lifetime lease blocks even a caller native assertion',async t=>{
  const f=await fixture(t); const {Context}=await load('@deepseek-ai/cordis'); const ctx=new Context();
  t.after(()=>ctx.fiber.dispose()); f.host.continuationContext=ctx; f.host.startupOwner='native';
  const key=Symbol.for('goal-wait-startup.root-lifetime.v1');
  const global=globalThis as any; const leases=global[key]??=new WeakMap();
  leases.set(ctx.root[Context.isolate],{owner:ctx.fiber,state:{strategy:'replacement',status:'closed'}});
  const input=await inspectMigration(f.host,target);
  assert.match(input.moduleProblems?.goalWait?.join(';')??'',/startup.*lifetime/);
  assert.equal((await dryRunMigration(f.host,target)).decisions[0].phase,'conflict');
});
test('public CLI-like migration cannot exclude a live programmatic owner and refuses goal handover',async t=>{
  const f=await fixture(t);
  f.host.moduleConfig=()=>({enabled:true});
  const plan=await dryRunMigration(f.host,target);
  assert.equal(plan.decisions[0].phase,'conflict');
  assert.match(plan.decisions[0].reason??'',/programmatic|ownership.*verif/);
  const before=await readFile(f.host.profileContext.patchPath,'utf8');
  const report=await runMigration(f.host,target);
  assert.equal(report.modules.goalWait?.ready,false);
  assert.equal(await readFile(f.host.profileContext.patchPath,'utf8'),before);
});
