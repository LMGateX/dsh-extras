import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

test('emitted compaction and model entries edit the same accepted policy without duplicate native writes',{timeout:60000},async()=>{
 const browserCode=(await build({entryPoints:[new URL('./shared-compaction-browser.fixture.js',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 let document:any={revision:3,defaults:{enabled:true,rules:[]},workspaceOverrides:{}};let writes=0;
 const server=createServer(async(req,res)=>{if(req.url==='/view.js'){res.setHeader('content-type','text/javascript');res.end(browserCode);return;}if(req.url?.endsWith('/shared-compaction')){res.setHeader('content-type','application/json');if(req.method==='PUT'){let body='';for await(const c of req)body+=c;const candidate=JSON.parse(body);if(candidate.expectedRevision!==document.revision){res.statusCode=409;res.end(JSON.stringify({current:document}));return;}writes++;document={revision:document.revision+1,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};}res.end(JSON.stringify(document));return;}res.setHeader('content-type','text/html');res.end('<div id="root"></div><script src="/view.js"></script>');});
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');
 let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+address.port);
 const first=page.locator('[data-entry=compact]').getByRole('group',{name:'Compaction-request reasoning',exact:true});const second=page.locator('[data-entry=model]').getByRole('group',{name:'Compaction-request reasoning',exact:true});
 await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).waitFor();
 await page.waitForFunction(()=>!document.querySelector('[data-entry=compact] fieldset input')?.hasAttribute('disabled'));
 assert.equal(await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),true);
 await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).uncheck();await first.getByRole('button',{name:'Save policy',exact:true}).click();
 await page.waitForFunction(()=>{const checkbox=document.querySelector('[data-entry=model] fieldset[aria-label="Compaction-request reasoning"] input') as HTMLInputElement|null;return checkbox!==null&&checkbox.checked===false;});
 assert.equal(await second.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),false);assert.equal(writes,1);assert.equal(document.defaults.enabled,false);
 await first.getByRole('button',{name:'Add rule',exact:true}).click();
 const scope=page.locator('[data-entry=compact]').getByRole('button',{name:'Select policy scope',exact:true});
 assert.equal(await scope.isDisabled(),true,'scope changes cannot discard an unsaved policy');
 await second.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();await second.getByRole('button',{name:'Save policy',exact:true}).click();
 await first.getByRole('alert').filter({hasText:'Configuration changed'}).waitFor();
 assert.equal(await first.getByRole('group',{name:'Rule 1',exact:true}).count(),1,'concurrent acceptance retains the dirty rule');
 assert.equal(await first.getByRole('button',{name:'Save policy',exact:true}).isDisabled(),true);
 await first.getByRole('button',{name:'Discard policy draft',exact:true}).click();
 assert.equal(await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),true);
 assert.equal(writes,2);assert.deepEqual(errors,[]);await page.evaluate(()=>(window as any).unmount());
 }finally{await browser?.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
