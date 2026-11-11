import assert from 'node:assert/strict';
import test from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import type { TestContext } from 'node:test';
import { execFile, spawn } from 'node:child_process';
import { chromium, expect } from '@playwright/test';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { parse } from 'yaml';
import { once } from 'node:events';
import { createHash } from 'node:crypto';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'package.json'));
const dshManifest = require.resolve('@deepseek-ai/dsh/package.json');
const dshPackage = JSON.parse(await readFile(dshManifest, 'utf8'));
const cli = join(dirname(dshManifest), dshPackage.bin.dsh);
const version = JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const artifacts = resolve(process.env.DSH_EXTRAS_ARTIFACT_DIR ?? join(root, 'artifacts'));

function environment(temp: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME:temp, DSH_HOME:join(temp,'dsh-home'), TMPDIR:process.env.TMPDIR, XDG_CACHE_HOME:join(temp,'cache'), XDG_CONFIG_HOME:join(temp,'config'), XDG_DATA_HOME:join(temp,'data'), npm_config_cache:join(temp,'npm-cache'), CI:'1', NO_COLOR:'1' };
}

async function native(temp: string, args: string[], env = environment(temp)) {
  try { return (await run(process.execPath, [cli, ...args], { cwd:temp, env, timeout:120000, maxBuffer:8*1024*1024 })).stdout; }
  catch (error: any) { throw new Error('Native DSH failed: ' + args.join(' ') + '\n' + String(error.stdout ?? '') + String(error.stderr ?? ''), {cause:error}); }
}

test('native CLI installs packed combined distribution into isolated web profile', {timeout:180000}, async t => {
  const temp = await mkdtemp(join(root,'.sandbox-native-'));
  let stopNative=async()=>{};let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
  t.after(async()=>{await browser?.close();await stopNative();if(process.env.DSH_EXTRAS_KEEP_NATIVE)console.log('Retained native acceptance sandbox:',temp);else{assert.ok(temp.startsWith(join(root,'.sandbox-native-')));await rm(temp,{recursive:true,force:true});}});
  const seed=process.env.DSH_EXTRAS_NATIVE_SEED;
  if(seed){assert.ok(resolve(seed).startsWith(join(root,'.sandbox-native-')),'Cache seed must be a retained test sandbox');await cp(join(seed,'cache'),join(temp,'cache'),{recursive:true});await cp(join(seed,'data'),join(temp,'data'),{recursive:true});}
  const profile = 'acceptance';
  const initial = await native(temp,['--profile',profile,'--from-default-profile','web','--dump-config']);
  assert.ok(initial.includes('web-app'));
  const installed = await native(temp,['plugin','--profile',profile,'add',join(artifacts,'dsh-extras-'+version+'.tgz'),'--ignore-scripts','--no-optional','--config.auto-install-peers=false',...(seed?['--offline']:[])]);
  assert.ok(installed.includes('dsh-extras'));
  const packageFile = join(environment(temp).DSH_HOME!,'profiles',profile,'package.json');
  const pkg = JSON.parse(await readFile(packageFile,'utf8'));
  assert.ok(pkg.dependencies['dsh-extras']);
  const composed = parse(await native(temp,['--profile',profile,'--dump-config']),{customTags:[{tag:'tag:yaml.org,2002:js',resolve:(value:string)=>value}]});
  assert.ok(JSON.stringify(composed).includes('dsh-extras'));
  const child = spawn(process.execPath,[cli,'--profile',profile,'--host','127.0.0.1','--port','0','--no-open'],{cwd:temp,env:environment(temp),stdio:['ignore','pipe','pipe'],detached:true});
  const exited = once(child,'close'); let log = '';
  const clean = (text:string) => text.replace(/(https?:\/\/[^\s?#]+)[^\s]*/g,'$1/[redacted]');
  stopNative=async()=>{if(child.exitCode===null&&child.signalCode===null){process.kill(-child.pid!,'SIGTERM');const force=setTimeout(()=>{try{process.kill(-child.pid!,'SIGKILL');}catch{}},8000);force.unref();await exited;clearTimeout(force);}};
  const url = await new Promise<string>((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Native startup timed out\n'+clean(log))),30000);
    const capture=(data:Buffer)=>{log+=data;const match=log.match(/dsh web: (https?:\/\/\S+)/);if(match){clearTimeout(timeout);resolve(match[1]!);}};
    child.stdout!.on('data',capture);child.stderr!.on('data',capture);child.once('exit',code=>{clearTimeout(timeout);reject(new Error('Native exit '+code+'\n'+clean(log)));});child.once('error',reject);
  });
  assert.notEqual(new URL(url).port,'3080');
  browser=await chromium.launch({executablePath:process.env.DSH_EXTRAS_CHROMIUM,headless:true,args:['--no-sandbox'],env:environment(temp) as Record<string,string>});
  const page=await browser.newPage();page.setDefaultTimeout(5000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text().split('\n')[0]!.slice(0,500));});
  await page.goto(url);await page.waitForFunction(()=>Boolean((globalThis as any).__DSH_BOOT__));
  const entry=await page.evaluate(()=>((globalThis as any).__DSH_BOOT__.entries as any[]).find(entry=>entry.id==='dsh-extras'));
  assert.ok(entry);assert.equal(entry.inject.includes('@deepseek-ai/dsh-client-ui-settings'),true);
  const served=await page.request.get(new URL(entry.url,url).href);assert.equal(served.status(),200);
  const packedClient=await readFile(join(environment(temp).DSH_HOME!,'profiles',profile,'node_modules','dsh-extras','lib','client.js'));
  const sha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
  const normalize=(value:Buffer)=>value.toString().replace(/\/\/# sourceMappingURL=[^\r\n]*\s*$/,'').replace(/\n;\s*$/,'\n').trimEnd();
  assert.equal(sha(normalize(await served.body())),sha(normalize(packedClient)),'only native source-map trailer and concat separator differ from installed packed client');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('dialog',{name:'Get started',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Plugins',exact:true}).click();
  await page.getByText('dsh-extras',{exact:true}).first().waitFor({timeout:15000});
  assert.equal(await page.getByText('dsh-extras',{exact:true}).count(),1);
  await page.getByRole('button',{name:'View dsh-extras',exact:true}).click();
  await page.getByRole('button',{name:'Configure dsh-extras',exact:true}).click();
  await page.locator('[data-package="dsh-extras"]').waitFor();
  assert.equal(await page.locator('[data-module]').count(),5);
  const moduleStatus=await page.evaluate(async()=>{const response=await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'});return {code:response.status,body:await response.json()};});
  assert.equal(moduleStatus.code,200);assert.equal(moduleStatus.body.modules.chime.ready,true);
  assert.equal(moduleStatus.body.modules['compact-context'].phase,'active','context adapter activates without a global engine in stock web presets');
  assert.deepEqual(Object.keys(moduleStatus.body.modules).sort(),['chime','compact-context','goalWait','model-policy','retry']);
  assert.equal(moduleStatus.body.modules['model-policy'].enabled,false);
  assert.equal(moduleStatus.body.modules['model-policy'].phase,'disabled');
  await page.getByRole('button',{name:'Expand all',exact:true}).click();
  console.log('Native module phases:',Object.fromEntries(Object.entries(moduleStatus.body.modules).map(([id,value])=>[id,(value as any).phase])));
  const patchFile=join(environment(temp).DSH_HOME!,'profiles',profile,'cordis.patch.yml');
  const readModules=async()=>parse(await readFile(patchFile,'utf8')).find((row:any)=>row.id==='dsh-extras')?.config?.modules ?? {};
  const waitSaved=async(predicate:(modules:any)=>boolean,label:string)=>{
    const deadline=Date.now()+8000;
    for(;;){const modules=await readModules();if(predicate(modules))return modules;
      assert.ok(Date.now()<deadline,'Native ConfigEditor did not persist '+label);
      await new Promise(resolve=>setTimeout(resolve,25));}
  };
  const timeoutGroup=page.locator('[data-group="compact-timeouts"]');
  const delay=timeoutGroup.locator('[data-field="retryDelayMs"]');
  const beforeTimeoutDraft=await readFile(patchFile,'utf8');
  await delay.locator('input').fill('3.5');
  await timeoutGroup.locator('[data-field="retryAttempts"] input').fill('0');
  await timeoutGroup.locator('[data-field="ptcTimeoutMs"] input').fill('300');
  assert.equal(await readFile(patchFile,'utf8'),beforeTimeoutDraft,'group draft does not write before Save');
  await timeoutGroup.getByRole('button',{name:'Save',exact:true}).click();
  await waitSaved(modules=>modules['compact-context']?.retryDelayMs===3500&&modules['compact-context']?.retryAttempts===0&&modules['compact-context']?.ptcTimeoutMs===300000,'atomic timeout group');
  assert.deepEqual(await timeoutGroup.getByRole('alert').allTextContents(),[]);
  const retryGroup=page.locator('[data-group="retry-policy"]');
  const beforeRetryDraft=await readFile(patchFile,'utf8');
  await retryGroup.getByRole('checkbox',{name:'Retry empty model responses',exact:true}).uncheck();
  await retryGroup.locator('[data-field="providers"] textarea').fill('parity-offline-route');
  assert.equal(await readFile(patchFile,'utf8'),beforeRetryDraft,'retry flag and route are staged together');
  await retryGroup.getByRole('button',{name:'Save',exact:true}).click();
  await waitSaved(modules=>modules.retry?.retryEmptyResponse===false&&modules.retry?.providers?.[0]==='parity-offline-route','atomic retry flag and route');
  const beforeReset=await readFile(patchFile,'utf8');
  await retryGroup.getByRole('button',{name:'Reset to inherited',exact:true}).click();
  assert.equal(await readFile(patchFile,'utf8'),beforeReset,'group reset is staged');
  await retryGroup.getByRole('button',{name:'Save',exact:true}).click();
  await waitSaved(modules=>modules.retry&&['errorCodes','providers','retryEmptyResponse'].every(key=>!Object.hasOwn(modules.retry,key)),'inherited retry policy including boolean unset');
  await page.waitForFunction(()=>Boolean((document.querySelector('[data-group="retry-policy"] [data-field="retryEmptyResponse"] input') as HTMLInputElement)?.checked));
  for(const [field,value] of [['notifyAtRatio','0.8'],['pressureStep','4']] as const){
    const control=page.locator('[data-module="compact-context"] [data-field="'+field+'"]');
    await control.locator('input').fill(value);await control.getByRole('button',{name:'Save',exact:true}).click();
    await waitSaved(modules=>modules['compact-context']?.[field]===Number(value),'editable '+field);
  }
  const goalGroup=page.locator('[data-group="goal-policy"]');
  const nativeRows=async()=>parse(await readFile(patchFile,'utf8')).filter((row:any)=>row.id==='goal-round-driver'||row.name==='@deepseek-ai/dsh-goal-round-driver');
  const nativeBefore=await nativeRows();
  for(const [strategy,mounted] of [['replacement','replacement-port'],['off','none'],['native','host-driver'],['activation','host-driver+gate']] as const){
    const beforeDraft=await readFile(patchFile,'utf8');
    await goalGroup.locator('[data-field="strategy"] select').selectOption(strategy);
    assert.equal(await readFile(patchFile,'utf8'),beforeDraft,'Goal strategy is staged until group Save');
    await goalGroup.getByRole('button',{name:'Save',exact:true}).click();
    await waitSaved(modules=>modules.goalWait?.strategy===strategy,'Goal strategy '+strategy);
    await page.waitForFunction(async({strategy,mounted})=>{
      const response=await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)return false;
      const state=(await response.json()).modules.goalWait;
      return state.enabled===true&&state.capabilities?.continuation?.phase==='active'&&state.details?.goalWait?.requested===strategy&&state.details.goalWait.mounted===mounted;
    },{strategy,mounted},{timeout:10000});
    await page.waitForFunction(()=>!(document.querySelector('[data-group="goal-policy"] select') as HTMLSelectElement)?.disabled);
    assert.deepEqual(await goalGroup.getByRole('alert').allTextContents(),[],'native strategy Save must be acknowledged, not only persisted');
    await page.locator('[data-goal-driver]').getByText('Mounted: '+mounted,{exact:false}).waitFor();
    assert.deepEqual(await nativeRows(),nativeBefore,'temporary driver suppression never persists native-row overrides');
  }
  const toolGroup=page.getByRole('group',{name:'Agent-facing compaction tools',exact:true});
  const compactSection=page.locator('[data-module="compact-context"]');
  const reasoning=compactSection.getByRole('group',{name:'Compaction-request reasoning',exact:true});
  const readPolicy=async()=>page.evaluate(async()=>{const response=await fetch('/extras/dsh-extras/shared-compaction',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Canonical compaction policy unavailable: '+response.status);return response.json();});
  const originalShared=await readPolicy();
  assert.equal(originalShared.defaults.enabled,false);
  assert.equal(await reasoning.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true}).isChecked(),false);
  await toolGroup.getByRole('checkbox',{name:'Expose compact_context',exact:true}).click();
  await toolGroup.getByRole('status').filter({hasText:'Tools runtime: disabled'}).waitFor().catch(async error=>{
    const runtime=await page.evaluate(async()=> (await (await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'})).json()).modules['compact-context']);
    throw new Error('Compaction tool disable was not confirmed: '+JSON.stringify({saved:(await readModules())['compact-context'],runtime,ui:await toolGroup.getByRole('status').allTextContents(),alerts:await page.getByRole('alert').allTextContents(),browserErrors:errors}),{cause:error});
  });
  await compactSection.getByRole('checkbox',{name:'Provide compaction reasoning from this module',exact:true}).click();
  await waitSaved(modules=>modules['compact-context']?.compactionReasoning?.enabled===true,'local compaction participation');
  const afterParticipation=await readPolicy();
  assert.deepEqual({revision:afterParticipation.revision,defaults:afterParticipation.defaults,workspaceOverrides:afterParticipation.workspaceOverrides},
    {revision:originalShared.revision,defaults:originalShared.defaults,workspaceOverrides:originalShared.workspaceOverrides},
    'Changing local participation must not seed, revise or enable the canonical master policy: '+JSON.stringify({before:originalShared,after:afterParticipation,localSaved:(await readModules())['compact-context']?.compactionReasoning}));
  const canonicalEnable=reasoning.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true});
  const enableBefore=afterParticipation;
  try {
    await expect(canonicalEnable).toBeEnabled();
    await expect(canonicalEnable).not.toBeChecked();
    await canonicalEnable.check();
    await expect(canonicalEnable).toBeChecked();
    await reasoning.getByRole('button',{name:'Save policy',exact:true}).click();
  }
  catch(cause) {
    const ui=await compactSection.evaluate(node=>({checkboxes:[...node.querySelectorAll('input[type=checkbox]')].map(input=>({checked:(input as HTMLInputElement).checked,disabled:(input as HTMLInputElement).disabled})),dirty:[...node.querySelectorAll('[data-extras-dirty]')].map(node=>node.getAttribute('data-extras-dirty')),alerts:[...node.querySelectorAll('[role=alert]')].map(node=>node.textContent)}));
    throw new Error('Canonical enable UI action failed: '+JSON.stringify({before:enableBefore,after:await readPolicy().catch(()=>({unavailable:true})),localSaved:(await readModules())['compact-context']?.compactionReasoning,ui,browserErrors:errors}),{cause});
  }
  await reasoning.getByRole('status').filter({hasText:'Reasoning runtime: active'}).waitFor().catch(async error=>{
    const runtime=await page.evaluate(async()=> (await (await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'})).json()).modules['compact-context']);
    throw new Error('Canonical reasoning not active: '+JSON.stringify({runtime,canonical:await readPolicy(),saved:(await readModules())['compact-context']?.compactionReasoning,ui:await reasoning.getByRole('status').allTextContents(),alerts:await compactSection.getByRole('alert').allTextContents(),browserErrors:errors}),{cause:error});
  });
  const rule=reasoning.getByRole('group',{name:'Rule 1',exact:true});
  await rule.getByRole('combobox',{name:'Match scope',exact:true}).selectOption('provider-model');
  await rule.getByRole('textbox',{name:'Provider route ID',exact:true}).fill('Synthetic/Exact-Route');
  await rule.getByRole('textbox',{name:'Model ID',exact:true}).fill('Synthetic/Exact-Model');
  await rule.getByRole('combobox',{name:'Action',exact:true}).selectOption('fixed');
  await rule.getByRole('textbox',{name:'Native effort ID',exact:true}).fill('Opaque:Effort/Case');
  await reasoning.getByRole('button',{name:'Save policy',exact:true}).click();
  // Canonical native storage authority, not a duplicated module profile field, is the oracle.
  await assert.doesNotReject(async()=>{
    const deadline=Date.now()+5000;
    while((await readPolicy())?.defaults?.rules?.[0]?.effort!=='Opaque:Effort/Case'){
      if(Date.now()>deadline)throw new Error('Native policy was not persisted');
      await new Promise(resolve=>setTimeout(resolve,25));
    }
  });
  const nativePolicyStatus=await page.evaluate(async()=> (await (await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'})).json()).modules['compact-context'].capabilities);
  assert.equal(nativePolicyStatus.compactionReasoning.phase,'active');assert.equal(nativePolicyStatus.tools.phase,'disabled');
  await page.getByRole('checkbox',{name:'Enable Stream and empty-response retry',exact:true}).click();
  await page.waitForFunction(()=>!(document.querySelector('[data-module=retry] input[data-field=enabled]') as HTMLInputElement)?.checked).catch(async error=>{
    const disk=parse(await readFile(join(environment(temp).DSH_HOME!,'profiles',profile,'cordis.patch.yml'),'utf8')).find((row:any)=>row.id==='dsh-extras')?.config?.modules;
    const runtime=await page.evaluate(async()=> (await (await fetch('/extras/dsh-extras/status',{credentials:'same-origin',cache:'no-store'})).json()).modules.retry);
    throw new Error('Retry toggle not accepted: '+JSON.stringify({saved:disk?.retry, runtime, alerts:await page.getByRole('alert').allTextContents(), browserErrors:errors}),{cause:error});
  });
  await page.getByRole('button',{name:'🔔 正常',exact:true}).click();
  await page.getByRole('button',{name:'🌙 休息中',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'🌙 休息中',exact:true}).waitFor();
  await page.getByRole('dialog',{name:'Get started',exact:true}).getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Plugins',exact:true}).click();
  await page.getByRole('button',{name:'View dsh-extras',exact:true}).click();
  await page.getByRole('button',{name:'Configure dsh-extras',exact:true}).click();
  await page.locator('[data-package="dsh-extras"]').waitFor();
  await page.getByRole('button',{name:'Expand all',exact:true}).click();
  assert.equal(await page.locator('[data-module="compact-context"] [data-field="retryDelayMs"] input').inputValue(),'3.5');
  assert.equal(await page.getByRole('checkbox',{name:'Enable Stream and empty-response retry',exact:true}).isChecked(),false);
  assert.equal(await toolGroup.getByRole('checkbox',{name:'Expose compact_context',exact:true}).isChecked(),false);
  await expect(reasoning.getByRole('checkbox',{name:'Enable compaction-request reasoning',exact:true})).toBeChecked();
  assert.equal(await rule.getByRole('textbox',{name:'Provider route ID',exact:true}).inputValue(),'Synthetic/Exact-Route');
  assert.equal(await rule.getByRole('textbox',{name:'Model ID',exact:true}).inputValue(),'Synthetic/Exact-Model');
  assert.equal(await rule.getByRole('textbox',{name:'Native effort ID',exact:true}).inputValue(),'Opaque:Effort/Case');
  const chimeSection=page.locator('[data-module="chime"]');
  await chimeSection.locator('#dsh-session-chime-enabled').uncheck();
  await chimeSection.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'🌙 休息中',exact:true}).waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-module]').count(),5,'disabled chime keeps sibling configuration available');
  assert.deepEqual(await chimeSection.getByRole('alert').allTextContents(),[]);
  const persisted=await readFile(join(environment(temp).DSH_HOME!,'profiles',profile,'cordis.patch.yml'),'utf8');
  const accepted=parse(persisted).find((row:any)=>row.id==='dsh-extras').config.modules;
  assert.equal(accepted['compact-context'].retryDelayMs,3500);
  assert.equal(accepted['compact-context'].retryAttempts,0);assert.equal(accepted['compact-context'].ptcTimeoutMs,300000);
  assert.equal(accepted['compact-context'].notifyAtRatio,0.8);assert.equal(accepted['compact-context'].pressureStep,4);
  assert.equal(accepted.goalWait.strategy,'activation');
  assert.ok(['errorCodes','providers','retryEmptyResponse'].every(key=>!Object.hasOwn(accepted.retry,key)),'group Reset removed explicit retry overrides');
  assert.equal(accepted['compact-context'].compactTool,false);
  assert.equal(accepted['compact-context'].compactionReasoning.enabled,true,'local participation remains independent');
  const canonical=await readPolicy();
  assert.ok(canonical.revision>originalShared.revision);
  assert.deepEqual(canonical.defaults,{enabled:true,rules:[{scope:'provider-model',provider:'Synthetic/Exact-Route',model:'Synthetic/Exact-Model',mode:'fixed',effort:'Opaque:Effort/Case'}]});
  assert.notEqual(accepted['model-policy']?.enabled,true,'editing shared compaction never enables new model policy');
  assert.equal(accepted.retry.enabled,false);assert.equal(accepted.chime.restMode,true);assert.equal(accepted.chime.enabled,false);
  assert.deepEqual(errors,[]);
  console.log('Native startup log:',clean(log).slice(-3000));
});

test('all six packed manifests compose through native CLI; distinct split peers coexist', {timeout:180000}, async t=>{
  const temp=await mkdtemp(join(root,'.sandbox-native-'));
  t.after(async()=>{assert.ok(temp.startsWith(join(root,'.sandbox-native-')));await rm(temp,{recursive:true,force:true});});
  const seed=process.env.DSH_EXTRAS_NATIVE_SEED;
  if(seed){assert.ok(resolve(seed).startsWith(join(root,'.sandbox-native-')));await cp(join(seed,'cache'),join(temp,'cache'),{recursive:true});await cp(join(seed,'data'),join(temp,'data'),{recursive:true});}
  const names=['dsh-extras','dsh-extras-compact-context','dsh-extras-retry','dsh-extras-chime','dsh-extras-goal-wait','dsh-extras-model-policy'];
  const flatten=(value:any):any[]=>Array.isArray(value)?value.flatMap(flatten):value&&typeof value==='object'?[...(typeof value.id==='string'?[value]:[]),...Object.values(value).flatMap(flatten)]:[];
  for(const [index,name] of names.entries()){
    const profile='compose-'+index;
    await native(temp,['--profile',profile,'--from-default-profile','web','--dump-config']);
    await native(temp,['plugin','--profile',profile,'add',join(artifacts,name+'-'+version+'.tgz'),'--ignore-scripts','--no-optional','--config.auto-install-peers=false',...(seed?['--offline']:[])]);
    const output=await native(temp,['--profile',profile,'--dump-config']);
    const rows=flatten(parse(output,{customTags:[{tag:'tag:yaml.org,2002:js',resolve:(value:string)=>value}]}));
    assert.equal(rows.filter(row=>row.id===name&&row.name===name).length,1,name+' inserted exactly once');
    const profileDir=join(environment(temp).DSH_HOME!,'profiles',profile);
    const pkg=JSON.parse(await readFile(join(profileDir,'package.json'),'utf8'));
    assert.ok(pkg.dependencies[name]);assert.ok(pkg.dsh.profile.bundles.includes(name));
    const manifest=JSON.parse(await readFile(join(profileDir,'node_modules',name,'package.json'),'utf8'));
    assert.equal(manifest.dsh.client.platform,'web');assert.equal(manifest.dsh.bundle.patch,'cordis.patch.yml');
  }
  const profile='split-peers';await native(temp,['--profile',profile,'--from-default-profile','web','--dump-config']);
  await native(temp,['plugin','--profile',profile,'add',...names.slice(1).map(name=>join(artifacts,name+'-'+version+'.tgz')),'--ignore-scripts','--no-optional','--config.auto-install-peers=false',...(seed?['--offline']:[])]);
  const peerRows=flatten(parse(await native(temp,['--profile',profile,'--dump-config']),{customTags:[{tag:'tag:yaml.org,2002:js',resolve:(value:string)=>value}]}));
  for(const name of names.slice(1))assert.equal(peerRows.filter(row=>row.id===name).length,1);
  assert.equal(peerRows.some(row=>row.id==='dsh-extras'),false);
});

/** Real CLI install + native web shell shared by the five independent split consumers. */
async function splitWebFixture(t: TestContext, suffix: string, moduleId: string) {
  // Chromium's process-singleton socket has a short Unix pathname limit,
  // including the caller's explicit disposable TMPDIR.
  const temp = await mkdtemp(join(tmpdir(), 'sw-'));
  const profile = 'isolated';
  const env: NodeJS.ProcessEnv = { ...environment(temp), TMPDIR: join(temp, 'tmp'), XDG_STATE_HOME: join(temp, 'state'), DSH_PROFILE: profile };
  await mkdir(env.TMPDIR!, { recursive: true });
  const name = 'dsh-extras-' + suffix;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let stop = async () => {};
  t.after(async () => { try { await browser?.close(); } finally { try { await stop(); } finally {
    assert.equal(dirname(temp), resolve(tmpdir())); assert.ok(temp.split('/').at(-1)!.startsWith('sw-'));
    await rm(temp, { recursive: true, force: true });
  } } });
  await native(temp, ['--profile', profile, '--from-default-profile', 'web', '--dump-config'], env);
  await native(temp, ['plugin', '--profile', profile, 'add', join(artifacts, name + '-' + version + '.tgz'), '--ignore-scripts', '--no-optional', '--config.auto-install-peers=false'], env);
  const profileDir = join(env.DSH_HOME!, 'profiles', profile);
  const installed = JSON.parse(await readFile(join(profileDir, 'package.json'), 'utf8'));
  assert.ok(installed.dependencies[name]);
  assert.equal(Object.keys(installed.dependencies).filter(id => id.startsWith('dsh-extras')).length, 1);
  const child = spawn(process.execPath, [cli, '--profile', profile, '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const exited = once(child, 'close'); let log = '';
  const clean = () => log.replace(/(https?:\/\/[^\s?#]+)[^\s]*/g, '$1/[redacted]');
  stop = async () => { if (child.exitCode === null && child.signalCode === null) {
    process.kill(-child.pid!, 'SIGTERM'); const force = setTimeout(() => { try { process.kill(-child.pid!, 'SIGKILL'); } catch {} }, 8000);
    force.unref(); try { await exited; } finally { clearTimeout(force); }
  } };
  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Split native startup timed out\n' + clean())), 30000);
    const capture = (data: Buffer) => { log += data; const match = log.match(/dsh web: (https?:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]!); } };
    child.stdout!.on('data', capture); child.stderr!.on('data', capture);
    child.once('exit', code => { clearTimeout(timeout); reject(new Error('Split native exit ' + code + '\n' + clean())); });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  assert.notEqual(new URL(url).port, '3080');
  browser = await chromium.launch({ executablePath: process.env.DSH_EXTRAS_CHROMIUM, headless: true, args: ['--no-sandbox'], env: env as Record<string, string> });
  const page = await browser.newPage(); page.setDefaultTimeout(10000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text().split('\n')[0]!.slice(0, 500)); });
  await page.goto(url); await page.waitForFunction(() => Boolean((globalThis as any).__DSH_BOOT__));
  const entries = await page.evaluate(() => (globalThis as any).__DSH_BOOT__.entries as any[]);
  assert.deepEqual(entries.filter(entry => entry.id.startsWith('dsh-extras')).map(entry => entry.id), [name]);
  const entry = entries.find(entry => entry.id === name)!;
  assert.ok(entry.inject.includes('@deepseek-ai/dsh-client-ui-settings'));
  const served = await page.request.get(new URL(entry.url, url).href); assert.equal(served.status(), 200);
  const normalize = (value: Buffer) => value.toString().replace(/\/\/# sourceMappingURL=[^\r\n]*\s*$/, '').replace(/\n;\s*$/, '\n').trimEnd();
  const sha = (value: string) => createHash('sha256').update(value).digest('hex');
  assert.equal(sha(normalize(await served.body())), sha(normalize(await readFile(join(profileDir, 'node_modules', name, 'lib', 'client.js')))), 'native served client matches this installed final archive');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const configure = async () => {
    await page.getByRole('dialog', { name: 'Get started', exact: true }).getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Plugins', exact: true }).click();
    await page.getByRole('button', { name: 'View ' + name, exact: true }).click();
    await page.getByRole('button', { name: 'Configure ' + name, exact: true }).click();
    await page.locator('[data-package="' + name + '"]').waitFor();
    assert.deepEqual(await page.locator('[data-module]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-module'))), [moduleId], 'split exposes no unrelated module UI');
    await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  };
  await configure();
  const status = () => page.evaluate(async name => {
    const response = await fetch('/extras/' + name + '/status', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Split native status ' + response.status);
    return response.json();
  }, name);
  const active = async () => { await expect.poll(async () => (await status()).modules[moduleId]?.phase).toBe('active'); };
  const initial = await status(); assert.deepEqual(Object.keys(initial.modules), [moduleId]);
  const readModules = async () => parse(await readFile(join(profileDir, 'cordis.patch.yml'), 'utf8')).find((row: any) => row.id === name)?.config?.modules ?? {};
  return { page, name, moduleId, errors, status, active, readModules, reload: async () => { await page.reload(); await configure(); } };
}

async function sharedPolicyRoundtrip(f: Awaited<ReturnType<typeof splitWebFixture>>) {
  const { page, moduleId, name } = f;
  const section = page.locator('[data-module="' + moduleId + '"]');
  const reasoning = section.getByRole('group', { name: 'Compaction-request reasoning', exact: true });
  const readPolicy = () => page.evaluate(async name => {
    const response = await fetch('/extras/' + name + '/shared-compaction', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Split canonical policy ' + response.status);
    return response.json();
  }, name);
  const initial = await readPolicy(); assert.equal(initial.defaults.enabled, false);
  await section.getByRole('checkbox', { name: 'Provide compaction reasoning from this module', exact: true }).click();
  await expect.poll(async () => (await f.readModules())[moduleId]?.compactionReasoning?.enabled).toBe(true);
  await reasoning.getByRole('checkbox', { name: 'Enable compaction-request reasoning', exact: true }).check();
  const rule = reasoning.getByRole('group', { name: 'Rule 1', exact: true });
  await rule.getByRole('combobox', { name: 'Match scope', exact: true }).selectOption('provider-model');
  await rule.getByRole('textbox', { name: 'Provider route ID', exact: true }).fill('Synthetic/Exact-Route');
  await rule.getByRole('textbox', { name: 'Model ID', exact: true }).fill('Synthetic/Exact-Model');
  await rule.getByRole('combobox', { name: 'Action', exact: true }).selectOption('fixed');
  await rule.getByRole('textbox', { name: 'Native effort ID', exact: true }).fill('Opaque:Effort/Case');
  await reasoning.getByRole('button', { name: 'Save policy', exact: true }).click();
  const globalPolicy = { enabled: true, rules: [{ scope: 'provider-model', provider: 'Synthetic/Exact-Route', model: 'Synthetic/Exact-Model', mode: 'fixed', effort: 'Opaque:Effort/Case' }] };
  await expect.poll(async () => (await readPolicy()).defaults).toEqual(globalPolicy);
  await expect.poll(async () => (await f.status()).modules[moduleId].capabilities.compactionReasoning.phase).toBe('active');
  const savedGlobal = await readPolicy(); assert.ok(savedGlobal.revision > initial.revision);
  const workspaceId = 'Opaque:Workspace/Case';
  const picker = section.getByRole('combobox', { name: 'Compaction policy scope', exact: true });
  const badge = section.getByRole('status', { name: 'Accepted compaction policy', exact: true });
  await picker.selectOption('workspace');
  await section.getByRole('textbox', { name: 'Compaction workspace ID', exact: true }).fill(workspaceId);
  await expect(badge).toContainText('Inherited from global defaults');
  await expect(rule.getByRole('textbox', { name: 'Native effort ID', exact: true })).toHaveValue('Opaque:Effort/Case');
  assert.equal((await readPolicy()).revision, savedGlobal.revision, 'scope navigation cannot create a workspace copy');
  await rule.getByRole('textbox', { name: 'Native effort ID', exact: true }).fill('Opaque:Effort/Workspace');
  await reasoning.getByRole('button', { name: 'Save policy', exact: true }).click();
  const workspacePolicy = { ...globalPolicy, rules: [{ ...globalPolicy.rules[0], effort: 'Opaque:Effort/Workspace' }] };
  await expect.poll(async () => (await readPolicy()).workspaceOverrides[workspaceId]).toEqual(workspacePolicy);
  assert.deepEqual((await readPolicy()).defaults, globalPolicy, 'workspace save never overwrites global policy');
  await expect(badge).toContainText('Custom workspace policy');
  return async () => {
    await expect(rule.getByRole('textbox', { name: 'Native effort ID', exact: true })).toHaveValue('Opaque:Effort/Case');
    await picker.selectOption('native:' + encodeURIComponent(workspaceId));
    await expect(badge).toContainText('Custom workspace policy');
    await expect(rule.getByRole('textbox', { name: 'Native effort ID', exact: true })).toHaveValue('Opaque:Effort/Workspace');
    assert.deepEqual((await readPolicy()).defaults, globalPolicy);
    assert.deepEqual((await readPolicy()).workspaceOverrides[workspaceId], workspacePolicy);
    await expect.poll(async () => (await f.status()).modules[moduleId].capabilities.compactionReasoning.phase).toBe('active');
  };
}

for (const [suffix, moduleId] of [['compact-context', 'compact-context'], ['model-policy', 'model-policy'], ['retry', 'retry'], ['chime', 'chime'], ['goal-wait', 'goalWait']] as const) {
  test('packed split whole GUI persists selected module only: ' + suffix, { timeout: 180000 }, async t => {
    const f = await splitWebFixture(t, suffix, moduleId); const { page } = f;
    const section = page.locator('[data-module="' + moduleId + '"]');
    if (moduleId === 'model-policy') {
      assert.equal((await f.status()).modules[moduleId].enabled, false);
      assert.equal((await f.status()).modules[moduleId].phase, 'disabled');
      await section.getByRole('checkbox', { name: 'Enable Model policy', exact: true }).click();
      await expect.poll(async () => (await f.readModules())[moduleId]?.enabled).toBe(true);
    }
    await f.active();
    let verifySaved: () => Promise<void>;
    if (moduleId === 'retry') {
      const policy = section.locator('[data-group="retry-policy"]');
      await policy.getByRole('checkbox', { name: 'Retry empty model responses', exact: true }).uncheck();
      await policy.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await f.readModules()).retry?.retryEmptyResponse).toBe(false);
      verifySaved = async () => { await expect(policy.getByRole('checkbox', { name: 'Retry empty model responses', exact: true })).not.toBeChecked(); };
    } else if (moduleId === 'chime') {
      await section.locator('#dsh-session-chime-durationMs').fill('3000');
      await section.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await f.readModules()).chime?.durationMs).toBe(3000);
      verifySaved = async () => { await expect(section.locator('#dsh-session-chime-durationMs')).toHaveValue('3000'); };
    } else if (moduleId === 'goalWait') {
      const policy = section.locator('[data-group="goal-policy"]');
      await policy.locator('[data-field="strategy"] select').selectOption('native');
      await policy.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await f.readModules()).goalWait?.strategy).toBe('native');
      verifySaved = async () => {
        await expect(policy.locator('[data-field="strategy"] select')).toHaveValue('native');
        await expect.poll(async () => (await f.status()).modules.goalWait.details?.goalWait?.mounted).toBe('host-driver');
        await expect.poll(async () => (await f.status()).modules.goalWait.capabilities?.continuation?.phase).toBe('active');
      };
      await verifySaved();
    } else if (moduleId === 'compact-context') {
      const control = section.locator('[data-field="notifyAtRatio"]');
      await control.locator('input').fill('0.8');
      await control.getByRole('button', { name: 'Save', exact: true }).click();
      await expect.poll(async () => (await f.readModules())[moduleId]?.notifyAtRatio).toBe(0.8);
      verifySaved = async () => { await expect(control.locator('input')).toHaveValue('0.8'); };
    } else {
      const models = section.getByRole('group', { name: 'Workspace model defaults', exact: true });
      const root = models.getByRole('group', { name: 'Root agent', exact: true });
      await root.getByRole('combobox', { name: 'Root agent mode', exact: true }).selectOption('exact');
      await root.getByRole('textbox', { name: 'Root agent provider', exact: true }).fill('Synthetic/Exact-Route');
      await root.getByRole('textbox', { name: 'Root agent model', exact: true }).fill('Synthetic/Exact-Model');
      await root.getByRole('textbox', { name: 'Root agent reasoningEffort', exact: true }).fill('Opaque:Effort/Case');
      await models.getByRole('button', { name: 'Save model policy', exact: true }).click();
      await expect.poll(async () => (await f.readModules())[moduleId]?.root).toEqual({ provider: 'Synthetic/Exact-Route', model: 'Synthetic/Exact-Model', reasoningEffort: 'Opaque:Effort/Case' });
      await expect.poll(async () => (await f.status()).modules[moduleId].capabilities.modelPolicy.phase).toBe('active');
      verifySaved = async () => {
        await expect(root.getByRole('textbox', { name: 'Root agent provider', exact: true })).toHaveValue('Synthetic/Exact-Route');
        await expect(root.getByRole('textbox', { name: 'Root agent model', exact: true })).toHaveValue('Synthetic/Exact-Model');
        await expect(root.getByRole('textbox', { name: 'Root agent reasoningEffort', exact: true })).toHaveValue('Opaque:Effort/Case');
        await expect.poll(async () => (await f.status()).modules[moduleId].capabilities.modelPolicy.phase).toBe('active');
      };
    }
    const verifyShared = moduleId === 'compact-context' || moduleId === 'model-policy' ? await sharedPolicyRoundtrip(f) : async () => {};
    await f.active(); await f.reload();
    await verifySaved(); await verifyShared(); await f.active();
    assert.deepEqual(await section.getByRole('alert').allTextContents(), []);
    assert.deepEqual(f.errors, []);
  });
}
