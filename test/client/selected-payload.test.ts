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

const root = new URL('../../', import.meta.url).pathname;
const distributions = ['dsh-extras', 'dsh-extras-compact-context', 'dsh-extras-retry', 'dsh-extras-chime', 'dsh-extras-goal-wait'];
const reasoningMarkers = [
  'function createReasoningEditor(', 'function ReasoningControl(', 'validateCompactionReasoning',
  'Compaction-request reasoning', 'Refresh native effort choices', 'Native metadata unavailable.', 'modelCatalog()',
];

test('actual emitted and packed clients carry reasoning implementation only in selected distributions', { timeout: 120000 }, async () => {
  const sandbox = await mkdtemp('/tmp/dxp-');
  const env = {
    PATH: process.env.PATH, HOME: join(sandbox, 'home'), DSH_HOME: join(sandbox, 'dsh'),
    XDG_CONFIG_HOME: join(sandbox, 'config'), XDG_CACHE_HOME: join(sandbox, 'cache'),
    XDG_DATA_HOME: join(sandbox, 'data'), npm_config_cache: join(sandbox, 'npm'), TMPDIR: sandbox,
  };
  for (const path of Object.values(env)) if (path?.startsWith(sandbox)) await mkdir(path, { recursive: true });
  try {
    // Build/pack only an allowlisted disposable source consumer, never the caller's release outputs.
    const fixture = join(sandbox, 'fixture');
    await mkdir(fixture);
    for (const path of ['package.json', 'scripts', 'src', 'client', 'assets', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
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
      const selected = name === 'dsh-extras' || name === 'dsh-extras-compact-context';
      const emitted = await readFile(join(fixture, 'dist', name, 'lib/client.js'), 'utf8');
      const archive = join(fixture, 'artifacts', name + '-' + version + '.tgz');
      const packed = execFileSync('tar', ['-xOf', archive, 'package/lib/client.js'], { encoding: 'utf8', env });
      packedClients.set(name, packed);
      assert.equal(packed, emitted, name + ': packaging preserves the actual build output');
      for (const marker of reasoningMarkers) assert.equal(packed.includes(marker), selected, name + ': selected payload ' + marker);
      const map = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/lib/client.js.map'], { encoding: 'utf8', env }));
      for (const source of ['client/reasoning.ts', 'client/reasoning-settings.ts', 'src/modules/compact-context/reasoning-policy.ts']) {
        assert.equal(map.sources.some((path: string) => path.endsWith(source)), selected, name + ': selected source ' + source);
      }
      for (const facade of ['client/index.ts', 'client/settings.ts']) assert.equal(map.sources.some((path: string) => path.endsWith(facade)), false, name + ': production bypasses all-feature source facade');
      const manifest = JSON.parse(execFileSync('tar', ['-xOf', archive, 'package/package.json'], { encoding: 'utf8', env }));
      if (selected) assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'));
      if (name === 'dsh-extras-retry' || name === 'dsh-extras-goal-wait') assert.equal(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-api-remotes'), false);
    }
    const harness = (await build({
      entryPoints: [join(root, 'test/client/reasoning-browser.fixture.js')], bundle: true, write: false,
      platform: 'browser', format: 'iife', alias: {react: dependency.resolve('react'), 'react-dom/client': dependency.resolve('react-dom/client')},
    })).outputFiles[0]!.text;
    const server = createServer((req, res) => {
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
      for (const name of ['dsh-extras', 'dsh-extras-compact-context']) {
        const page = await browser.newPage(); const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('http://127.0.0.1:' + address.port + '/' + name);
        const policy = page.getByRole('group', {name:'Compaction-request reasoning',exact:true});
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
        await page.waitForFunction(() => (window as any).accepted().modules['compact-context'].compactionReasoning.rules[0]?.effort === 'Opaque:MAX/Case');
        assert.equal(await page.evaluate(() => (window as any).accepted().modules['compact-context'].compactTool), false);
        await page.reload(); await policy.waitFor();
        assert.equal(await policy.getByRole('checkbox').isChecked(), true);
        await page.evaluate(() => (window as any).unload());
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
