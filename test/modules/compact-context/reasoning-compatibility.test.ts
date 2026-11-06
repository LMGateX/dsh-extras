import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime, { type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm';
import * as plugin from '../../../src/modules/compact-context/index.ts';

globalThis.fetch = (async () => { throw new Error('reasoning compatibility tests forbid network'); }) as typeof fetch;
const fixed = { enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort: 'opaque-effort' }] };
const request = (): GenerateOptions => Object.freeze({ provider: 'route', model: 'model', messages: [], purpose: 'compaction' }) as GenerateOptions;
async function consume(stream: AsyncIterable<StreamChunk>): Promise<void> { for await (const _chunk of stream) { /* drain */ } }
async function fixture(t: TestContext) {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  const llm = ctx.plugin(LlmRuntime); await llm.await();
  const raw = (ctx.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
  const seen: GenerateOptions[] = [];
  ctx.on('llm/stream', options => { seen.push(options); return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })(); }, { global: true });
  const mount = async () => { const fork = ctx.plugin(plugin, { compactTool: false, compactionReasoning: fixed }); await fork.await(); return fork; };
  return { ctx, llm, raw, seen, mount };
}

test('no native runtime is unavailable, native provision activates, withdrawal and reprovision recover', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  const fork = ctx.plugin(plugin, { compactTool: false, compactionReasoning: fixed }); await fork.await();
  const status = () => plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning;
  assert.equal(status().phase, 'unavailable'); assert.match(status().reason!, /no native LLM/);
  const first = ctx.plugin(LlmRuntime); await first.await(); assert.equal(status().phase, 'active');
  await first.dispose(); assert.equal(status().phase, 'unavailable');
  await ctx.plugin(LlmRuntime).await(); assert.equal(status().phase, 'active');
});

test('an unknown isolated runtime withdraws all modifiers without breaking native compaction and removal recovers', async t => {
  const { ctx, raw, seen, mount } = await fixture(t); const fork = await mount();
  const native = LlmRuntime.prototype.stream; const original = request();
  assert.notEqual(Object.getOwnPropertyDescriptor(raw, 'stream')?.value, native);
  const foreign = ctx.isolate('llm');
  const remove = foreign.reflect.provide('llm', { stream() { throw new Error('custom runtime must not be called by probing'); } } as unknown as LlmRuntime);
  const status = () => plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning;
  assert.equal(status().phase, 'unavailable'); assert.match(status().reason!, /lineage/);
  assert.equal(Object.getOwnPropertyDescriptor(raw, 'stream'), undefined);
  await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1), original); assert.equal(status().phase, 'unavailable');
  await remove(); assert.equal(status().phase, 'active');
  await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1)!.reasoningEffort, 'opaque-effort');
  assert.equal(Object.getOwnPropertyDescriptor(LlmRuntime.prototype, 'stream')!.value, native);
});

test('native descriptors must be inert and replaceable; original native compaction stays available', async t => {
  for (const kind of ['nonextensible', 'accessor', 'unwritable'] as const) await t.test(kind, async child => {
    const { ctx, raw, seen, mount } = await fixture(child); let reads = 0;
    if (kind === 'nonextensible') Object.preventExtensions(raw);
    if (kind === 'accessor') Object.defineProperty(raw, 'stream', { configurable: true, get() { reads++; return LlmRuntime.prototype.stream; } });
    if (kind === 'unwritable') Object.defineProperty(raw, 'stream', { value: LlmRuntime.prototype.stream, configurable: false, writable: false });
    const before = Object.getOwnPropertyDescriptor(raw, 'stream'); const fork = await mount();
    const status = plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning;
    assert.equal(status.phase, 'unavailable'); assert.equal(reads, 0);
    assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
    // Native Cordis itself cannot proxy a non-configurable non-writable method:
    // its tracing proxy violates the JS read-only invariant even without Extras.
    if (kind !== 'unwritable') { const original = request(); await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1), original); }
    await fork.dispose(); assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
  });
});

test('exact own descriptors are restored and a later wrapper is never overwritten or left with live stale policy', async t => {
  const { ctx, raw, seen, mount } = await fixture(t);
  const own = { value: LlmRuntime.prototype.stream, configurable: false, writable: true, enumerable: true };
  Object.defineProperty(raw, 'stream', own);
  const first = await mount(); await first.dispose(); assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), own);
  const fork = await mount(); const installed = Object.getOwnPropertyDescriptor(raw, 'stream')!;
  const later: LlmRuntime['stream'] = function (this: LlmRuntime, options) { return Reflect.apply(installed.value, this, [options]); };
  const laterDescriptor = { ...installed, value: later }; Object.defineProperty(raw, 'stream', laterDescriptor);
  const original = request(); await consume(ctx.llm.stream(original));
  assert.equal(plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning.phase, 'unavailable');
  assert.equal(seen.at(-1), original);
  assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), laterDescriptor);
  await fork.dispose(); assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), laterDescriptor);
  await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1), original);
});

test('a borrowed wrapper rejects a different native Context root but preserves the incoming receiver and native request', async t => {
  const one = await fixture(t); const two = await fixture(t); const fork = await one.mount();
  const wrapped = one.ctx.llm.stream; const other = two.ctx.llm;
  const original = request(); await consume(Reflect.apply(wrapped, other, [original]));
  const state = plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning;
  assert.equal(state.phase, 'unavailable'); assert.equal(state.reason, 'unverified incoming LLM context');
  assert.equal(two.seen.at(-1), original); assert.equal(one.seen.length, 0);
  assert.equal(Object.getOwnPropertyDescriptor(one.raw, 'stream'), undefined);
});

test('an unverified public package version fails closed without modifying native runtime', async t => {
  const { ctx, raw, seen, mount } = await fixture(t);
  // Public package metadata in the in-memory module cache only; never edit node_modules.
  const metadata = createRequire(import.meta.url)('@deepseek-ai/dsh-llm/package.json'); const version = metadata.version;
  metadata.version = 'unverified-test-version';
  try {
    const fork = await mount(); const state = plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning;
    assert.equal(state.phase, 'unavailable'); assert.equal(state.reason, 'unverified host version');
    assert.equal(Object.getOwnPropertyDescriptor(raw, 'stream'), undefined);
    const original = request(); await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1), original);
  } finally { metadata.version = version; }
});

test('an unsupported compaction envelope is passed through without getter evaluation and withdraws the modifier', async t => {
  const { ctx, raw, seen, mount } = await fixture(t); const fork = await mount();
  let reads = 0;
  const original = Object.freeze(Object.defineProperty({ ...request() }, 'provider', { enumerable: true, get() { reads++; return 'route'; } })) as GenerateOptions;
  const stream = ctx.llm.stream(original);
  assert.equal(reads, 0); assert.equal(plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning.phase, 'unavailable');
  assert.equal(Object.getOwnPropertyDescriptor(raw, 'stream'), undefined);
  await consume(stream); assert.equal(seen.at(-1), original); assert.equal(reads, 0);
  const next = request(); await consume(ctx.llm.stream(next)); assert.equal(seen.at(-1), next);
  assert.equal(plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning.phase, 'unavailable');
});
