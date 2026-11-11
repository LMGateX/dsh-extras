// Development-only provisioning. Never imported by product/runtime code.
import {readFile,writeFile,readdir,lstat,realpath,mkdir,symlink,rename,access} from 'node:fs/promises';
import {join,resolve,dirname,isAbsolute,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const COMMIT='ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c', VERSION='0.2.2-rc.2';
const DRIVER='8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c';
const RECEIPT='.dsh-extras-source-host.json';
const json=async path=>JSON.parse(await readFile(path,'utf8'));
async function info(path){try{return await lstat(path);}catch(error){if(error.code==='ENOENT')return null;throw error;}}
function git(source,...args){return execFileSync('git',['--no-optional-locks','-C',source,...args],{encoding:'utf8',env:{...process.env,GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'}}).trim();}
function inside(root,path){const rel=relative(root,path);return rel!==''&&!rel.startsWith('..'+sep)&&rel!=='..'&&!isAbsolute(rel);}
async function same(path,target){try{return await realpath(path)===target;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function auditSource(input){
  if(!input||!isAbsolute(input))throw new Error('Supply an absolute path to the already built official source checkout.');
  const source=await realpath(input);
  if(git(source,'rev-parse','--show-toplevel')!==source||git(source,'rev-parse','HEAD')!==COMMIT)throw new Error('Source host revision must be '+COMMIT);
  if(git(source,'status','--porcelain','--untracked-files=no'))throw new Error('Source host has dirty tracked files.');
  const files=git(source,'ls-files','-z','--',':(glob)vendor/*/package.json',':(glob)packages/*/*/package.json',':(glob)apps/*/package.json').split(String.fromCharCode(0)).filter(path=>new RegExp('^(?:vendor/[^/]+|packages/[^/]+/[^/]+|apps/[^/]+)/package[.]json$').test(path)).sort();
  const packages=new Map();
  for(const file of files){
    const manifest=await json(join(source,file));
    if(!manifest.name?.startsWith('@deepseek-ai/'))continue;
    if(!new RegExp('^@deepseek-ai/[a-z0-9][a-z0-9._-]*$').test(manifest.name)||packages.has(manifest.name))throw new Error('Invalid or duplicate native package name.');
    const target=await realpath(dirname(join(source,file)));
    if(!inside(source,target))throw new Error('Native package escaped supplied checkout.');
    packages.set(manifest.name,{target,manifest});
  }
  for(const [name,version] of [['@deepseek-ai/dsh',VERSION],['@deepseek-ai/dsh-goal-round-driver',VERSION],['@deepseek-ai/cordis','4.1.0'],['@deepseek-ai/schemastery','3.19.0']]){
    if(packages.get(name)?.manifest.version!==version)throw new Error('Wrong native version: '+name);
  }
  for(const {target,manifest} of packages.values()){
    for(const entry of [manifest.main,manifest.types].filter(Boolean)){
      const path=resolve(target,entry);
      if(!inside(target,path))throw new Error('Invalid native build entrypoint.');
      try{await access(path);}catch{throw new Error('Unbuilt source host entrypoint: '+path);}
    }
  }
  const anchor=packages.get('@deepseek-ai/dsh').target;
  for(const entry of ['lib/bin.js','lib/profile-boot.js','lib/types/profile-boot.d.ts']){
    try{await access(join(anchor,entry));}catch{throw new Error('Unbuilt source host CLI: '+entry);}
  }
  const driverSha256=createHash('sha256').update(await readFile(join(packages.get('@deepseek-ai/dsh-goal-round-driver').target,'lib/index.js'))).digest('hex');
  if(driverSha256!==DRIVER)throw new Error('Unrecognized source host compiled Goal driver hash.');
  // Declared local runtime/peer edges must lead to the same physical graph.
  for(const {target,manifest} of packages.values()){
    const require=createRequire(join(target,'package.json'));
    for(const name of Object.keys({...manifest.dependencies,...manifest.peerDependencies})){
      if(!packages.has(name))continue;
      let actual;
      try{actual=await realpath(require.resolve(name+'/package.json'));}
      catch(error){
        if(target===anchor)continue; // Explicit anchor can be completed below.
        if(manifest.peerDependenciesMeta?.[name]?.optional)continue;
        throw new Error('Incomplete source host dependency '+manifest.name+' -> '+name+': '+error.message);
      }
      if(actual!==join(packages.get(name).target,'package.json'))throw new Error('Foreign native graph: '+manifest.name+' -> '+name);
    }
  }
  return {source,anchor,packages,identity:{format:1,source,commit:COMMIT,nativeVersion:VERSION,cordisVersion:'4.1.0',driverSha256,packageCount:packages.size}};
}
// Explicit native test selectors may not select a second graph after receipt admission.
async function checkSelectors({anchor}){
  const expected=await realpath(join(anchor,'package.json'));
  for(const name of ['DSH_RUNTIME_ROOT','DSH_TEST_INSTALL_ANCHOR']){
    const value=process.env[name];if(value===undefined)continue;
    try{
      if(!value.trim())throw new Error('Empty selector.');
      let actual;
      if(name==='DSH_RUNTIME_ROOT'){
        const base=await realpath(resolve(value));
        if(!(await lstat(base)).isDirectory())throw new Error('Runtime root must be a directory.');
        for(const candidate of [base,join(base,'node_modules'),join(base,'node_modules','@deepseek-ai')]){
          try{actual=await realpath(createRequire(join(candidate,'package.json')).resolve('@deepseek-ai/dsh/package.json'));break;}catch{}
        }
      }else{
        if(!isAbsolute(value))throw new Error('Install anchor must be absolute.');
        const file=await realpath(value);
        if(!(await lstat(file)).isFile())throw new Error('Install anchor must be a file.');
        actual=await realpath(createRequire(file).resolve('@deepseek-ai/dsh/package.json'));
      }
      if(actual!==expected)throw new Error('Missing or foreign native graph.');
    }catch{throw new Error(name+' must resolve to the supplied source host CLI graph.');}
  }
}
async function planLinks(modules,packages,{replaceSchema=false}={}){
  // Never follow a consumer node_modules/scope link and mutate its target.
  for(const path of [modules,join(modules,'@deepseek-ai')]){
    const state=await info(path);
    if(state&&(!state.isDirectory()||state.isSymbolicLink()))throw new Error('Refuse linked or non-directory mutation boundary: '+path);
  }
  const scope=join(modules,'@deepseek-ai');
  for(const name of await readdir(scope).catch(error=>{if(error.code==='ENOENT')return [];throw error;})){
    if(/^(?:dsh(?:-|$)|cordis(?:-|$)|cosmokit$|schemastery$)/.test(name)&&!packages.has('@deepseek-ai/'+name))throw new Error('Foreign native package: '+name);
  }
  const changes=[];
  for(const [name,{target,manifest}] of packages){
    const path=join(modules,name),state=await info(path);
    if(state&&await same(path,target))continue;
    if(!state){changes.push({path,target});continue;}
    // Preserve an equal-version registry schema directory in a bounded backup.
    // Never unlink a foreign symlink or recursively delete anything.
    if(replaceSchema&&['@deepseek-ai/schemastery','@deepseek-ai/cosmokit'].includes(name)&&state.isDirectory()&&!state.isSymbolicLink()){
      const installed=await json(join(path,'package.json'));
      if(installed.name===name&&installed.version===manifest.version&&await realpath(path)===path){
        const backup=join(modules,'.dsh-extras-registry-'+name.split('/')[1]+'-'+manifest.version);
        if(await info(backup))throw new Error('Schema backup already exists; refusing replacement.');
        changes.push({path,target,backup});continue;
      }
    }
    throw new Error('Foreign native identity at '+path);
  }
  return changes;
}
async function verifyLinks(modules,packages){
  const require=createRequire(join(modules,'..','package.json'));
  for(const [name,{target}] of packages){
    if(!await same(join(modules,name),target)||await realpath(require.resolve(name+'/package.json'))!==join(target,'package.json'))throw new Error('Source host graph mismatch: '+name);
  }
}
export async function checkSourceHost(root){
  const modules=join(root,'node_modules');
  let receipt;
  try{receipt=await json(join(modules,RECEIPT));}
  catch{throw new Error('Source host is not provisioned; run npm run host:link -- /absolute/source-checkout after npm ci.');}
  const audited=await auditSource(receipt.source);
  if(JSON.stringify(receipt)!==JSON.stringify(audited.identity))throw new Error('Source host receipt identity mismatch; reprovision explicitly.');
  await checkSelectors(audited);
  await verifyLinks(modules,audited.packages);
  await verifyLinks(join(audited.anchor,'node_modules'),audited.packages);
  return audited.identity;
}
async function linkSourceHost(root,input){
  const audited=await auditSource(input),modules=join(root,'node_modules');
  await checkSelectors(audited);
  if(inside(audited.source,root)||root===audited.source)throw new Error('Consumer must be outside the supplied source checkout.');
  const receipt=join(modules,RECEIPT),existing=await info(receipt);
  if(existing&&(existing.isSymbolicLink()||JSON.stringify(await json(receipt))!==JSON.stringify(audited.identity)))throw new Error('Foreign source host receipt.');
  // Complete both plans before the first filesystem mutation.
  const changes=[...await planLinks(join(audited.anchor,'node_modules'),audited.packages),...await planLinks(modules,audited.packages,{replaceSchema:true})];
  for(const {path,target,backup} of changes){
    await mkdir(dirname(path),{recursive:true});
    if(backup)await rename(path,backup);
    await symlink(target,path,'dir');
  }
  await verifyLinks(modules,audited.packages);
  await verifyLinks(join(audited.anchor,'node_modules'),audited.packages);
  if(!existing)await writeFile(receipt,JSON.stringify(audited.identity)+String.fromCharCode(10),{flag:'wx'});
  return audited.identity;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const [command,source,...extra]=process.argv.slice(2);
    if(extra.length||(command==='check'?source!==undefined:command!=='link'||!source))throw new Error('Usage: native-host.mjs link /absolute/source-checkout | check');
    console.log(JSON.stringify(command==='link'?await linkSourceHost(process.cwd(),source):await checkSourceHost(process.cwd())));
  }catch(error){console.error(error.message);process.exitCode=1;}
}
