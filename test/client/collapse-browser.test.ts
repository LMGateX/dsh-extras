import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {access, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';

const root = new URL('../../', import.meta.url).pathname;
const dependency = createRequire(new URL('../../package.json', import.meta.url));
const modules = {'compact-context':{},retry:{},chime:{},goalWait:{}};
const distributions=[{name:'dsh-extras'},{name:'dsh-extras-retry'}];
for (const delivery of ['emitted','packed'] as const) test(delivery+' collapse hides mounted drafts and does not write configuration', {timeout:180000}, async () => {
  const sandbox=await mkdtemp('/tmp/dxp-presentation-');
  const env={PATH:process.env.PATH,HOME:join(sandbox,'home'),DSH_HOME:join(sandbox,'dsh'),DSH_PROFILE:'collapse',
    XDG_CONFIG_HOME:join(sandbox,'config'),XDG_CACHE_HOME:join(sandbox,'cache'),XDG_DATA_HOME:join(sandbox,'data'),
    npm_config_cache:join(sandbox,'npm'),TMPDIR:sandbox};
  for(const path of Object.values(env)) if(path?.startsWith(sandbox)) await mkdir(path,{recursive:true});
  try {
    const fixture=join(sandbox,'fixture'); await mkdir(fixture);
    for(const path of ['package.json','scripts','src','client','assets','README.md','LICENSE','THIRD_PARTY_NOTICES.md','docs/PUBLIC_PACKAGE_TYPES.md']) {
      await cp(join(root,path),join(fixture,path),{recursive:true});
    }
    let dependencyRoot:string|undefined;
    for(const candidate of dependency.resolve.paths('esbuild') ?? []) {
      try {
        await Promise.all(['esbuild/package.json','@deepseek-ai/dsh/package.json','react/package.json'].map(path=>access(join(candidate,path))));
        dependencyRoot=await realpath(candidate);break;
      } catch { /* Discover existing read-only dependencies; never install into a profile. */ }
    }
    assert.ok(dependencyRoot,'Existing build dependencies are required; no implicit dependency installs.');
    await symlink(dependencyRoot,join(fixture,'node_modules'),'dir');
    if(delivery==='packed') execFileSync(process.execPath,['scripts/build.mjs'],{cwd:fixture,env,stdio:'pipe'});
    if(delivery==='packed') execFileSync(process.execPath,['scripts/pack.mjs'],{cwd:fixture,env,stdio:'pipe'});
    const {version}=JSON.parse(await readFile(join(fixture,'package.json'),'utf8'));
    const packedClients=new Map<string,string>();
    for(const {name} of distributions) {
      if(delivery==='emitted') {
        const ids=name==='dsh-extras'?['compact-context','retry','chime','goalWait']:['retry'];
        const entry='import {createExtrasClient} from "./client/composition.ts"; window.__ModuleLoader__.load({id:'+JSON.stringify(name)+',factory(require){return createExtrasClient('+JSON.stringify({rowId:name,packageName:name,moduleIds:ids})+',require("react"));}});';
        const emitted=await build({stdin:{contents:entry,resolveDir:fixture,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});
        packedClients.set(name,emitted.outputFiles[0]!.text);continue;
      }
      const archive=join(fixture,'artifacts',name+'-'+version+'.tgz');
      const packed=execFileSync('tar',['-xOf',archive,'package/lib/client.js'],{encoding:'utf8',env});
      assert.equal(packed,await readFile(join(fixture,'dist',name,'lib/client.js'),'utf8'),name+': load the exact packed build output');
      packedClients.set(name,packed);
    }
    if(delivery==='emitted') {
      const entry='import {createSettingsView} from "./client/settings-core.ts"; window.__ModuleLoader__.load({id:"slot-fixture",factory(require){const React=require("react"); const model=()=>React.createElement("div",{"data-editor-slot":"model","data-extras-dirty":false},"Model policy editor",React.createElement("button",{type:"button"},"Discard native draft")); const retry=()=>React.createElement("p",{"data-editor-slot":"retry"},"Native retry editor"); const shared=props=>React.createElement("p",{"data-editor-slot":"shared","data-target-module":props.moduleId},"Shared policy editor");return {inject:["slots","configForms"],apply(ctx){const View=createSettingsView(React,{rowId:"slot-fixture",packageName:"slot-fixture",moduleIds:["model-policy","retry"]},undefined,undefined,shared,undefined,ctx.get("locale"),model,retry);ctx.effect(()=>ctx.slots.register({name:"plugins.bundle.config"},View));}};}});';
      packedClients.set('slot-fixture',(await build({stdin:{contents:entry,resolveDir:fixture,loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'})).outputFiles[0]!.text);
    }
    const harness=(await build({entryPoints:[join(root,'test/client/collapse-browser.fixture.js')],bundle:true,write:false,
      platform:'browser',format:'iife',alias:{react:dependency.resolve('react'),'react-dom/client':dependency.resolve('react-dom/client')}})).outputFiles[0]!.text;
    const server=createServer((req,res)=>{
      const url=new URL(req.url ?? '/', 'http://127.0.0.1');
      if(url.pathname==='/harness.js'){res.setHeader('content-type','text/javascript');res.end(harness);return;}
      const name=url.pathname.slice(1).replace(/\.js$/,'');
      if(url.pathname.endsWith('.js') && packedClients.has(name)){res.setHeader('content-type','text/javascript');res.end(packedClients.get(name));return;}
      if(url.pathname.endsWith('/status')) {
        const status=Object.fromEntries(Object.keys(modules).map(id=>[id,{phase:'missing-dependency',ready:false,enabled:true,reason:'Waiting for services: syntheticService',
          capabilities:{tools:{phase:'standby',reason:'tool dependencies are unavailable'},compactionReasoning:{phase:'unavailable',reason:'no native LLM runtime is available'}}}]));
        res.setHeader('content-type','application/json');res.end(JSON.stringify({modules:status}));return;
      }
      if(!packedClients.has(name)){res.statusCode=404;res.end();return;}
      res.setHeader('content-type','text/html');
      res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:12px;font:14px/1.5 system-ui;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1)}</style></head><body><div id="root"></div><script>window.__DSH_BOOT__={entries:[]};</script><script src="/harness.js"></script><script src="/'+name+'.js"></script></body></html>');
    });
    server.listen(0,'127.0.0.1');await once(server,'listening');
    const address=server.address();assert.ok(address && typeof address==='object');
    const origin='http://127.0.0.1:'+address.port;
    let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
    try {
      browser=await chromium.launch({headless:true,executablePath:process.env.DSH_EXTRAS_CHROMIUM,env:{...env,PATH:env.PATH ?? ''},args:['--no-sandbox']});

      const page=await browser.newPage({viewport:{width:360,height:800}});page.setDefaultTimeout(3000);
      const pageErrors: string[] = []; page.on('pageerror', error => pageErrors.push(error.message));
      for(const {name} of distributions){
        await page.goto(origin+'/'+name+'?locale=en');await page.locator('[data-package]').waitFor();
        const section=page.locator('[data-module="retry"]');
        const control=section.locator('[data-field="providers"] textarea');await control.fill('UNSAVED/Exact');
        const identity=await control.elementHandle();
        const subscribers=await page.evaluate(()=>[(window as any).formSubscriberCount(),(window as any).localeSubscriberCount()]);
        const summary=section.locator(':scope > [data-collapse-summary]');
        await summary.filter({hasText:'Unsaved changes'}).waitFor();
        const toggle=section.locator(':scope > h3 button');
        await toggle.click();assert.equal(await control.isVisible(),false);
        assert.equal(await toggle.getAttribute('aria-expanded'),'false');
        assert.match(await summary.innerText(),/Unsaved changes/);
        assert.deepEqual(await page.evaluate(()=>[(window as any).formSubscriberCount(),(window as any).localeSubscriberCount()]),subscribers,'collapse does not unsubscribe mounted editors');
        await page.evaluate(()=>(window as any).setFormState({revision:8}));
        await section.locator('[data-group="retry-policy"] [role="alert"]').waitFor({state:'attached'});
        await summary.filter({hasText:/Errors: [1-9]/}).waitFor();
        await toggle.press('Enter');assert.equal(await control.inputValue(),'UNSAVED/Exact');
        assert.equal(await control.evaluate((node,old)=>node===old,identity),true);
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        const group=section.locator('[data-collapse-group]').first();
        const groupToggle=group.locator(':scope > h4 button');
        await control.focus(); await groupToggle.evaluate((node:HTMLButtonElement)=>node.click());
        assert.equal(await groupToggle.evaluate(node=>document.activeElement===node),true,'hiding a focused editor returns focus to its disclosure');
        assert.equal(await control.isVisible(),false);
        await groupToggle.press('Space');assert.equal(await control.isVisible(),true);
        await page.getByRole('button',{name:'Collapse all',exact:true}).click();
        assert.equal(await page.locator('[data-collapse-body]:visible').count(),0);
        await page.evaluate(()=>(window as any).setLocale('zh'));
        await page.getByRole('button',{name:'全部展开',exact:true}).click();
        assert.match(await summary.innerText(),/有未保存.*错误/);
        await page.evaluate(()=>(window as any).setLocale('en'));
        for(const theme of ['light','dark']) {
          await page.evaluate(theme=>(window as any).setTheme(theme),theme);
          const bulk=page.getByRole('button',{name:'Expand all',exact:true});
          const style=await bulk.evaluate(node=>({border:parseFloat(getComputedStyle(node).borderTopWidth),radius:parseFloat(getComputedStyle(node).borderRadius),background:getComputedStyle(node).backgroundColor,color:getComputedStyle(node).color}));
          assert.ok(style.border>=1 && style.radius>=4,'collapse controls must use native themed button styling');
          assert.equal(style.background,theme==='light'?'rgb(255, 255, 255)':'rgb(15, 23, 42)');
          assert.equal(style.color,theme==='light'?'rgb(31, 41, 55)':'rgb(226, 232, 240)');
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'narrow collapse controls do not overflow');
        }
        assert.equal(await control.inputValue(),'UNSAVED/Exact');
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        if(name==='dsh-extras') {
          await page.getByRole('status').filter({hasText:'Tools runtime: standby'}).waitFor();
          for(const spec of [
            {module:'compact-context',selector:'[data-field="guidanceText"] textarea',draft:'unsaved guidance'},
            {module:'goalWait',selector:'[data-field="maxHoldMs"] input',draft:'1234'},
            ...(delivery==='packed'?[{module:'chime',selector:'#dsh-session-chime-durationMs',draft:'3000'}]:[]),
          ]) {
            const module=page.locator('[data-module="'+spec.module+'"]');
            const field=module.locator(spec.selector);await field.fill(spec.draft);
            const node=await field.elementHandle();
            await module.locator(':scope > h3 button').click();
            assert.equal(await field.isVisible(),false);
            await module.locator(':scope > [data-collapse-summary]').filter({hasText:'Unsaved changes'}).waitFor();
            await module.locator(':scope > h3 button').press('Space');
            assert.equal(await field.inputValue(),spec.draft);
            assert.equal(await field.evaluate((current,old)=>current===old,node),true);
          }
        }
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        assert.deepEqual(await page.evaluate(()=>(window as any).unload()),{form:0,locale:0});
      }
      if(delivery==='emitted') {
        await page.goto(origin+'/slot-fixture?locale=en');
        await page.locator('[data-editor-slot="model"]').waitFor();
        await page.locator('[data-editor-slot="retry"]').waitFor();
        const model=page.locator('[data-module="model-policy"]');
        assert.equal(await model.locator('input[data-field="enabled"]').isChecked(),false,'new module stays default-off');
        assert.equal(await model.locator('[data-editor-slot="shared"]').getAttribute('data-target-module'),'model-policy');
        assert.equal(await model.locator('[data-collapse-group]').count(),2);
        await model.locator(':scope > [data-collapse-summary]').filter({hasText:'No pending draft'}).waitFor();
        assert.equal(await page.locator('[data-module="retry"] [data-collapse-group]').count(),2);
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        assert.deepEqual(await page.evaluate(()=>(window as any).unload()),{form:0,locale:0});
      }
      assert.deepEqual(pageErrors,[], 'settings render and collapse without browser errors');
    } finally {await browser?.close();server.close();await once(server,'close');}
  } finally {await rm(sandbox,{recursive:true,force:true});}
});
