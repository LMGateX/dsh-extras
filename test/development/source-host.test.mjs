import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, cp, rm, readFile, realpath, stat, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const root = resolve(import.meta.dirname, '../..');
const cli = join(root, 'scripts/native-host.mjs');
const source = process.env.DSH_EXTRAS_SOURCE_HOST ?? JSON.parse(await readFile(join(root,'node_modules/.dsh-extras-source-host.json'),'utf8').catch(()=>'{}')).source;
async function consumer(run) {
  const sandbox = await mkdtemp(join(tmpdir(), 'extras-source-host-'));
  const env = {...process.env, HOME:join(sandbox,'home'), DSH_HOME:join(sandbox,'dsh'), DSH_PROFILE:'isolated', XDG_CONFIG_HOME:join(sandbox,'config'), XDG_CACHE_HOME:join(sandbox,'cache'), XDG_DATA_HOME:join(sandbox,'data'), TMPDIR:sandbox, npm_config_cache:join(sandbox,'npm')};
  for (const key of ['HOME','DSH_HOME','XDG_CONFIG_HOME','XDG_CACHE_HOME','XDG_DATA_HOME','npm_config_cache']) await mkdir(env[key], {recursive:true});
  const cwd = join(sandbox, 'consumer'); await mkdir(cwd);
  await cp(join(root,'package.json'),join(cwd,'package.json'));
  const invoke = (...args) => spawnSync(process.execPath,[cli,...args],{cwd,env,encoding:'utf8'});
  try {await run({cwd,env,invoke,sandbox});} finally {await rm(sandbox,{recursive:true,force:true});}
}

test('public host check refuses unprovisioned consumers without ancestor host discovery', async () => {
  await consumer(async ({invoke}) => {
    const result = invoke('check');
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Source host is not provisioned.*host:link/s);
  });
});

test('explicit public CLI links one audited graph and reruns without mutation',async()=>{
  assert.ok(source,'Run host:link first, or supply DSH_EXTRAS_SOURCE_HOST for provisioning tests.');
  await consumer(async({cwd,invoke})=>{
    // Public consumer fixture: equal audited registry-library identities, not a native host.
    for(const name of ['schemastery','cosmokit']) {
      const installed=join(cwd,'node_modules/@deepseek-ai',name); await mkdir(installed,{recursive:true});
      await cp(join(source,'vendor',name,'package.json'),join(installed,'package.json'));
      await writeFile(join(installed,'registry-marker'),'preserve this consumer library');
    }
    const linked=invoke('link',source); assert.equal(linked.status,0,linked.stderr);
    for(const [name,version] of [['schemastery','3.19.0'],['cosmokit','1.9.0']])assert.equal(await readFile(join(cwd,'node_modules','.dsh-extras-registry-'+name+'-'+version,'registry-marker'),'utf8'),'preserve this consumer library');
    const receipt=join(cwd,'node_modules/.dsh-extras-source-host.json');
    const before=await stat(receipt);
    const checked=invoke('check'); assert.equal(checked.status,0,checked.stderr);
    const identity=JSON.parse(checked.stdout); assert.equal(identity.commit,'ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c');
    assert.equal(identity.driverSha256,'8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c');
    const consumer=createRequire(join(cwd,'package.json')),host=createRequire(join(source,'apps/cli/package.json'));
    for(const name of ['cordis','schemastery','cosmokit','dsh-agent','dsh-goal-round-driver'])assert.equal(await realpath(consumer.resolve('@deepseek-ai/'+name+'/package.json')),await realpath(host.resolve('@deepseek-ai/'+name+'/package.json')));
    assert.equal(consumer('@deepseek-ai/cordis').Context,host('@deepseek-ai/cordis').Context);
    const again=invoke('link',source); assert.equal(again.status,0,again.stderr); assert.equal((await stat(receipt)).mtimeMs,before.mtimeMs);
  });
});

test('public link refuses wrong source and foreign Cordis without changing consumer contents',async()=>{
  await consumer(async({cwd,invoke,sandbox})=>{
    const wrong=invoke('link',sandbox); assert.notEqual(wrong.status,0);
    await assert.rejects(stat(join(cwd,'node_modules')), {code:'ENOENT'});
    const foreign=join(cwd,'node_modules/@deepseek-ai/cordis'); await mkdir(foreign,{recursive:true});
    await cp(join(source,'vendor/cordis/package.json'),join(foreign,'package.json'));
    const result=invoke('link',source); assert.notEqual(result.status,0); assert.match(result.stderr,/Foreign native identity/);
    assert.equal((await stat(foreign)).isSymbolicLink(),false);
    await assert.rejects(stat(join(cwd,'node_modules/.dsh-extras-source-host.json')), {code:'ENOENT'});
    await assert.rejects(stat(join(cwd,'node_modules/@deepseek-ai/dsh')), {code:'ENOENT'});
  });
});

test('public check accepts borrowed complete graph without binding consumer cwd',async()=>{
  await consumer(async({cwd,invoke,sandbox})=>{
    const borrowed=join(sandbox,'borrowed');await mkdir(borrowed);
    const linked=invoke('link',source);assert.equal(linked.status,0,linked.stderr);
    const {symlink}=await import('node:fs/promises');
    await symlink(join(cwd,'node_modules'),join(borrowed,'node_modules'),'dir');
    const result=spawnSync(process.execPath,[cli,'check'],{cwd:borrowed,env:{...process.env,HOME:join(sandbox,'home'),DSH_HOME:join(sandbox,'dsh'),DSH_PROFILE:'isolated',XDG_CONFIG_HOME:join(sandbox,'config'),XDG_CACHE_HOME:join(sandbox,'cache'),XDG_DATA_HOME:join(sandbox,'data'),TMPDIR:sandbox},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
  });
});
