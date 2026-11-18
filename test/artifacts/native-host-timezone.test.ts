import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'package.json'));
const manifest = require.resolve('@deepseek-ai/dsh/package.json');
const cli = join(dirname(manifest), JSON.parse(await readFile(manifest, 'utf8')).bin.dsh);
const artifacts = resolve(process.env.DSH_EXTRAS_ARTIFACT_DIR ?? join(root, 'artifacts'));
const sandbox = resolve(process.env.DSH_EXTRAS_TIMEZONE_ROOT ?? tmpdir());
const run = promisify(execFile);
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const hostZone = 'Asia/Singapore';

function environment(temp: string, profile: string): NodeJS.ProcessEnv {
  return { PATH: process.env.PATH, HOME: join(temp, 'home'), DSH_HOME: join(temp, 'dsh'), DSH_PROFILE: profile,
    XDG_CACHE_HOME: join(temp, 'cache'), XDG_CONFIG_HOME: join(temp, 'config'), XDG_DATA_HOME: join(temp, 'data'),
    XDG_STATE_HOME: join(temp, 'state'), TMPDIR: join(temp, 'tmp'), npm_config_cache: join(temp, 'npm-cache'),
    TZ: hostZone, CI: '1', NO_COLOR: '1' };
}

async function native(temp: string, env: NodeJS.ProcessEnv, args: string[]) {
  try { return (await run(process.execPath, [cli, ...args], { cwd: temp, env, timeout: 120000, maxBuffer: 8 * 1024 * 1024 })).stdout; }
  catch (error: any) { throw new Error('Isolated native CLI failed: ' + args.join(' ') + '\n' + String(error.stdout ?? '') + String(error.stderr ?? ''), { cause: error }); }
}

/** Public native client plugin: calls ISessions/SessionFace, never constructs a fake Session or transport. */
async function writeProbe(temp: string) {
  const dir = join(temp, 'native-host-timezone-probe');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'native-host-timezone-probe', version: '1.0.0', type: 'module',
    exports: { '.': './index.js', './client': './client.js', './package.json': './package.json' },
    dsh: { bundle: { patch: 'cordis.patch.yml' }, client: { platform: 'web', inject: ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-api-remotes'] } } }));
  const llmUrl = pathToFileURL(require.resolve('@deepseek-ai/dsh-llm')).href;
  await writeFile(join(dir, 'index.js'), `import { randomUUID } from 'node:crypto';
import { LlmAdapter } from ${JSON.stringify(llmUrl)};
export const inject = ['agents','subagents','llm','webServer','clientModules'];
export function apply(ctx) {
  const sources=[]; let calls=0; let parent; let activation;
  class Offline extends LlmAdapter {
    async resolveModel(provider,model){return {provider,id:model,name:model,context:{contextWindow:100000},defaultMaxTokens:100};}
    async *stream(options){calls++; if(options.provider!=='htz-offline')throw new Error('Nonlocal model forbidden');
      yield {type:'block-start',index:0,blockType:'text'};yield {type:'text-delta',index:0,text:'offline acceptance'};
      yield {type:'block-end',index:0,block:{type:'text',text:'offline acceptance'}};yield {type:'finish',reason:{kind:'stop'}};}
  }
  ctx.llm.registerAdapter(['htz-offline'],new Offline());
  ctx.on('llm/stream',(options,next)=>{if(options.provider!=='htz-offline')throw new Error('Remote model calls forbidden in isolated acceptance');return next();});
  ctx.on('session/event',(session,event)=>{const scan=value=>{if(!value||typeof value!=='object')return;
    if(value.kind==='user'&&typeof value.rpcId==='string')sources.push({sessionId:session.id,source:value});
    for(const item of Object.values(value))scan(item);};scan(event.data);});
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/htz-native-fixture/child',resource:async()=>{
    if(!parent){parent=await ctx.agents.create({sessionId:randomUUID(),meta:{cwd:process.cwd()},agentOptions:{provider:'htz-offline',model:'local'}});
      activation=await ctx.subagents.startActivation({parent:parent.agent,provider:'spawn',name:'timezone-child',label:'Local timezone acceptance',
        prompt:[{type:'text',text:'Initialize isolated child'}],signal:new AbortController().signal,delivery:'caller',agentOptions:{provider:'htz-offline',model:'local'}});
      await activation.result;}
    return Response.json({parentSessionId:parent.agent.id,childSessionId:activation.childId,mode:'continuable'});
  }}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/htz-native-fixture/set-los-angeles',resource:async()=>{process.env.TZ='America/Los_Angeles';return Response.json({timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone});}}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/htz-native-fixture/graph',resource:async()=>Response.json(ctx.clientModules.graph())}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/htz-native-fixture/evidence',resource:async()=>Response.json({sources,calls,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone})}));
  ctx.on('dispose',async()=>{await activation?.dispose();await parent?.dispose();});
}
`);
  await writeFile(join(dir, 'cordis.patch.yml'), '- insert:\n    - id: native-host-timezone-probe\n      name: native-host-timezone-probe\n');
  await writeFile(join(dir, 'client.js'),
    'window.__ModuleLoader__.load({id:"native-host-timezone-probe",factory(){return {inject:["sessions","remote","remote.schedule","modules","loader"],apply(ctx){' +
    'window.__HTZ_NATIVE__={ctx,async prompt(mode,child=false,empty=false){' +
    'const id=child?undefined:await ctx.sessions.create(); const target=child?await (await fetch("/htz-native-fixture/child")).json():id;' +
    'return ctx.sessions.using(target,{source:"controllerOperation"},async ref=>{' +
    'await ref.ready;return ref.binding.session.prompt(empty?[]:[{type:"text",text:"Isolated host timezone acceptance"}],mode);});}};' +
    'ctx.on("dispose",()=>{delete window.__HTZ_NATIVE__;});}}}});\n');
  return dir;
}

/** An isolated package facade changes only copied client bytes; original native packages remain untouched. */
async function unsupportedTarget(temp: string) {
  const id = '@deepseek-ai/dsh-api-session-controller';
  const originalManifest = require.resolve(id + '/package.json');
  const original = JSON.parse(await readFile(originalManifest, 'utf8'));
  const dir = join(temp, 'unsupported-session-client'); await mkdir(join(dir, 'lib'), { recursive: true });
  await cp(join(dirname(originalManifest), 'lib'), join(dir, 'lib'), { recursive: true });
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  await writeFile(join(dir, 'package.json'), JSON.stringify({ ...original, dependencies: {}, optionalDependencies: {}, peerDependencies: {}, devDependencies: {},
    dsh: { ...original.dsh, bundle: { patch: 'cordis.patch.yml' } } }));
  await writeFile(join(dir, 'cordis.patch.yml'), '- id: session-controller\n  name: \'@deepseek-ai/dsh-api-session-controller\'\n');
  const client = await readFile(join(dirname(originalManifest), 'lib/client.js'), 'utf8');
  await writeFile(join(dir, 'lib/client.js'), client + '\n// Deliberately unsupported disposable acceptance bytes.\n');
  return dir;
}

async function fixture(t: TestContext, name: string, browserZone: string, unsupported = false) {
  await mkdir(sandbox, { recursive: true });
  const temp = await mkdtemp(join(sandbox, 'htz-'));
  const profile = 'timezone-acceptance';
  const env = environment(temp, profile);
  for (const key of ['HOME', 'DSH_HOME', 'TMPDIR', 'XDG_CACHE_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_STATE_HOME', 'npm_config_cache']) await mkdir(env[key]!, { recursive: true });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let stop = async () => {};
  t.after(async () => { try { await browser?.close(); } finally { await stop();
    if (process.env.DSH_EXTRAS_KEEP_NATIVE) console.log('Retained timezone acceptance sandbox:', temp);
    else { assert.equal(dirname(temp), sandbox); assert.ok(temp.split('/').at(-1)!.startsWith('htz-')); await rm(temp, { recursive: true, force: true }); }
  } });
  await native(temp, env, ['--profile', profile, '--from-default-profile', 'web', '--dump-config']);
  await native(temp, env, ['plugin', '--profile', profile, 'add', join(artifacts, name + '-' + version + '.tgz'), await writeProbe(temp), ...(unsupported ? [await unsupportedTarget(temp)] : []), '--ignore-scripts', '--no-optional', '--config.auto-install-peers=false']);
  const profileDir = join(env.DSH_HOME!, 'profiles', profile);
  const installed = JSON.parse(await readFile(join(profileDir, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(installed.version, version);
  const startHost = async (port: string, timeZone: string) => {
    const child = spawn(process.execPath, [cli, '--profile', profile, '--host', '127.0.0.1', '--port', port, '--no-open'], { cwd: temp, env: { ...env, TZ: timeZone }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    const exited = once(child, 'close'); let log = '';
    const clean = () => log.replace(/(https?:\/\/[^\s?#]+)[^\s]*/g, '$1/[redacted]');
    stop = async () => { if (child.exitCode === null && child.signalCode === null) {
      process.kill(-child.pid!, 'SIGTERM'); const force = setTimeout(() => { try { process.kill(-child.pid!, 'SIGKILL'); } catch {} }, 8000);
      force.unref(); try { await exited; } finally { clearTimeout(force); }
    } };
    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Native timezone startup timed out\n' + clean())), 30000);
      const capture = (data: Buffer) => { log += data; const match = log.match(/dsh web: (https?:\/\/\S+)/); if (match) { clearTimeout(timeout); resolve(match[1]!); } };
      child.stdout!.on('data', capture); child.stderr!.on('data', capture);
      child.once('exit', code => { clearTimeout(timeout); reject(new Error('Native timezone exit ' + code + '\n' + clean())); });
      child.once('error', reject);
    });
    return { url, clean };
  };
  let host = await startHost('0', hostZone);
  const url = host.url;
  const clean = () => host.clean();
  assert.notEqual(new URL(url).port, '3080');
  browser = await chromium.launch({ executablePath: process.env.DSH_EXTRAS_CHROMIUM, headless: true, args: ['--no-sandbox'], env: env as Record<string, string> });
  const page = await browser.newPage({ timezoneId: browserZone }); page.setDefaultTimeout(10000);
  const browserErrors: string[] = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') browserErrors.push(message.text()); });
  const wires: { channel: string; body: string; value: any }[] = [];
  page.on('request', request => { if (request.method() !== 'POST') return;
    const body = request.postData() ?? ''; let value: any; try { value = JSON.parse(body); } catch { return; }
    wires.push({ channel: String(value.channel ?? value.method ?? '').replaceAll('/', '.'), body, value });
  });
  await page.goto(url); await page.waitForFunction(() => Boolean((globalThis as any).__DSH_BOOT__));
  try {
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForFunction(() => Boolean((globalThis as any).__HTZ_NATIVE__));
  } catch (cause) {
    throw new Error('Native probe did not mount: ' + JSON.stringify({ browserErrors, body: await page.locator('body').innerText(),
      probe: await page.evaluate(() => (globalThis as any).__DSH_BOOT__.entries.filter((entry: any) => entry.id.includes('probe'))) }) + '\n' + clean(), { cause });
  }
  const dismiss = async () => { const dialog = page.getByRole('dialog', { name: 'Get started', exact: true }); if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close', exact: true }).click(); };
  const configure = async () => { await dismiss(); if (await page.locator('[data-package="' + name + '"]').isVisible()) return; await page.getByRole('button', { name: 'Plugins', exact: true }).click();
    await page.getByRole('button', { name: 'View ' + name, exact: true }).click();
    await page.getByRole('button', { name: 'Configure ' + name, exact: true }).click();
    await page.locator('[data-package="' + name + '"]').waitFor();
  };
  const status = () => page.evaluate(async name => (await (await fetch('/extras/' + name + '/status', { credentials: 'same-origin', cache: 'no-store' })).json()), name);
  const restart = async (timeZone: string) => {
    const origin = new URL(url).origin; const port = new URL(url).port;
    await stop(); host = await startHost(port, timeZone);
    assert.equal(new URL(host.url).origin, origin, 'restart uses the exact existing isolated origin, never 3080');
  };
  const reload = async () => {
    await page.reload(); await page.waitForFunction(() => Boolean((globalThis as any).__HTZ_NATIVE__));
    if (await page.evaluate(() => Boolean((globalThis as any).__DSH_EXTRAS_HOST_TIMEZONE_PAGE__))) {
      await configure();
      try { await expect.poll(async () => page.locator('[data-host-timezone-page-status]').getAttribute('data-host-timezone-page-status')).toBe('ready'); }
      catch (cause) { throw new Error('Protected native page did not become ready: ' + JSON.stringify({
        pageStatus: await page.locator('[data-host-timezone-page-status]').innerText(), browserErrors, server: (await status()).modules['host-timezone'],
      }), { cause }); }
    }
  };
  return { page, name, temp, env, profile, profileDir, wires, status, configure, dismiss, restart, reload };
}

type Fixture = Awaited<ReturnType<typeof fixture>>;

async function promptWire(f: Fixture, expectedZone: string, mode: 'queue' | 'steer' = 'queue', child = false, empty = false) {
  const count = f.wires.length;
  const result = await f.page.evaluate(({ mode, child, empty }) => (globalThis as any).__HTZ_NATIVE__.prompt(mode, child, empty), { mode, child, empty });
  const endpoint = child ? 'subagents.prompt' : 'session.prompt';
  const calls = f.wires.slice(count).filter(row => row.channel === endpoint);
  assert.equal(calls.length, 1, 'real browser serialized one ' + endpoint + ': ' + JSON.stringify({ channels: f.wires.slice(count).map(row => row.channel), result }));
  const call = calls[0]!;
  const request = call.value.payload.args.request;
  assert.equal(request.clientTimeZone, expectedZone);
  assert.equal(request[child ? 'delivery' : 'mode'], mode);
  const browserZone = await f.page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (expectedZone !== browserZone) assert.equal(call.body.includes(browserZone), false, 'no raw browser zone in request metadata');
  assert.ok(result && typeof result.ok === 'boolean', 'native host settled the actual RPC, not a stubbed browser response');
  if (child) {
    assert.equal(result.ok, true, 'real native continuable child accepts human prompt');
    await expect.poll(async () => {
      const evidence = await f.page.evaluate(async () => (await (await fetch('/htz-native-fixture/evidence')).json()));
      return evidence.sources.find((row: any) => row.source.rpcId === request.requestId)?.source.clientTimeZone;
    }).toBe(expectedZone);
    const source = await f.page.evaluate(async requestId => {
      const evidence = await (await fetch('/htz-native-fixture/evidence')).json();
      return evidence.sources.find((row: any) => row.source.rpcId === requestId).source;
    }, request.requestId);
    if (expectedZone !== browserZone) assert.equal(JSON.stringify(source).includes(browserZone), false, 'no raw browser zone alias in new durable source');
  }
  // Ordinary no-provider prompts may fail after acceptance; the child uses only a deterministic local adapter.
}

async function promptRefused(f: Fixture, child = false) {
  const count = f.wires.length;
  const outcome = await f.page.evaluate(async child => {
    try { return await (globalThis as any).__HTZ_NATIVE__.prompt('queue', child); }
    catch (error) { return { rejected: String(error) }; }
  }, child);
  assert.equal(f.wires.slice(count).filter(row => row.channel === (child ? 'subagents.prompt' : 'session.prompt')).length, 0, 'revoked protected page refuses before native prompt serialization');
  assert.ok(outcome.rejected || outcome.ok === false, 'revocation reports failure rather than silent success');
}

async function scheduleRoundtrip(f: Fixture, browserZone: string) {
  await f.dismiss();
  await f.page.getByRole('button', { name: 'Automation tasks', exact: true }).click();
  await f.page.getByRole('button', { name: 'Choose a creation method', exact: true }).click();
  await f.page.getByRole('menuitem', { name: 'Create manually', exact: true }).click();
  await f.page.getByRole('textbox', { name: 'Automation task name', exact: true }).fill('Host timezone acceptance');
  await f.page.getByRole('textbox', { name: 'Automation task instruction', exact: true }).fill('Isolated acceptance task; delete without delivering');
  const before = Date.now();
  const pending = f.page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/api/schedule/create'));
  const accepted = f.page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/api/schedule/create'));
  await f.page.getByRole('button', { name: 'Create', exact: true }).click();
  const request = JSON.parse((await pending).postData()!).payload.args.request;
  const after = Date.now();
  assert.equal((await accepted).status(), 200);
  assert.equal(request.timing.kind, 'rrule');
  assert.match(request.timing.rrule, /^DTSTART;TZID=Asia\/Singapore:/);
  assert.equal(JSON.stringify(request).includes(browserZone), false);
  const local = request.timing.rrule.match(/:(\d{8}T\d{6})/)[1];
  assert.equal(local.slice(-2), '00', 'native default minute precision keeps seconds zero');
  const instant = Date.parse(local.slice(0, 4) + '-' + local.slice(4, 6) + '-' + local.slice(6, 8) + 'T' + local.slice(9, 11) + ':' + local.slice(11, 13) + ':' + local.slice(13, 15) + '+08:00');
  assert.ok(instant >= before + 59 * 60000 && instant <= after + 61 * 60000, 'default start is one hour ahead in host zone, not browser wall time relabelled');
  const catalog = await f.page.evaluate(async () => (await (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.catalog()));
  assert.equal(catalog.ok, true);
  const task = catalog.value.find((task: any) => task.title === 'Host timezone acceptance');
  assert.ok(task, 'native host persisted created schedule');
  // Explicit/stored rules traverse the same public native service unchanged.
  const explicit = 'DTSTART;TZID=America/New_York:20300309T233000\nRRULE:FREQ=DAILY;COUNT=2';
  const edited = await f.page.evaluate(async ({ id, updatedAt, explicit }) => (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.edit({ id, action: 'update', expectedUpdatedAt: updatedAt, patch: { timing: { kind: 'rrule', rrule: explicit } } }), { id: task.id, updatedAt: task.updatedAt, explicit });
  assert.equal(edited.ok, true);
  assert.equal(edited.value.scheduledAt, '2030-03-10T04:30:00.000Z', 'explicit New York rule keeps cross-day / DST-boundary instant');
  const reread = await f.page.evaluate(async () => (await (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.catalog()));
  assert.equal(reread.value.find((row: any) => row.id === task.id).rrule, explicit, 'explicit task rules are not rewritten at RPC boundary');
  const editWire = f.wires.findLast(row => row.channel === 'schedule.edit')!;
  assert.equal(editWire.value.payload.args.request.patch.timing.rrule, explicit);
  // A content-only edit of an existing explicit rule must omit timing entirely.
  await f.page.getByRole('textbox', { name: 'Automation task name', exact: true }).fill('Retitled host timezone acceptance');
  const contentEdit = f.page.waitForRequest(request => new URL(request.url()).pathname.endsWith('/api/schedule/edit'));
  await f.page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const contentRequest = JSON.parse((await contentEdit).postData()!).payload.args.request;
  assert.equal(Object.hasOwn(contentRequest.patch, 'timing'), false);
  await expect.poll(async () => {
    const current = await f.page.evaluate(async () => (await (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.catalog()));
    const stored = current.value.find((row: any) => row.id === task.id);
    return { title: stored?.title, rrule: stored?.rrule };
  }).toEqual({ title: 'Retitled host timezone acceptance', rrule: explicit });
  const removed = await f.page.evaluate(async id => (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.edit({ id, action: 'delete' }), task.id);
  assert.equal(removed.ok, true);
}

test(version + ' provides seven synchronized archives including real host-timezone split', async () => {
  for (const name of ['dsh-extras', 'dsh-extras-compact-context', 'dsh-extras-model-policy', 'dsh-extras-retry', 'dsh-extras-chime', 'dsh-extras-goal-wait', 'dsh-extras-host-timezone']) {
    const { stdout } = await run('tar', ['-xOf', join(artifacts, name + '-' + version + '.tgz'), 'package/package.json']);
    const manifest = JSON.parse(stdout); assert.equal(manifest.name, name); assert.equal(manifest.version, version);
  }
});

for (const [name, browserZone] of [['dsh-extras', 'America/New_York'], ['dsh-extras-host-timezone', 'Asia/Shanghai']] as const)
  test('packed native browser host-zone lifecycle: ' + name + ' / ' + browserZone, { timeout: 240000 }, async t => {
    const f = await fixture(t, name, browserZone);
    await f.configure();
    const initial = await f.status();
    assert.equal(Object.keys(initial.modules).length, name === 'dsh-extras' ? 6 : 1);
    assert.equal(initial.modules['host-timezone'].enabled, false, 'new capability defaults off even in standalone');
    assert.equal(initial.modules['host-timezone'].phase, 'disabled');
    const section = f.page.locator('[data-module="host-timezone"]');
    await section.waitFor();
    assert.equal(await section.locator('select').count(), 0, 'no arbitrary fixed time-zone selector');
    const nativeBoot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
    const originalTargets = nativeBoot.entries.filter((entry: any) => ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'].includes(entry.id));
    await promptWire(f, browserZone);
    await section.locator('input[type=checkbox]').first().click();
    await expect.poll(async () => (await f.status()).modules['host-timezone'].enabled).toBe(true);
    await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.status).toBe('needs-full-reload');
    // Saving affects newly served pages, not this already loaded native sampler.
    await promptWire(f, browserZone);
    await f.reload();
    await promptWire(f, hostZone);
    for (const entry of originalTargets) {
      const denied = await f.page.request.get(new URL(entry.url, f.page.url()).href);
      assert.equal(denied.status(), 503, 'enabled adapter refuses native immutable target URL to prevent HMR bypass');
      assert.match(denied.headers()['cache-control'] ?? '', /no-store/);
    }
    const unrelated = nativeBoot.entries.find((entry: any) => entry.id === '@deepseek-ai/dsh-client-locale');
    assert.ok(unrelated);
    assert.equal((await f.page.request.get(new URL(unrelated.url, f.page.url()).href)).status(), 200, 'non-target native resource passes through');
    for (const mode of ['queue', 'steer'] as const) {
      await promptWire(f, hostZone, mode);
      await promptWire(f, hostZone, mode, true);
      await promptWire(f, hostZone, mode, false, true);
    }
    assert.equal(await f.page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone), browserZone, 'global browser Intl is unchanged');
    const boot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
    for (const id of ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule']) {
      const entry = boot.entries.find((row: any) => row.id === id); assert.ok(entry);
      assert.match(entry.url, /extras\/host-timezone/, 'changed bytes use owned namespace, not native immutable URL');
      const response = await f.page.request.get(new URL(entry.url, f.page.url()).href); assert.equal(response.status(), 200);
      assert.match(response.headers()['cache-control'] ?? '', /no-store/);
    }
    await scheduleRoundtrip(f, browserZone);
    await f.reload(); await f.configure();
    await f.page.locator('[data-module="host-timezone"] input[type=checkbox]').first().click();
    await expect.poll(async () => (await f.status()).modules['host-timezone'].enabled).toBe(false);
    // The protected page is irreversibly revoked on disable; fresh disabled reload restores native sampling.
    await promptRefused(f);
    await f.reload(); await promptWire(f, browserZone);
    const restored = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
    for (const id of ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'])
      assert.doesNotMatch(restored.entries.find((entry: any) => entry.id === id).url, /extras\/host-timezone/);
    for (const entry of originalTargets) assert.equal((await f.page.request.get(new URL(entry.url, f.page.url()).href)).status(), 200, 'disabled adapter restores original native resource');
    const evidence = await f.page.evaluate(async () => (await (await fetch('/htz-native-fixture/evidence')).json()));
    assert.equal(evidence.timeZone, hostZone); assert.ok(evidence.calls > 0, 'real child performed only registered deterministic local provider calls');
    console.log('Native host-timezone evidence:', JSON.stringify({ distribution: name, browserZone, hostZone,
      localProviderCalls: evidence.calls, durableSourceZones: [...new Set(evidence.sources.map((row: any) => row.source.clientTimeZone))], promptCalls: f.wires.filter(row => ['session.prompt', 'subagents.prompt'].includes(row.channel)).map(row => ({ endpoint: row.channel, zone: row.value.payload.args.request.clientTimeZone })) }));
  });

test('unsupported native client bytes report unavailable without claiming browser protection', { timeout: 240000 }, async t => {
  const f = await fixture(t, 'dsh-extras-host-timezone', 'America/New_York', true);
  await f.configure();
  await f.page.locator('[data-module="host-timezone"] input[type=checkbox]').first().click();
  await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.status).toBe('unavailable');
  const state = (await f.status()).modules['host-timezone'];
  assert.equal(state.capabilities.hostTimezone.phase, 'unavailable');
  assert.match(state.details.hostTimezone.reason, /unsupported|artifact|hash|sha/i);
  await f.reload();
  const entry = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__.entries.find((row: any) => row.id === '@deepseek-ai/dsh-api-session-controller'));
  assert.doesNotMatch(entry.url, /extras\/host-timezone/, 'unsupported original bytes remain visibly unprotected rather than falsely transformed');
  await promptWire(f, 'America/New_York');
});

test('same-origin native restart with a new host zone refuses stale browser sampler until full reload', { timeout: 240000 }, async t => {
  const f = await fixture(t, 'dsh-extras-host-timezone', 'America/New_York');
  await f.configure();
  await f.page.locator('[data-module="host-timezone"] input[type=checkbox]').first().click();
  await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.status).toBe('needs-full-reload');
  await f.reload(); await promptWire(f, hostZone);
  const editable = await f.page.evaluate(async () => (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.create({
    title: 'Retain explicit task across host reconnect', prompt: 'Isolated future task',
    timing: { kind: 'rrule', rrule: 'DTSTART;TZID=Asia/Singapore:20300102T090000\nRRULE:FREQ=DAILY;COUNT=2' },
  }));
  assert.equal(editable.ok, true);
  await f.dismiss(); await f.page.getByRole('button', { name: 'Automation tasks', exact: true }).click();
  await f.page.getByRole('button', { name: 'Choose a creation method', exact: true }).click();
  await f.page.getByRole('menuitem', { name: 'Create manually', exact: true }).click();
  await f.page.getByRole('textbox', { name: 'Automation task name', exact: true }).fill('Preserve stale default task draft');
  await f.page.getByRole('textbox', { name: 'Automation task instruction', exact: true }).fill('Do not lose this unsent draft on host reconnect');
  const oldBoot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
  const nextZone = 'America/Los_Angeles';
  await f.restart(nextZone);
  await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.timeZone).toBe(nextZone);
  // Re-establish a *real* native Session first; rejection of the sampler must not be confused with a dead server or failed Session.create.
  await f.page.evaluate(async () => {
    const ctx = (globalThis as any).__HTZ_NATIVE__.ctx;
    const id = await ctx.sessions.create(); const ref = ctx.sessions.retain(id, { source: 'controllerOperation' });
    await ref.ready; (globalThis as any).__HTZ_STALE_SESSION__ = ref;
  });
  const count = f.wires.length;
  const outcome = await f.page.evaluate(async () => {
    const ref = (globalThis as any).__HTZ_STALE_SESSION__;
    try { return await ref.binding.session.prompt([{ type: 'text', text: 'Stale host-zone acceptance' }], 'queue'); }
    catch (error) { return { rejected: String(error) }; }
    finally { ref.release(); }
  });
  const promptLeaks = f.wires.slice(count).filter(row => row.channel === 'session.prompt');
  await promptRefused(f, true);
  const editCount = f.wires.length;
  const timingEdit = await f.page.evaluate(async id => (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.edit({
    id, action: 'update', patch: { timing: { kind: 'rrule', rrule: 'DTSTART;TZID=Asia/Singapore:20300103T090000\nRRULE:FREQ=DAILY;COUNT=2' } },
  }), editable.value.id);
  assert.equal(timingEdit.ok, false);
  assert.equal(f.wires.slice(editCount).filter(row => row.channel === 'schedule.edit').length, 0, 'stale time-bearing schedule edit is rejected before serialization');
  const contentOnly = await f.page.evaluate(async id => (globalThis as any).__HTZ_NATIVE__.ctx.remote.schedule.edit({ id, action: 'update', patch: { title: 'Content-only reconnect edit remains native' } }), editable.value.id);
  assert.equal(contentOnly.ok, true, 'unrelated native content-only schedule edit is not blocked by zone revocation');
  assert.equal(f.wires.slice(editCount).filter(row => row.channel === 'schedule.edit').length, 1);
  const scheduleCount = f.wires.length;
  await f.page.getByRole('button', { name: 'Create', exact: true }).click();
  await f.page.getByText('Could not create the task. Your input is preserved; try again.', { exact: true }).waitFor();
  assert.equal(f.wires.slice(scheduleCount).filter(row => row.channel === 'schedule.create').length, 0, 'already-constructed stale default draft timing must be refused before serialization');
  assert.equal(await f.page.getByRole('textbox', { name: 'Automation task name', exact: true }).inputValue(), 'Preserve stale default task draft');
  assert.equal(await f.page.getByRole('textbox', { name: 'Automation task instruction', exact: true }).inputValue(), 'Do not lose this unsent draft on host reconnect');
  assert.equal(promptLeaks.length, 0, 'stale host zone must be refused before serialized /api/session/prompt, not overwritten on receipt');
  assert.ok(outcome.rejected || outcome.ok === false, 'old page reports unavailable/reload, not accepted protection');
  await f.reload(); await promptWire(f, nextZone);
  const freshBoot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
  const id = '@deepseek-ai/dsh-api-session-controller';
  assert.notEqual(freshBoot.entries.find((row: any) => row.id === id).url, oldBoot.entries.find((row: any) => row.id === id).url, 'new host generation changes owned URL even when native artifacts are the same');
});

test('native unchanged-revision retry cannot leak browser zone from a previously cached immutable client', { timeout: 240000 }, async t => {
  const f = await fixture(t, 'dsh-extras-host-timezone', 'America/New_York');
  const id = '@deepseek-ai/dsh-api-session-controller';
  const rawGraph = await f.page.evaluate(async () => (await (await fetch('/htz-native-fixture/graph')).json()));
  const row = rawGraph.entries.find((entry: any) => entry.id === id);
  assert.ok(row);
  const seeded = await f.page.evaluate(async url => { const response = await fetch(url); return { status: response.status, cache: response.headers.get('cache-control') }; }, row.url);
  assert.equal(seeded.status, 200); assert.match(seeded.cache!, /immutable/);
  await f.configure(); await f.page.locator('[data-module="host-timezone"] input[type=checkbox]').first().click();
  await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.status).toBe('needs-full-reload');
  await f.reload(); await promptWire(f, hostZone);
  // APIRequestContext has no Chromium HTTP cache; the same native URL is denied by the live server.
  assert.equal((await f.page.request.get(new URL(row.url, f.page.url()).href)).status(), 503);
  // The real Chromium cache still has the immutable response; a server route alone cannot invalidate it.
  const cached = await f.page.evaluate(async url => (await fetch(url)).status, row.url);
  assert.equal(cached, 200, 'exercise an actually seeded browser immutable response, not a stubbed transport');
  await f.page.evaluate(async ({ id, rawGraph }) => {
    const ctx = (globalThis as any).__HTZ_NATIVE__.ctx; const modules = ctx.modules;
    const native = await modules.import('@deepseek-ai/dsh-client-modules/client', '', {});
    const entry = [...ctx.loader.entries()].find((entry: any) => entry.options.name === id);
    if (!entry) throw new Error('Native session-controller Loader entry missing');
    // Native exposes this exact teardown helper; entries.sync takes its real missing-fiber/same-revision retry path.
    await native.tearDownEntryFiber(entry);
    await modules.entries.sync(rawGraph);
    await modules.entries.retry();
  }, { id, rawGraph });
  await f.page.waitForFunction(() => Boolean((globalThis as any).__HTZ_NATIVE__));
  const count = f.wires.length;
  const outcome = await f.page.evaluate(async () => {
    try { return await (globalThis as any).__HTZ_NATIVE__.prompt('queue'); }
    catch (error) { return { rejected: String(error) }; }
  });
  const sent = f.wires.slice(count).filter(row => row.channel === 'session.prompt');
  for (const call of sent) assert.equal(call.value.payload.args.request.clientTimeZone, hostZone, 'cached raw sampler must not pass browser zone through actual native serialization');
  assert.ok(sent.length > 0 || outcome.rejected || outcome.ok === false, 'retry either restores host sampling or reports protection unavailable');
});

test('isolated live process TZ change revokes old page and full reload acquires the new host source', { timeout: 240000 }, async t => {
  const f = await fixture(t, 'dsh-extras-host-timezone', 'America/New_York');
  await f.configure(); await f.page.locator('[data-module="host-timezone"] input[type=checkbox]').first().click();
  await expect.poll(async () => (await f.status()).modules['host-timezone'].details?.hostTimezone?.status).toBe('needs-full-reload');
  await f.reload(); await promptWire(f, hostZone);
  const oldBoot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
  // Explicit, test-only host fault. Product code never writes TZ or rewrites tool environments.
  const changed = await f.page.evaluate(async () => (await (await fetch('/htz-native-fixture/set-los-angeles')).json()));
  assert.equal(changed.timeZone, 'America/Los_Angeles');
  await promptRefused(f); await promptRefused(f, true);
  await f.reload(); await promptWire(f, 'America/Los_Angeles');
  const freshBoot = await f.page.evaluate(() => (globalThis as any).__DSH_BOOT__);
  for (const id of ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule']) {
    const oldEntry = oldBoot.entries.find((row: any) => row.id === id);
    const freshEntry = freshBoot.entries.find((row: any) => row.id === id);
    assert.notEqual(freshEntry.url, oldEntry.url, 'full reload rotates the owned source URL instead of looping on an old generation');
    const resource = await f.page.request.get(new URL(freshEntry.url, f.page.url()).href);
    assert.equal(resource.status(), 200); assert.match(resource.headers()['cache-control'] ?? '', /no-store/);
  }
});
