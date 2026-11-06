import test from 'node:test';
import assert from 'node:assert/strict';
import { Context, symbols } from '@deepseek-ai/cordis';
import { SessionStore, type Session, type SessionId } from '@deepseek-ai/dsh-session';
import LlmRuntime, { markAgentLoopRequest, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm';
import * as plugin from '../../../src/modules/compact-context/index.ts';

globalThis.fetch = (async () => { throw new Error('reasoning runtime tests forbid network'); }) as typeof fetch;

const fixed = { enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort: 'opaque-effort' }] };
const request = (extra: Partial<GenerateOptions> = {}): GenerateOptions => Object.freeze({
  provider: 'route', model: 'model', messages: Object.freeze([]), purpose: 'compaction', ...extra,
}) as GenerateOptions;
async function consume(stream: AsyncIterable<StreamChunk>): Promise<void> { for await (const _chunk of stream) { /* drain */ } }

test('native request policy clones only the compaction envelope without tool-only dependencies', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  await ctx.plugin(LlmRuntime).await();
  const seen: { options: GenerateOptions; ctx: Context }[] = [];
  ctx.on('llm/stream', function (options) {
    seen.push({ options, ctx: this.ctx });
    return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })();
  });
  const raw = (ctx.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
  const before = Object.getOwnPropertyDescriptor(raw, 'stream');
  const fork = ctx.plugin(plugin, { compactTool: false, compactionReasoning: fixed }); await fork.await();
  const signal = new AbortController().signal;
  const original = request({ signal, tools: [], toolHistory: { tools: [], updates: [] }, maxTokens: 123 });
  await consume(ctx.llm.stream(original));
  assert.equal(seen.length, 1);
  const outgoing = seen[0]!.options;
  assert.equal(outgoing.reasoningEffort, 'opaque-effort');
  assert.notEqual(outgoing, original);
  assert.equal(outgoing.messages, original.messages);
  assert.equal(outgoing.tools, original.tools);
  assert.equal(outgoing.toolHistory, original.toolHistory);
  assert.equal(outgoing.signal, original.signal);
  assert.equal(outgoing.maxTokens, 123);
  assert.equal(Object.hasOwn(original, 'reasoningEffort'), false);
  assert.equal(seen[0]!.ctx, ctx);
  assert.equal(plugin.runtimeStatus(fork.ctx).capabilities.compactionReasoning.phase, 'active');
  await fork.dispose();
  assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
});

function header(session: Session, effort?: string): void {
  session.append('request/header', { reason: session.requestHeader() ? 'change' : 'initial', header: { config: {
    provider: 'conversation-route', model: 'conversation-model',
    ...(effort === undefined ? {} : { reasoningEffort: effort as GenerateOptions['reasoningEffort'] }),
  } } });
}

test('inheritance captures only the exact use-site session durable header before iteration', async t => {
  const ctx = new Context(); t.after(() => ctx.fiber.dispose());
  await ctx.plugin(LlmRuntime).await(); await ctx.plugin(SessionStore).await();
  const scoped = ctx.isolate('sessions'); await scoped.plugin(SessionStore).await();
  const rootSession = ctx.sessions.create('same-id' as SessionId); header(rootSession, 'wrong-root');
  const one = scoped.sessions.create('same-id' as SessionId); header(one, 'scope-first'); header(one, 'scope-latest');
  const two = scoped.sessions.create('other-id' as SessionId); header(two, 'scope-other');
  const empty = scoped.sessions.create('no-header' as SessionId);
  const seen: { options: GenerateOptions; ctx: Context }[] = [];
  ctx.on('llm/stream', function (options) {
    seen.push({ options, ctx: this.ctx });
    return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })();
  }, { global: true });
  const fork = ctx.plugin(plugin, { compactTool: false, compactionReasoning: { enabled: true, rules: [
    { scope: 'all', mode: 'fixed', effort: 'broader-must-not-win' },
    { scope: 'provider-model', provider: 'route', model: 'model', mode: 'inherit' },
    { scope: 'provider', provider: 'route', mode: 'fixed', effort: 'provider-effort' },
  ] } }); await fork.await();
  const first = request({ sessionId: one.id }); const other = request({ sessionId: two.id });
  const firstStream = scoped.llm.stream(first); const otherStream = scoped.llm.stream(other);
  header(one, 'too-late');
  await Promise.all([consume(firstStream), consume(otherStream)]);
  assert.deepEqual(seen.map(item => item.options.reasoningEffort), ['scope-latest', 'scope-other']);
  // Cordis re-shadows the event listener to its registration context. The
  // inherited values above prove the modifier used the incoming session scope,
  // rather than mistaking the downstream observer's root context for use-site.
  assert.notEqual(seen[0]!.options.reasoningEffort, rootSession.requestHeader()?.config.reasoningEffort);
  const missing = request({ sessionId: 'missing' as SessionId, reasoningEffort: 'keep-original' as GenerateOptions['reasoningEffort'] });
  const absentHeader = request({ sessionId: empty.id });
  header(two); const absentEffort = request({ sessionId: two.id });
  const noId = request();
  const loop = markAgentLoopRequest(request({ sessionId: one.id }));
  const ordinary = request({ sessionId: one.id, purpose: undefined });
  for (const value of [missing, absentHeader, absentEffort, noId, loop, ordinary]) {
    await consume(scoped.llm.stream(value)); assert.equal(seen.at(-1)!.options, value);
  }
  const provider = request({ model: 'different-summary-model' }); await consume(scoped.llm.stream(provider));
  assert.equal(seen.at(-1)!.options.reasoningEffort, 'provider-effort');
  const all = request({ provider: 'Route' }); await consume(scoped.llm.stream(all));
  assert.equal(seen.at(-1)!.options.reasoningEffort, 'broader-must-not-win');
});
