/** Explicit opt-in unofficial native-candidate acceptance; never imported by default tests. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,readFile,writeFile,symlink,realpath,rm} from 'node:fs/promises';
import {join,dirname,basename,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';

const exec=promisify(execFile);
export const repository=resolve(import.meta.dirname,'../..');
export const sha=(v:any)=>createHash('sha256').update(v).digest('hex');
export const response=()=>({code:0,headers:{} as any,body:'',writeHead(code:number,headers:any={}){this.code=code;this.headers=headers;},end(v=''){this.body+=v;}});
export async function until(read:()=>any,accept:(v:any)=>boolean,label:string){const end=Date.now()+7000;for(;;){const v=await read();if(accept(v))return v;assert.ok(Date.now()<end,label+': '+JSON.stringify(v));await new Promise(r=>setTimeout(r,10));}}
export async function candidateFixture(t:any,distribution:string){
 const anchor=process.env.DSH_RECOVERY_CANDIDATE_ANCHOR;
 assert.ok(anchor&&anchor.startsWith('/tmp/'),'explicit isolated /tmp candidate anchor required');
 assert.ok(process.env.HOME?.startsWith('/tmp/'),'explicit disposable HOME required');
 assert.ok(process.env.DSH_HOME?.startsWith('/tmp/'),'explicit disposable DSH_HOME required');
 assert.equal(process.env.DSH_PROFILE,'isolated');
 const require=createRequire(anchor!);
 const manifestFile=process.env.DSH_RECOVERY_CANDIDATE_MANIFEST;
 assert.ok(manifestFile,'explicit unofficial manifest required');
 const staged=JSON.parse(await readFile(manifestFile!,'utf8'));
 const manifest=staged.candidateManifest??staged;
 assert.equal(manifest.official,false);assert.equal(manifest.protocol,'dsh.request-recovery.v1');
 const identity:any[]=[];
 for(const p of manifest.packages){
  const file=require.resolve(p.name);const packageFile=require.resolve(p.name+'/package.json');
  const meta=JSON.parse(await readFile(packageFile,'utf8'));
  assert.equal(meta.version,manifest.version);assert.equal(sha(await readFile(file)),p.indexSha256);
  assert.ok((await realpath(file)).startsWith('/tmp/'),'candidate never uses production package');
  identity.push({name:p.name,version:meta.version,entry:await realpath(file),sha256:p.indexSha256});
 }
 const cordis=require.resolve('@deepseek-ai/cordis');
 for(const p of manifest.packages)assert.equal(createRequire(require.resolve(p.name)).resolve('@deepseek-ai/cordis'),cordis,'single Context identity: '+p.name);
 const load=async(name:string)=>import(pathToFileURL(require.resolve('@deepseek-ai/'+name)).href);
 const {Context}=await load('cordis');const ctx=new Context();
 const root=await mkdtemp(join(tmpdir(),'extras-real-native-recovery-'));
 t.after(async()=>{await ctx.fiber.dispose();assert.equal(dirname(root),resolve(tmpdir()));assert.ok(basename(root).startsWith('extras-real-native-recovery-'));if(!process.env.DSH_RECOVERY_KEEP)await rm(root,{recursive:true,force:true});else console.log('Candidate sandbox retained:',root);});
 const artifactDir=resolve(process.env.DSH_EXTRAS_ARTIFACT_DIR??join(repository,'artifacts'));
 const artifact=join(artifactDir,distribution+'-0.5.1.tgz');const artifactHash=sha(await readFile(artifact));
 await exec('tar',['-xzf',artifact,'-C',root]);
 const dependencyRoot=join(dirname(anchor!),'node_modules');
 await symlink(dependencyRoot,join(root,'node_modules'),'dir');
 const packed=await import(pathToFileURL(join(root,'package/lib/index.js')).href);
 const profile=join(root,'dsh','profiles','isolated');await mkdir(profile,{recursive:true});
 const config={modules:{retry:{enabled:true},'compact-context':{enabled:false},chime:{enabled:false},goalWait:{enabled:false},'model-policy':{enabled:false}},migration:{auto:false}};
 const {default:Loader,Group}=await load('cordis-plugin-loader');
 const NativeInclude=(await load('cordis-plugin-include')).default;
 class Include extends NativeInclude {import(name:string,stack:any){return name===distribution?packed:super.import(name,stack);}}
 class MemoryLoader extends Loader {constructor(...args:any[]){super(...args);}import(name:string,stack:any){return name==='cordis:include'?Include:name===distribution?packed:super.import(name,stack);}}
 ctx.baseUrl=pathToFileURL(anchor!).href;
 const loader=new MemoryLoader(ctx,{baseUrl:ctx.baseUrl});loader.builtins.group=Group;
 const patchPath=join(profile,'cordis.patch.yml');
 await writeFile(join(profile,'package.json'),JSON.stringify({name:'unofficial-native-recovery-acceptance',private:true,dependencies:{},dsh:{profile:{bundles:[]}}}));
 await writeFile(patchPath,JSON.stringify([{insert:[{id:distribution,name:distribution,config}]}]));
 await writeFile(join(profile,'cordis.yml'),'[]');
 ctx.reflect.provide('profileContext',{dir:profile,patchPath,home:join(root,'dsh'),installAnchor:anchor,overlays:[]});
 const routes=new Map<string,any>();
 ctx.reflect.provide('webServer',{register(route:any){assert.ok(!routes.has(route.path));routes.set(route.path,route);return()=>routes.delete(route.path);}});
 const credentials=new Map();ctx.reflect.provide('credentials',{async modifyRecord(key:string,edit:any){const next=await edit(credentials.get(key));if(next!==undefined)credentials.set(key,next);return credentials.get(key);}});
 await ctx.plugin(await load('dsh-client-connection'),{}).await();
 for(const name of ['dsh-llm','dsh-session','dsh-session-projection','dsh-system-prompt','dsh-tools','dsh-tool-executor-native','dsh-agent','dsh-llm-retry']){
  const plugin=await load(name);await ctx.plugin(plugin.default??plugin).await();
 }
 const loop=await load('dsh-agent-loop');await ctx.plugin(loop.default??loop,{agents:[]}).await();
 const boot=await load('dsh-app-boot');await boot.mountRootInclude(ctx,join(profile,'cordis.yml'),boot.readProfilePatches('dsh',ctx.get('profileContext')));await loader.await();
 const entry=[...loader.entries()].find((v:any)=>v.options.id===distribution);assert.ok(entry?.fiber);
 const nativeConnection=ctx.get('connection');
 let browserBundle='';const browserAssets=new Map<string,string>();
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url!,'http://'+req.headers.host);
   if(browserAssets.has(url.pathname)){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(browserAssets.get(url.pathname));return;}
   if(url.pathname==='/acceptance.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(browserBundle);return;}
   if(url.pathname==='/acceptance-state'){
    const admit=nativeConnection.admit(req);if('rejection'in admit){res.writeHead(admit.rejection);res.end();return;}
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(state?.()??{}));return;
   }
   const route=routes.get(url.pathname);if(route){await route.handler(req,res);return;}
   const auth=nativeConnection.authorizeIndex(req,res);if(!auth)return;
   res.writeHead(200,{'Content-Type':'text/html'});res.end('<!doctype html><div id="app"></div><div id="root"></div><script type="module" src="/acceptance.js"></script>');
  }catch(error){res.writeHead(500);res.end(String(error));}
 });
 let state:(()=>any)|undefined;
 server.listen(0,'127.0.0.1');await new Promise<void>(r=>server.once('listening',()=>r()));
 t.after(()=>new Promise<void>(r=>server.close(()=>r())));
 const address=server.address() as any;assert.notEqual(address.port,3080);const origin='http://127.0.0.1:'+address.port;const host=new URL(origin).host;
 const launch=new URL(nativeConnection.authenticatedUrl(origin+'/'));
 const login=response();nativeConnection.authorizeIndex({method:'GET',url:launch.pathname+launch.search,headers:{host}},login);
 const ownerCookie=String(login.headers['Set-Cookie']??login.headers['set-cookie']).split(';')[0]!;
 const http=async(path:string,method='GET',body?:any,headers:any={})=>{
  const r=await fetch(origin+path,{method,headers:{cookie:ownerCookie,'Content-Type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await r.text();return{code:r.status,json:text?JSON.parse(text):undefined};
 };
 const status=async()=> (await http('/extras/'+distribution+'/status')).json;
 await until(status,v=>v?.modules?.retry?.phase==='active','packed native module admission');
 const update=async(enabled:boolean)=>{if(!ctx.get('configEditor'))await ctx.plugin((await load('dsh-config-editor')).default).await();await ctx.get('configEditor').edit(entry,()=>({...config,modules:{...config.modules,retry:{enabled}}}));await loader.await();await until(status,v=>v?.modules?.retry?.phase===(enabled?'active':'disabled'),'native accepted config update');};
 const llm=await load('dsh-llm');
 const failure=[{type:'finish',reason:{kind:'error',failure:{code:'SERVER',message:'deterministic offline failure'}}}];
 const text=(s:string)=>[{type:'block-start',index:0,blockType:'text'},{type:'text-delta',index:0,text:s},{type:'block-end',index:0,block:{type:'text',text:s}},{type:'finish',reason:{kind:'stop'}}];
 const adapters:any[]=[];
 async function session(id:string,script:any[]=[failure,text('Recovered actual native request')],maxRetries=0){
  class OfflineAdapter extends llm.LlmAdapter {
   requests:any[]=[];gate:Promise<void>|undefined;
   async resolveModel(provider:string,model:string){return{provider,id:model,name:model,defaultMaxTokens:32,reasoning:{efforts:[{id:'low',name:'Low'}]}};}
   providerRetryPolicy(){return llm.resolveRetryPolicy({mode:'normal',maxRetries,backoff:{initialDelayMs:1,maxDelayMs:1,jitterRatio:0}});}
   async *stream(options:any){this.requests.push(options);if(this.gate)await this.gate;const chunks=script.shift();assert.ok(chunks,'offline provider script exhausted');for(const chunk of typeof chunks==='function'?chunks(options):chunks)yield chunk;}
  }
  const adapter=new OfflineAdapter();adapters.push(adapter);ctx.llm.registerAdapter([id],adapter);
  const owned=await ctx.agents.create({sessionId:id,agentOptions:{provider:id,model:'offline-model',reasoningEffort:'low'}});t.after(()=>owned.dispose());
  owned.agent.followup(llm.createUserMessage({source:{kind:'user'},content:[{type:'text',text:'Explicit synthetic acceptance input'}]}));await owned.agent.whenIdle();
  return{agent:owned.agent,owned,adapter};
 }
 console.log(JSON.stringify({kind:'unofficial-candidate-identity',distribution,artifactSha256:artifactHash,implementationCommit:manifest.implementationCommit,cordis,identity}));
 return{ctx,root,profile,load,require,anchor,distribution,manifest,http,origin,ownerCookie,launch:nativeConnection.authenticatedUrl(origin+'/'),routes,status,update,session,failure,text,llm,adapters,artifactHash,clientPath:join(root,'package/lib/client.js'),browserAsset:(name:string,code:string)=>browserAssets.set('/native-assets/'+name,code),browserBundle:(bundle:string,read:()=>any)=>{browserBundle=bundle;state=read;},assertFrozen:async()=>assert.equal(sha(await readFile(artifact)),artifactHash)};
}
