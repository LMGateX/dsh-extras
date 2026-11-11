import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, mkdir, readdir, symlink, writeFile, realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {verifyPublicTypes} from './public-types-consumer.mjs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {distributions} from '../../scripts/distributions.mjs';
const root = resolve(import.meta.dirname, '../..');
const version = JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const artifactDir = join(root,'artifacts');
assert.equal(distributions.length, 6, '0.6.0-rc.1 delivers combined plus five independent splits');
assert.equal(version, '0.6.0-rc.1');
const checksums = new Map((await readFile(join(artifactDir,'SHA256SUMS'),'utf8')).trim().split('\n').map(line => line.split('  ').reverse()));
const hostRequire = createRequire(createRequire(join(root,'package.json')).resolve('@deepseek-ai/dsh/package.json'));
for(const {name,modules} of distributions) test('packed installable distribution: '+name,{timeout:120000},async t=>{
  const archive=join(artifactDir,name+'-'+version+'.tgz');
  assert.equal(createHash('sha256').update(await readFile(archive)).digest('hex'),checksums.get(name+'-'+version+'.tgz'));
  const temp=await mkdtemp(join(tmpdir(),'ex-package-'));
  t.after(async()=>{assert.ok(temp.startsWith(join(tmpdir(),'ex-package-')));await rm(temp,{recursive:true,force:true});});
  await writeFile(join(temp,'package.json'),JSON.stringify({name:'extras-clean-consumer',private:true,type:'module'}));
  // Use npm itself, not source imports. Optional host peers must not install a second runtime.
  execFileSync('npm',['install','--ignore-scripts','--omit=optional','--no-audit','--no-fund',archive],{cwd:temp,stdio:'pipe',timeout:90000,env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home'),npm_config_cache:join(temp,'npm-cache')}});
  const packageDir=join(temp,'node_modules',name);
  const pkg=JSON.parse(await readFile(join(packageDir,'package.json'),'utf8'));
  assert.equal(pkg.version,version);assert.equal(pkg.name,name);assert.equal(pkg.private,undefined);
  const readme = await readFile(join(packageDir,'README.md'),'utf8');
  assert.match(readme, /Source-built preview/);
  assert.ok(readme.includes('ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c'));
  assert.ok(readme.includes('not certification of unobserved npm rc.2 bytes'));
  assert.equal(pkg.engines.dsh,'0.2.2-rc.2');assert.equal(pkg.dsh.client.platform,'web');
  assert.equal(pkg.dsh.client.platforms,undefined);assert.equal(pkg.dsh.bundle.patch,'cordis.patch.yml');
  assert.equal(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-api-session-controller'), modules.includes('retry') || modules.includes('chime'), 'selected session-controller dependency does not depend on chime transitively');
  assert.equal(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-api-workspace-controller'), modules.includes('model-policy') || modules.includes('compact-context'), 'native workspace discovery dependency belongs only to workspace settings distributions');
  const patch=await readFile(join(packageDir,'cordis.patch.yml'),'utf8');assert.ok(patch.includes('id: '+name));
  const listing=execFileSync('tar',['-tzf',archive],{encoding:'utf8'}).split('\n');
  assert.ok(!listing.some(file=>file.includes('node_modules/')||file.includes('.dsh-extras/')||file.includes('.env')));
  const server=await readFile(join(packageDir,'lib/index.js'),'utf8');
  const browser=await readFile(join(packageDir,'lib/client.js'),'utf8');
  assert.ok(browser.includes(name));assert.ok(browser.includes('__ModuleLoader__'));
  const browserMap=JSON.parse(await readFile(join(packageDir,'lib/client.js.map'),'utf8'));
  assert.equal(browserMap.sources.some(path=>path.endsWith('/client/request-recovery.ts')),modules.includes('retry'),'recovery adapter ships only with selected retry');
  assert.equal(browserMap.sources.some(path=>path.endsWith('/client/workspace-settings.ts')),modules.includes('model-policy') || modules.includes('compact-context'),'workspace discovery and picker never leak into unrelated split payloads');
  for(const id of ['compact-context','retry','chime','goalWait','model-policy']) {
    const notice=listing.some(file=>file==='package/notices/'+id+'.txt');
    assert.equal(notice,modules.includes(id),'selected feature notice '+id);
  }
  assert.equal(listing.some(file=>file.endsWith('/chime-soft.wav')),modules.includes('chime'));
  if(!modules.includes('chime')) {assert.ok(!browser.includes('data:audio/wav'));assert.ok(!browser.includes('AudioContext'));}
  if(!modules.includes('compact-context'))assert.ok(!server.includes('function selectNativeRetentionRange'));
  if(!modules.includes('goalWait'))assert.ok(!server.includes('class GoalWaitGate'));
  assert.ok(!listing.some(file=>file.startsWith('package/node_modules/@deepseek-ai/dsh/')));
  // Host imports resolve against one anchored runtime in the isolated consumer, as DSH does.
  const imports=[...server.matchAll(/from ["'](@deepseek-ai\/[^"']+)["']/g)].map(match=>match[1]);
  await mkdir(join(temp,'node_modules','@deepseek-ai'),{recursive:true});
  for(const spec of new Set([...imports, ...Object.keys(pkg.peerDependencies)])) {
    const dir=join(temp,'node_modules',spec);
    assert.ok(dir.startsWith(join(temp,'node_modules','@deepseek-ai') + '/'));
    await rm(dir,{recursive:true,force:true});
    const anchor=resolve(hostRequire.resolve(spec+'/package.json'),'..');
    await symlink(anchor,dir,'dir');
    assert.equal(await realpath(dir),await realpath(anchor),'one native host runtime for '+spec);
  }
  await verifyPublicTypes(temp,name,modules);
  const entry=await import(pathToFileURL(join(packageDir,'lib/index.js')).href);
  assert.equal(entry.name,name);assert.equal(typeof entry.apply,'function');
  assert.deepEqual(Object.keys(entry).sort(),['Config','apply','inject','name']);
  const consumerRequire=createRequire(join(temp,'package.json'));
  assert.throws(()=>consumerRequire.resolve(name+'/client-types'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  assert.throws(()=>consumerRequire.resolve(name+'/locale'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
  execFileSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const root=await import(${JSON.stringify(name)});
    assert.deepEqual(Object.keys(root).sort(),['Config','apply','inject','name']);
    assert.equal(root.name,${JSON.stringify(name)});
    const migration=await import(${JSON.stringify(name+'/migration')});
    assert.equal(typeof migration.inspectMigration,'function');
    let registration;
    globalThis.window={__ModuleLoader__:{load(value){registration=value;}}};
    const client=await import(${JSON.stringify(name+'/client')});
    assert.deepEqual(Object.keys(client),[]);
    assert.equal(registration.id,root.name);
    assert.equal(typeof registration.factory,'function');
  `],{cwd:temp,encoding:'utf8',stdio:'pipe',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')},timeout:30000});
  assert.deepEqual(Object.keys(entry.Config.dict.modules.dict),modules);
  assert.equal(Object.hasOwn(entry.Config.dict.modules.dict, 'context'), false, 'no old configuration alias in packed exports');
  assert.ok(!listing.includes('package/notices/context.txt'), 'no old feature notice alias');
  assert.ok(!server.includes('extras-context'), 'no old owned plugin identity');
  if (modules.includes('compact-context')) {
    assert.ok(server.includes('extras-compact-context'));
    assert.ok(server.includes('compact_context') && server.includes('context_status'), 'canonical native tool names survive packaging');
    const resolved = entry.Config({modules: {'compact-context': {enabled: false, retryAttempts: 0}}});
    assert.equal(resolved.modules['compact-context'].enabled.get(), false);
    assert.equal(resolved.modules['compact-context'].retryAttempts.get(), 0);
    assert.deepEqual(entry.Config({}).modules['compact-context'].compactionReasoning.get(), {enabled:false,rules:[{scope:'all',mode:'inherit'}]}, 'packed defaults keep request reasoning disabled and tool-independent');
  }
  if (modules.includes('model-policy')) {
    const defaults = entry.Config({}).modules['model-policy'];
    assert.equal(defaults.enabled.get(), false, 'new capability never auto-enables');
    assert.ok(defaults.root.get() == null, 'native omitted nullable default retains inherit');
    assert.ok(defaults.descendants.get() == null, 'native omitted nullable default retains inherit');
    const explicitNull = entry.Config({modules:{'model-policy':{root:null,descendants:null}}}).modules['model-policy'];
    assert.equal(explicitNull.root.get(),null);
    assert.equal(explicitNull.descendants.get(),null);
    assert.deepEqual(defaults.workspaceOverrides.get(), []);
    assert.equal(entry.Config({modules:{'model-policy':{enabled:true}}}).modules['model-policy'].enabled.get(), true);
  }
  for (const bundle of ['index.js','migration.js','migrate.js']) {
    const map = JSON.parse(await readFile(join(packageDir, 'lib', bundle + '.map'), 'utf8'));
    for (const [id,directory] of Object.entries({'compact-context':'compact-context',retry:'retry',chime:'chime',goalWait:'goal-wait','model-policy':'model-policy'})) {
      if (!modules.includes(id)) assert.ok(!map.sources.some(source => source.includes('/modules/' + directory + '/') && !source.endsWith('/reasoning-policy.ts')), name + '/' + bundle + ' excludes ' + id);
    }
  }
  const migration=await import(pathToFileURL(join(packageDir,'lib/migration.js')).href);
  assert.deepEqual(migration.MODULE_IDS, ['compact-context','retry','chime','goalWait','model-policy']);
  assert.deepEqual(migration.LEGACY_MODULE_IDS, ['compact-context','retry','chime','goalWait']);
  assert.equal(Object.hasOwn(migration.LEGACY_DEFAULTS,'model-policy'), false);
  if (modules.includes('model-policy')) {
    const input = {profileId:'packed-fixture',profile:{dir:temp,patchPath:join(temp,'profile.patch.yml'),home:temp,installAnchor:join(temp,'package.json')},revision:'one',manifest:{},patchText:'[]',manifestText:'{}',rows:[],sources:[],target:{rowId:name,moduleIds:['model-policy']},explicit:{},peers:{},problems:[],legacyMode:false};
    assert.deepEqual(migration.planMigration(input).decisions.map(({phase,enabled,config}) => ({phase,enabled,config})), [{phase:'fresh',enabled:false,config:{enabled:false}}]);
    input.explicit['model-policy']={enabled:true,root:null,workspaceOverrides:[]};
    assert.equal(migration.planMigration(input).decisions[0].enabled,true);
  }
  const reasoningSelected = modules.includes('compact-context') || modules.includes('model-policy');
  assert.equal(Boolean(pkg.peerDependencies['@deepseek-ai/dsh-storage-domain']), reasoningSelected, 'new shared storage peer follows selected shared implementation');
  if (modules.includes('retry') || modules.includes('model-policy')) assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'));
  assert.equal(typeof migration.startAutomaticMigration,'function');
  const help=execFileSync(process.execPath,[join(packageDir,'lib/migrate.js'),'--help'],{encoding:'utf8',env:{...process.env,HOME:temp,DSH_HOME:join(temp,'dsh-home')}});
  assert.ok(help.includes('profile')&&help.includes('inspect'));
  assert.ok(help.includes('--modules compact-context,retry,chime,goalWait'));
  assert.ok(!help.includes('--modules context,'));
});

test('packed server imports declare every external host dependency', () => {
  for (const {name} of distributions) {
    const archive = join(artifactDir, name + '-' + version + '.tgz');
    const pkg = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], {encoding:'utf8'}));
    const server = execFileSync('tar', ['-xOf', archive, 'package/lib/index.js'], {encoding:'utf8'});
    for (const match of server.matchAll(/from ["'](@deepseek-ai\/[^"']+)["']/g)) {
      const dependency = match[1].split('/').slice(0, 2).join('/');
      assert.ok(pkg.dependencies?.[dependency] || pkg.peerDependencies?.[dependency], name + ' must declare ' + dependency);
    }
  }
});
