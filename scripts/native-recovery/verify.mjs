#!/usr/bin/env node
/** Recheck staged bytes and run a public emitted Agent probe in fresh disposable homes. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {lstat,mkdtemp,readFile,readdir,realpath,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {auditGraph,readCandidate,sha256,PACKAGE_NAMES} from './stage.mjs';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const prefix=await realpath(resolve(process.argv[2]??''));assert.ok(process.argv[2]&&prefix.startsWith('/tmp/dsh-native-recovery-stage-'),'only an isolated /tmp candidate stage can be verified');
const manifest=await json(join(prefix,'manifest.json'));const host=await realpath(manifest.host);assert.ok(host.startsWith(prefix+'/'));
assert.equal(manifest.official,false);assert.equal(manifest.implementationCommit,'2121312aacce481d2970ae582fdfc9a3056039ca');
const {manifest:candidate}=await readCandidate(manifest.candidateRoot);assert.deepEqual(candidate,manifest.candidateManifest);
const graph=await auditGraph(host);const requireHost=createRequire(join(host,'package.json'));
const verified=[];
for(const entry of candidate.packages){
 const dir=join(host,'node_modules',entry.name);assert.equal(await realpath(dir),dir);
 const metadata=await json(join(dir,'package.json'));assert.equal(metadata.name,entry.name);assert.equal(metadata.version,candidate.version);assert.equal(metadata.private,true);assert.equal(metadata.dshNativeRecovery?.official,false);assert.equal(metadata.dshNativeRecovery?.sourceCommit,manifest.implementationCommit);assert.equal(metadata.dshNativeRecovery?.protocol,candidate.protocol);
 for(const group of ['dependencies','peerDependencies','optionalDependencies'])for(const [name,version] of Object.entries(metadata[group]??{}))if(PACKAGE_NAMES.includes(name))assert.equal(version,candidate.version);
 const runtime=await realpath(requireHost.resolve(entry.name));assert.equal(runtime,join(dir,'lib/index.js'));assert.equal(sha256(await readFile(runtime)),entry.indexSha256,'candidate emitted runtime drift: '+entry.name);
 const original=join(manifest.sourceHost,'node_modules',entry.name,'lib/index.js');const [a,b]=await Promise.all([lstat(original),lstat(runtime)]);assert.ok(a.dev!==b.dev||a.ino!==b.ino,'stage must not hardlink modified candidate owner to original');
 verified.push({name:entry.name,version:metadata.version,runtime,indexSha256:entry.indexSha256,archiveSha256:entry.sha256,independentInode:true});
}
const unchanged=[];
for(const before of manifest.baseline){
 assert.equal(sha256(await readFile(before.path)),before.sha256,'original host changed: '+before.name);
 if(PACKAGE_NAMES.includes(before.name))continue;
 const path=before.name==='@deepseek-ai/dsh'?join(host,'lib/bin.js'):join(host,'node_modules',before.name,'lib/index.js');
 assert.equal(sha256(await readFile(path)),before.sha256,'unchanged stock runtime drift: '+before.name);
 const metadata=await json(before.name==='@deepseek-ai/dsh'?join(host,'package.json'):join(host,'node_modules',before.name,'package.json'));
 assert.equal(metadata.version,before.version);if(before.name==='@deepseek-ai/cordis')assert.equal(metadata.version,'4.1.0');else assert.equal(metadata.version,'0.2.2-rc.1');
 unchanged.push({name:before.name,version:metadata.version,sha256:before.sha256});
}
assert.equal(unchanged.find(p=>p.name==='@deepseek-ai/dsh-goal-round-driver').sha256,'1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de');
const originalMetadata=await json(join(manifest.sourceHost,'package.json'));assert.equal(sha256(await readFile(join(manifest.sourceHost,'package.json'))),manifest.rootBaseline.packageSha256);
const stagedMetadata=await json(join(host,'package.json'));assert.equal(stagedMetadata.dshExtrasNativeRecovery.official,false);assert.equal(stagedMetadata.dshExtrasNativeRecovery.implementationCommit,manifest.implementationCommit);delete stagedMetadata.dshExtrasNativeRecovery;assert.deepEqual(stagedMetadata,originalMetadata,'only explicit root adaptation provenance may change');
async function treeHash(dir){const hash=createHash('sha256');async function visit(base,relative=''){for(const item of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const rel=relative+'/'+item.name;const path=join(base,item.name);if(item.isDirectory())await visit(path,rel);else{assert.ok(item.isFile(),'unexpected link in unchanged driver');hash.update(rel+'\0');hash.update(await readFile(path));}}}await visit(dir);return hash.digest('hex');}
const driverName='@deepseek-ai/dsh-goal-round-driver';const driverTree=await treeHash(join(host,'node_modules',driverName));assert.equal(driverTree,await treeHash(join(manifest.sourceHost,'node_modules',driverName)),'entire unchanged stock driver payload');
const fixture=await mkdtemp('/tmp/dsh-native-candidate-verify-');const env={...process.env,HOME:join(fixture,'home'),DSH_HOME:join(fixture,'dsh'),npm_config_cache:join(fixture,'npm-cache'),XDG_CACHE_HOME:join(fixture,'cache')};
const version=spawnSync(process.execPath,[manifest.wrapper,'--version'],{env,encoding:'utf8',timeout:30000});assert.equal(version.status,0,version.stderr);assert.match(version.stderr,/UNOFFICIAL.*native-recovery/);assert.equal(version.stdout.trim(),'0.2.2-rc.1');
for(const args of [['--version','--port','3080'],['--version','--port=3080'],['web']]){const denied=spawnSync(process.execPath,[manifest.wrapper,...args],{env,encoding:'utf8',timeout:30000});assert.notEqual(denied.status,0);assert.match(denied.stderr,/must not be 3080|requires explicit --port/);}
const refused=spawnSync(process.execPath,[manifest.wrapper,'--version'],{env:{...env,HOME:'/not-a-disposable-home'},encoding:'utf8',timeout:30000});assert.notEqual(refused.status,0);assert.match(refused.stderr,/HOME must explicitly name a disposable/);
const probe=spawnSync(process.execPath,[join(dirname(fileURLToPath(import.meta.url)),'probe-agent.mjs'),join(host,'package.json')],{env,encoding:'utf8',timeout:30000});assert.equal(probe.status,0,probe.stderr);const publicAgent=JSON.parse(probe.stdout);
const report={schemaVersion:1,official:false,status:'isolated-staging-and-public-agent-verified-not-production-approved',implementationCommit:manifest.implementationCommit,prefix,anchor:join(host,'package.json'),graph,verified,unchanged,stockGoalRoundDriverTreeSha256:driverTree,wrapper:'unofficial warning, baseline version retained, real homes/3080/implicit application ports refused',publicAgent,remainingGates:['real Extras HTTP owner/origin admission','real packed browser acceptance','external allNativeWakeAdmission intent compatibility','production authorization and backup/rollback']};
await writeFile(join(prefix,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
