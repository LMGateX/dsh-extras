import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

/** Deterministic canonical route + emitted public settings; no private editor inspection. */
async function openShared(t:any,initial:any) {
 const code=(await build({entryPoints:[new URL('./shared-compaction-browser.fixture.js',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 let accepted=structuredClone(initial);let writes=0;let hold=false;let release:()=>void=()=>{};
 const server=createServer(async(req,res)=>{
  if(req.url==='/view.js'){res.setHeader('content-type','text/javascript');res.end(code);return;}
  if(req.url?.endsWith('/shared-compaction')){
   res.setHeader('content-type','application/json');
   if(req.method==='PUT'){
    let text='';for await(const chunk of req)text+=chunk;const candidate=JSON.parse(text);
    if(hold)await new Promise<void>(resolve=>{release=resolve;});
    if(candidate.expectedRevision!==accepted.revision){res.statusCode=409;res.end(JSON.stringify({current:accepted}));return;}
    writes++;accepted={revision:accepted.revision+1,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};
   }
   res.end(JSON.stringify(accepted));return;
  }
  res.setHeader('content-type','text/html');res.end('<div id="root"></div><script src="/view.js"></script>');
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');assert.notEqual(address.port,3080);
 const browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 t.after(async()=>{release();try{await page.evaluate(()=>(window as any).unmount());}catch{}await browser.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
 await page.goto('http://127.0.0.1:'+address.port);
 const compact=page.locator('[data-entry=compact]');const model=page.locator('[data-entry=model]');
 const control=(entry:any)=>entry.getByRole('group',{name:'Compaction-request reasoning',exact:true});
 const picker=(entry:any)=>entry.getByRole('combobox',{name:'Compaction policy scope',exact:true});
 const badge=(entry:any)=>entry.getByRole('status',{name:'Accepted compaction policy',exact:true});
 await badge(compact).waitFor();
 return {page,compact,model,control,picker,badge,errors,document:()=>structuredClone(accepted),writes:()=>writes,
  external(defaults:any){accepted={...accepted,revision:accepted.revision+1,defaults};},
  hold(){hold=true;},release(){hold=false;release();}};
}

test('opaque workspace IDs inherit global without prototype lookups or scope writes',{timeout:30000},async t=>{
 const view=await openShared(t,{revision:4,defaults:{enabled:true,rules:[]},workspaceOverrides:{}});
 await view.picker(view.compact).selectOption('workspace');
 await view.compact.getByRole('textbox',{name:'Compaction workspace ID',exact:true}).fill('toString');
 await view.badge(view.compact).filter({hasText:'Inherited from global defaults'}).waitFor();
 assert.equal(await view.control(view.compact).getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),true);
 assert.equal(view.writes(),0);assert.deepEqual(view.document().workspaceOverrides,{});assert.deepEqual(view.errors,[]);
});




test('shared workspace policies preserve false and empty overrides, inherit global updates and reset only the selected workspace',{timeout:30000},async t=>{
 const orphan={enabled:false,rules:[]};
 const view=await openShared(t,{revision:5,defaults:{enabled:true,rules:[{scope:'all',mode:'inherit'}]},workspaceOverrides:{'Deleted:ID':orphan}});
 const {page,compact,model,picker,control,badge}=view;
 const first=control(compact),second=control(model);
 await picker(compact).selectOption('native:Opaque%3AA');await picker(model).selectOption('native:Opaque%3AB');
 await badge(compact).filter({hasText:'Inherited from global defaults'}).waitFor();
 assert.match(await badge(model).innerText(),/enabled.*rules: 1/);assert.equal(view.writes(),0);
 await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).uncheck();
 await first.getByRole('button',{name:'Remove rule',exact:true}).click();
 assert.equal(await picker(compact).isDisabled(),true);assert.equal(view.writes(),0);
 await first.getByRole('button',{name:'Save policy',exact:true}).click();
 await badge(compact).filter({hasText:'Custom workspace policy'}).waitFor();
 assert.deepEqual(view.document(),{revision:6,defaults:{enabled:true,rules:[{scope:'all',mode:'inherit'}]},workspaceOverrides:{'Deleted:ID':orphan,'Opaque:A':{enabled:false,rules:[]}}});
 assert.match(await badge(model).innerText(),/Inherited.*enabled.*rules: 1/);
 // Another accepted global update changes B's inheritance, never A's explicit false/empty.
 view.external({enabled:false,rules:[]});await page.evaluate(()=>(window as any).refreshShared());
 await badge(model).filter({hasText:'disabled · rules: 0'}).waitFor();
 assert.match(await badge(compact).innerText(),/Custom.*disabled.*rules: 0/);
 await second.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();
 await second.getByRole('button',{name:'Save policy',exact:true}).click();await badge(model).filter({hasText:'Custom workspace policy'}).waitFor();
 assert.deepEqual(view.document().workspaceOverrides['Opaque:B'],{enabled:true,rules:[]});
 // A clean reset still locks both entry selectors until its canonical acknowledgement.
 view.hold();const response=page.waitForResponse(r=>r.request().method()==='PUT'&&r.url().endsWith('/shared-compaction'));
 await first.getByRole('button',{name:'Reset workspace policy to global now',exact:true}).click();
 assert.equal(await picker(compact).isDisabled(),true);assert.equal(await picker(model).isDisabled(),true);
 assert.equal(view.writes(),2,'pending reset is not another accepted write');
 view.release();await response;await badge(compact).filter({hasText:'Inherited from global defaults'}).waitFor();
 assert.deepEqual(view.document().workspaceOverrides,{'Deleted:ID':orphan,'Opaque:B':{enabled:true,rules:[]}});
 assert.deepEqual(view.document().defaults,{enabled:false,rules:[]});assert.equal(view.writes(),3);
 await page.reload();await badge(compact).waitFor();await picker(compact).selectOption('native:Opaque%3AA');
 await badge(compact).filter({hasText:'Inherited from global defaults'}).waitFor();
 await picker(model).selectOption('native:Opaque%3AB');await badge(model).filter({hasText:'Custom workspace policy'}).waitFor();
 assert.equal(await second.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),true);
 // Saved unregistered policy stays reachable even if native discovery fails.
 await page.evaluate(()=>(window as any).setWorkspaces({items:[],state:'error',phase:'ready',error:{code:'fixture/disconnected',message:'private-error-never-render'}}));
 assert.equal(await picker(compact).locator('option').filter({hasText:'Deleted:ID'}).count(),1);
 await picker(compact).selectOption('native:Deleted%3AID');await badge(compact).filter({hasText:'Custom workspace policy'}).waitFor();
 assert.equal(await page.getByText('private-error-never-render',{exact:false}).count(),0);
 await picker(compact).selectOption('workspace');const input=compact.getByRole('textbox',{name:'Compaction workspace ID',exact:true});
 await input.fill('');assert.equal(await first.getByRole('button',{name:'Save policy',exact:true}).isDisabled(),true);
 assert.equal(await first.getByRole('button',{name:'Reset workspace policy to global now',exact:true}).isDisabled(),true);
 assert.equal(view.writes(),3);assert.deepEqual(view.document().defaults,{enabled:false,rules:[]});assert.deepEqual(view.errors,[]);
});

test('emitted compaction and model entries edit the same accepted policy without duplicate native writes',{timeout:60000},async()=>{
 const browserCode=(await build({entryPoints:[new URL('./shared-compaction-browser.fixture.js',import.meta.url).pathname],bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text;
 let document:any={revision:3,defaults:{enabled:true,rules:[]},workspaceOverrides:{},legacyImport:{phase:'unavailable'}};let writes=0;
 const server=createServer(async(req,res)=>{if(req.url==='/view.js'){res.setHeader('content-type','text/javascript');res.end(browserCode);return;}if(req.url?.endsWith('/shared-compaction')){res.setHeader('content-type','application/json');if(req.method==='PUT'){let body='';for await(const c of req)body+=c;const candidate=JSON.parse(body);if(candidate.expectedRevision!==document.revision){res.statusCode=409;res.end(JSON.stringify({current:document}));return;}writes++;document={revision:document.revision+1,defaults:candidate.defaults,workspaceOverrides:candidate.workspaceOverrides};}res.end(JSON.stringify(document));return;}res.setHeader('content-type','text/html');res.end('<div id="root"></div><script src="/view.js"></script>');});
 server.listen(0,'127.0.0.1');await once(server,'listening');const address=server.address();assert.ok(address&&typeof address==='object');
 let browser;try{browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,args:['--no-sandbox']});const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+address.port);
 const first=page.locator('[data-entry=compact]').getByRole('group',{name:'Compaction-request reasoning',exact:true});const second=page.locator('[data-entry=model]').getByRole('group',{name:'Compaction-request reasoning',exact:true});
 await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).waitFor();
 const picker=page.locator('[data-entry=compact]').getByRole('combobox',{name:'Compaction policy scope',exact:true});
 assert.equal(await picker.count(),1,'shared policy offers native global/workspace scope selection');
 assert.equal(await picker.locator('option').filter({hasText:'Workspace A'}).count(),1);
 assert.equal(await picker.locator('option').filter({hasText:'Workspace B'}).count(),1);
 assert.equal(await picker.locator('option').filter({hasText:'Global defaults'}).count(),1);
 assert.equal(writes,0,'scope discovery creates no overrides');
 await page.waitForFunction(()=>!document.querySelector('[data-entry=compact] fieldset input')?.hasAttribute('disabled'));
 assert.equal(await page.getByRole('alert').filter({hasText:'Legacy policy import is unavailable'}).count(),2,'both entry surfaces expose import diagnostics without raw rule data');
 assert.equal(await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),true);
 await first.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).uncheck();await first.getByRole('button',{name:'Save policy',exact:true}).click();
 await page.waitForFunction(()=>{const checkbox=document.querySelector('[data-entry=model] fieldset[aria-label="Compaction-request reasoning"] input') as HTMLInputElement|null;return checkbox!==null&&checkbox.checked===false;});
 assert.equal(await second.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),false);assert.equal(writes,1);assert.equal(document.defaults.enabled,false);
 await first.getByRole('button',{name:'Add rule',exact:true}).click();
 const scope=page.locator('[data-entry=compact]').getByRole('combobox',{name:'Compaction policy scope',exact:true});
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
