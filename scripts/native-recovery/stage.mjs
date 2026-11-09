#!/usr/bin/env node
/** Offline, unofficial candidate overlay. Never installs packages or touches the source host. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile} from 'node:fs/promises';
import {basename, dirname, isAbsolute, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const PACKAGE_NAMES=['dsh-agent','dsh-agent-loop','dsh-session','dsh-llm-retry','dsh-goal'].map(name=>'@deepseek-ai/'+name);
const VERSION='0.2.2-rc.1-native-recovery.0';
const IMPLEMENTATION='2121312aacce481d2970ae582fdfc9a3056039ca';
const STOCK_DRIVER_SHA='1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async path=>JSON.parse(await readFile(path,'utf8'));
const within=(path,root)=>path.startsWith(root+sep);
const packageDir=(host,name)=>join(host,'node_modules',name);
async function fingerprint(host,name) {
 const dir=name==='@deepseek-ai/dsh'?host:packageDir(host,name);
 const metadata=await json(join(dir,'package.json'));
 const path=join(dir,name==='@deepseek-ai/dsh'?'lib/bin.js':'lib/index.js');
 return {name,version:metadata.version,path,realpath:await realpath(path),sha256:sha256(await readFile(path))};
}
export async function auditGraph(host) {
 const root=await realpath(host);let files=0,symlinks=0;
 async function visit(dir){for(const item of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,item.name);
  if(item.isSymbolicLink()){symlinks++;const target=await realpath(path);assert.ok(within(target,root),'external dependency symlink: '+path+' -> '+target);}
  else if(item.isDirectory())await visit(path);else if(item.isFile())files++;
 }}
 await visit(root);return {files,symlinks,externalSymlinks:0};
}
export async function readCandidate(candidate) {
 const root=await realpath(candidate);const manifest=await json(join(root,'manifest.json'));
 assert.equal(manifest.official,false,'candidate must be explicitly unofficial');
 assert.equal(manifest.version,VERSION);assert.equal(manifest.implementationCommit,IMPLEMENTATION);
 assert.equal(manifest.protocol,'dsh.request-recovery.v1');
 assert.equal(manifest.snapshotLifetime,'process-local');
 assert.equal(manifest.compatibility?.stockReadsCandidateLogs,false);assert.equal(manifest.compatibility?.profileIsolationRequired,true);assert.equal(manifest.compatibility?.goalRoundDriverChanged,false);
 assert.deepEqual(manifest.packages.map(p=>p.name).sort(),[...PACKAGE_NAMES].sort(),'exact five candidate owners required');
 for(const entry of manifest.packages){
  assert.equal(entry.version,VERSION);assert.equal(entry.file,basename(entry.file));assert.ok(entry.file.endsWith(VERSION+'.tgz'));
  const file=join(root,entry.file);assert.ok((await lstat(file)).isFile(),'archive must not be a symlink');
  const bytes=await readFile(file);assert.equal(bytes.length,entry.bytes);assert.equal(sha256(bytes),entry.sha256,'archive digest: '+entry.name);
  assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),entry.integrity);
  const names=execFileSync('tar',['-tzf',file],{encoding:'utf8'}).trim().split('\n');
  assert.ok(names.every(name=>name.startsWith('package/')&&!name.split('/').includes('..')&&!isAbsolute(name)),'unsafe archive member');
  const listing=execFileSync('tar',['-tvzf',file],{encoding:'utf8'}).trim().split('\n');
  assert.ok(listing.every(line=>line[0]==='-'||line[0]==='d'),'candidate archives must not contain links or special files');
 }
 return {root,manifest};
}
export async function stageCandidate(candidate,source) {
 const {root:candidateRoot,manifest:candidateManifest}=await readCandidate(candidate);
 const sourceHost=await realpath(source);const sourceMetadata=await json(join(sourceHost,'package.json'));
 assert.equal(sourceMetadata.name,'@deepseek-ai/dsh');assert.equal(sourceMetadata.version,'0.2.2-rc.1');assert.equal(sourceMetadata.dshExtrasNativeRecovery,undefined,'source must be the read-only stock baseline, not a previous adaptation');
 const sourceAudit=await auditGraph(sourceHost);
 const baselineNames=['@deepseek-ai/dsh',...PACKAGE_NAMES,'@deepseek-ai/dsh-goal-round-driver','@deepseek-ai/cordis','@deepseek-ai/dsh-llm','@deepseek-ai/dsh-compaction-basic'];
 const baseline=await Promise.all(baselineNames.map(name=>fingerprint(sourceHost,name)));
 for(const entry of baseline)assert.equal(entry.version,entry.name==='@deepseek-ai/cordis'?'4.1.0':'0.2.2-rc.1','stock baseline version: '+entry.name);
 assert.equal(baseline.find(p=>p.name==='@deepseek-ai/dsh-goal-round-driver').sha256,STOCK_DRIVER_SHA,'do not stage a modified stock Goal driver');
 const prefix=await mkdtemp(join(await realpath('/tmp'),'dsh-native-recovery-stage-'));
 const host=join(prefix,'node_modules/@deepseek-ai/dsh');await mkdir(dirname(host),{recursive:true});
 console.error('Copying independent baseline graph to '+host);
 execFileSync('cp',['-a','--reflink=auto','--',sourceHost,host],{stdio:'inherit'});
 await auditGraph(host);
 for(const entry of candidateManifest.packages){
  const unpack=join(prefix,'unpack',entry.name.split('/')[1]);await mkdir(unpack,{recursive:true});
  execFileSync('tar',['-xzf',join(candidateRoot,entry.file),'-C',unpack,'--no-same-owner','--no-same-permissions']);
  const incoming=join(unpack,'package');const metadata=await json(join(incoming,'package.json'));
  assert.equal(metadata.name,entry.name);assert.equal(metadata.version,VERSION);assert.equal(metadata.private,true);assert.equal(metadata.dshNativeRecovery?.official,false);assert.equal(metadata.dshNativeRecovery?.sourceCommit,IMPLEMENTATION);assert.equal(metadata.dshNativeRecovery?.protocol,candidateManifest.protocol);
  assert.equal(sha256(await readFile(join(incoming,'lib/index.js'))),entry.indexSha256,'emitted runtime digest: '+entry.name);
  for(const field of ['dependencies','peerDependencies','optionalDependencies'])for(const [name,version] of Object.entries(metadata[field]??{}))if(PACKAGE_NAMES.includes(name))assert.equal(version,VERSION,'mixed candidate owner: '+name);
  const target=packageDir(host,entry.name);
  assert.ok(within(target,host));assert.equal(await realpath(target),target,'changed package must not be a symlink');assert.ok((await lstat(target)).isDirectory());
  // The resolved removal target was verified above and belongs exclusively to this newly created stage.
  await rm(target,{recursive:true});await cp(incoming,target,{recursive:true});
 }
 const metadataPath=join(host,'package.json');const rootMetadata=await json(metadataPath);
 const provenance={official:false,status:'independent-offline-candidate-not-production-approved',version:VERSION,sourceTag:candidateManifest.sourceTag,baselineCommit:candidateManifest.baselineCommit,implementationCommit:IMPLEMENTATION,protocol:candidateManifest.protocol,snapshotLifetime:'process-local',stockGoalRoundDriverSha256:STOCK_DRIVER_SHA};
 rootMetadata.dshExtrasNativeRecovery=provenance;
 await writeFile(metadataPath,JSON.stringify(rootMetadata,null,2)+'\n');
 const manifest={schemaVersion:1,...provenance,prefix,host,anchor:metadataPath,wrapper:join(prefix,'bin/dsh-unofficial.mjs'),sourceHost,candidateRoot,sourceAudit,baseline,candidateManifest,rootBaseline:{version:sourceMetadata.version,packageSha256:sha256(await readFile(join(sourceHost,'package.json')))},graph:await auditGraph(host)};
 await writeFile(join(prefix,'package.json'),JSON.stringify({name:'dsh-extras-unofficial-native-recovery-stage',private:true,version:VERSION,type:'module',dshExtrasNativeRecovery:provenance},null,2)+'\n');
 await writeFile(join(prefix,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(join(prefix,'candidate-manifest.json'),JSON.stringify(candidateManifest,null,2)+'\n');
 await mkdir(join(prefix,'bin'));await writeFile(manifest.wrapper,wrapperSource(host,prefix),{mode:0o755});
 await writeFile(join(prefix,'README.md'),[
  '# UNOFFICIAL isolated native recovery candidate',
  '',
  'Not an official DSH release and not production-approved. This is a complete private copy of the baseline dependency graph; only five explicitly suffixed candidate packages were overlaid from verified top-level archives. The CLI root version deliberately remains '+sourceMetadata.version+'; dshExtrasNativeRecovery records the adaptation.',
  '',
  'Source implementation: '+IMPLEMENTATION+'; baseline source: '+candidateManifest.baselineCommit+'.',
  'Manifest: manifest.json (five archive/runtime hashes, root baseline, stock fingerprints and provenance). Stock Goal round driver SHA256: '+STOCK_DRIVER_SHA+'.',
  '',
  'Launch only through bin/dsh-unofficial.mjs with explicit disposable HOME and DSH_HOME under /tmp; it prints an unofficial warning and refuses port 3080. Application launches are native dsh profiles; no replacement server is provided.',
  '',
  'Never point this candidate at a stock/real profile. Candidate session logs contain new required events; stock readers cannot read them. Roll back by stopping the candidate and restoring only the separate disposable profile backup, never by stripping audit events or downgrading an in-place profile.',
  '',
  'Staging and graph checks are not HTTP/browser acceptance or allNativeWakeAdmission approval. Those remain separate gates. No provider credentials are included.',
 ].join('\n')+'\n');
 // Source host remained read-only throughout staging, including all candidate owners and driver.
 for(const before of baseline)assert.deepEqual(await fingerprint(sourceHost,before.name),before,'source baseline changed during staging');
 assert.equal(sha256(await readFile(join(sourceHost,'package.json'))),manifest.rootBaseline.packageSha256);
 return manifest;
}
export function wrapperSource(host,prefix){return [
 '#!/usr/bin/env node',
 'import {spawn} from "node:child_process";',
 'import {isAbsolute,resolve,dirname} from "node:path";',
 'import {realpathSync,mkdirSync,existsSync} from "node:fs";',

 'console.error("UNOFFICIAL DSH native-recovery candidate '+VERSION+'; not an upstream release; disposable profiles only.");',
 'const temp=realpathSync("/tmp");for(const key of ["HOME","DSH_HOME"]){const path=process.env[key];if(!path||!isAbsolute(path)||!resolve(path).startsWith(temp+"/"))throw Error(key+" must explicitly name a disposable /tmp directory");let parent=resolve(path);while(!existsSync(parent))parent=dirname(parent);const boundary=realpathSync(parent);if(boundary!==temp&&!boundary.startsWith(temp+"/"))throw Error(key+" parent resolves outside /tmp");mkdirSync(path,{recursive:true});if(!realpathSync(path).startsWith(temp+"/"))throw Error(key+" resolves outside /tmp");}',
 'const args=process.argv.slice(2);for(let i=0;i<args.length;i++)if(args[i]==="--port"||args[i].startsWith("--port=")){const value=args[i]==="--port"?args[i+1]:args[i].slice(7);if(!/^[0-9]+$/.test(value??"")||Number(value)===3080)throw Error("explicit port must be numeric and must not be 3080");}',
 'const offline=args.some(arg=>["--help","-h","--version","-V","plugin","plugins","config"].includes(arg));if(!offline&&!args.some(arg=>arg==="--port"||arg.startsWith("--port=")))throw Error("application launch requires explicit --port 0 or a non-3080 temporary port");',
 'const child=spawn(process.execPath,['+JSON.stringify(join(host,'lib/bin.js'))+',...args],{stdio:"inherit",env:{...process.env,XDG_CACHE_HOME:process.env.HOME+"/.cache",npm_config_cache:process.env.HOME+"/.npm-cache"}});',
 'for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));child.once("error",error=>{console.error(error.message);process.exitCode=1;});child.once("exit",(code,signal)=>{process.exitCode=code??(signal?1:0);});',
 ].join('\n')+'\n';}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [candidate,source]=process.argv.slice(2);assert.ok(candidate&&source,'usage: node stage.mjs CANDIDATE_DIR READ_ONLY_BASELINE_DSH_ROOT');
 const result=await stageCandidate(candidate,source);console.log(JSON.stringify({prefix:result.prefix,host:result.host,anchor:result.anchor,wrapper:result.wrapper,manifest:join(result.prefix,'manifest.json')},null,2));
}
