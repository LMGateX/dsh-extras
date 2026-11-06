import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile, realpath} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {parseDocument} from 'yaml';
import {distributions} from '../../scripts/distributions.mjs';

const root = resolve(import.meta.dirname, '../..');
const version = process.env.DSH_EXTRAS_ARTIFACT_VERSION ?? JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const artifacts = resolve(process.env.DSH_EXTRAS_ARTIFACT_DIR ?? join(root, 'artifacts'));
function environment(temp) {
  return {PATH:process.env.PATH, HOME:join(temp,'home'), DSH_HOME:join(temp,'dsh-home'), TMPDIR:join(temp,'tmp'), XDG_CACHE_HOME:join(temp,'cache'), XDG_CONFIG_HOME:join(temp,'config'), XDG_DATA_HOME:join(temp,'data'), npm_config_cache:join(temp,'npm-cache'), CI:'1', NO_COLOR:'1'};
}
function run(temp, command, args) {
  const result = spawnSync(command,args,{cwd:temp,env:environment(temp),encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  assert.ifError(result.error);
  return result;
}
function succeeds(result, message) { assert.equal(result.status,0,message+'\n'+result.stdout+result.stderr); return result.stdout; }
async function snapshot(dir) {
  const result = {};
  for (const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
    const path = join(dir,entry.name);
    result[entry.name] = entry.isDirectory() ? await snapshot(path) : await readFile(path,'base64');
  }
  return result;
}
async function disposable(t) {
  // Explicit temporary storage, never a repository/host descendant. No peers are linked.
  const temp = await mkdtemp(join(tmpdir(),'extras-standalone-cli-'));
  assert.ok(!temp.startsWith(root+'/'));
  t.after(async()=>{assert.ok(temp.startsWith(join(tmpdir(),'extras-standalone-cli-')));await rm(temp,{recursive:true,force:true});});
  for(const dir of ['home','dsh-home','tmp']) await mkdir(join(temp,dir));
  return temp;
}
async function consumer(t, name) {
  const temp=await disposable(t);
  await writeFile(join(temp,'package.json'),JSON.stringify({name:'standalone-cli-consumer',private:true,type:'module'}));
  succeeds(run(temp,'npm',['install','--ignore-scripts','--omit=optional','--no-audit','--no-fund',join(artifacts,name+'-'+version+'.tgz')]),'ordinary dependency install');
  const packageDir = join(temp,'node_modules',name);
  const manifest = JSON.parse(await readFile(join(packageDir,'package.json'),'utf8'));
  assert.equal(manifest.version,version);
  const script = join(packageDir,manifest.bin['dsh-extras-migrate']);
  const bin = join(temp,'node_modules','.bin','dsh-extras-migrate');
  assert.equal(await realpath(bin),await realpath(script),'actual package-manager bin');
  succeeds(run(temp,process.execPath,['--input-type=module','-e',
    "import assert from 'node:assert/strict'; import {createRequire} from 'node:module'; const r=createRequire("+JSON.stringify(join(packageDir,'package.json'))+"); assert.throws(()=>r.resolve('@deepseek-ai/cordis'),{code:'MODULE_NOT_FOUND'}); await assert.rejects(import('@deepseek-ai/cordis'),{code:'ERR_MODULE_NOT_FOUND'});"
  ]),'Cordis must not be resolvable in clean consumer');
  return {temp,packageDir,script,bin};
}

for(const {name} of distributions) test('standalone packed help without Cordis: '+name,{timeout:180000},async t=>{
  const {temp,script,bin}=await consumer(t,name);
  const before = {home:await snapshot(join(temp,'home')),dsh:await snapshot(join(temp,'dsh-home'))};
  for(const [command,args] of [[process.execPath,[script,'--help']],[bin,['--help']],[process.execPath,[bin,'--help']],[process.execPath,['--preserve-symlinks-main',bin,'--help']]]) {
    const output=succeeds(run(temp,command,args),'standalone --help must start without host peers');
    assert.match(output,/inspect\|dry-run\|apply\|retry\|rollback/);
    assert.match(output,/--profile-dir DIR/);
  }
  for(const setup of ['process.argv.length=1;', 'process.argv[1]=process.execPath;', 'process.argv[1]='+JSON.stringify(join(temp,'missing-argv-script'))+';']) {
    const imported=run(temp,process.execPath,['--input-type=module','-e',setup+'const entry=await import('+JSON.stringify(pathToFileURL(script).href)+');if(typeof entry.migrationMain!=="function")throw new Error("missing CLI function");']);
    assert.equal(succeeds(imported,'imported CLI must not execute for unrelated/missing argv'),'');
    assert.equal(imported.stderr,'');
  }
  assert.deepEqual({home:await snapshot(join(temp,'home')),dsh:await snapshot(join(temp,'dsh-home'))},before,'help creates no profile or journal state');
  assert.equal((await readdir(temp)).includes('.dsh-extras'),false);
});

const anchor = process.env.DSH_TEST_INSTALL_ANCHOR ?? createRequire(import.meta.url).resolve('@deepseek-ai/dsh/package.json');
async function legacyBundle(temp, name, version, row) {
  // Detached legacy package metadata/config is intentional: discovery must not
  // execute predecessor code. Native compose/discovery/locking stay real.
  const dir=join(temp,'node_modules',name);
  await mkdir(dir,{recursive:true});
  await writeFile(join(dir,'package.json'),JSON.stringify({name,version,type:'module',dsh:{bundle:{patch:'./cordis.patch.yml'}}}));
  await writeFile(join(dir,'cordis.patch.yml'),JSON.stringify([{insert:[row]}]));
  await writeFile(join(dir,'index.js'),'throw new Error("legacy feature code must not execute during migration");');
}
async function migrationProfile(temp,name,{goal=false,compact=false}={}) {
  await legacyBundle(temp,'dsh-stream-retry','0.1.9',{id:'stream-retry',name:'dsh-stream-retry',config:{errorCodes:[],providers:[],retryEmptyResponse:false}});
  const legacy=['dsh-stream-retry'];
  if(goal){await legacyBundle(temp,'dsh-goal-wait-gate','0.4.23',{id:'goal-wait-gate',name:'dsh-goal-wait-gate',config:{strategy:'off'}});legacy.push('dsh-goal-wait-gate');}
  if(compact){await legacyBundle(temp,'dsh-tool-compact-context','0.4.7',{id:'dsh-tool-compact-context',name:'dsh-tool-compact-context',config:{guidanceText:'',retryAttempts:0,ptcTimeoutMs:0}});legacy.push('dsh-tool-compact-context');}
  const manifest=JSON.parse(await readFile(join(temp,'package.json'),'utf8'));
  for(const key of legacy)manifest.dependencies[key]='*';
  manifest.dsh={profile:{bundles:[name,...legacy]}};
  await writeFile(join(temp,'package.json'),JSON.stringify(manifest));
  await writeFile(join(temp,'cordis.patch.yml'),'[]\n');
}
function flags(temp,name) {
  return ['--profile-dir',temp,'--dsh-home',environment(temp).DSH_HOME,'--install-anchor',anchor,'--distribution',name];
}
function publicAPI(temp,name,body) {
  const profile={dir:temp,patchPath:join(temp,'cordis.patch.yml'),home:environment(temp).DSH_HOME,installAnchor:anchor};
  const target=distributions.find(d=>d.name===name);
  return run(temp,process.execPath,['--input-type=module','-e',
    'import assert from "node:assert/strict";const api=await import('+JSON.stringify(name+'/migration')+');const host={profileContext:'+JSON.stringify(profile)+',loader:{entries:()=>[]}};const target='+JSON.stringify({rowId:name,packageName:name,moduleIds:target.modules})+';'+body]);
}
async function inputs(temp) {
  return {manifest:await readFile(join(temp,'package.json'),'utf8'),patch:await readFile(join(temp,'cordis.patch.yml'),'utf8'),home:await snapshot(join(temp,'home')),dsh:await snapshot(join(temp,'dsh-home'))};
}
for(const {name,modules} of distributions) test('standalone public import, guards and anchored read-only plans: '+name,{timeout:180000},async t=>{
  const {temp,script,bin}=await consumer(t,name);
  succeeds(publicAPI(temp,name,'for(const key of ["inspectMigration","dryRunMigration","runMigration","rollbackMigration","startAutomaticMigration"])assert.equal(typeof api[key],"function");'),'documented migration subpath imports without peers');
  await migrationProfile(temp,name,{goal:true,compact:true});
  const before=await inputs(temp);
  const invalid=[[],['inspect'],['inspect','--profile-dir',temp],['inspect','--profile-dir',temp,'--dsh-home',environment(temp).DSH_HOME],['inspect',...flags(temp,name),'--distribution','not-a-distribution'],['rollback',...flags(temp,name)],['rollback',...flags(temp,name),'--operation','missing','--modules','context'],['bogus',...flags(temp,name)],['inspect','--profile-dir']];
  for(const args of invalid) for(const [command,prefix] of [[process.execPath,[script]],[bin,[]]]) {
    const result=run(temp,command,[...prefix,...args]);
    assert.equal(result.status,1,'argument guard must reject '+JSON.stringify(args)+'\n'+result.stdout+result.stderr);
    assert.match(result.stderr,/Migration refused or failed/);
    assert.doesNotMatch(result.stderr,/ERR_MODULE_NOT_FOUND|Cannot find package/);
  }
  for(const operation of ['inspect','dry-run']) for(const [command,prefix] of [[process.execPath,[script]],[bin,[]]]) {
    const plan=JSON.parse(succeeds(run(temp,command,[...prefix,operation,...flags(temp,name)]),'anchored '+operation));
    assert.equal(plan.legacyMode,true);assert.equal(plan.problems.length,0);
    assert.deepEqual(plan.decisions.map(d=>d.moduleId),modules);
    if(modules.includes('retry')){const retry=plan.decisions.find(d=>d.moduleId==='retry');assert.equal(retry.phase,'prepared');assert.equal(retry.source.version,'0.1.9');}
    if(modules.includes('goalWait')){const goal=plan.decisions.find(d=>d.moduleId==='goalWait');assert.equal(goal.phase,'conflict');assert.equal(goal.enabled,false);assert.match(goal.reason,/runtime|continuation|restart/i);}
  }
  const detail=JSON.parse(succeeds(publicAPI(temp,name,'console.log(JSON.stringify(await api.dryRunMigration(host,target)));'),'public anchored dry run'));
  if(modules.includes('retry')) assert.deepEqual(detail.decisions.find(d=>d.moduleId==='retry').config,{enabled:true,errorCodes:[],providers:[],retryEmptyResponse:false});
  if(modules.includes('compact-context')){const config=detail.decisions.find(d=>d.moduleId==='compact-context').config;assert.equal(config.retryAttempts,0);assert.equal(config.guidanceText,'');assert.equal(config.ptcTimeoutMs,0);}
  assert.deepEqual(await inputs(temp),before,'imports, guards, inspect and dry-run preserve all profile/home inputs');
  assert.equal((await readdir(temp)).includes('.dsh-extras'),false,'read-only operations create no journal');
});

test('native pnpm peer-auto-install-disabled profile launches standalone installed CLI',{timeout:240000},async t=>{
  const temp=await disposable(t);
  const hostManifest=JSON.parse(await readFile(anchor,'utf8'));
  const cli=resolve(anchor,'..',hostManifest.bin.dsh);
  const initialized=succeeds(run(temp,process.execPath,[cli,'--profile','standalone','--from-default-profile','web','--dump-config']),'initialize actual native profile');
  assert.match(initialized,/web-app/);
  const installed=succeeds(run(temp,process.execPath,[cli,'plugin','--profile','standalone','add',join(artifacts,'dsh-extras-'+version+'.tgz'),'--ignore-scripts','--no-optional','--config.auto-install-peers=false']),'native pnpm installation without peer auto-install');
  assert.match(installed,/dsh-extras/);
  const profile=join(environment(temp).DSH_HOME,'profiles','standalone');
  const packageDir=join(profile,'node_modules','dsh-extras');
  assert.equal(JSON.parse(await readFile(join(packageDir,'package.json'),'utf8')).version,version);
  succeeds(run(temp,process.execPath,['--input-type=module','-e',
    'import assert from "node:assert/strict";import{createRequire}from"node:module";const r=createRequire('+JSON.stringify(join(packageDir,'package.json'))+');assert.throws(()=>r.resolve("@deepseek-ai/cordis"),{code:"MODULE_NOT_FOUND"});'
  ]),'native installed package has no locally resolvable Cordis');
  const before={manifest:await readFile(join(profile,'package.json'),'utf8'),patch:await readFile(join(profile,'cordis.patch.yml'),'utf8')};
  for(const [command,args] of [[process.execPath,[join(packageDir,'lib','migrate.js'),'--help']],[join(profile,'node_modules','.bin','dsh-extras-migrate'),['--help']]]) {
    assert.match(succeeds(run(temp,command,args),'native installed standalone help'),/--install-anchor/);
  }
  const plan=JSON.parse(succeeds(run(temp,process.execPath,[join(packageDir,'lib','migrate.js'),'inspect','--profile-dir',profile,'--dsh-home',environment(temp).DSH_HOME,'--install-anchor',anchor]),'native profile standalone inspect'));
  assert.equal(typeof plan.profileId,'string');assert.equal(plan.decisions.length,4);
  assert.deepEqual({manifest:await readFile(join(profile,'package.json'),'utf8'),patch:await readFile(join(profile,'cordis.patch.yml'),'utf8')},before);
  assert.equal((await readdir(profile)).includes('.dsh-extras'),false);
});

async function journal(temp) {
  const dir=join(temp,'.dsh-extras');
  const names=(await readdir(dir)).filter(name=>name.endsWith('.json')&&!name.endsWith('.backup.json')&&!name.endsWith('.report.json'));
  assert.equal(names.length,1,'exactly one private profile journal');
  const path=join(dir,names[0]);
  return {path,value:JSON.parse(await readFile(path,'utf8'))};
}
function cliJSON(temp,bin,operation,name,extra=[]) {
  return JSON.parse(succeeds(run(temp,bin,[operation,...flags(temp,name),...extra]),operation+' through installed bin'));
}
for(const name of ['dsh-extras','dsh-extras-retry']) test('packed apply retry and selective rollback preserve journal and later edits: '+name,{timeout:180000},async t=>{
  const {temp,bin,script}=await consumer(t,name);
  await migrationProfile(temp,name,{compact:true,goal:name==='dsh-extras'});
  const original=await inputs(temp);
  const applied=cliJSON(temp,bin,'apply',name);
  assert.ok(applied.operationId);assert.equal(applied.modules.retry.ready,false,'offline persistence is not a live handover');
  assert.equal(applied.modules.retry.phase,'restart-required');
  if(name==='dsh-extras') assert.equal(applied.modules.goalWait.phase,'conflict','Goal refusal does not reject non-Goal migration');
  const saved=await journal(temp);
  const backup=await readFile(saved.value.backup,'utf8');
  assert.equal(saved.value.operationId,applied.operationId);
  assert.equal(saved.value.schemaVersion,1);
  const permissions=await import('node:fs/promises');
  assert.equal((await permissions.stat(saved.path)).mode&0o777,0o600);
  assert.equal((await permissions.stat(join(temp,'.dsh-extras'))).mode&0o777,0o700);
  const backed=JSON.parse(backup);
  assert.equal(backed.manifest,original.manifest);assert.equal(backed.patch,original.patch);
  const patch=await readFile(join(temp,'cordis.patch.yml'),'utf8');
  const retried=JSON.parse(succeeds(run(temp,process.execPath,[script,'retry',...flags(temp,name)]),'retry packed Node script'));
  assert.equal(retried.operationId,applied.operationId);assert.equal(await readFile(join(temp,'cordis.patch.yml'),'utf8'),patch,'retry does not duplicate owned deltas');
  const manifest=JSON.parse(await readFile(join(temp,'package.json'),'utf8'));
  assert.equal(manifest.dsh.profile.bundles.includes('dsh-stream-retry'),false);
  manifest.userAddedAfterMigration={preserve:true};await writeFile(join(temp,'package.json'),JSON.stringify(manifest));
  const edited=parseDocument(patch);edited.add({insert:[{id:'unrelated-later-row',name:'unrelated-test-plugin',config:{keep:true}}]});
  await writeFile(join(temp,'cordis.patch.yml'),String(edited));
  const one=cliJSON(temp,bin,'rollback',name,['--operation',applied.operationId,'--modules','retry']);
  assert.equal(one.modules.retry.phase,'restart-required','stage one disables new ownership before restoring old');
  assert.equal(JSON.parse(await readFile(join(temp,'package.json'),'utf8')).dsh.profile.bundles.includes('dsh-stream-retry'),false);
  const two=cliJSON(temp,bin,'rollback',name,['--operation',applied.operationId,'--modules','retry']);
  assert.equal(two.modules.retry.phase,'rolled-back');
  const finalManifest=JSON.parse(await readFile(join(temp,'package.json'),'utf8'));
  assert.equal(finalManifest.dsh.profile.bundles.includes('dsh-stream-retry'),true);
  assert.deepEqual(finalManifest.userAddedAfterMigration,{preserve:true});
  if(name==='dsh-extras') {
    assert.equal(finalManifest.dsh.profile.bundles.includes('dsh-tool-compact-context'),false,'unrequested compact-context remains migrated');
    assert.equal(finalManifest.dsh.profile.bundles.includes('dsh-goal-wait-gate'),true,'offline Goal legacy selection remains untouched');
  }
  const finalPatch=await readFile(join(temp,'cordis.patch.yml'),'utf8');
  assert.match(finalPatch,/unrelated-later-row/);assert.match(finalPatch,/keep: true/);
  assert.doesNotMatch(finalPatch,new RegExp('dsh-extras-migration:'+applied.operationId+':retry'));
  if(name==='dsh-extras')assert.match(finalPatch,new RegExp('dsh-extras-migration:'+applied.operationId+':compact-context'));
  assert.equal((await journal(temp)).value.operationId,applied.operationId,'journal is preserved, not deleted after rollback');
  assert.equal(await readFile(saved.value.backup,'utf8'),backup,'original backup remains byte-identical');
  assert.equal(await readFile(join(temp,'node_modules','dsh-stream-retry','index.js'),'utf8'),'throw new Error("legacy feature code must not execute during migration");');
});

for(const concurrentEdit of [false,true]) test('packed public API durable interruption '+(concurrentEdit?'protects concurrent edit':'retries idempotently'),{timeout:180000},async t=>{
  const name='dsh-extras-retry';const {temp,script}=await consumer(t,name);
  await migrationProfile(temp,name);
  const before=await inputs(temp);
  succeeds(publicAPI(temp,name,'await assert.rejects(api.runMigration(host,target,{checkpoint:stage=>{if(stage==="after-journal")throw new Error("test-durable-interruption");}}),/test-durable-interruption/);'),'public API checkpoint interrupts after durable journal');
  const saved=await journal(temp);const backup=await readFile(saved.value.backup,'utf8');
  assert.equal(await readFile(join(temp,'cordis.patch.yml'),'utf8'),before.patch,'no target write before interrupted durable preparation');
  assert.equal(await readFile(join(temp,'package.json'),'utf8'),before.manifest);
  if(concurrentEdit) {
    const changed='# unrelated edit after interruption\n'+before.patch;
    await writeFile(join(temp,'cordis.patch.yml'),changed);
    const result=run(temp,process.execPath,[script,'retry',...flags(temp,name)]);
    assert.equal(result.status,1);assert.match(result.stderr,/Migration refused or failed/);
    assert.equal(await readFile(join(temp,'cordis.patch.yml'),'utf8'),changed,'retry refuses to replay over concurrent profile bytes');
    assert.equal(await readFile(join(temp,'package.json'),'utf8'),before.manifest,'legacy remains selected');
  } else {
    const first=JSON.parse(succeeds(run(temp,process.execPath,[script,'retry',...flags(temp,name)]),'retry interrupted public operation'));
    const patch=await readFile(join(temp,'cordis.patch.yml'),'utf8');
    const second=JSON.parse(succeeds(run(temp,process.execPath,[script,'retry',...flags(temp,name)]),'repeat resumed operation'));
    assert.equal(first.operationId,saved.value.operationId);assert.equal(second.operationId,first.operationId);
    assert.equal(first.modules.retry.phase,'restart-required');
    assert.equal(await readFile(join(temp,'cordis.patch.yml'),'utf8'),patch);
    assert.equal(JSON.parse(await readFile(join(temp,'package.json'),'utf8')).dsh.profile.bundles.includes('dsh-stream-retry'),false);
  }
  assert.equal((await journal(temp)).value.operationId,saved.value.operationId);
  assert.equal(await readFile(saved.value.backup,'utf8'),backup,'failure/retry retains original backup');
});
