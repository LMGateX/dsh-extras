import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { chromium, expect } from '@playwright/test';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(join(root, 'package.json'));
const manifest = require.resolve('@deepseek-ai/dsh/package.json');
const nativePackage = JSON.parse(await readFile(manifest, 'utf8'));
const cli = join(dirname(manifest), nativePackage.bin.dsh);
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const artifacts = resolve(process.env.DSH_EXTRAS_ARTIFACT_DIR ?? join(root, 'artifacts'));
const run = promisify(execFile);
const statusId = '@deepseek-ai/dsh-client-ui-session-status';
const modulesId = '@deepseek-ai/dsh-client-modules';
const extrasId = 'dsh-extras';

/** Observe stock Cordis and loader state, without creating an arrival edge to status. */
async function writeProbe(temp: string) {
  const dir = join(temp, 'native-chime-arrival-probe');
  await mkdir(dir);
  await writeFile(join(dir, 'package.json'), JSON.stringify({
    name: 'native-chime-arrival-probe', version: '1.0.0', type: 'module',
    exports: { '.': './index.js', './client': './client.js', './package.json': './package.json' },
    dsh: { bundle: { patch: 'cordis.patch.yml' }, client: { platform: 'web', inject: [modulesId, '@deepseek-ai/dsh-client-ui-renderer'] } },
  }));
  await writeFile(join(dir, 'index.js'), 'export function apply() {}');
  await writeFile(join(dir, 'cordis.patch.yml'), '- insert:\n    - id: native-chime-arrival-probe\n      name: native-chime-arrival-probe\n');
  await writeFile(join(dir, 'client.js'),
    'window.__ModuleLoader__.load({id:"native-chime-arrival-probe",factory(){return {inject:["modules","slots"],apply(ctx){' +
    'let statusAvailable=false;ctx.inject(["uiSession.sessionStatus"],scope=>{' +
    'statusAvailable=typeof scope["uiSession.sessionStatus"].subscribe==="function";' +
    'return ()=>{statusAvailable=false};});' +
    'window.__CHIME_ARRIVAL_PROBE__=()=>({statusAvailable,statusError:ctx.modules.importError(' + JSON.stringify(statusId) + ')?.message,' +
    'extrasError:ctx.modules.importError(' + JSON.stringify(extrasId) + ')?.message,' +
    'extrasLoaded:ctx.modules.loadCache.has(' + JSON.stringify(extrasId) + '),' +
    'managerError:ctx.modules.importError("@deepseek-ai/dsh-client-ui-plugin-manager")?.message,' +
    'configAvailable:ctx.slots.entries("plugins.bundle.config").some(entry=>entry.options.key==="dsh-extras")});' +
    'window.__CHIME_ARRIVAL_DECLARE_CONFIG__=()=>{ctx.slots.inject("main",()=>ctx.slots.register({name:"main",key:"chime-test-config",' +
    'children:{"plugins.bundle.config":{kind:"keyed",scope:"root"}}},()=>null));};' +
    '}}}});\n');
  return dir;
}

interface BootModule { id: string; url: string }
interface BootBatch { entries: string[]; url: string }

test('the packed combined client tolerates native Session status bundle arrival failure', { timeout: 150000 }, async t => {
  assert.equal(nativePackage.version, '0.2.3-alpha.2');
  const prefix = join(tmpdir(), 'dsh-chime-native-');
  const temp = await mkdtemp(prefix);
  const profile = 'chime-arrival-acceptance';
  const env = {
    PATH: process.env.PATH, HOME: join(temp, 'home'), DSH_HOME: join(temp, 'dsh'), DSH_PROFILE: profile,
    XDG_CACHE_HOME: join(temp, 'cache'), XDG_CONFIG_HOME: join(temp, 'config'), XDG_DATA_HOME: join(temp, 'data'),
    XDG_STATE_HOME: join(temp, 'state'), XDG_RUNTIME_DIR: join(temp, 'runtime'), TMPDIR: join(temp, 'tmp'),
    npm_config_cache: join(temp, 'npm-cache'), DSH_TELEMETRY_DISABLED: '1', CI: '1', NO_COLOR: '1',
  };
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let stopHost = async () => {};
  t.after(async () => {
    try { await browser?.close(); } finally { await stopHost(); }
    assert.equal(dirname(temp), dirname(prefix));
    assert.ok(temp.startsWith(prefix));
    await rm(temp, { recursive: true, force: true });
  });
  await Promise.all(Object.entries(env).filter(([key]) => key === 'HOME' || key.endsWith('_HOME') || key.endsWith('_DIR') || key === 'TMPDIR' || key === 'npm_config_cache').map(([, dir]) => mkdir(dir!, { recursive: true })));
  const native = (args: string[]) => run(process.execPath, [cli, '--profile', profile, ...args], { cwd: temp, env, timeout: 90000 });
  await native(['--from-default-profile', 'web', '--dump-config']);
  await run(process.execPath, [cli, 'plugin', '--profile', profile, 'add', join(artifacts, extrasId + '-' + version + '.tgz'), await writeProbe(temp),
    '--ignore-scripts', '--no-optional', '--config.auto-install-peers=false'], { cwd: temp, env, timeout: 90000 });

  const host = spawn(process.execPath, [cli, '--profile', profile, '--host', '127.0.0.1', '--port', '0', '--no-open'], { cwd: temp, env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  const closed = once(host, 'close');
  stopHost = async () => {
    if (host.exitCode !== null || host.signalCode !== null || host.pid === undefined) return;
    process.kill(-host.pid, 'SIGTERM');
    const force = setTimeout(() => { try { process.kill(-host.pid!, 'SIGKILL'); } catch {} }, 8000);
    force.unref();
    try { await closed; } finally { clearTimeout(force); }
  };
  const url = await new Promise<string>((resolve, reject) => {
    let log = '';
    const clean = () => log.replace(/(https?:\/\/[^\s?#]+)[^\s]*/g, '$1/[redacted]');
    const timeout = setTimeout(() => reject(new Error('Native Chime startup timed out\n' + clean())), 30000);
    const capture = (chunk: Buffer) => {
      log += chunk;
      const match = log.match(/dsh web: (https?:\/\/\S+)/);
      if (match) { clearTimeout(timeout); resolve(match[1]!); }
    };
    host.stdout!.on('data', capture);
    host.stderr!.on('data', capture);
    host.once('error', error => { clearTimeout(timeout); reject(error); });
    host.once('exit', code => { clearTimeout(timeout); reject(new Error('Native Chime host exited: ' + code + '\n' + clean())); });
  });
  assert.equal(new URL(url).hostname, '127.0.0.1');
  assert.notEqual(new URL(url).port, '3080');
  browser = await chromium.launch({ executablePath: process.env.DSH_EXTRAS_CHROMIUM, headless: true, args: ['--no-sandbox'], env });
  const stock = await browser.newPage();
  stock.setDefaultTimeout(10000);
  const open = async (page: typeof stock) => {
    await page.goto(url);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForFunction(() => Boolean((globalThis as any).__CHIME_ARRIVAL_PROBE__));
  };
  const read = (page: typeof stock) => page.evaluate(() => (globalThis as any).__CHIME_ARRIVAL_PROBE__() as {
    statusAvailable: boolean; statusError?: string; extrasError?: string; extrasLoaded: boolean; managerError?: string; configAvailable: boolean;
  });
  const chimeSwitch = (page: typeof stock) => page.getByRole('button', { name: '🔔 正常', exact: true });

  await open(stock);
  await expect.poll(() => read(stock)).toMatchObject({ statusAvailable: true });
  await expect(chimeSwitch(stock)).toBeVisible();
  const onboarding = stock.getByRole('dialog', { name: 'Get started', exact: true });
  await onboarding.getByRole('button', { name: 'Close', exact: true }).click();
  await stock.getByRole('button', { name: 'Plugins', exact: true }).click();
  await stock.getByRole('button', { name: 'View dsh-extras', exact: true }).click();
  await stock.getByRole('button', { name: 'Configure dsh-extras', exact: true }).click();
  await expect(stock.locator('[data-package="dsh-extras"] [data-module="retry"]')).toBeVisible();
  const graph = await stock.evaluate(() => (globalThis as any).__DSH_BOOT__ as { entries: BootModule[]; batches: BootBatch[] });
  const status = graph.entries.find(row => row.id === statusId);
  const batch = graph.batches.find(row => row.entries.includes(statusId));
  assert.ok(status && batch, 'the stock Web profile publishes the status package independently');
  assert.notEqual(status.url, batch.url, 'the fault case exercises native single-resource fallback');

  const failed = await browser.newPage();
  failed.setDefaultTimeout(10000);
  // Leave every other registration in the native combo intact and fail only
  // the status package's single-resource fallback.
  const registration = 'window.__ModuleLoader__.load({id:`' + statusId + '`,';
  let failedStatusRequests = 0;
  await failed.route(new URL(batch.url, url).href, async route => {
    const response = await route.fetch();
    const body = await response.text();
    assert.equal(body.split(registration).length, 2, 'fault replaces exactly one known alpha.2 registration');
    await route.fulfill({ response, body: body.replace(registration, 'void ({id:`' + statusId + '`,') });
  });
  await failed.route(new URL(status.url, url).href, route => { failedStatusRequests += 1; return route.abort(); });
  await failed.goto(url);
  // The stock shell itself has required entries that depend on status. Its boot
  // audit can fail without that implicating unrelated plugin arrival.
  await expect(failed.getByText('Failed to load plugins', { exact: true })).toBeVisible();
  await failed.waitForFunction(() => Boolean((globalThis as any).__CHIME_ARRIVAL_PROBE__));
  const observed = await read(failed);
  assert.ok(observed.statusError?.includes('could not load "' + statusId + '"'), 'the real native loader recorded the status fault');
  assert.ok(failedStatusRequests > 0, 'the native status single-resource fallback was exercised');
  assert.equal(observed.statusAvailable, false);
  assert.ok(observed.managerError?.includes(statusId), 'the stock plugin manager itself hard-depends on status');
  assert.ok(!observed.extrasError, 'status arrival failure is not a dependency failure of the packed combined client');
  assert.equal(observed.extrasLoaded, true, 'the packed combined client factory still materializes');
  // A minimal independent owner declares the same native settings slot; the
  // active Extras plugin, not the probe, contributes the actual configuration view.
  await failed.evaluate(() => (globalThis as any).__CHIME_ARRIVAL_DECLARE_CONFIG__());
  await expect.poll(async () => (await read(failed)).configAvailable).toBe(true);
});
