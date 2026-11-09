/** Public emitted composition + unchanged native ui-chat owner; no native recovery emulation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {nativeBrowserBundle} from './browser-bundle.fixture.ts';

const root=new URL('../../',import.meta.url).pathname;
const event=(type:string,seq:number,data:any)=>({type,seq,time:seq*1000,data});
const turn=(n:number,seq:number,kind='completed')=>[
 event('turn/start',seq,{turn:n}),
 event('turn/end',seq+1,{turn:n,reason:kind==='error'?{kind,error:{code:'SERVER',message:'offline terminal failure'}}:kind==='aborted'?{kind,reason:{kind:'user'}}:{kind}}),
];
const unavailable={protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'unavailable',reason:'native-recovery-unavailable'};

for(const distribution of ['dsh-extras-retry','dsh-extras'])test('real native TurnTail latest-error visibility, card and recovery actions: '+distribution,{timeout:60000},async t=>{
 assert.ok(process.env.HOME?.startsWith('/tmp/'),'explicit disposable HOME');
 assert.ok(process.env.DSH_HOME?.startsWith('/tmp/'),'explicit disposable DSH_HOME');
 const temp=await mkdtemp(join(tmpdir(),'extras-recovery-ui-'));
 t.after(()=>rm(temp,{recursive:true,force:true}));
 const descriptor={rowId:distribution,packageName:distribution,moduleIds:['retry']};
 const entry='import {createExtrasClient} from "./client/composition.ts";import {createRequestRecoveryAdapter} from "./client/request-recovery.ts";window.__ModuleLoader__.load({id:'+JSON.stringify(distribution)+',factory(require){return createExtrasClient('+JSON.stringify(descriptor)+',require("react"),undefined,undefined,undefined,undefined,createRequestRecoveryAdapter);}});';
 const client=(await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 const clientPath=join(temp,'client.js');await writeFile(clientPath,client);
 const assets=new Map<string,string>();
 const bundle=await nativeBrowserBundle({distribution,clientPath,require:createRequire(new URL('../../package.json',import.meta.url)),browserAsset:(name:string,code:string)=>assets.set('/native-assets/'+name,code)});
 let state:any={sessionId:'public-native-session',events:turn(1,1),running:false};
 let reads=0;let recovery:any=unavailable;let readFailure=false;const commands:any[]=[];let disposition='accepted';let releasePost:(()=>void)|undefined;let holdPost=false;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url!,'http://fixture.invalid').pathname;
  res.setHeader('Cache-Control','no-store');
  if(assets.has(path)){res.setHeader('Content-Type','text/javascript');res.end(assets.get(path));return;}
  if(path==='/acceptance.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle);return;}
  if(path==='/acceptance-state'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(state));return;}
  if(path==='/extras/'+distribution+'/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({modules:{retry:{phase:'active',ready:true,enabled:true}}}));return;}
  if(path==='/extras/'+distribution+'/request-recovery'){
   res.setHeader('Content-Type','application/json');
   if(req.method==='POST'){const parts=[];for await(const part of req)parts.push(part);const command=JSON.parse(Buffer.concat(parts).toString());commands.push(command);if(holdPost)await new Promise<void>(resolve=>{releasePost=resolve;});
    if(disposition==='rejected'){res.statusCode=409;res.end(JSON.stringify({status:'rejected',reason:'checkpoint-stale'}));}else res.end(JSON.stringify({status:'accepted',checkpointId:command.checkpointId,operationId:command.operationId,executionId:'native-fixture-execution'}));return;
   }
   reads++;if(readFailure)res.statusCode=503;res.end(JSON.stringify(recovery));return;
  }
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;font-family:system-ui;background:#fff}main{max-width:720px;margin:auto} @media(prefers-color-scheme:dark){body{background:#171a20}}</style><div id="app"></div><div id="root"></div><script type="module" src="/acceptance.js"></script>');
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
 const address=server.address() as any;assert.notEqual(address.port,3080);
 const browser=await chromium.launch({executablePath:process.env.DSH_EXTRAS_CHROMIUM,headless:true,args:['--no-sandbox']});t.after(()=>browser.close());
 const page=await browser.newPage();page.setDefaultTimeout(4000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+address.port);
 await page.waitForFunction(()=>document.documentElement.dataset.nativeAcceptance);
 assert.equal(await page.evaluate(()=>document.documentElement.dataset.nativeAcceptance),'ready',await page.evaluate(()=>(window as any).__nativeAcceptanceError));
 await expect(page.locator('[data-turn-tail]')).toHaveCount(1);
 await expect(page.locator('[data-request-recovery]')).toHaveCount(0);
 assert.equal(reads,0,'ordinary replies do not even read unsupported recovery');
 state={...state,events:[...turn(1,1,'error'),...turn(2,3)]};
 await page.evaluate(()=>(window as any).__nativeAcceptance.refresh());
 await expect(page.locator('[data-turn-tail]')).toHaveCount(2);
 await expect(page.locator('[data-request-recovery]')).toHaveCount(0);
 assert.equal(reads,0,'a historical failure cannot query a later successful session');
 const refresh=async()=>{await page.evaluate(()=>(window as any).__nativeAcceptance.refresh());await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));};
 for(const kind of ['aborted','interrupted','max-tokens']){state={...state,events:turn(2,3,kind)};await refresh();await expect(page.locator('[data-request-recovery]')).toHaveCount(0);}
 // Paged history deliberately contains only an old error; authoritative outline
 // still says turn 3 exists. Newest loaded error is NOT the current request.
 state={...state,events:turn(1,1,'error'),turnOutline:[{turn:1,seq:1,prompt:'',response:''},{turn:3,seq:7,prompt:'',response:''}]};
 await refresh();await expect(page.locator('[data-turn-tail]')).toHaveCount(1);await expect(page.locator('[data-request-recovery]')).toHaveCount(0);
 state={...state,turnOutline:[]};await refresh();await expect(page.locator('[data-request-recovery]')).toHaveCount(0);
 assert.equal(reads,0,'unknown head and cancelled/historical turns stay silent');
 state={...state,events:[...turn(1,1,'error'),...turn(2,3,'error')],turnOutline:undefined};await refresh();
 await expect(page.locator('[data-request-recovery]')).toHaveCount(1);
 await expect(page.locator('[data-native-tail-turn="2"] [data-request-recovery]')).toContainText('native-recovery-unavailable');
 await expect(page.getByRole('button',{name:'Retry failed request',exact:true})).toHaveCount(0);
 assert.equal(reads,1,'only the current genuine native error reads eligibility');
 await expect(page.getByRole('region',{name:'Failed request recovery',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Failed request recovery',exact:true})).toBeVisible();
 const presentation=await page.locator('[data-request-recovery]').evaluate(node=>{const s=getComputedStyle(node);return{padding:parseFloat(s.paddingTop),border:s.borderTopStyle,background:s.backgroundColor};});
 assert.ok(presentation.padding>=12,'the recovery card has independent spacing');
 assert.equal(presentation.border,'solid');assert.notEqual(presentation.background,'rgba(0, 0, 0, 0)');
 const checkpoint=(n:number,seq:number,id:string)=>({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'available',checkpoint:{sessionId:state.sessionId,checkpointId:id,revision:n,attemptId:'native-attempt-'+n,attemptSeq:seq-1,terminalSeq:seq,turn:n,step:1,selection:{provider:'offline',model:'offline-model'},disposition:'budget-exhausted'}});
 recovery=checkpoint(2,4,'checkpoint-two');
 await page.getByRole('button',{name:'Refresh recovery state',exact:true}).click();
 const retry=page.getByRole('button',{name:'Retry failed request',exact:true});await expect(retry).toBeVisible();
 await expect(page.getByRole('button',{name:'Refresh recovery state',exact:true})).toBeVisible();
 // Rendering uses native locale and theme tokens/fallbacks; screenshot artifacts
 // are optional and always go outside Git. These are actual native tail seats.
 const evidence=process.env.DSH_RECOVERY_UI_EVIDENCE;if(evidence){assert.ok(evidence.startsWith('/tmp/'));await mkdir(evidence,{recursive:true});}
 const colors:string[]=[];
 for(const [locale,scheme,width] of [['en','light',900],['en','dark',900],['zh','light',360],['zh','dark',360]] as const){
  state={...state,locale};await refresh();await page.emulateMedia({colorScheme:scheme});await page.setViewportSize({width,height:650});
  await expect(page.getByRole('heading',{name:locale==='en'?'Failed request recovery':'失败请求恢复',exact:true})).toBeVisible();
  const card=page.locator('[data-request-recovery]');colors.push(await card.evaluate(node=>getComputedStyle(node).backgroundColor));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no narrow horizontal overflow');
  const button=page.getByRole('button',{name:locale==='en'?'Retry failed request':'重试失败请求',exact:true});await page.keyboard.press('Tab');await button.focus();
  assert.equal(await button.evaluate(node=>getComputedStyle(node).outlineStyle),'solid','keyboard focus is visible');
  if(evidence)await page.screenshot({path:join(evidence,'recovery-'+locale+'-'+scheme+'-'+width+'.png'),fullPage:true});
 }
 assert.notEqual(colors[0],colors[1],'dark and light recovery surfaces differ');assert.notEqual(colors[2],colors[3]);
 state={...state,locale:'en'};await refresh();
 let loseResponse=true;await page.route('**/request-recovery',async route=>{if(route.request().method()!=='POST'||!loseResponse){await route.continue();return;}loseResponse=false;await route.fetch();await route.abort();});
 holdPost=true;await retry.evaluate((button:HTMLButtonElement)=>{button.click();button.click();});
 await expect(page.locator('[data-request-recovery]')).toHaveAttribute('aria-busy','true');
 await expect(page.getByRole('button',{name:'Retrying…',exact:true})).toBeDisabled();
 await expect.poll(()=>commands.length).toBe(1);releasePost!();holdPost=false;
 await expect(page.getByRole('alert')).toContainText('Recovery transport unavailable');
 await retry.click();await expect(page.getByRole('status')).toContainText('Recovery accepted; native execution started (not completed).');
 assert.equal(commands.length,2);assert.equal(commands[0].operationId,commands[1].operationId,'lost response keeps operation identity');
 assert.deepEqual(Object.keys(commands[0]).sort(),['checkpointId','expectedRevision','operationId','sessionId'],'no prompt or synthetic message payload');
 await expect(retry).toHaveCount(0);
 const readsBeforeIneligible=reads;
 for(const patch of [{running:true},{running:false,openState:'loading'},{openState:'open',removed:true},{removed:false,events:[...state.events,event('turn/start',5,{turn:3})]}]){state={...state,...patch};await refresh();await expect(page.locator('[data-request-recovery]')).toHaveCount(0);}
 assert.equal(reads,readsBeforeIneligible,'running/unopened/removed/new-turn states cannot read recovery');
 state={...state,events:turn(3,5,'error')};await refresh();
 await expect(page.locator('[data-request-recovery]'),'a checkpoint for another terminal seq cannot be offered').toHaveCount(0);
 recovery=checkpoint(3,6,'checkpoint-three');await refresh();await expect(retry).toBeVisible();
 disposition='rejected';await retry.click();await expect(page.getByRole('alert')).toContainText('checkpoint-stale');await expect(retry).toHaveCount(0);
 await page.getByRole('button',{name:'Refresh recovery state',exact:true}).click();await expect(retry,'refresh cannot resurrect a rejected checkpoint').toHaveCount(0);
 state={...state,events:turn(4,7,'error')};recovery=checkpoint(4,8,'checkpoint-four');readFailure=true;await refresh();
 await expect(page.getByRole('alert')).toContainText('Recovery transport unavailable');await expect(retry).toHaveCount(0);
 readFailure=false;await page.getByRole('button',{name:'Refresh recovery state',exact:true}).click();await expect(retry).toBeVisible();
 await expect(page.locator('[data-request-recovery]')).not.toContainText('offline terminal failure');
 state={...state,retryEnabled:false};await refresh();await expect(page.locator('[data-request-recovery]')).toHaveCount(0);
 state={...state,retryEnabled:true};await refresh();await expect(retry).toBeVisible();
 assert.deepEqual(errors,[]);
 await page.evaluate(()=>(window as any).__nativeAcceptance.dispose());
});
