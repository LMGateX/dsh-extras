import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile, realpath} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {distributions} from '../../scripts/distributions.mjs';

const root = resolve(import.meta.dirname, '../..');
const version = process.env.DSH_EXTRAS_TEST_ARCHIVE_VERSION ?? JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
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
async function consumer(t, name) {
  // Explicit /tmp storage, never a repository/host descendant. No peers are linked.
  const temp = await mkdtemp(join(tmpdir(),'extras-standalone-cli-'));
  assert.ok(!temp.startsWith(root+'/'));
  t.after(async()=>{assert.ok(temp.startsWith(join(tmpdir(),'extras-standalone-cli-')));await rm(temp,{recursive:true,force:true});});
  for(const dir of ['home','dsh-home','tmp']) await mkdir(join(temp,dir));
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
  for(const [command,args] of [[process.execPath,[script,'--help']],[bin,['--help']]]) {
    const output=succeeds(run(temp,command,args),'standalone --help must start without host peers');
    assert.match(output,/inspect\|dry-run\|apply\|retry\|rollback/);
    assert.match(output,/--profile-dir DIR/);
  }
  assert.deepEqual({home:await snapshot(join(temp,'home')),dsh:await snapshot(join(temp,'dsh-home'))},before,'help creates no profile or journal state');
});
