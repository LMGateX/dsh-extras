import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Distribution, FeaturePlugin } from '../../src/types.ts';
import { createRuntime, runTurn, llm } from '../modules/retry/runtime.ts';
import { loadHost, loaderFixture } from '../integration/loader-harness.ts';

const root = resolve(import.meta.dirname, '../..');
const version = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version;
const unpack = promisify(execFile);

test('packed combined policy changes native summary effort with agent tools disabled', { timeout: 20000 }, async t => {
  const temp = await mkdtemp(join(root, '.sandbox-packed-reasoning-'));
  t.after(async () => {
    assert.equal(dirname(temp), root); assert.ok(basename(temp).startsWith('.sandbox-packed-reasoning-'));
    await rm(temp, { recursive: true, force: true });
  });
  await unpack('tar', ['-xzf', join(root, 'artifacts', 'dsh-extras-' + version + '.tgz'), '-C', temp]);
  const entry = await import(pathToFileURL(join(temp, 'package/lib/index.js')).href) as FeaturePlugin;
  const runtime = await createRuntime({ product: false, retry: false }); t.after(() => runtime.dispose());
  const ctx = runtime.ctx;
  const calls: any[] = [];
  const summaryEnvelopes: any[] = [];
  ctx.on('llm/stream', (options: any, next: () => unknown) => {
    if (options.purpose === 'compaction') summaryEnvelopes.push(options);
    return next();
  });
  class PackedAdapter extends llm.LlmAdapter {
    async resolveModel(provider: string, model: string) {
      return { provider, id: model, name: model, context: { contextWindow: 1000000 }, defaultMaxTokens: 100,
        reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] } };
    }
    async *stream(options: any) {
      calls.push(options);
      yield { type: 'block-start', index: 0, blockType: 'text' };
      yield { type: 'text-delta', index: 0, text: 'Synthetic packed acceptance summary.' };
      yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Synthetic packed acceptance summary.' } };
      yield { type: 'finish', reason: { kind: 'stop' } };
    }
  }
  ctx.llm.registerAdapter(['packed-policy-route'], new PackedAdapter());
  await ctx.plugin((await loadHost('dsh-token-meter')).default).await();
  await ctx.plugin((await loadHost('dsh-compaction-basic')).default, { auto: false, retainTokens: 0, headroomTokens: 0, maxTokens: 100 }).await();
  const d: Distribution = { name: 'dsh-extras', moduleIds: ['compact-context'], modulePlugins: {} };
  const f = await loaderFixture(t, d, { modules: {
    'compact-context': { enabled: true, compactTool: false, compactionReasoning: { enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort: 'high' }] } },
    retry: { enabled: false }, chime: { enabled: false }, goalWait: { enabled: false },
  }, migration: { auto: false } }, ctx, [], entry);
  await f.ready();
  const handle = await ctx.agents.create({ sessionId: 'packed-synthetic-session', agentOptions: { provider: 'packed-policy-route', model: 'packed-model', reasoningEffort: 'low' } });
  t.after(() => handle.dispose());
  assert.equal(ctx.tools.get('compact_context', handle.agent), undefined);
  await runTurn(handle, 'Synthetic old packed history. '.repeat(1000));
  await runTurn(handle, 'Synthetic newer packed history. '.repeat(1000));
  assert.deepEqual(calls.map(call => call.reasoningEffort), ['low', 'low']);
  const before = handle.agent.session.surface.replaceGeneration;
  const signal = new AbortController().signal;
  const result = await ctx.get('compaction').compactNow(handle.agent, signal);
  assert.ok(result);
  assert.ok(handle.agent.session.surface.replaceGeneration > before);
  const summaries = calls.filter(call => call.purpose === 'compaction');
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0].reasoningEffort, 'high');
  assert.equal(summaryEnvelopes.length, 1);
  assert.equal(summaries[0].signal, summaryEnvelopes[0].signal, 'preserve the native stream envelope signal; the engine may already compose cancellation');
  assert.equal(calls.length, 3, 'native policy introduces no extra provider dispatch');
});
