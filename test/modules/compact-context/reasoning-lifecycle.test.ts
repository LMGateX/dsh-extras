import test from 'node:test';
import assert from 'node:assert/strict';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime, { type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm';
import * as plugin from '../../../src/modules/compact-context/index.ts';
import { loaderFixture, until } from '../../integration/loader-harness.ts';
import Storage from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
import { mkdtemp, rm } from 'node:fs/promises';
import { nativeProfileFixture } from '../../native-profile-fixture.ts';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openSharedCompactionStore } from '../../../src/shared-compaction/store.ts';
import type { CompactionReasoningPolicy } from '../../../src/shared-compaction/index.ts';

globalThis.fetch = (async () => { throw new Error('reasoning lifecycle tests forbid network'); }) as typeof fetch;
const distribution = { name: '@dsh-extras/compact-context', moduleIds: ['compact-context'] as const, modulePlugins: { 'compact-context': plugin } };
const policy = (effort: string, enabled = true) => ({ enabled, rules: [{ scope: 'all', mode: 'fixed', effort }] });
const config = (effort: string, enabled = true) => ({ migration: { auto: false }, modules: { 'compact-context': { compactTool: false, compactionReasoning: policy(effort, enabled) } } });
const request = (): GenerateOptions => Object.freeze({ provider: 'route', model: 'model', messages: [], purpose: 'compaction' }) as GenerateOptions;
async function consume(stream: AsyncIterable<StreamChunk>): Promise<void> { for await (const _chunk of stream) { /* drain */ } }

test('real Loader volatile updates capture in-flight policy, remove disabled effects and never stack across repeated re-enables', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'reasoning-lifecycle-'));
  const ctx = new Context(); t.after(async () => { await ctx.fiber.dispose(); await rm(directory, { recursive: true, force: true }); });
  (await nativeProfileFixture(t, { home: join(directory, 'home') })).provide(ctx);
  await ctx.plugin(LlmRuntime).await();
  const seen: GenerateOptions[] = [];
  ctx.on('llm/stream', options => { seen.push(options); return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })(); }, { global: true });
  const raw = (ctx.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
  const before = Object.getOwnPropertyDescriptor(raw, 'stream'); const prototype = Object.getOwnPropertyDescriptor(LlmRuntime.prototype, 'stream');
  await ctx.plugin(Storage).await();
  await ctx.plugin(Json, { root: directory }).await();
  await ctx.plugin(Domain, { backend: 'json' }).await();
  const canonical = await openSharedCompactionStore(ctx);
  const savePolicy = (effort: string) => canonical.write({ expectedRevision: canonical.read().revision,
    defaults: policy(effort) as CompactionReasoningPolicy, workspaceOverrides: {} });
  await savePolicy('one');
  const fixture = await loaderFixture(t, distribution, config('one'), ctx); await fixture.ready();
  const status = () => fixture.status().modules['compact-context'].capabilities;
  const admitted = (enabled: boolean, revision: number) => until(() => fixture.status(), value => {
    const module = value.modules?.['compact-context'];
    const reasoning = module?.capabilities?.compactionReasoning;
    return module?.ready === true && module.phase === 'active' && module.enabled === true
      && reasoning?.phase === (enabled ? 'active' : 'disabled')
      && reasoning.participating === enabled && reasoning.revision === revision;
  }, 'native compact-context admission at canonical revision ' + revision + ', participating=' + enabled);
  // Loader/config persistence can finish before asynchronous ownership discovery
  // republishes the exact feature capability. Await that public state, not time.
  // Canonical revision and local participation fence out a stale prior projection.
  const update = async (effort: string, enabled = true) => {
    const accepted = await savePolicy(effort);
    await fixture.update(config('one', enabled));
    await admitted(enabled, accepted.revision);
  };
  await admitted(true, canonical.read().revision);
  assert.equal(status().compactionReasoning.phase, 'active'); assert.equal(status().tools.phase, 'disabled');
  const original = request(); const first = ctx.llm.stream(original);
  await update('two'); const second = ctx.llm.stream(original);
  await update('three', false);
  assert.equal(status().compactionReasoning.phase, 'disabled'); assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
  await Promise.all([consume(first), consume(second)]);
  assert.deepEqual(seen.map(value => value.reasoningEffort), ['one', 'two']);
  assert.equal(original.reasoningEffort, undefined);
  await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1), original);
  const late = ctx.isolate('llm'); await late.plugin(LlmRuntime).await();
  const lateRaw = (late.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
  assert.equal(Object.getOwnPropertyDescriptor(lateRaw, 'stream'), undefined);
  for (const effort of ['three', 'four', 'five']) {
    await update(effort);
    assert.equal(status().compactionReasoning.phase, 'active');
    const count = seen.length; await consume(ctx.llm.stream(original)); await consume(late.llm.stream(original));
    assert.equal(seen.length, count + 2); assert.deepEqual(seen.slice(-2).map(value => value.reasoningEffort), [effort, effort]);
    await update(effort, false);
    assert.equal(status().compactionReasoning.phase, 'disabled');
    assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
    assert.equal(Object.getOwnPropertyDescriptor(lateRaw, 'stream'), undefined);
  }
  await update('after-reenable');
  const pending = ctx.llm.stream(original); await fixture.dispose(); await consume(pending);
  assert.equal(seen.at(-1)!.reasoningEffort, 'after-reenable');
  assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
  assert.equal(Object.getOwnPropertyDescriptor(lateRaw, 'stream'), undefined);
  assert.deepEqual(Object.getOwnPropertyDescriptor(LlmRuntime.prototype, 'stream'), prototype);
});

test('native live-view notification rejects a malformed candidate as a whole and retains the last accepted policy and tool state', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose()); await ctx.plugin(LlmRuntime).await();
  const seen: GenerateOptions[] = [];
  ctx.on('llm/stream', options => { seen.push(options); return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })(); });
  let value: Record<string, unknown> = { compactTool: false, compactionReasoning: policy('accepted-one') };
  const view = {};
  for (const key of ['compactTool', 'compactionReasoning']) Object.defineProperty(view, key, { enumerable: true, get: () => value[key] });
  // This is the stable public input view and own-fiber notification used by the
  // root module boundary, without any private hook or reflection-store patch.
  const fork = ctx.plugin({ name: plugin.name, inject: plugin.inject, apply: plugin.apply }, view); await fork.await();
  const notify = () => { const receiver = Object.create(fork.ctx); receiver[Context.filter] = (owner: Context) => owner.fiber === fork.ctx.fiber; fork.ctx.emit(receiver, 'loader/volatile-update', [['compactionReasoning'], ['compactTool']]); };
  const status = () => plugin.runtimeStatus(fork.ctx).capabilities;
  const original = request(); const pending = ctx.llm.stream(original);
  value = { compactTool: true, compactionReasoning: { enabled: true, rules: [ ...policy('bad').rules, ...policy('duplicate').rules ] } };
  notify(); await consume(pending); await consume(ctx.llm.stream(original));
  assert.deepEqual(seen.map(item => item.reasoningEffort), ['accepted-one', 'accepted-one']);
  assert.equal(status().compactionReasoning.phase, 'active'); assert.equal(status().tools.phase, 'disabled');
  value = { compactTool: true, compactionReasoning: policy('accepted-two') }; notify();
  await consume(ctx.llm.stream(original)); assert.equal(seen.at(-1)!.reasoningEffort, 'accepted-two');
  assert.equal(status().compactionReasoning.phase, 'active'); assert.equal(status().tools.phase, 'unavailable');
});
