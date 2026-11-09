/** Consume unchanged installed browser artifacts, including the stock static-module registry. */
import {readFile,readdir} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {sha} from './candidate.fixture.ts';
import {build,transform} from 'esbuild';
export async function nativeBrowserBundle(f:any){
 const builtins=new Set(['react','react/jsx-runtime','react-dom','react-dom/client','@deepseek-ai/cordis','zod','@tanstack/react-virtual','@deepseek-ai/dsh-client-store','@deepseek-ai/dsh-client-ui-slots','@deepseek-ai/dsh-client-ui-primitives','@deepseek-ai/dsh-client-ui-dockkit']);
 const factories=new Map<string,string>();const pure=new Map<string,string>();
 const visit=async(id:string)=>{
  if(factories.has(id)||pure.has(id)||builtins.has(id))return;
  const entry=f.require.resolve(id.endsWith('/client')?id:id+'/client');const code=await readFile(entry,'utf8');
  if(!code.includes('window.__ModuleLoader__.load({')){pure.set(id,entry);return;}
  factories.set(id,code);
  for(const match of code.matchAll(/require[(]["']([^"']+)["'][)]/g))await visit(match[1]!);
 };
 for(const id of ['@deepseek-ai/dsh-client-ui-renderer','@deepseek-ai/dsh-client-ui-conversation','@deepseek-ai/dsh-client-ui-chat','@deepseek-ai/dsh-api-session-controller','@deepseek-ai/dsh-client-locale'])await visit(id);
 const assets=join(dirname(f.require.resolve('@deepseek-ai/dsh-web-frontend/package.json')),'dist/assets');
 const files=(await readdir(assets)).filter((name:string)=>name.endsWith('.js'));
 const assetHashes=[];for(const name of files){const code=await readFile(join(assets,name),'utf8');f.browserAsset(name,code);assetHashes.push({name,sha256:sha(code)});}
 const index=files.find((name:string)=>name.startsWith('index-'));if(!index)throw Error('No installed stock browser static-module entry');
 const packed=await readFile(f.clientPath,'utf8');
 const fixture=await readFile(new URL('./browser.fixture.js',import.meta.url),'utf8');
 const prelude='window.__acceptanceProgress="before-native-import";const factories=new Map();let capture;const captured=new Promise(r=>capture=r);window.__DSH_BOOT__={entries:[]};window.__ModuleLoader__={load(v){factories.set(v.id,v.factory);},create(options){capture(options.staticModules);throw Error("acceptance-static-bootstrap-captured");}};const originalConsoleError=console.error;console.error=(...args)=>{if(args[0]?.message==="acceptance-static-bootstrap-captured"){window.__nativeStaticBootstrapBoundary="captured-only-not-whole-GUI";return;}originalConsoleError(...args);};const frontend=await import('+JSON.stringify('/native-assets/'+index)+');window.__nativeFrontendExports=Object.keys(frontend);if(frontend.getStaticModules)capture(frontend.getStaticModules());else if(frontend.AppWebEntry)new frontend.AppWebEntry(document.getElementById("root")).run();const statics=await captured;console.error=originalConsoleError;const modules=new Map(Object.entries(statics));function nativeRequire(id){if(modules.has(id))return modules.get(id);if(!factories.has(id))throw Error("missing native browser module "+id);const value=factories.get(id)(nativeRequire);modules.set(id,value);return value;}nativeRequire.asset=name=>"/native-assets/"+name;window.__acceptanceRequire=nativeRequire;';
 console.log(JSON.stringify({kind:'actual-emitted-native-browser',distribution:f.distribution,packedClientSha256:sha(packed),nativeFactories:[...factories.keys()],stockFrontendAssets:assetHashes,wholeGui:false}));
 const p=await build({stdin:{contents:[...pure].map(([id,path],i)=>'import * as N'+i+' from '+JSON.stringify(path)+';window.__acceptancePure??={};window.__acceptancePure['+JSON.stringify(id)+']=N'+i+';').join(''),resolveDir:process.cwd(),loader:'js'},bundle:true,platform:'browser',format:'iife',write:false,logLevel:'silent',plugins:[{name:'native-static-cordis',setup(builder){builder.onResolve({filter:/^@deepseek-ai[/]cordis$/},()=>({path:'cordis',namespace:'native-static-cordis'}));builder.onLoad({filter:/.*/,namespace:'native-static-cordis'},()=>({contents:'const native=window.__acceptanceRequire("@deepseek-ai/cordis");export const Service=native.Service;export const Context=native.Context;',loader:'js'}));}}]});
 const assembled=['window.__acceptanceStarted=true;',prelude,p.outputFiles[0]!.text,'for(const[id,value]of Object.entries(window.__acceptancePure??{}))modules.set(id,value);',...factories.values(),packed,'window.__acceptanceDistribution='+JSON.stringify(f.distribution)+';',fixture].join(String.fromCharCode(10)+';'+String.fromCharCode(10));
 try{await transform(assembled,{loader:'js',format:'esm',target:'es2022',sourcefile:'native-acceptance-carrier.js'});}catch(error:any){console.log(error.errors?.map((v:any)=>v.location));throw error;}return assembled;
}
