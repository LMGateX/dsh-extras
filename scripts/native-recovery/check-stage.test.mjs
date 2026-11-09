import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {appendFile,cp,copyFile,mkdir,mkdtemp,readFile,symlink,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));const prefix=process.env.DSH_NATIVE_RECOVERY_PREFIX;
assert.ok(prefix?.startsWith('/tmp/dsh-native-recovery-stage-'),'set DSH_NATIVE_RECOVERY_PREFIX to an actual isolated candidate stage');
const manifest=JSON.parse(await readFile(join(prefix,'manifest.json'),'utf8'));
const run=(script,args,env={})=>spawnSync(process.execPath,[join(here,script),...args],{encoding:'utf8',timeout:30000,env:{...process.env,...env}});
test('complete isolated graph preserves stock bytes and exposes genuine emitted public Agent recovery',()=>{
 const result=run('verify.mjs',[prefix]);assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);assert.equal(report.official,false);assert.equal(report.verified.length,5);assert.equal(report.graph.externalSymlinks,0);
 assert.equal(report.publicAgent.requests,2);assert.equal(report.publicAgent.modelVisibleMessagesAdded,0);assert.equal(report.publicAgent.duplicate,'same receipt, no extra dispatch');
 assert.equal(new Set(report.publicAgent.identities.map(item=>item.cordis)).size,1);
 assert.equal(report.unchanged.find(item=>item.name==='@deepseek-ai/dsh-goal-round-driver').sha256,'1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de');
});
test('stager rejects an official-release claim before copying or invoking the baseline',async()=>{
 const fixture=await mkdtemp('/tmp/dsh-candidate-invalid-manifest-');await writeFile(join(fixture,'manifest.json'),JSON.stringify({...manifest.candidateManifest,official:true}));
 const result=run('stage.mjs',[fixture,manifest.sourceHost]);assert.notEqual(result.status,0);assert.match(result.stderr,/candidate must be explicitly unofficial/);
});
test('stager rejects altered archive bytes before extraction or copying the baseline',async()=>{
 const fixture=await mkdtemp('/tmp/dsh-candidate-invalid-archive-');await writeFile(join(fixture,'manifest.json'),JSON.stringify(manifest.candidateManifest));
 const entry=manifest.candidateManifest.packages[0];const bytes=await readFile(join(manifest.candidateRoot,entry.file));bytes[30]^=1;await writeFile(join(fixture,entry.file),bytes);
 const result=run('stage.mjs',[fixture,manifest.sourceHost]);assert.notEqual(result.status,0);assert.match(result.stderr,/archive digest: @deepseek-ai\/dsh-agent/);
});
async function minimalFixture(){
 const fixture=await mkdtemp('/tmp/dsh-native-recovery-stage-test-');const host=join(fixture,'node_modules/@deepseek-ai/dsh');await mkdir(host,{recursive:true});
 await copyFile(manifest.anchor,join(host,'package.json'));
 for(const entry of manifest.candidateManifest.packages){const target=join(host,'node_modules',entry.name);await mkdir(dirname(target),{recursive:true});await cp(join(manifest.host,'node_modules',entry.name),target,{recursive:true});}
 await writeFile(join(fixture,'manifest.json'),JSON.stringify({...manifest,prefix:fixture,host,anchor:join(host,'package.json')}));return {fixture,host};
}
test('verifier refuses a drifted emitted owner instead of trusting candidate metadata',async()=>{
 const {fixture,host}=await minimalFixture();await appendFile(join(host,'node_modules/@deepseek-ai/dsh-agent/lib/index.js'),'\n// fixture drift\n');
 const result=run('verify.mjs',[fixture]);assert.notEqual(result.status,0);assert.match(result.stderr,/candidate emitted runtime drift: @deepseek-ai\/dsh-agent/);
});
test('verifier refuses dependency symlinks back to the real installation',async()=>{
 const {fixture,host}=await minimalFixture();await symlink(manifest.sourceHost,join(host,'forbidden-source-link'));
 const result=run('verify.mjs',[fixture]);assert.notEqual(result.status,0);assert.match(result.stderr,/external dependency symlink/);
});
