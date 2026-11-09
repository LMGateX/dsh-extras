import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, cp, symlink, access, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';
import {canonicalPolicyHttpFixture} from './canonical-http.fixture.ts';

const root = new URL('../../', import.meta.url).pathname;
const distributions = ['dsh-extras', 'dsh-extras-compact-context', 'dsh-extras-retry', 'dsh-extras-chime', 'dsh-extras-goal-wait', 'dsh-extras-model-policy'];
const reasoningMarkers = [
  'function createReasoningEditor(', 'function ReasoningControl(', 'validateCompactionReasoning',
  'Compaction-request reasoning', 'Refresh native effort choices', 'Native metadata unavailable.', 'modelCatalog()',
];

test('actual emitted and packed clients carry reasoning implementation only in selected distributions', { timeout: 120000 }, async () => {
  const sandbox = await mkdtemp('/tmp/dxp-');
  const env = {
    PATH: process.env.PATH, HOME: join(sandbox, 'home'), DSH_HOME: join(sandbox, 'dsh'), DSH_PROFILE: 'fixture',
    XDG_CONFIG_HOME: join(sandbox, 'config'), XDG_CACHE_HOME: join(sandbox, 'cache'),
    XDG_DATA_HOME: join(sandbox, 'data'), npm_config_cache: join(sandbox, 'npm'), TMPDIR: sandbox,
  };
  for (const path of Object.values(env)) if (path?.startsWith(sandbox)) await mkdir(path, { recursive: true });
  try {
    // Build/pack only an allowlisted disposable source consumer, never the caller's release outputs.
    const fixture = join(sandbox, 'fixture');
    await mkdir(fixture);
    for (const path of ['package.json', 'scripts', 'src', 'client', 'assets', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'docs/PUBLIC_PACKAGE_TYPES.md']) {
      await cp(join(root, path), join(fixture, path), {recursive:true});
    }
    const dependency = createRequire(new URL('../../package.json', import.meta.url));
    let modules: string | undefined;
    for (const candidate of dependency.resolve.paths('esbuild') ?? []) {
      try {
        await Promise.all(['esbuild/package.json', '@deepseek-ai/dsh/package.json', 'react/package.json'].map(path => access(join(candidate, path))));
        modules = await realpath(candidate); break;
      } catch { /* Continue to the next existing dependency root. */ }
    }
    assert.ok(modules, 'Existing read-only build dependencies are required; never install them in the original checkout.');
    await symlink(modules, join(fixture, 'node_modules'), 'dir');
    execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: fixture, env, stdio: 'pipe' });
    execFileSync(process.execPath, ['scripts/pack.mjs'], { cwd: fixture, env, stdio: 'pipe' });
    const { version } = JSON.parse(await readFile(join(fixture, 'package.json'), 'utf8'));
    const packedClients = new Map<string, string>();
    for (const name of distributions) {
      const selected = name === 'dsh-extras' || name === 'dsh-extras-compact-context' || name === 'dsh-extras-model-policy';
      const emitted = await readFile(join(fixture, 'dist', name, 'lib/client.js'), 'utf8');
      const archive = join(fixture, 'artifacts', name + '-' + version + '.tgz');
      const packed = execFileSync('tar', ['-xOf', archive, 'package/lib/client.js'], { encoding: 'utf8', env });
      packedClients.set(name, packed);
      assert.equal(packed, emitted, name + ': packaging preserves the actual build output');
      for (const marker of reasoningMarkers) assert.equal(packed.includes(marker), selected, name + ': selected payload ' + marker);
      const modelSelected=name==='dsh-extras'||name==='dsh-extras-model-policy';
      const retrySelected=name==='dsh-extras'||name==='dsh-extras-retry';
      for(const marker of ['function createModelPolicyEditor(', 'function ModelPolicySettings(', 'function createModelPolicyAdapter(']) assert.equal(packed.includes(marker),modelSelected,name+': model payload '+marker);
      for(const marker of ['function createRetrySettingsSource(', 'function RetrySettings(', 'function createRetrySettingsAdapter(', 'function createRequestRecoverySource(', 'function createRequestRecoveryAdapter(']) assert.equal(packed.includes(marker),retrySelected,name+': native retry/recovery payload '+marker);
      const map = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/lib/client.js.map'], { encoding: 'utf8', env }));
      for (const source of ['client/reasoning.ts', 'client/reasoning-settings.ts', 'src/modules/compact-context/reasoning-policy.ts']) {
        assert.equal(map.sources.some((path: string) => path.endsWith(source)), selected, name + ': selected source ' + source);
      }
      for(const source of ['client/model-policy-settings.ts','src/modules/model-policy/policy.ts'])assert.equal(map.sources.some((path:string)=>path.endsWith(source)),modelSelected,name+': selected model source '+source);
      for(const source of ['client/retry-settings.ts','client/request-recovery.ts','src/modules/retry/recovery.ts'])assert.equal(map.sources.some((path:string)=>path.endsWith(source)),retrySelected,name+': selected native retry/recovery source '+source);
      for(const source of ['client/shared-compaction.ts'])assert.equal(map.sources.some((path:string)=>path.endsWith(source)),selected,name+': selected shared browser source '+source);
      assert.equal(map.sources.some((path:string)=>path.includes('src/shared-compaction/')),false,name+': native canonical authority is never bundled into a browser');
      for (const facade of ['client/index.ts', 'client/settings.ts']) assert.equal(map.sources.some((path: string) => path.endsWith(facade)), false, name + ': production bypasses all-feature source facade');
      const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8', env }));
      if (selected) assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'));
      if (name === 'dsh-extras-retry') assert.equal(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'), true, 'native recovery requires the declared remote service');
      if (name === 'dsh-extras-goal-wait') assert.equal(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'), false);
    }
    const harness = (await build({
      entryPoints: [join(root, 'test/client/reasoning-browser.fixture.js')], bundle: true, write: false,
      platform: 'browser', format: 'iife', alias: {react: dependency.resolve('react'), 'react-dom/client': dependency.resolve('react-dom/client')},
    })).outputFiles[0]!.text;
    const canonicalHttp=canonicalPolicyHttpFixture();
    const server = createServer(async (req, res) => {
      if(await canonicalHttp(req,res))return;
      if (req.url === '/harness.js') { res.setHeader('content-type', 'text/javascript'); res.end(harness); return; }
      const name = req.url?.slice(1).replace(/.js$/, '') ?? '';
      if (req.url?.endsWith('.js') && packedClients.has(name)) {
        res.setHeader('content-type', 'text/javascript'); res.end(packedClients.get(name)); return;
      }
      if (req.url?.includes('/status')) {
        res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({modules: {'compact-context': {phase:'active',ready:true,enabled:true,capabilities:{tools:{phase:'disabled'},compactionReasoning:{phase:'active'}}}}})); return;
      }
      if (!packedClients.has(name)) {res.statusCode = 404; res.end(); return;}
      res.setHeader('content-type', 'text/html');
      res.end('<div id="root"></div><script>window.__DSH_BOOT__={entries:[]};</script><script src="/harness.js"></script><script src="/'+name+'.js"></script>');
    });
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const address = server.address(); assert.ok(address && typeof address === 'object');
    let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
    try {
      browser = await chromium.launch({headless:true, executablePath:process.env.DSH_EXTRAS_CHROMIUM, env:{...env,PATH:env.PATH ?? ''}, args:['--no-sandbox']});
      for (const name of ['dsh-extras', 'dsh-extras-compact-context', 'dsh-extras-model-policy']) {
        const page = await browser.newPage(); const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:' + address.port + '/' + name);
        const moduleId=name==='dsh-extras-model-policy'?'model-policy':'compact-context';
        const policy = page.locator('[data-module="'+moduleId+'"]').getByRole('group', {name:'Compaction-request reasoning',exact:true});
        await policy.waitFor();
        assert.equal(await page.evaluate(() => (window as any).catalogCalls), 0);
        await policy.getByRole('checkbox', {name:'Enable compaction-request reasoning',exact:true}).check();
        await policy.getByRole('button', {name:'Refresh native effort choices',exact:true}).click();
        await page.waitForFunction(() => (window as any).catalogCalls === 1);
        await policy.getByRole('button', {name:'Add rule',exact:true}).click();
        const rule = policy.getByRole('group', {name:'Rule 1',exact:true});
        await rule.getByRole('combobox', {name:'Match scope'}).selectOption('provider-model');
        await rule.getByRole('textbox', {name:'Provider route ID'}).fill('Route/A');
        await rule.getByRole('textbox', {name:'Model ID'}).fill('Model/Exact');
        await rule.getByRole('combobox', {name:'Action'}).selectOption('fixed');
        await rule.getByRole('combobox', {name:'Advertised effort for exact model'}).selectOption('Opaque:MAX/Case');
        await policy.getByRole('button', {name:'Save policy',exact:true}).click();
        await page.waitForFunction(async () => (await (await fetch('/fixture/shared-document')).json()).document.defaults.rules[0]?.effort === 'Opaque:MAX/Case');
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],'canonical policy save does not mutate module participation or sibling configuration');
        assert.equal(await page.evaluate(() => (window as any).accepted().modules['compact-context'].compactTool), false);
        await page.reload(); await policy.waitFor();
        assert.equal(await policy.getByRole('checkbox').isChecked(), true);
        await policy.getByRole('button',{name:'Remove rule',exact:true}).click();
        await policy.getByRole('button',{name:'Save policy',exact:true}).click();
        await page.waitForFunction(async()=>(await(await fetch('/fixture/shared-document')).json()).document.revision===5);
        assert.deepEqual(await page.evaluate(async()=>(await(await fetch('/fixture/shared-document')).json()).document.defaults),{enabled:true,rules:[]},'an explicit empty policy is saved, not replaced by defaults');
        assert.deepEqual(await page.evaluate(()=>(window as any).writes),[],'both canonical saves leave all module configuration untouched');
        await page.reload();await policy.waitFor();
        await policy.getByText('No rules. Saving preserves an explicit empty list (no reasoning override).',{exact:true}).waitFor();
        assert.equal(await policy.getByRole('checkbox').isChecked(),true,'reload/navigation observes accepted canonical policy');
        await page.evaluate(() => {(window as any).pendingCatalog=true;});
        await policy.getByRole('button',{name:'Refresh native effort choices',exact:true}).click();
        await page.waitForFunction(()=>(window as any).catalogCalls===1);
        await page.evaluate(async () => {await (window as any).unload();(window as any).resolveCatalog((window as any).catalog);await Promise.resolve();});
        assert.equal(await page.evaluate(() => (window as any).remainingListeners), 0);
        assert.deepEqual(errors, [], name + ': packed selected settings function without browser errors');
        await page.close();
      }
    } finally { await browser?.close(); server.close(); await once(server, 'close'); }
  } finally {
    assert.equal(dirname(await realpath(sandbox)), '/tmp', 'Cleanup must remain inside the allocated absolute temporary root.');
    await rm(sandbox, { recursive: true, force: true });
  }
});
