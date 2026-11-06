import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
const root=new URL('../../',import.meta.url).pathname;
const dependency=createRequire(new URL('../../package.json',import.meta.url));

test('emitted settings share the native wire fence and keep sibling writes current before page props render', {timeout:30000}, async()=>{
  const descriptor={rowId:'dsh-extras',packageName:'dsh-extras',moduleIds:['compact-context','retry','chime','goalWait']};
  const client=(await build({stdin:{contents:'import {createExtrasClient} from "./client/composition.ts";import {createReasoningAdapter} from "./client/reasoning-settings.ts";import {createChimeAdapter} from "./client/chime.ts";window.__ModuleLoader__.load({factory(require){return createExtrasClient('+JSON.stringify(descriptor)+',require("react"),createChimeAdapter,createReasoningAdapter)}});',resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
  const harness=(await build({entryPoints:[root+'test/client/page-publication-browser.fixture.js'],bundle:true,write:false,platform:'browser',format:'iife',alias:{react:dependency.resolve('react'),'react-dom/client':dependency.resolve('react-dom/client')}})).outputFiles[0]!.text;
  const server=createServer((req,res)=>{
    if(req.url==='/client.js'||req.url==='/harness.js'){res.setHeader('content-type','text/javascript');res.end(req.url==='/client.js'?client:harness);return;}
    if(req.url?.endsWith('/status')){res.setHeader('content-type','application/json');res.end(JSON.stringify({modules:{'compact-context':{phase:'active',ready:true,enabled:true,capabilities:{tools:{phase:'disabled'},compactionReasoning:{phase:'active'}}}}}));return;}
    res.setHeader('content-type','text/html');res.end('<div id="root"></div><script>window.__DSH_BOOT__={entries:[]};</script><script src="/harness.js"></script><script src="/client.js"></script>');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');
  let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});
    const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+address.port);
    const policy=page.getByRole('group',{name:'Compaction-request reasoning',exact:true});await policy.waitFor();
    const sibling=page.locator('[data-module="retry"] input[data-field="enabled"]');
    await policy.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>typeof(window as any).acknowledge==='function');
    assert.equal(await sibling.isDisabled(),true,'other modules cannot submit a fixed old revision during the wire call');
    await page.evaluate(()=>(window as any).acknowledge());
    await page.waitForFunction(()=>(window as any).accepted().value.modules['compact-context'].compactionReasoning.enabled===true);
    assert.equal(await page.evaluate(()=>(window as any).pageRevision()),7,'page props intentionally did not publish');
    await sibling.uncheck();
    await page.waitForFunction(()=>(window as any).accepted().value.modules.retry.enabled===false);
    assert.deepEqual(await page.evaluate(()=>(window as any).nativeWrites.map((write:any)=>write.revision)),[7,8]);
    assert.equal(await page.getByRole('alert').count(),0);
    await page.evaluate(()=>(window as any).unload());assert.equal(await page.evaluate(()=>(window as any).remainingListeners),0);
    assert.deepEqual(errors,[]);
  }finally{await browser?.close();server.close();await once(server,'close');}
});
