import assert from 'node:assert/strict';
import test from 'node:test';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {createRequire} from 'node:module';
const root = new URL('../../',import.meta.url).pathname;
const dependency = createRequire(new URL('../../package.json',import.meta.url));

test('emitted native page settings preserve independent reasoning and tool choices', {timeout:60000}, async () => {
  const descriptor = {rowId:'dsh-extras-compact-context',packageName:'dsh-extras-compact-context',moduleIds:['compact-context']};
  const plugin = (await build({stdin:{contents:'import {createExtrasClient} from "./client/index.ts"; window.__ModuleLoader__.load({factory(require){return createExtrasClient('+JSON.stringify(descriptor)+',require("react"))}});',resolveDir:root,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
  const harness = (await build({entryPoints:[root+'test/client/reasoning-browser.fixture.js'],bundle:true,write:false,platform:'browser',format:'iife',alias:{react:dependency.resolve('react'),'react-dom/client':dependency.resolve('react-dom/client')}})).outputFiles[0]!.text;
  let reasoningPhase: string | undefined;
  const server = createServer((req,res)=>{
    if(req.url === '/plugin.js' || req.url === '/harness.js'){res.setHeader('content-type','text/javascript');res.end(req.url === '/plugin.js'?plugin:harness);return;}
    if(req.url?.includes('/status')){res.setHeader('content-type','application/json');res.end(JSON.stringify({modules:{'compact-context':{phase:'active',ready:true,enabled:true,capabilities:{tools:{phase:'disabled'},...(reasoningPhase ? {compactionReasoning:{phase:reasoningPhase}} : {})}}}}));return;}
    res.setHeader('content-type','text/html');res.end('<div id="root"></div><script>window.__DSH_BOOT__={entries:[]};window.noRemote='+String(req.url === '/no-remote')+';</script><script src="/harness.js"></script><script src="/plugin.js"></script>');
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();assert.ok(address && typeof address === 'object');
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});
    const page=await browser.newPage(); const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:'+address.port);
    const policy=page.getByRole('group',{name:'Compaction-request reasoning',exact:true});
    await policy.waitFor();
    assert.equal(await page.getByRole('group',{name:'Agent-facing compaction tools',exact:true}).count(),1);
    await page.getByRole('group',{name:'Agent-facing compaction tools',exact:true}).getByRole('status').filter({hasText:'Tools runtime: disabled'}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).catalogCalls),0);
    assert.match(await policy.textContent() ?? '',/Reasoning runtime: unavailable/);
    await policy.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.enabled);
    assert.equal(await page.evaluate(()=>(window as any).accepted().modules['compact-context'].compactTool),false);
    await page.reload();await policy.waitFor();
    assert.equal(await policy.getByRole('checkbox').isChecked(),true);
    await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
    await page.waitForFunction(()=>(window as any).catalogCalls === 1);
    await policy.getByRole('button',{name:'Add rule',exact:true}).click();
    const rule = policy.getByRole('group',{name:'Rule 1',exact:true});
    await rule.getByRole('combobox',{name:'Match scope'}).selectOption('provider-model');
    await rule.getByRole('textbox',{name:'Provider route ID'}).fill('Route/A');
    await rule.getByRole('textbox',{name:'Model ID'}).fill('Model/Exact');
    await rule.getByRole('combobox',{name:'Action'}).selectOption('fixed');
    await rule.getByRole('combobox',{name:'Advertised effort for exact model'}).selectOption('Opaque:MAX/Case');
    assert.equal(await rule.getByRole('textbox',{name:'Native effort ID'}).inputValue(),'Opaque:MAX/Case');
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.rules[0]?.effort === 'Opaque:MAX/Case');
    // Metadata is for exact IDs only, never a provider/all effort mapping.
    await rule.getByRole('textbox',{name:'Model ID'}).fill('model/exact');
    assert.equal(await rule.getByRole('combobox',{name:'Advertised effort for exact model'}).count(),0);
    assert.equal(await rule.getByRole('textbox',{name:'Native effort ID'}).inputValue(),'Opaque:MAX/Case');
    await rule.getByRole('combobox',{name:'Match scope'}).selectOption('provider');
    assert.equal(await rule.getByRole('textbox',{name:'Model ID'}).count(),0);
    assert.equal(await rule.getByRole('combobox',{name:'Advertised effort for exact model'}).count(),0);
    await rule.getByRole('combobox',{name:'Action'}).selectOption('inherit');
    assert.equal(await rule.getByRole('textbox',{name:'Native effort ID'}).count(),0);
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.rules[0]?.scope === 'provider');
    assert.deepEqual(await page.evaluate(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.rules),[{scope:'provider',provider:'Route/A',mode:'inherit'}]);
    // A sibling native write never rebases or discards an in-progress policy.
    await rule.getByRole('textbox',{name:'Provider route ID'}).fill('Unsaved/Exact');
    await page.evaluate(()=>(window as any).siblingWrite());
    await policy.getByRole('alert').filter({hasText:'Configuration changed'}).waitFor();
    assert.equal(await rule.getByRole('textbox',{name:'Provider route ID'}).inputValue(),'Unsaved/Exact');
    assert.equal(await policy.getByRole('button',{name:'Save policy',exact:true}).isDisabled(),true);
    await policy.getByRole('button',{name:'Discard policy draft',exact:true}).click();
    assert.equal(await rule.getByRole('textbox',{name:'Provider route ID'}).inputValue(),'Route/A');
    await rule.getByRole('button',{name:'Remove rule',exact:true}).click();
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.rules.length === 0);
    assert.equal(await page.evaluate(()=>(window as any).accepted().modules.retry.enabled),false);
    await policy.getByRole('button',{name:'Reset policy to inherited',exact:true}).click();
    await page.waitForFunction(()=>!(window as any).accepted().modules['compact-context'].compactionReasoning);
    assert.equal(await policy.getByRole('checkbox').isChecked(),false);
    assert.equal(await policy.getByRole('group',{name:'Rule 1',exact:true}).getByRole('combobox',{name:'Match scope'}).inputValue(),'all');
    // The same shared validator is visible through the rendered native page.
    const beforeInvalid = await page.evaluate(()=>(window as any).writes.length);
    await policy.getByRole('button',{name:'Add rule',exact:true}).click();
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await policy.getByRole('alert').filter({hasText:'duplicate match target'}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).writes.length),beforeInvalid);
    await policy.getByRole('button',{name:'Discard policy draft',exact:true}).click();
    await page.evaluate(()=>(window as any).update({writable:false}));
    await page.waitForFunction(()=>document.querySelector('fieldset[aria-label="Compaction-request reasoning"] input')?.hasAttribute('disabled'));
    assert.equal(await policy.getByRole('button',{name:'Reset policy to inherited',exact:true}).isDisabled(),true);
    await page.evaluate(()=>(window as any).update({writable:true,status:'loading'}));
    assert.equal(await policy.getByRole('checkbox').isDisabled(),true);
    await page.evaluate(()=>(window as any).update({status:'ready'}));
    reasoningPhase='active';
    await policy.getByRole('status').filter({hasText:'Reasoning runtime: active'}).waitFor();
    assert.equal(await policy.getByRole('checkbox').isChecked(),false,'runtime status does not infer activation from saved configuration');
    reasoningPhase='disabled';await policy.getByRole('status').filter({hasText:'Reasoning runtime: disabled'}).waitFor();
    // Failed/partial native metadata must never expose provider error bodies.
    await page.evaluate(()=>{(window as any).catalog={ok:false,error:{message:'https://secret:credential@example.invalid/provider-error'}};});
    await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
    await policy.getByRole('status').filter({hasText:'Native metadata unavailable'}).waitFor();
    assert.doesNotMatch(await policy.textContent() ?? '',/credential|example.invalid|provider-error/);
    await page.evaluate(()=>{(window as any).catalog={ok:true,value:{groups:[],failures:[{message:'https://secret:credential@example.invalid/provider-error'}]}};});
    await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
    await policy.getByRole('status').filter({hasText:'Some native metadata is unavailable'}).waitFor();
    assert.doesNotMatch(await policy.textContent() ?? '',/credential|example.invalid|provider-error/);
    await page.goto('http://127.0.0.1:'+address.port+'/no-remote');await policy.waitFor();
    await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
    await policy.getByRole('status').filter({hasText:'Native metadata unavailable'}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).catalogCalls),0);
    const manual=policy.getByRole('group',{name:'Rule 1',exact:true});
    await manual.getByRole('combobox',{name:'Action'}).selectOption('fixed');
    await manual.getByRole('textbox',{name:'Native effort ID'}).fill('Manual/Opaque:Exact');
    await policy.getByRole('button',{name:'Save policy',exact:true}).click();
    await page.waitForFunction(()=>(window as any).accepted().modules['compact-context'].compactionReasoning.rules[0].effort === 'Manual/Opaque:Exact');
    // Pending optional metadata is logically cancelled on unmount (native remote has no AbortSignal).
    await page.goto('http://127.0.0.1:'+address.port);await policy.waitFor();
    await page.evaluate(()=>{(window as any).pendingCatalog=true;});
    await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
    await page.waitForFunction(()=>typeof (window as any).resolveCatalog === 'function');
    await page.evaluate(()=>(window as any).unload());
    await page.evaluate(()=>{(window as any).resolveCatalog({ok:true,value:{groups:[],failures:[]}});});
    assert.equal(await page.evaluate(()=>(window as any).remainingListeners),0);
    assert.deepEqual(errors,[]);
  } finally {await browser?.close();server.close();await once(server,'close');}
});
