import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {distributions} from '../../scripts/distributions.mjs';

const root = resolve(import.meta.dirname, '../..');
const version = process.env.DSH_EXTRAS_ARTIFACT_VERSION ?? JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const artifacts = process.env.DSH_EXTRAS_ARTIFACT_DIR ?? join(root,'artifacts');
const anchor = process.env.DSH_TEST_INSTALL_ANCHOR ?? createRequire(join(root,'package.json')).resolve('@deepseek-ai/dsh/package.json');

// Serialized into the disposable consumer: no source imports, loader hooks,
// NODE_PATH, NODE_OPTIONS, local Cordis, or native bootstrap resolution helpers.
async function consumer() {
  const {default:assert} = await import('node:assert/strict');
  const {createRequire} = await import('node:module');
  const {mkdir,writeFile,readFile,readdir,symlink} = await import('node:fs/promises');
  const {join,dirname} = await import('node:path');
  const {pathToFileURL} = await import('node:url');
  const [name,anchor] = process.argv.slice(2);
  assert.equal(process.env.NODE_OPTIONS,undefined); assert.equal(process.env.NODE_PATH,undefined);
  const local = createRequire(import.meta.url), hostRequire = createRequire(anchor);
  assert.throws(()=>local.resolve('@deepseek-ai/cordis'), {code:'MODULE_NOT_FOUND'});
  const api = await import(name+'/migration');
  const load = name => import(pathToFileURL(hostRequire.resolve(name)).href);
  const {Context} = await load('@deepseek-ai/cordis');
  const native = await load('@deepseek-ai/dsh-app-boot');
  const driver = await load('@deepseek-ai/dsh-goal-round-driver');
  const dir = process.env.DSH_PROFILE_DIR, home = process.env.DSH_HOME;
  const target = {rowId:name,packageName:name,moduleIds:['goalWait']};
  const pkg = async (id,version,patches) => {
    const out=join(dir,'node_modules',id); await mkdir(out,{recursive:true});
    await writeFile(join(out,'package.json'),JSON.stringify({name:id,version,type:'module',dsh:{bundle:{patch:'./cordis.patch.yml'}}}));
    await writeFile(join(out,'cordis.patch.yml'),JSON.stringify(patches));
  };
  await mkdir(join(dir,'node_modules','@deepseek-ai'),{recursive:true});
  await symlink(dirname(local.resolve(name+'/package.json')),join(dir,'node_modules',name),'dir');
  await symlink(dirname(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver/package.json')),join(dir,'node_modules','@deepseek-ai','dsh-goal-round-driver'),'dir');
  await pkg('native-base','1.0.0',[{insert:[{id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}]}]);
  await writeFile(join(dir,'package.json'),JSON.stringify({name:'runtime-profile',dependencies:{[name]:'*'},dsh:{profile:{bundles:['native-base',name]}}}));
  const manifestBefore=await readFile(join(dir,'package.json'),'utf8');
  const patchPath=join(dir,'cordis.patch.yml'); await writeFile(patchPath,'[]\n');
  const ctx=new Context();
  const host={profileContext:{dir,home,patchPath,installAnchor:anchor},loader:{entries:()=>[]},continuationContext:ctx};
  const inspect=()=>api.inspectMigration(host,target);
  const refusal=async pattern=>{
    const input=await inspect();
    assert.equal(input.goalOwner?.verified,false); assert.equal(input.goalOwner?.stockActive,false);
    assert.match(input.goalOwner?.reason??'',pattern);
  };
  try {
    for(const id of ['dsh-system-prompt','dsh-session','dsh-session-projection','dsh-agent','dsh-llm','dsh-tools','dsh-agent-loop','dsh-goal']) {
      await ctx.plugin((await load('@deepseek-ai/'+id)).default).await();
    }
    ctx.baseUrl=pathToFileURL(dir).href+'/';
    await ctx.plugin((await load('@deepseek-ai/cordis-plugin-loader')).default).await();
    await ctx.loader.create({id:'goal-round-driver',name:'@deepseek-ai/dsh-goal-round-driver'}); await ctx.loader.await();
    host.loader=ctx.loader;
    const stock=ctx.loader.resolve('goal-round-driver');
    assert.equal(stock.fiber.state,2,'real native Loader stock must be active');
    assert.equal(stock.moduleNamespace.apply,driver.apply);
    assert.equal(stock.fiber.ctx.fiber.entry,stock);
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:true});
    host.continuationContext=stock.fiber.ctx;
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:true},'actual scoped Context has the same anchored root');
    host.continuationContext=ctx;
    console.log('PASS anchored native Loader stock and scoped Context');

    // A consumer-visible package must never replace the explicit host's Cordis.
    const shadow=join(process.cwd(),'node_modules','@deepseek-ai','cordis');
    await mkdir(shadow,{recursive:true});
    await writeFile(join(shadow,'package.json'),JSON.stringify({name:'@deepseek-ai/cordis',version:'4.1.0',type:'module',exports:'./index.js'}));
    await writeFile(join(shadow,'index.js'),"throw new Error('consumer shadow Cordis must not execute');");
    assert.equal(local.resolve('@deepseek-ai/cordis'),join(shadow,'index.js'));
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:true});
    console.log('PASS consumer-local shadow ignored');

    const isolate=Object.getOwnPropertyDescriptor(ctx.root,Context.isolate);
    Object.defineProperty(ctx.root,Context.isolate,{...isolate,value:undefined});
    try {await refusal(/Cordis.*root|root.*Cordis/);} finally {Object.defineProperty(ctx.root,Context.isolate,isolate);}
    console.log('PASS unavailable actual root isolation evidence refused');

    // The real audited facade is used solely to reach ownership inspection for
    // intentionally missing/incompatible anchors; no replacement owner internals.
    host.nativeMigration=native;
    const savedAnchor=host.profileContext.installAnchor;
    for(const kind of ['missing','unsupported-version','unsupported-isolate','foreign-context']) {
      const out=join(process.cwd(),'anchors',kind); await mkdir(out,{recursive:true});
      const fakeAnchor=join(out,'package.json'); await writeFile(fakeAnchor,JSON.stringify({name:'incompatible-host',type:'module'}));
      const scope=join(out,'node_modules','@deepseek-ai'); await mkdir(scope,{recursive:true});
      await symlink(dirname(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver/package.json')),join(scope,'dsh-goal-round-driver'),'dir');
      if(kind!=='missing') {
        const cordis=join(scope,'cordis');await mkdir(cordis,{recursive:true});
        await writeFile(join(cordis,'package.json'),JSON.stringify({name:'@deepseek-ai/cordis',version:kind==='unsupported-version'?'99.0.0':'4.1.0',type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
        await writeFile(join(cordis,'index.js'),kind==='unsupported-isolate'?'export class Context {static isolate="unsupported"}':"export class Context {static isolate=Symbol.for('cordis.isolate')}");
      }
      host.profileContext.installAnchor=fakeAnchor;
      await refusal(kind==='missing' ? /anchored Cordis runtime unavailable/ : kind==='unsupported-version' ? /unsupported anchored Cordis version/ : /anchored Cordis Context\/root shape/);
    }
    host.profileContext.installAnchor=savedAnchor; delete host.nativeMigration;
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:true});
    console.log('PASS missing, unsupported version/isolate, and foreign anchored Context refused');

    host.nativeMigration=native;
    for(const kind of ['driver-version','driver-bytes','loader-version','loader-missing','loader-foreign']) {
      const out=join(process.cwd(),'anchors',kind), scope=join(out,'node_modules','@deepseek-ai');
      await mkdir(scope,{recursive:true});
      const fakeAnchor=join(out,'package.json');await writeFile(fakeAnchor,JSON.stringify({name:'unverified-artifact-host',type:'module'}));
      await symlink(dirname(hostRequire.resolve('@deepseek-ai/cordis/package.json')),join(scope,'cordis'),'dir');
      if(kind.startsWith('driver-')) {
        await symlink(dirname(hostRequire.resolve('@deepseek-ai/cordis-plugin-loader/package.json')),join(scope,'cordis-plugin-loader'),'dir');
        const dir=join(scope,'dsh-goal-round-driver');await mkdir(dir);
        await writeFile(join(dir,'package.json'),JSON.stringify({name:'@deepseek-ai/dsh-goal-round-driver',version:kind==='driver-version'?'99.0.0':'0.2.2-rc.2',type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
        await writeFile(join(dir,'index.js'),'globalThis[Symbol.for("unverified-packed-driver-evaluated")]=true;export * from '+JSON.stringify(pathToFileURL(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver')).href)+';');
      } else {
        await symlink(dirname(hostRequire.resolve('@deepseek-ai/dsh-goal-round-driver/package.json')),join(scope,'dsh-goal-round-driver'),'dir');
        if(kind!=='loader-missing') {
          const dir=join(scope,'cordis-plugin-loader');await mkdir(dir);
          await writeFile(join(dir,'package.json'),JSON.stringify({name:'@deepseek-ai/cordis-plugin-loader',version:kind==='loader-version'?'99.0.0':'1.1.0',type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
          await writeFile(join(dir,'index.js'),kind==='loader-foreign'?'export default class Loader {}':'export {default} from '+JSON.stringify(pathToFileURL(hostRequire.resolve('@deepseek-ai/cordis-plugin-loader')).href)+';');
        }
      }
      host.profileContext.installAnchor=fakeAnchor;
      await refusal(kind==='driver-version'?/unsupported anchored native driver version/:kind==='driver-bytes'?/anchored native driver.*fingerprint/:/anchored.*Loader/);
      assert.equal(globalThis[Symbol.for('unverified-packed-driver-evaluated')],undefined,'unverified driver is rejected before evaluation');
      assert.equal(stock.fiber.state,2);assert.equal(stock.options.disabled,undefined);
    }
    host.profileContext.installAnchor=savedAnchor;delete host.nativeMigration;
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:true});
    console.log('PASS unknown/changed driver and missing/version/foreign Loader proof refused before unverified driver import');

    const other=new Context(); host.continuationContext=other;
    try {await refusal(/native.*Loader|ownership/);} finally {host.continuationContext=ctx;await other.fiber.dispose();}
    const extra=ctx.plugin(driver);await extra.await();
    try {await refusal(/native.*Loader|ownership/);} finally {await extra.dispose();}
    const namespace=stock.moduleNamespace;
    stock.moduleNamespace={apply(){}};
    try {await refusal(/native.*Loader|ownership/);} finally {stock.moduleNamespace=namespace;}
    console.log('PASS foreign root, programmatic official callback, and namespace mismatch refused');

    const key=Symbol.for('goal-wait-startup.root-lifetime.v1');
    const leases=globalThis[key]??=new WeakMap();leases.set(ctx.root[Context.isolate],{});
    host.startupOwner='native';
    try {await refusal(/startup.*lifetime/);} finally {leases.delete(ctx.root[Context.isolate]);}
    function apply(){}
    Object.defineProperty(apply,Symbol.for('goal-wait-startup.owner-callback.v1'),{value:true});
    const marked=ctx.plugin({name:'cooperating-startup',apply});await marked.await();
    try {await refusal(/startup.*callback/);} finally {await marked.dispose();}
    console.log('PASS startup lifetime lease and callback markers preserved');

    ctx.registry.delete(driver.apply);await stock.fiber.await();
    assert.equal(stock.fiber.ctx.fiber.uid,null);
    assert.deepEqual((await inspect()).goalOwner,{verified:true,stockActive:false});
    console.log('PASS exact retired stock remains known inactive');
    host.continuationContext=undefined;
    host.nativeMigration=native;
    host.profileContext.installAnchor=join(process.cwd(),'anchors','missing','package.json');
    assert.match((await inspect()).goalOwner.reason,/offline.*runtime|runtime.*verification/,'offline return precedes even unavailable anchored Cordis');
    assert.equal(await readFile(patchPath,'utf8'),'[]\n');
    assert.equal(await readFile(join(dir,'package.json'),'utf8'),manifestBefore);
    assert.deepEqual(await readdir(home),[]);
    console.log('PASS offline refusal and read-only inspection');
  } finally {await ctx.fiber.dispose();}
}

for(const {name} of distributions) test('packed public anchored runtime ownership: '+name,{timeout:120000},async t=>{
  const temp=await mkdtemp(join(tmpdir(),'ex-migration-runtime-'));
  t.after(async()=>{assert.ok(temp.startsWith(join(tmpdir(),'ex-migration-runtime-')));await rm(temp,{recursive:true,force:true});});
  for(const part of ['home','dsh','profile','cache','config','data','tmp'])await mkdir(join(temp,part),{recursive:true});
  const env={PATH:process.env.PATH,HOME:join(temp,'home'),DSH_HOME:join(temp,'dsh'),DSH_PROFILE_DIR:join(temp,'profile'),XDG_CONFIG_HOME:join(temp,'config'),XDG_DATA_HOME:join(temp,'data'),XDG_CACHE_HOME:join(temp,'cache'),npm_config_cache:join(temp,'cache','npm'),TMPDIR:join(temp,'tmp')};
  await writeFile(join(temp,'package.json'),JSON.stringify({name:'runtime-consumer',private:true,type:'module'}));
  const archive=join(artifacts,name+'-'+version+'.tgz');
  execFileSync('npm',['install','--ignore-scripts','--omit=optional','--legacy-peer-deps','--no-audit','--no-fund',archive],{cwd:temp,env,stdio:'pipe',timeout:90000});
  const entry=join(temp,'consumer.mjs');await writeFile(entry,'await ('+consumer.toString()+')();\n');
  try {
    const output=execFileSync(process.execPath,['--expose-internals',entry,name,anchor],{cwd:temp,env,encoding:'utf8',stdio:'pipe',timeout:30000});
    t.diagnostic(output.trim());
  } catch(error) {throw new Error(String(error.stdout??'')+String(error.stderr??''),{cause:error});}
});
