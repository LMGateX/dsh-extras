/** Public module + native PTC resolve/run seam; synthetic owners, no provider network. */
import test, { before, after, type TestContext } from 'node:test';
import { mkdtemp, mkdir, rm, realpath } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import assert from 'node:assert/strict';
import * as compactContext from '../../src/modules/compact-context/index.ts';
import { createRuntime, runTurn, runtimeVersion } from '../modules/retry/runtime.ts';
import { loadHost, loaderFixture } from './loader-harness.ts';

// Every direct invocation is isolated too, not only the release runner's environment.
let disposable: string;
const savedEnv = new Map<string, string | undefined>();
before(async () => {
  disposable = await mkdtemp('/tmp/ex-ptc-');
  for (const [key, path] of Object.entries({ HOME: join(disposable, 'home'), DSH_HOME: join(disposable, 'dsh'), TMPDIR: disposable,
    XDG_CONFIG_HOME: join(disposable, 'config'), XDG_CACHE_HOME: join(disposable, 'cache'), XDG_DATA_HOME: join(disposable, 'data') })) {
    savedEnv.set(key, process.env[key]); process.env[key] = path; await mkdir(path, { recursive: true });
  }
});
after(async () => {
  assert.equal(dirname(await realpath(disposable)), '/tmp'); assert.ok(basename(disposable).startsWith('ex-ptc-'));
  await rm(disposable, { recursive: true, force: true });
  for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
});

async function fixture(t: TestContext, config: Record<string, unknown> = {}, loader = false) {
  assert.equal(runtimeVersion, '0.2.2-rc.2');
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  const ctx = runtime.ctx;
  for (const name of ['dsh-token-meter', 'dsh-fs-local', 'dsh-subprocess-local', 'dsh-sandbox-local']) {
    await ctx.plugin((await loadHost(name)).default).await();
  }
  await ctx.plugin((await loadHost('dsh-sandbox-policy')).default, { mode: 'danger-full-access', workspaceRoot: process.env.HOME }).await();
  const row = { compactTool: false, ptcTimeoutMs: 300000, ...config };
  const loaded = loader ? await loaderFixture(t, { name: 'dsh-extras-compact-context', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': compactContext } }, { modules: { 'compact-context': { enabled: true, ...row } }, migration: { auto: false } }, ctx) : undefined;
  const plugin = loaded?.fiber ?? ctx.plugin(compactContext, row);
  if (loaded) await loaded.ready(); else await plugin.await();
  const NodePtcRuntime = (await loadHost('dsh-ptc-runtime-node')).default;
  const mount = async (scope = ctx, native = {}) => {
    const fiber = scope.plugin(NodePtcRuntime, { timeoutMs: 120000, maxTimeoutMs: 600000, ...native });
    await fiber.await();
    const ptc = scope.get('ptcRuntime'); assert.ok(ptc instanceof NodePtcRuntime);
    return { ptc, fiber };
  };
  const request = (extra = {}) => ({ program: 'return 42;', bindings: [], cwd: process.env.HOME, ...extra });
  return { runtime, ctx, plugin, mount, request, loaded };
}

test('late native PTC runtime receives the configured omitted deadline', async t => {
  const f = await fixture(t);
  assert.equal(f.ctx.get('ptcRuntime'), undefined);
  const { ptc } = await f.mount();
  assert.equal(ptc.resolve(f.request()).timeoutMs, 300000);
});

test('already-mounted native PTC runtime is discovered and its original descriptor restored', async t => {
  const f = await fixture(t, { ptcTimeoutMs: 0 });
  const { ptc } = await f.mount();
  const original = Object.getOwnPropertyDescriptor(ptc, 'resolve');
  assert.equal(ptc.resolve(f.request()).timeoutMs, 120000);
  await f.plugin.dispose();
  const plugin = f.ctx.plugin(compactContext, { compactTool: false, ptcTimeoutMs: 300000 });
  await plugin.await();
  assert.equal(ptc.resolve(f.request()).timeoutMs, 300000);
  await plugin.dispose();
  assert.deepEqual(Object.getOwnPropertyDescriptor(ptc, 'resolve'), original);
  assert.equal(ptc.resolve(f.request()).timeoutMs, 120000);
});

test('native runtime replacement and unload restore only the owned deadline wrapper', async t => {
  const f = await fixture(t);
  const first = await f.mount();
  assert.equal(first.ptc.resolve(f.request()).timeoutMs, 300000);
  await first.fiber.dispose();
  const second = await f.mount(f.ctx, { timeoutMs: 110000 });
  assert.notEqual(first.ptc, second.ptc);
  assert.equal(second.ptc.resolve(f.request()).timeoutMs, 300000);
  const captured = second.ptc.resolve.bind(second.ptc);
  await f.plugin.dispose();
  assert.equal(second.ptc.resolve(f.request()).timeoutMs, 110000);
  assert.equal(captured(f.request()).timeoutMs, 110000, 'captured wrappers are inert after unload');
  await second.fiber.dispose();
  const third = await f.mount();
  assert.equal(third.ptc.resolve(f.request()).timeoutMs, 120000, 'unload removes the late-runtime observer');
});

test('native PTC unload preserves a foreign descriptor even when it retains our function', async t => {
  const f = await fixture(t);
  const { ptc } = await f.mount();
  const resolve = Object.getOwnPropertyDescriptor(ptc, 'resolve')!.value;
  Object.defineProperty(ptc, 'resolve', { value: resolve, writable: false, configurable: true, enumerable: false });
  const foreign = Object.getOwnPropertyDescriptor(ptc, 'resolve');
  await f.plugin.dispose();
  assert.deepEqual(Object.getOwnPropertyDescriptor(ptc, 'resolve'), foreign);
  assert.equal(ptc.resolve(f.request()).timeoutMs, 120000, 'retained function is inactive');
});

test('native configuration changes replace PTC defaults and explicit zero removes the modifier', async t => {
  const f = await fixture(t, {}, true);
  const { ptc } = await f.mount();
  assert.equal(ptc.resolve(f.request()).timeoutMs, 300000);
  const update = async (fields: Record<string, unknown>) => {
    await f.loaded!.update({ modules: { 'compact-context': { enabled: true, compactTool: false, ...fields } }, migration: { auto: false } });
    // Native persistence/Loader completion may precede Extras migration admission.
    // Assert the PTC behavior only after the public module status is ready.
    await f.loaded!.ready();
  };
  await update({ ptcTimeoutMs: 450000 });
  assert.equal(ptc.resolve(f.request()).timeoutMs, 450000);
  await update({ ptcTimeoutMs: 0, ptcModelTimeouts: {} });
  assert.equal(ptc.resolve(f.request()).timeoutMs, 120000);
  await update({ ptcTimeoutMs: 0, ptcModelTimeouts: { 'slow/model': 420000 } });
  const handle = await f.runtime.createAgent({ sessionId: 'ptc-live-map', agentOptions: { provider: 'slow', model: 'model' } });
  assert.equal(ptc.resolve(f.request({ stateOwner: handle.agent })).timeoutMs, 420000);
  assert.equal(ptc.resolve(f.request()).timeoutMs, 120000);
});

test('native run_code transport dispatches nested tools under the configured PTC deadline', async t => {
  const f = await fixture(t);
  const { ptc } = await f.mount();
  const resolve = ptc.resolve.bind(ptc);
  const resolved: any[] = [];
  ptc.resolve = (request: any) => { const spec = resolve(request); resolved.push({ request, spec }); return spec; };
  await f.ctx.plugin((await loadHost('dsh-working-directory')).default, { defaultDirectory: process.env.HOME }).await();
  const { PtcExecutor } = await loadHost('dsh-tool-executor-ptc');
  const executor = new PtcExecutor(f.ctx);
  const handle = await f.runtime.createAgent({ sessionId: 'ptc-transport' });
  let nestedCalls = 0;
  f.ctx.tools.register({ name: 'ptc_probe', description: 'Synthetic offline evidence.', parameters: { type: 'object', properties: {} }, output: { schema: { type: 'object', properties: { evidence: { type: 'string' } }, required: ['evidence'] }, render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value) }] }, execute: async () => { nestedCalls++; return { evidence: 'native-nested-call' }; } });
  const result = await executor.execute({ agent: handle.agent, signal: new AbortController().signal, calls: [{ type: 'tool-call', id: 'synthetic-ptc-call', name: 'run_code', arguments: JSON.stringify({ code: 'return await tools.ptc_probe({});', description: 'Synthetic native PTC dispatch evidence' }) }] });
  assert.equal(nestedCalls, 1, JSON.stringify(result));
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].request.stateOwner, handle.agent);
  assert.equal(resolved[0].request.timeoutMs, undefined);
  assert.equal(resolved[0].spec.timeoutMs, 300000);
  assert.equal(result.results.length, 1);
  assert.match(JSON.stringify(result), /native-nested-call/);
});

test('native PTC chooses latest full durable header before current selected model', async t => {
  const f = await fixture(t, { ptcModelTimeouts: { 'route/first': 410000, 'route/second': 520000 } });
  const { ptc } = await f.mount();
  const handle = await f.runtime.createAgent({ sessionId: 'ptc-route', route: 'route', adapter: { failures: 0 }, agentOptions: { provider: 'route', model: 'first' } });
  const request = f.request({ stateOwner: handle.agent });
  assert.equal(handle.agent.session.requestHeader(), undefined);
  assert.equal(ptc.resolve(request).timeoutMs, 410000, 'no header falls back to agent options');
  await runTurn(handle, 'Synthetic first request.');
  handle.agent.model.select({ provider: 'route', model: 'second' });
  assert.equal(handle.agent.session.requestHeader().config.model, 'first');
  assert.equal(ptc.resolve(request).timeoutMs, 410000, 'selection alone is not a full durable header');
  await runTurn(handle, 'Synthetic second request.');
  assert.equal(handle.agent.session.requestHeader().config.model, 'second');
  assert.equal(ptc.resolve(request).timeoutMs, 520000);
});

test('native explicit timeout values keep validation and null authority ahead of defaults', async t => {
  const f = await fixture(t);
  const { ptc } = await f.mount();
  assert.equal(ptc.resolve(f.request({ timeoutMs: 1234 })).timeoutMs, 1234);
  assert.equal(ptc.resolve(f.request({ timeoutMs: 900000 })).timeoutMs, 600000);
  assert.equal(ptc.resolve(f.request({ timeoutMs: null })).timeoutMs, null);
  assert.throws(() => ptc.resolve(f.request({ timeoutMs: 0 })), /timeoutMs must be a positive finite number/);
  assert.throws(() => ptc.resolve(f.request({ timeoutMs: -1 })), /timeoutMs must be a positive finite number/);
});

test('exact native agent presets retain isolated PTC runtimes and cap per-model deadlines', async t => {
  const f = await fixture(t, { ptcModelTimeouts: { 'slow/model': 900000 } }, true);
  await f.ctx.plugin((await loadHost('dsh-agent-preset-registry')).default, { default: 'one' }).await();
  const presets = f.ctx.get('agentPresets');
  const native = (await loadHost('dsh-ptc-runtime-node')).default;
  f.loaded!.importTable.set('@deepseek-ai/dsh-ptc-runtime-node', native);
  for (const [id, maxTimeoutMs] of [['one', 500000], ['two', 600000]] as const) {
    const remove = await presets.register({ id, plugins: [{ id: 'execution', name: 'cordis:group', group: true, isolate: { ptcRuntime: true }, config: [{ id: 'runtime', name: '@deepseek-ai/dsh-ptc-runtime-node', config: { timeoutMs: 120000, maxTimeoutMs } }] }] });
    t.after(remove);
  }
  const create = async (id: string, provider: string) => {
    const handle = await f.ctx.agents.create({ sessionId: 'ptc-' + id, agentOptions: { provider, model: 'model' }, setup: async (scope: any) => { await presets.mount(scope, id); } });
    t.after(() => handle.dispose()); return handle.agent;
  };
  const one = await create('one', 'slow'); const two = await create('two', 'fast');
  const first = presets.serviceFor(one, 'ptcRuntime'); const second = presets.serviceFor(two, 'ptcRuntime');
  assert.ok(first instanceof native); assert.ok(second instanceof native); assert.notEqual(first, second);
  assert.equal(f.ctx.get('ptcRuntime'), undefined);
  assert.equal(first.resolve(f.request({ stateOwner: one })).timeoutMs, 500000);
  assert.equal(second.resolve(f.request({ stateOwner: two })).timeoutMs, 300000);
  const result = await first.run(first.resolve(f.request({ stateOwner: one })));
  assert.equal(result.error, undefined, JSON.stringify(result)); assert.equal(result.value, 42);
});
