import test from 'node:test';
import assert from 'node:assert/strict';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime, { type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm';
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
