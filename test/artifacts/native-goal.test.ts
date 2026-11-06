/** Actual packed Extras root with native Loader/Agent/goals/jobs; offline and without a listening socket. */
import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join, resolve, dirname, basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import type {FeaturePlugin, Distribution} from '../../src/types.ts';
import {createRuntime} from '../modules/retry/runtime.ts';
import {loaderFixture, loadHost, until} from '../integration/loader-harness.ts';

const root=resolve(import.meta.dirname,'../..');
const version=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const unpack=promisify(execFile);
const nativeName='@deepseek-ai/dsh-goal-round-driver';

async function packedGoal(t:TestContext, packageName:string, strategy='replacement') {
  const temp=await mkdtemp(join(root,'.sandbox-packed-goal-'));
  let runtime:Awaited<ReturnType<typeof createRuntime>>|undefined;
  let fixture:Awaited<ReturnType<typeof loaderFixture>>|undefined;
  let detach:(()=>void)|undefined;
  t.after(async()=>{
    detach?.(); await runtime?.dispose(); await fixture?.dispose();
    assert.equal(dirname(temp),root);assert.ok(basename(temp).startsWith('.sandbox-packed-goal-'));
    await rm(temp,{recursive:true,force:true});
  });
  await unpack('tar',['-xzf',join(root,'artifacts',packageName+'-'+version+'.tgz'),'-C',temp]);
  const entry=await import(pathToFileURL(join(temp,'package/lib/index.js')).href) as FeaturePlugin;
  runtime=await createRuntime({product:false,retry:false});
  const {ctx}=runtime;
  await ctx.plugin((await loadHost('dsh-goal')).default).await();
  await ctx.plugin((await loadHost('dsh-jobs-local')).default,{}).await();
  detach=ctx.jobs.attachController('packed-goal-acceptance');
  const native=await loadHost('dsh-goal-round-driver');
  const distribution:Distribution={name:packageName,moduleIds:['goalWait'],modulePlugins:{}};
  const config={modules:{...(packageName==='dsh-extras'?{'compact-context':{enabled:false},retry:{enabled:false},chime:{enabled:false}}:{}),goalWait:{enabled:true,strategy}},migration:{auto:false}};
  const f=fixture=await loaderFixture(t,distribution,config,ctx,[{id:'goal-round-driver',name:nativeName}],entry,{[nativeName]:native});
  await f.ready();
  const status=()=>f.status().modules.goalWait;
  await until(status,value=>value?.capabilities?.continuation?.phase==='active','packed continuation owner');
  const stock=[...f.loader.entries()].find(row=>row.options.name===nativeName)!;
  const select=async(next:string)=>{
    await f.update({...config,modules:{...config.modules,goalWait:{enabled:true,strategy:next}}});
    return until(status,value=>value?.capabilities?.continuation?.phase==='active'&&value.details.goalWait.requested===next,'packed '+next+' owner');
  };
  const liveNative=()=>[...(ctx.registry.get(native)?.fibers??[])].filter((fiber:any)=>fiber.uid!==null);
  return {runtime,ctx,f,stock,status,config,select,liveNative};
}

function ownedJob(t:TestContext,ctx:any,owner:string) {
  const work=Promise.withResolvers<{status:string}>();
  t.after(()=>work.resolve({status:'killed'}));
  const id=ctx.jobs.start({kind:'workflow',label:'synthetic packed job',owner,run:()=>({done:work.promise,cancel:()=>work.resolve({status:'killed'})})});
  return {id,finish:()=>work.resolve({status:'completed'})};
}

for(const packageName of ['dsh-extras','dsh-extras-goal-wait']) {
  test(packageName+': packed replacement waits armed and quiet Job completion dispatches once', {timeout:20000}, async t=>{
    const {runtime,ctx,f,stock,status,config,liveNative}=await packedGoal(t,packageName);
    assert.equal(status().details.goalWait.mounted,'replacement-port');
    assert.equal(stock.fiber!.ctx.fiber.uid,null,'stock is fully stopped before replacement activation');
    const handle=await runtime.createAgent({sessionId:'packed-goal-job',adapter:{failures:0}});
    const job=ownedJob(t,ctx,handle.agent.session.id);
    const goal=ctx.goals.create(handle.agent,{objective:'Synthetic packed continuation',maxGoalRounds:1});
    await new Promise<void>(resolve=>setImmediate(resolve));
    const held=ctx.goals.get(handle.agent);
    assert.equal(held.activation,'armed');assert.equal(held.revision,goal.revision);assert.equal(held.roundsStarted,0);assert.equal(handle.state.requests.length,0);
    job.finish();await ctx.jobs.wait(job.id,1000,handle.agent.session.id);
    await until(()=>handle.state.requests.length,value=>value===1,'quiet native Job wake');
    await handle.agent.whenIdle();
    assert.equal(ctx.goals.get(handle.agent).roundsStarted,1);assert.equal(handle.state.requests.length,1);
    await f.update({...config,modules:{...config.modules,goalWait:{enabled:false,strategy:'replacement'}}});
    await until(()=>stock.fiber?.state,value=>value===2,'stock restoration on module disable');
    assert.equal(stock.disabled,false);assert.equal(liveNative().length,1);
  });

  test(packageName+': packed strategy switches preserve exact authority and reject external revocation', {timeout:20000}, async t=>{
    const f=await packedGoal(t,packageName,'activation');
    const stockOptions=structuredClone(f.stock.options);
    const descriptor=Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm');
    const handle=await f.runtime.createAgent({sessionId:'packed-goal-authority',adapter:{failures:0}});
    ownedJob(t,f.ctx,handle.agent.session.id);
    const before=f.ctx.goals.create(handle.agent,{objective:'Synthetic packed authority',maxGoalRounds:1});
    await until(()=>f.ctx.goals.get(handle.agent).activation,value=>value==='disarmed','owned activation hold');
    const port=await f.select('replacement');assert.equal(port.details.goalWait.mounted,'replacement-port');
    const preserved=f.ctx.goals.get(handle.agent);
    assert.equal(preserved.id,before.id);assert.equal(preserved.revision,before.revision+1);assert.equal(preserved.phase,'active');assert.equal(preserved.activation,'armed');
    assert.equal(preserved.roundsStarted,0);assert.equal(handle.state.requests.length,0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm'),descriptor);
    const oldStackLimit=Error.stackTraceLimit;Error.stackTraceLimit=50;
    let revocations=0;
    const stop=f.ctx.on('goal/activation-changed',({sessionId}:any)=>{
      if(sessionId===handle.agent.session.id&&revocations++===0) f.ctx.goals.disarm(handle.agent);
    });
    try {
      const off=await f.select('off');assert.equal(off.enabled,true);assert.equal(off.details.goalWait.mounted,'none');
    } finally {stop();Error.stackTraceLimit=oldStackLimit;}
    assert.ok(revocations>0,'external same-value disarm ran during actual owned teardown');
    const revoked=f.ctx.goals.get(handle.agent);
    assert.equal(revoked.id,preserved.id);assert.equal(revoked.revision,preserved.revision);assert.equal(revoked.phase,'active');assert.equal(revoked.activation,'disarmed');
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm'),descriptor);
    const native=await f.select('native');assert.equal(native.details.goalWait.mounted,'host-driver');
    await new Promise<void>(resolve=>setImmediate(resolve));
    assert.equal(f.ctx.goals.get(handle.agent).activation,'disarmed');assert.equal(handle.state.requests.length,0);
    assert.equal(f.liveNative().length,1);
    f.ctx.goals.resume(handle.agent,{id:revoked.id,revision:revoked.revision});
    await until(()=>handle.state.requests.length,value=>value===1,'explicit human-authorized native resume');
    await handle.agent.whenIdle();assert.equal(f.ctx.goals.get(handle.agent).roundsStarted,1);
    await f.select('off');assert.equal(f.liveNative().length,0);
    await f.f.entry.update({disabled:true});await f.f.loader.await();
    await until(()=>f.stock.fiber?.state,value=>value===2,'whole Extras row disable restores original stock');
    assert.equal(f.liveNative().length,1);assert.deepEqual(f.stock.options,stockOptions);
    assert.equal(f.f.request().code,404,'disabled root leaves no authenticated status handler');
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm'),descriptor);
  });

  test(packageName+': packed activation exit cannot bypass an observed external revocation', {timeout:20000}, async t=>{
    const f=await packedGoal(t,packageName,'activation');
    const handle=await f.runtime.createAgent({sessionId:'packed-activation-revocation',adapter:{failures:0}});
    ownedJob(t,f.ctx,handle.agent.session.id);
    const before=f.ctx.goals.create(handle.agent,{objective:'Synthetic observed transition revocation',maxGoalRounds:1});
    await until(()=>f.ctx.goals.get(handle.agent).activation,value=>value==='disarmed','activation hold before stock teardown');
    const stockRaw=f.stock.fiber!.ctx.fiber;
    let external=0;
    const stop=f.ctx.on('internal/status',(fiber:any)=>{
      if(fiber.ctx.fiber===stockRaw&&fiber.state===4&&external++===0)f.ctx.goals.disarm(handle.agent);
    });
    try {await f.select('off');} finally {stop();}
    assert.equal(external,1,'external disarm was actually observed during native stock teardown');
    const after=f.ctx.goals.get(handle.agent);
    assert.equal(after.id,before.id);assert.equal(after.revision,before.revision);
    assert.equal(after.phase,'active');assert.equal(after.activation,'disarmed');
    assert.equal(handle.state.requests.length,0);assert.equal(f.liveNative().length,0);
    await f.select('native');
    assert.equal(f.ctx.goals.get(handle.agent).activation,'disarmed');assert.equal(f.liveNative().length,1);
  });

  test(packageName+': packed transition preserves an externally replaced observer descriptor', {timeout:20000}, async t=>{
    const f=await packedGoal(t,packageName,'activation');
    const handle=await f.runtime.createAgent({sessionId:'packed-descriptor-revocation',adapter:{failures:0}});
    ownedJob(t,f.ctx,handle.agent.session.id);
    const before=f.ctx.goals.create(handle.agent,{objective:'Synthetic descriptor revocation',maxGoalRounds:1});
    await until(()=>f.ctx.goals.get(handle.agent).activation,value=>value==='disarmed','activation hold before descriptor takeover');
    const stockRaw=f.stock.fiber!.ctx.fiber;
    let foreign:PropertyDescriptor|undefined;
    const stop=f.ctx.on('internal/status',(fiber:any)=>{
      if(fiber.ctx.fiber!==stockRaw||fiber.state!==4||foreign)return;
      const installed=Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm');assert.ok(installed);
      foreign={...installed,enumerable:!installed.enumerable};
      Object.defineProperty(f.ctx.goals,'disarm',foreign);
    });
    try {
      await f.f.update({...f.config,modules:{...f.config.modules,goalWait:{enabled:true,strategy:'off'}}});
      await until(f.status,value=>value.details?.goalWait?.requested==='off'&&(value.capabilities?.continuation?.phase==='active'||/disarm/i.test(value.details.goalWait.fallback??'')),'settled observer ownership check');
    } finally {stop();}
    assert.ok(foreign,'external descriptor attribute replacement actually ran');
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals,'disarm'),foreign,'do not overwrite a descriptor merely because its function value is unchanged');
    const after=f.ctx.goals.get(handle.agent);
    assert.equal(after.id,before.id);assert.equal(after.revision,before.revision);assert.equal(after.activation,'disarmed');
    assert.equal(handle.state.requests.length,0);
    assert.equal(f.status().capabilities.continuation.phase,'unavailable');
    assert.match(f.status().details.goalWait.fallback,/disarm/i);
  });
}
