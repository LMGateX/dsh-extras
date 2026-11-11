/** Native-like protocol fixture; this does not prove the upstream extension implementation. */
import test from 'node:test';import assert from 'node:assert/strict';import {createServer}from'node:http';import{build}from'esbuild';import{chromium}from'@playwright/test';import{fixture,checkpoint}from'./fixture.ts';
test('emitted session-scoped chat action uses only proven checkpoints and fences pending/idempotent/disabled states',{timeout:30000},async t=>{
 const f=await fixture(t);const bundle=(await build({entryPoints:['test/request-recovery/browser.fixture.js'],bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 const server=createServer((req,res)=>{const route=f.routes.get((req.url??'').split('?')[0]!);if(route){void route.handler(req,res);return;}if(!(f.ctx.get('connection')as any).authorizeIndex(req,res))return;res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="root"></div><script>'+bundle+'</script>');});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise<void>(r=>server.close(()=>r())));
 const port=(server.address()as any).port;assert.notEqual(port,3080);const base='http://127.0.0.1:'+port;const launch=(f.ctx.get('connection')as any).authenticatedUrl(base+'/');
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox'],env:{...process.env}});t.after(()=>browser.close());const page=await browser.newPage();page.setDefaultTimeout(5000);await page.goto(launch);
 const button=page.getByRole('button',{name:'Retry failed request',exact:true});await button.waitFor();
 await page.evaluate(()=> (window as any).recoveryHarness.locale('zh'));await page.getByRole('button',{name:'重试失败请求',exact:true}).waitFor();await page.evaluate(()=> (window as any).recoveryHarness.locale('en'));await button.waitFor();
 await page.evaluate(()=> (window as any).recoveryHarness.running(true));assert.equal(await button.count(),0);await page.evaluate(()=> (window as any).recoveryHarness.running(false));await button.waitFor();assert.equal(await button.count(),1);assert.equal(await page.locator('[data-turn="1"]').getByRole('button',{name:'Retry failed request',exact:true}).count(),0);
 await Promise.all([page.waitForResponse(response=>response.url().includes('/request-recovery')&&response.request().method()==='GET'),page.evaluate(()=> (window as any).recoveryHarness.select('other-session'))]);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));assert.equal(await button.count(),0);assert.equal(await page.locator('[data-request-recovery]').count(),0,'absent stock checkpoint protocol is silent');
 await page.evaluate(()=> (window as any).recoveryHarness.select('session-a'));await button.waitFor();
 let release!:()=>void;const original=f.nativeLike.retry;f.nativeLike.retry=async command=>{await new Promise<void>(r=>release=r);return original(command);};
 await button.click();const pendingButton=page.getByRole('button',{name:'Retrying…',exact:true});assert.equal(await pendingButton.isDisabled(),true);await pendingButton.evaluate((node:HTMLButtonElement)=>node.click());release();
 await page.getByText('Recovery accepted; native execution started (not completed).',{exact:true}).waitFor();assert.equal(f.commands.length,1);assert.equal(f.calls(),1);assert.deepEqual(Object.keys(f.commands[0]).sort(),['checkpointId','expectedRevision','operationId','sessionId']);
 // A different native checkpoint is a new capability. Browser budget/provider fields never exist.
 f.setState({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'available',checkpoint:{...checkpoint,checkpointId:'checkpoint-new',revision:4}});
 f.nativeLike.retry=original;await page.evaluate(()=> (window as any).recoveryHarness.pulse());await button.waitFor();await button.click();await page.getByText('Recovery rejected: checkpoint-stale',{exact:true}).waitFor();
 // Lose an accepted response, then retry the identical native command rather than creating another operation.
 f.setState({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'available',checkpoint:{...checkpoint,checkpointId:'checkpoint-lost-response'}});
 await page.evaluate(()=> (window as any).recoveryHarness.pulse());await button.waitFor();
 let lost=true;await page.route('**/request-recovery',async route=>{if(route.request().method()==='POST'&&lost){lost=false;await route.fetch();await route.abort();}else await route.continue();});
 const before=f.commands.length;await button.click();await page.getByText('Recovery transport unavailable; retrying uses the same operation identity.',{exact:true}).waitFor();
 await button.click();await page.getByText('Recovery accepted; native execution started (not completed).',{exact:true}).waitFor();
 assert.equal(f.commands.length,before+2);assert.equal(f.commands[before].operationId,f.commands[before+1].operationId);assert.equal(f.calls(),3);
 await page.evaluate(()=> (window as any).recoveryHarness.setEnabled(false));assert.equal(await button.count(),0);assert.equal(await page.locator('[data-request-recovery]').count(),0);
 f.setState({protocol:'dsh.request-recovery.v1',lifetime:'process-local',status:'unavailable',reason:'checkpoint-stale'});
 await page.evaluate(()=>{(window as any).recoveryHarness.setEnabled(true);});await page.getByText('Recovery unavailable: checkpoint-stale',{exact:true}).first().waitFor();
 await page.evaluate(()=> (window as any).recoveryHarness.stop());assert.equal(await page.locator('[data-request-recovery]').count(),0);
});
