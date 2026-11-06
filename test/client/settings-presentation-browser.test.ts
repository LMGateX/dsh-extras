import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {access, cp, mkdir, mkdtemp, readFile, realpath, rm, symlink} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {build} from 'esbuild';
import {chromium, type Page} from '@playwright/test';

const root = new URL('../../', import.meta.url).pathname;
const dependency = createRequire(new URL('../../package.json', import.meta.url));
const modules = {
  'compact-context':{zh:'上下文压缩',en:'Compact-context'},
  retry:{zh:'流式与空响应重试',en:'Stream and empty-response retry'},
  chime:{zh:'会话提示音',en:'Session chime'},
  goalWait:{zh:'目标等待',en:'Goal wait'},
};
type ModuleId = keyof typeof modules;
const distributions: {name:string;ids:ModuleId[];field: string;draft:string;value:unknown}[] = [
  {name:'dsh-extras',ids:['compact-context','retry','chime','goalWait'],field:'guidanceText',draft:'Unsaved guidance / 保留草稿',value:'Unsaved guidance / 保留草稿'},
  {name:'dsh-extras-compact-context',ids:['compact-context'],field:'guidanceText',draft:'Unsaved guidance / 保留草稿',value:'Unsaved guidance / 保留草稿'},
  {name:'dsh-extras-retry',ids:['retry'],field:'providers',draft:'Route/Exact-Case',value:['Route/Exact-Case']},
  {name:'dsh-extras-chime',ids:['chime'],field:'durationMs',draft:'3000',value:3000},
  {name:'dsh-extras-goal-wait',ids:['goalWait'],field:'maxHoldMs',draft:'2500',value:2500},
];
const chinese = /[\u3400-\u9fff]/;

async function titles(page: Page, ids: ModuleId[], language:'zh'|'en') {
  assert.equal(await page.locator('[data-package] > h2').textContent(), language === 'zh' ? 'Extras 设置' : 'Extras settings');
  assert.deepEqual(await page.locator('[data-module]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-module'))),ids);
  for (const id of ids) {
    const section = page.locator('[data-module="'+id+'"]');
    assert.equal(await section.locator(':scope > h3').textContent(),modules[id][language]);
    assert.equal(await section.getAttribute('aria-label'),modules[id][language]);
  }
}

async function chineseControls(page: Page, ids: ModuleId[]) {
  // Public presentation, not a translated dictionary snapshot: technical IDs,
  // native model names, user drafts and config paths must NOT be translated.
  for (const id of ids) {
    const section = page.locator('[data-module="'+id+'"]');
    for (const text of await section.locator('label, button, small').allTextContents()) {
      assert.match(text,chinese,id+': control labels, help and actions must be Chinese: '+text);
    }
    assert.doesNotMatch(await section.innerText(), /Runtime status unavailable|Save policy|Discard draft|Reset to inherited|Enable compaction-request reasoning/);
  }
  if (ids.includes('compact-context')) {
    const delay = page.locator('[data-module="compact-context"] [data-field="retryDelayMs"]');
    assert.match(await delay.locator('label').innerText(),/秒/);
    assert.match(await delay.locator('small').innerText(),/0[–—~-]60.*秒/);
    assert.equal(await delay.locator('input').inputValue(),'1.5','seconds UI preserves millisecond config conversion');
    const ptc = page.locator('[data-module="compact-context"] [data-field="ptcTimeoutMs"]');
    assert.match(await ptc.locator('label').innerText(),/秒/);
    assert.equal(await ptc.locator('input').inputValue(),'30');
  }
  if (ids.includes('goalWait')) {
    const hold = page.locator('[data-module="goalWait"] [data-field="maxHoldMs"]');
    assert.match(await hold.locator('label').innerText(),/毫秒/);
    assert.match(await hold.locator('small').innerText(),/0/);
  }
  if (ids.includes('chime')) {
    const form = page.getByRole('form',{name:'会话铃声设置',exact:true});
    await form.waitFor();
    assert.match(await form.locator('#dsh-session-chime-durationMs').locator('..').innerText(),/毫秒/);
    assert.ok(await form.getByRole('button',{name:'保存',exact:true}).count());
    assert.ok(await form.getByRole('button',{name:'放弃草稿',exact:true}).count());
  }
}

async function presentation(page: Page, theme:'light'|'dark') {
  await page.evaluate(name=>(window as any).setTheme(name),theme);
  const measured = await page.evaluate(() => {
    const style = (element:Element) => {
      const s=getComputedStyle(element);
      return {tag:element.tagName,text:(element.textContent ?? '').slice(0,60),border:parseFloat(s.borderTopWidth),borderStyle:s.borderTopStyle,
        radius:parseFloat(s.borderTopLeftRadius),padding:parseFloat(s.paddingLeft),vertical:parseFloat(s.paddingTop),
        background:s.backgroundColor,color:s.color,boxSizing:s.boxSizing};
    };
    return {
      cards:[...document.querySelectorAll('[data-module]:not([data-module="chime"]), [data-module="chime"] form > section')].map(style),
      controls:[...document.querySelectorAll('[data-package] textarea, [data-package] select, [data-package] button, [data-package] input:not([type="checkbox"]):not([type="range"]):not([type="time"])')].map(style),
      muted:[...document.querySelectorAll('[data-module]:not([data-module="chime"]) small')].map(node=>getComputedStyle(node).color),
      width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    };
  });
  const palette = theme === 'light' ? {
    text:'rgb(31, 41, 55)',muted:'rgb(88, 99, 116)',foreground:'rgb(255, 255, 255)',accent:'rgb(37, 99, 235)',
    backgrounds:['rgb(248, 250, 252)','rgb(241, 245, 249)','rgb(255, 255, 255)','rgb(37, 99, 235)','rgb(219, 234, 254)'],
  } : {
    text:'rgb(226, 232, 240)',muted:'rgb(148, 163, 184)',foreground:'rgb(15, 23, 42)',accent:'rgb(96, 165, 250)',
    backgrounds:['rgb(17, 24, 39)','rgb(30, 41, 59)','rgb(15, 23, 42)','rgb(96, 165, 250)','rgb(23, 37, 84)'],
  };
  assert.ok(measured.cards.length>0,'actual settings cards exist');
  assert.ok(measured.controls.length>0,'actual editable controls exist');
  for (const card of measured.cards) {
    assert.ok(card.border>=1 && card.borderStyle!=='none',JSON.stringify({theme,card}));
    assert.ok(card.radius>=4 && card.padding>=8 && card.vertical>=8,JSON.stringify({theme,card}));
    assert.ok(palette.backgrounds.includes(card.background),JSON.stringify({theme,card}));
    assert.equal(card.color,palette.text,JSON.stringify({theme,card}));
  }
  for (const control of measured.controls) {
    assert.ok(control.border>=1 && control.borderStyle!=='none',JSON.stringify({theme,control}));
    assert.ok(control.radius>=4 && control.padding>=6 && control.vertical>=4,JSON.stringify({theme,control}));
    assert.ok(palette.backgrounds.includes(control.background),JSON.stringify({theme,control}));
    assert.ok([palette.text,palette.foreground,palette.muted,palette.accent].includes(control.color),JSON.stringify({theme,control}));
    if(control.tag!=='BUTTON') assert.equal(control.boxSizing,'border-box',JSON.stringify({theme,control}));
  }
  for (const color of measured.muted) assert.equal(color,palette.muted,'help text follows native secondary text color');
  assert.ok(measured.scrollWidth<=measured.width+1,'narrow settings must not horizontally overflow: '+JSON.stringify(measured));
}

// Build and pack exactly as selected-payload.test.ts does. No source-only entry,
// release output mutation, profile install, live GUI, or persistent web server.
test('all five actual packed settings localize, retain drafts and use native themed presentation', {timeout:180000}, async t => {
  const sandbox=await mkdtemp('/tmp/dxp-presentation-');
  const env={PATH:process.env.PATH,HOME:join(sandbox,'home'),DSH_HOME:join(sandbox,'dsh'),
    XDG_CONFIG_HOME:join(sandbox,'config'),XDG_CACHE_HOME:join(sandbox,'cache'),XDG_DATA_HOME:join(sandbox,'data'),
    npm_config_cache:join(sandbox,'npm'),TMPDIR:sandbox};
  for(const path of Object.values(env)) if(path?.startsWith(sandbox)) await mkdir(path,{recursive:true});
  try {
    const fixture=join(sandbox,'fixture'); await mkdir(fixture);
    for(const path of ['package.json','scripts','src','client','assets','README.md','LICENSE','THIRD_PARTY_NOTICES.md']) {
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
    execFileSync(process.execPath,['scripts/build.mjs'],{cwd:fixture,env,stdio:'pipe'});
    execFileSync(process.execPath,['scripts/pack.mjs'],{cwd:fixture,env,stdio:'pipe'});
    const {version}=JSON.parse(await readFile(join(fixture,'package.json'),'utf8'));
    const packedClients=new Map<string,string>();
    const packedManifests=new Map<string,any>();
    for(const {name} of distributions) {
      const archive=join(fixture,'artifacts',name+'-'+version+'.tgz');
      const packed=execFileSync('tar',['-xOf',archive,'package/lib/client.js'],{encoding:'utf8',env});
      assert.equal(packed,await readFile(join(fixture,'dist',name,'lib/client.js'),'utf8'),name+': load the exact packed build output');
      packedClients.set(name,packed);
      packedManifests.set(name,JSON.parse(execFileSync('tar',['-xOf',archive,'package/package.json'],{encoding:'utf8',env})));
    }
    const harness=(await build({entryPoints:[join(root,'test/client/settings-presentation-browser.fixture.js')],bundle:true,write:false,
      platform:'browser',format:'iife',alias:{react:dependency.resolve('react'),'react-dom/client':dependency.resolve('react-dom/client')}})).outputFiles[0]!.text;
    let goalRuntime:any;
    const server=createServer((req,res)=>{
      const url=new URL(req.url ?? '/', 'http://127.0.0.1');
      if(url.pathname==='/harness.js'){res.setHeader('content-type','text/javascript');res.end(harness);return;}
      const name=url.pathname.slice(1).replace(/\.js$/,'');
      if(url.pathname.endsWith('.js') && packedClients.has(name)){res.setHeader('content-type','text/javascript');res.end(packedClients.get(name));return;}
      if(url.pathname.endsWith('/status')) {
        const status=Object.fromEntries(Object.keys(modules).map(id=>[id,{phase:'missing-dependency',ready:false,enabled:true,reason:'Waiting for services: syntheticService',
          capabilities:{tools:{phase:'unavailable',reason:'tool dependencies are unavailable'},compactionReasoning:{phase:'unavailable',reason:'no native LLM runtime is available'}}}]));
        if(goalRuntime) status.goalWait=goalRuntime;
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
      for(const distribution of distributions) {
        const {name,ids,field,draft,value}=distribution;
        await t.test(name+': packed manifest orders the optional native locale service',()=>{
          assert.ok(packedManifests.get(name).dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'),
            name+': the fixture must not hide missing native locale load ordering');
        });
        // Each scenario gets its own browser context, native service instances,
        // accepted config, storage and page lifetime.
        const scenario=async (locale:string,run:(page:Page)=>Promise<void>)=>{
          const context=await browser!.newContext({viewport:{width:360,height:800}});
          const page=await context.newPage();page.setDefaultTimeout(4000);
          const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
          try {
            await page.goto(origin+'/'+name+'?locale='+locale);
            await page.locator('[data-package]').waitFor();
            await run(page);
            assert.deepEqual(await page.evaluate(()=>(window as any).unload()),{form:0,locale:0},'unload releases form and locale subscriptions');
            assert.deepEqual(errors,[],name+': no browser errors');
          } finally {await context.close();}
        };
        await t.test(name+': absent optional locale falls back to Chinese',()=>scenario('absent',async page=>{
          await titles(page,ids,'zh'); await chineseControls(page,ids);
          assert.equal(await page.evaluate(()=>(window as any).localeSubscriberCount()),0);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        }));
        await t.test(name+': controls and cards follow light/dark tokens without narrow overflow',()=>scenario('en',async page=>{
          await presentation(page,'light'); await presentation(page,'dark');
          await page.setViewportSize({width:960,height:800});await presentation(page,'light');
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
        }));
        await t.test(name+': owned runtime notices and conflict alerts follow Chinese and native error colors',()=>scenario('zh',async page=>{
          await page.getByRole('status').filter({hasText:'syntheticService'}).first().waitFor();
          for (const id of ids) {
            const notices = await page.locator('[data-module="'+id+'"] [role="status"]').allTextContents();
            assert.ok(notices.some(text=>text.includes('等待服务：syntheticService')));
            assert.ok(notices.every(text=>!text.includes('Waiting for services:') && !text.includes('dependencies are unavailable') && !text.includes('no native LLM runtime')));
          }
          const id = ids[0]!;
          const section = page.locator('[data-module="'+id+'"]');
          const control = id==='chime' ? section.locator('#dsh-session-chime-durationMs') : section.locator('[data-field="'+field+'"] textarea, [data-field="'+field+'"] input');
          await control.fill(draft);
          await page.evaluate(()=>(window as any).externalUpdate());
          const alert = section.getByRole('alert').first(); await alert.waitFor();
          assert.match(await alert.innerText(),chinese);
          for (const [theme,color] of [['light','#dc2626'],['dark','#fca5a5']] as const) {
            await page.evaluate(({theme,color})=>{(window as any).setTheme(theme);document.documentElement.style.setProperty('--dsw-alias-state-error-primary',color);},{theme,color});
            assert.equal(await alert.evaluate(node=>getComputedStyle(node).color),theme==='light'?'rgb(220, 38, 38)':'rgb(252, 165, 165)');
          }
          await page.evaluate(()=>(window as any).setLocale('en'));
          await page.getByRole('heading',{name:'Extras settings',exact:true}).waitFor();
          assert.match(await alert.innerText(),/configuration changed/i);
        }));
        for(const id of ids.filter(id=>id!=='chime')) await t.test(name+': '+id+' grouped policy is atomic across language switch, reset, conflict and permission fences',()=>scenario('en',async page=>{
          const specs = {
            retry:{name:'retry-policy',fields:['errorCodes','providers','retryEmptyResponse'],edits:{errorCodes:'EXACT',providers:'',retryEmptyResponse:false},expected:[['errorCodes',['EXACT']],['providers',[]],['retryEmptyResponse',false]]},
            'compact-context':{name:'compact-timeouts',fields:['retryAttempts','retryDelayMs','ptcTimeoutMs','ptcModelTimeouts'],edits:{retryAttempts:'0',retryDelayMs:'0.125',ptcTimeoutMs:'0',ptcModelTimeouts:''},expected:[['retryAttempts',0],['retryDelayMs',125],['ptcTimeoutMs',0],['ptcModelTimeouts',{}]]},
            goalWait:{name:'goal-policy',fields:['strategy','waitForJobs','waitForSubagents','maxHoldMs'],edits:{strategy:'replacement',waitForJobs:false,waitForSubagents:false,maxHoldMs:'0'},expected:[['strategy','replacement'],['waitForJobs',false],['waitForSubagents',false],['maxHoldMs',0]]},
          };
          const spec=specs[id as keyof typeof specs];
          const group=page.locator('[data-group="'+spec.name+'"]');
          const control=(field:string)=>group.locator('#'+name+'-'+field);
          const edit=async(field:string,value:unknown)=>{
            const node=control(field);
            if(typeof value==='boolean') await node.setChecked(value);
            else if(field==='strategy') await node.selectOption(String(value));
            else await node.fill(String(value));
          };
          const before=await page.evaluate(()=>(window as any).accepted());
          for(const [field,value] of Object.entries(spec.edits)) await edit(field,value);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],'typing and booleans only stage');
          for(const language of ['zh','en']) {
            await page.evaluate(language=>(window as any).setLocale(language),language);
            await group.getByRole('button',{name:language==='zh'?'保存':'Save',exact:true}).waitFor();
            for(const [field,value] of Object.entries(spec.edits)) {
              if(typeof value==='boolean') assert.equal(await control(field).isChecked(),value);
              else assert.equal(await control(field).inputValue(),value);
            }
          }
          await group.getByRole('button',{name:'Save',exact:true}).click();
          await page.waitForFunction(()=>(window as any).accepted().revision===8);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[{revision:7,ops:spec.expected.map(([field,value])=>({op:'set',path:['modules',id,field],value}))}]);
          const after=await page.evaluate(()=>(window as any).accepted());
          for(const sibling of Object.keys(before.value.modules).filter(key=>key!==id)) assert.deepEqual(after.value.modules[sibling],before.value.modules[sibling]);
          const reset=group.getByRole('button',{name:'Reset to inherited',exact:true});
          await reset.click();assert.equal(await page.evaluate(()=>(window as any).writes.length),1,'reset sends nothing before Save');
          await group.getByRole('button',{name:'Discard draft',exact:true}).click();
          assert.equal(await group.getByRole('button',{name:'Save',exact:true}).isDisabled(),true,'discard clears all pending unsets');
          await reset.click();
          await group.getByRole('button',{name:'Save',exact:true}).click();
          await page.waitForFunction(()=>(window as any).accepted().revision===9);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes.at(-1)),{revision:8,ops:spec.fields.map(field=>({op:'unset',path:['modules',id,field]}))});
          // Preserve a stale group without rebasing when another module changes.
          const field=spec.fields[0]!;const value=spec.edits[field as keyof typeof spec.edits];
          await edit(field,value);
          await page.evaluate(()=>(window as any).externalUpdate());
          await group.getByRole('alert').first().waitFor();
          assert.equal(await group.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
          assert.equal(await control(field).inputValue(),String(value),'foreign accepted updates retain the draft');
          await group.getByRole('button',{name:'Discard draft',exact:true}).click();
          for(const patch of [{writable:false},{writable:true,status:'loading'},{status:'unavailable'},{status:'ready',revision:undefined}]) {
            await page.evaluate(patch=>(window as any).setFormState(patch),patch);
            assert.equal(await control(field).isDisabled(),true,'all non-writable/unfenced states disable edits');
            assert.equal(await reset.isDisabled(),true);
          }
        }));
        if(ids.includes('compact-context')) await t.test(name+': packed watermarks validate and save live fields without enabling independent features',()=>scenario('en',async page=>{
          const section=page.locator('[data-module="compact-context"]');
          const ratio=section.locator('[data-field="notifyAtRatio"]');
          const step=section.locator('[data-field="pressureStep"]');
          await ratio.locator('input').fill('1');await ratio.getByRole('button',{name:'Save',exact:true}).click();
          await ratio.getByRole('alert').waitFor();assert.deepEqual(await page.evaluate(()=>(window as any).writes),[]);
          await ratio.locator('input').fill('0');await ratio.getByRole('button',{name:'Save',exact:true}).click();
          await page.waitForFunction(()=>(window as any).accepted().revision===8);
          await step.locator('input').fill('50');await step.getByRole('button',{name:'Save',exact:true}).click();
          await page.waitForFunction(()=>(window as any).accepted().revision===9);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[
            {revision:7,ops:[{op:'set',path:['modules','compact-context','notifyAtRatio'],value:0}]},
            {revision:8,ops:[{op:'set',path:['modules','compact-context','pressureStep'],value:50}]},
          ]);
          const accepted=await page.evaluate(()=>(window as any).accepted().value.modules['compact-context']);
          assert.equal(accepted.compactTool,false);assert.equal(accepted.compactionReasoning.enabled,false);
          assert.match(await ratio.innerText(),/Updates live.*next.*pressure prompt/);
        }));
        if(ids.includes('goalWait')) await t.test(name+': bilingual live requested/mounted/fallback/host status never treats an unavailable mount as active',async()=>{
          try {
            goalRuntime={phase:'active',ready:true,enabled:true,capabilities:{continuation:{phase:'active'}},details:{goalWait:{requested:'replacement',mounted:'host-driver+gate',fallback:'audited host pin mismatch',host:{distribution:'0.2.2-alpha.3',cordis:'4.19',driverSha256:'abc123'}}}};
            await scenario('en',async page=>{
              const driver=page.locator('[data-goal-driver]');
              await driver.getByText('Requested:',{exact:false}).waitFor();
              assert.match(await driver.innerText(),/Requested:.*replacement[\s\S]*Mounted:.*host-driver\+gate[\s\S]*Fallback: audited host pin mismatch[\s\S]*Host: 0.2.2-alpha.3.*abc123/);
              await page.evaluate(()=>(window as any).setLocale('zh'));
              await driver.getByText('请求策略：',{exact:false}).waitFor();
              assert.match(await driver.innerText(),/请求策略：.*replacement[\s\S]*实际挂载：.*host-driver\+gate[\s\S]*回退原因：.*pin mismatch[\s\S]*宿主：.*abc123/);
              assert.match(await page.locator('[data-module="goalWait"]').innerText(),/外部重复撤销激活.*无法区分.*replacement/);
              goalRuntime={...goalRuntime,phase:'unavailable',ready:false};
              await driver.getByText('尚未确认实际驱动已生效',{exact:false}).waitFor();
              assert.doesNotMatch(await driver.innerText(),/实际挂载：/);
              await page.evaluate(()=>(window as any).setLocale('en'));
              await driver.getByText('Actual driver not confirmed active',{exact:false}).waitFor();
              assert.doesNotMatch(await driver.innerText(),/Mounted:/);
            });
          } finally {goalRuntime=undefined;}
        });
        await t.test(name+': subscribed locale switches retain drafts and module-scoped writes',()=>scenario('en',async page=>{
          await titles(page,ids,'en');
          const id=ids[0]!;
          const section=page.locator('[data-module="'+id+'"]');
          const groupName=id==='retry'?'retry-policy':id==='goalWait'?'goal-policy':undefined;
          const fieldRoot=id==='chime' ? section.locator('form') : groupName ? section.locator('[data-group="'+groupName+'"]') : section.locator('[data-field="'+field+'"]');
          const control=id==='chime' ? fieldRoot.locator('#dsh-session-chime-durationMs') : section.locator('[data-field="'+field+'"] textarea, [data-field="'+field+'"] input');
          const original=await control.inputValue();
          await control.fill(draft);
          const identity=await control.elementHandle();assert.ok(identity);
          const policy=section.getByRole('group',{name:'Compaction-request reasoning',exact:true});
          let policyIdentity:Awaited<ReturnType<typeof control.elementHandle>>|undefined;
          if(id==='compact-context') {
            await policy.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();
            await policy.getByRole('button',{name:'Add rule',exact:true}).click();
            const rule=policy.getByRole('group',{name:'Rule 1',exact:true});
            await rule.getByRole('combobox',{name:'Match scope',exact:true}).selectOption('provider-model');
            await rule.getByRole('textbox',{name:'Provider route ID',exact:true}).fill('Route/Exact-Case');
            await rule.getByRole('textbox',{name:'Model ID',exact:true}).fill('Model/Exact-Case');
            await rule.getByRole('combobox',{name:'Action',exact:true}).selectOption('fixed');
            const effort=rule.getByRole('textbox',{name:'Native effort ID',exact:true});
            await effort.fill('Opaque:MAX/Case');policyIdentity=await effort.elementHandle();
          }
          const before=await page.evaluate(()=>(window as any).accepted());
          assert.ok(await page.evaluate(()=>(window as any).localeSubscriberCount())>0,'the optional native locale is subscribed');
          for(const language of ['zh','en'] as const) {
            await page.evaluate(language=>(window as any).setLocale(language),language);
            await page.getByRole('heading',{name:language==='zh'?'Extras 设置':'Extras settings',exact:true}).waitFor();
            await titles(page,ids,language);
            if(language==='zh') await chineseControls(page,ids);
            assert.equal(await control.inputValue(),draft,'unsaved field survives locale repaint');
            assert.equal(await control.evaluate((element,previous)=>element===previous,identity),true,'locale change does not remount the field');
            if(policyIdentity) {
              assert.equal(await policyIdentity.evaluate(element=>(element as HTMLInputElement).value),'Opaque:MAX/Case');
              assert.equal(await policyIdentity.evaluate(element=>element.isConnected),true,'policy draft is not remounted');
              assert.deepEqual(await section.getByRole('group',{name:language==='zh'?'压缩请求推理':'Compaction-request reasoning',exact:true}).getByRole('textbox').evaluateAll(nodes=>nodes.map(node=>(node as HTMLInputElement).value)),['Route/Exact-Case','Model/Exact-Case','Opaque:MAX/Case']);
            }
            assert.equal(await page.evaluate(()=>(window as any).viewRegistrations),1,'no slot registration/remount on language change');
            assert.deepEqual(await page.evaluate(()=>(window as any).accepted()),before,'locale changes do not mutate accepted configuration or its revision');
            assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],'drafts and locale changes never write configuration');
          }
          if(id==='compact-context') {
            await policy.getByRole('button',{name:'Discard policy draft',exact:true}).click();
            assert.equal(await policy.getByRole('group',{name:'Rule 1',exact:true}).count(),0);
          }
          await fieldRoot.getByRole('button',{name:id==='chime'?'Discard':'Discard draft',exact:true}).click();
          assert.equal(await control.inputValue(),original);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],'discard is local-only');
          await control.fill(draft);
          assert.deepEqual(await control.evaluate((element: HTMLInputElement) => ({valid:element.validity.valid, stepMismatch:element.validity.stepMismatch})), {valid:true,stepMismatch:false}, 'the test enters a valid native control value before submitting');
          await fieldRoot.getByRole('button',{name:'Save',exact:true}).click();
          await page.waitForFunction(()=>(window as any).accepted().revision===8);
          assert.deepEqual(await page.evaluate(()=>(window as any).writes),[{revision:7,ops:[{op:'set',path:['modules',id,field],value}]}]);
          const expected=structuredClone(before);expected.revision=8;expected.value.modules[id][field]=value;
          assert.deepEqual(await page.evaluate(()=>(window as any).accepted()),expected,'save changes exactly the selected module field, preserving every sibling');
          if(id!=='chime') {
            await fieldRoot.getByRole('button',{name:'Reset to inherited',exact:true}).click();
            if(groupName) {
              assert.equal(await page.evaluate(()=>(window as any).accepted().revision),8,'group Reset is staged until Save');
              await fieldRoot.getByRole('button',{name:'Save',exact:true}).click();
            }
            await page.waitForFunction(()=>(window as any).accepted().revision===9);
            const resetFields=id==='retry'?['errorCodes','providers','retryEmptyResponse']:id==='goalWait'?['strategy','waitForJobs','waitForSubagents','maxHoldMs']:[field];
            assert.deepEqual(await page.evaluate(()=>(window as any).writes.at(-1)),{revision:8,ops:resetFields.map(field=>({op:'unset',path:['modules',id,field]}))});
          } else {
            // The preserved chime editor stages its toggle and saves exactly the
            // same chime.enabled field, not a new translated/config alias.
            await fieldRoot.locator('#dsh-session-chime-enabled').uncheck();
            await fieldRoot.getByRole('button',{name:'Save',exact:true}).click();
            await page.waitForFunction(()=>(window as any).accepted().revision===9);
            assert.deepEqual(await page.evaluate(()=>(window as any).writes.at(-1)),{revision:8,ops:[{op:'set',path:['modules','chime','enabled'],value:false}]});
          }
          if(id==='compact-context') {
            await policy.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).check();
            await policy.getByRole('button',{name:'Add rule',exact:true}).click();
            await policy.getByRole('button',{name:'Save policy',exact:true}).click();
            await page.waitForFunction(()=>(window as any).accepted().revision===10);
            assert.deepEqual(await page.evaluate(()=>(window as any).writes.at(-1)),{revision:9,ops:[{op:'set',path:['modules','compact-context','compactionReasoning'],value:{enabled:true,rules:[{scope:'all',mode:'inherit'}]}}]});
          }
        }));
      }
    } finally {await browser?.close();server.close();await once(server,'close');}
  } finally {
    assert.equal(dirname(await realpath(sandbox)),'/tmp','Cleanup stays inside the allocated absolute disposable root.');
    await rm(sandbox,{recursive:true,force:true});
  }
});
