/** Native 0.2.2-alpha.3 entry acceptance; synthetic data and offline adapters only. */
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as compactContext from '../../src/modules/compact-context/index.ts';
import { createRuntime, runTurn, llm, runtimeVersion } from '../modules/retry/runtime.ts';
import { loadHost } from './loader-harness.ts';

const signal = () => new AbortController().signal;
const history = 'Synthetic project history, decisions and implementation details. '.repeat(1200);
const nativePolicy = { auto: false, thresholdRatio: 0.6, headroomTokens: 0, retainTokens: 0, maxTokens: 100, compactionRetries: 0, maxOverflowRetries: 1 };
const inherit = { enabled: true, rules: [{ scope: 'all', mode: 'inherit' }] };

class CaptureAdapter extends llm.LlmAdapter {
  calls: any[] = [];
  windows: Record<string, number> = {};
  overflowNext = false;
  toolNext: string | undefined;
  async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model, context: { contextWindow: this.windows[model] ?? 1000000 }, defaultMaxTokens: 100,
      reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }] } };
  }
  async *stream(options: any): AsyncGenerator<any> {
    this.calls.push({ ...options, messages: structuredClone(options.messages) });
    if (this.overflowNext && options.purpose !== 'compaction') {
      this.overflowNext = false;
      yield { type: 'finish', reason: { kind: 'error', failure: { code: 'CONTEXT_WINDOW_EXCEEDED', message: 'Synthetic overflow' } } };
      return;
    }
    if (this.toolNext && options.purpose !== 'compaction') {
      const name = this.toolNext; this.toolNext = undefined;
      const block = { type: 'tool-call', id: 'synthetic-compact-call', name, arguments: '{}' };
      yield { type: 'block-start', index: 0, blockType: 'tool-call' };
      yield { type: 'tool-call-delta', index: 0, id: block.id, name, argumentsDelta: '{}' };
      yield { type: 'block-end', index: 0, block };
      yield { type: 'finish', reason: { kind: 'tool-calls' } };
      return;
    }
    const text = options.purpose === 'compaction' ? 'Synthetic compact checkpoint.' : 'Synthetic response.';
    yield { type: 'block-start', index: 0, blockType: 'text' };
    yield { type: 'text-delta', index: 0, text };
    yield { type: 'block-end', index: 0, block: { type: 'text', text } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  }
}

async function fixture(t: TestContext, options: Record<string, any> = {}) {
  assert.equal(runtimeVersion, '0.2.2-alpha.3');
  const runtime = await createRuntime({ product: false, retry: false, persistent: true });
  t.after(() => runtime.dispose());
  const ctx = runtime.ctx;
  await ctx.plugin((await loadHost('dsh-token-meter')).default).await();
  await ctx.plugin((await loadHost('dsh-compaction-basic')).default, { ...nativePolicy, ...options.native }).await();
  await ctx.plugin((await loadHost('dsh-commands')).default).await();
  await ctx.plugin(await loadHost('dsh-command-compact')).await();
  const plugin = ctx.plugin(compactContext, { compactTool: false, compactionReasoning: inherit, ...options.plugin });
  await plugin.await();
  const adapter = new CaptureAdapter();
  Object.assign(adapter.windows, options.windows);
  ctx.llm.registerAdapter(['synthetic-native'], adapter);
  const handle = await ctx.agents.create({ sessionId: 'synthetic-native-session', agentOptions: { provider: 'synthetic-native', model: 'large-model', reasoningEffort: 'low' } });
  t.after(() => handle.dispose());
  const agent = handle.agent;
  const events = () => agent.session.snapshotEvents();
  const summaries = () => adapter.calls.filter(call => call.purpose === 'compaction');
  const turns = { ...handle, state: { events: [], frames: [], requests: [] } };
  return { runtime, ctx, plugin, adapter, agent, events, summaries, turns };
}

function assertTransaction(f: any, afterSeq: number, generation: number) {
  const events = f.events().filter((event: any) => event.seq > afterSeq);
  const starts = events.filter((event: any) => event.type === 'compaction/start');
  const summaries = events.filter((event: any) => event.type === 'compaction/summary');
  const ends = events.filter((event: any) => event.type === 'compaction/end');
  assert.equal(starts.length, 1); assert.equal(summaries.length, 1); assert.equal(ends.length, 1);
  assert.equal(summaries[0].data.compactionId, starts[0].data.compactionId);
  assert.equal(ends[0].data.compactionId, starts[0].data.compactionId);
  assert.equal(summaries[0].data.llmStreamCall, true);
  assert.ok(f.agent.session.surface.replaceGeneration > generation);
  return { start: starts[0], summary: summaries[0], end: ends[0] };
}

test('native /compact applies inherited reasoning with compactTool=false', async t => {
  const f = await fixture(t);
  assert.equal(f.ctx.tools.get('compact_context', f.agent), undefined);
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  assert.deepEqual(compactContext.resolveConfig({ compactionReasoning: inherit }).compactionReasoning, inherit);
  assert.equal(f.agent.session.requestHeader().config.reasoningEffort, 'low');
  assert.equal(f.adapter.calls.length, 2);
  assert.ok(f.adapter.calls.every(call => call.purpose !== 'compaction' && call.reasoningEffort === 'low'));
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const calls = f.adapter.calls.length;
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success', JSON.stringify(result));
  const transaction = assertTransaction(f, seq, generation);
  const commandEvents = f.events().filter((event: any) => event.seq > seq && ['command/run', 'command/done'].includes(event.type));
  assert.deepEqual(commandEvents.map((event: any) => event.type), ['command/run', 'command/done']);
  assert.ok(commandEvents.every((event: any) => event.data.commandId === result.commandId));
  assert.equal(transaction.start.data.turn, null);
  assert.equal(transaction.summary.data.sourceCommandId, result.commandId);
  assert.equal(result.result.sourceEventSeq, transaction.summary.seq);
  assert.equal(f.adapter.calls.length - calls, 1);
  assert.equal(f.summaries().length, 1);
  assert.equal(f.summaries()[0].reasoningEffort, 'low');
});

test('native automatic pressure applies policy with compactTool=false and leaves LOOP effort unchanged', async t => {
  const f = await fixture(t, { native: { auto: true }, windows: { 'large-model': 10000 },
    plugin: { compactionReasoning: { enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort: 'high' }] } } });
  await runTurn(f.turns, history);
  assert.equal(f.summaries().length, 0, 'the first pre-step has no durable request header');
  assert.ok(f.ctx.tokenMeter.measure(f.agent.session).totalTokens > 6000, 'fixture must exceed native pressure threshold');
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  await runTurn(f.turns, 'Continue briefly.');
  assertTransaction(f, seq, generation);
  assert.equal(f.ctx.tools.get('compact_context', f.agent), undefined);
  assert.equal(f.adapter.calls.length - before, 2);
  assert.equal(f.summaries().length, 1);
  assert.equal(f.summaries()[0].reasoningEffort, 'high');
  assert.ok(f.adapter.calls.filter(call => call.purpose !== 'compaction').every(call => call.reasoningEffort === 'low'));
});

test('native overflow recovery applies inherited reasoning with compactTool=false and retries once', async t => {
  const f = await fixture(t, { native: { auto: true } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  assert.ok(f.ctx.tokenMeter.measure(f.agent.session).totalTokens < 600000, 'pressure must not steal overflow coverage');
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  f.adapter.overflowNext = true;
  await runTurn(f.turns, 'Recover from the synthetic overflow.');
  assertTransaction(f, seq, generation);
  assert.equal(f.ctx.tools.get('compact_context', f.agent), undefined);
  const calls = f.adapter.calls.slice(before);
  assert.deepEqual(calls.map(call => call.purpose === 'compaction'), [false, true, false]);
  assert.ok(calls.every(call => call.reasoningEffort === 'low'));
  assert.equal(f.summaries().length, 1);
  const assistant = f.events().filter((event: any) => event.type === 'assistant/message').at(-1);
  assert.ok(assistant.data.message.content.some((block: any) => block.type === 'text' && block.text === 'Synthetic response.'));
});

test('native model switch summarizes the old durable route and effort before committing the new header', async t => {
  const f = await fixture(t, { native: { auto: true }, windows: { 'small-model': 10000 } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  assert.equal(f.summaries().length, 0);
  const oldHeader = f.agent.session.requestHeader();
  assert.ok(f.ctx.tokenMeter.measure(f.agent.session, { ...oldHeader, config: { ...oldHeader.config, model: 'small-model' } }).totalTokens > 6000);
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  f.agent.model.select({ provider: 'synthetic-native', model: 'small-model', reasoningEffort: 'high' });
  assert.equal(f.agent.session.requestHeader().config.model, 'large-model', 'model/select is not a durable request/header');
  await runTurn(f.turns, 'Continue on the smaller model.');
  const transaction = assertTransaction(f, seq, generation);
  const calls = f.adapter.calls.slice(before);
  assert.deepEqual(calls.map(call => [call.purpose === 'compaction', call.model, call.reasoningEffort]),
    [[true, 'large-model', 'low'], [false, 'small-model', 'high']]);
  const header = f.events().find((event: any) => event.seq > seq && event.type === 'request/header' && event.data.header.config.model === 'small-model');
  assert.ok(header.seq > transaction.end.seq);
  assert.equal(f.agent.session.requestHeader().config.reasoningEffort, 'high');
  assert.equal(f.ctx.tools.get('compact_context', f.agent), undefined);
});

test('agent compact_context tool uses native retained region transaction through the ordinary executor', async t => {
  const f = await fixture(t, { native: { retainTokens: 100 }, plugin: { compactTool: true } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const tool = f.ctx.tools.get('compact_context', f.agent);
  assert.ok(tool);
  assert.deepEqual(tool.parameters.properties, {});
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  f.adapter.toolNext = 'compact_context';
  await runTurn(f.turns, 'Compact earlier history and continue.');
  const transaction = assertTransaction(f, seq, generation);
  assert.notEqual(transaction.start.data.turn, null);
  const calls = f.adapter.calls.slice(before);
  assert.deepEqual(calls.map(call => call.purpose === 'compaction'), [false, true, false]);
  assert.ok(calls.every(call => call.reasoningEffort === 'low'));
  assert.equal(f.events().filter((event: any) => event.seq > seq && event.type === 'tool/result').length, 1);
});

test('public native compactRegion honors an explicit balanced surface range without the agent tool', async t => {
  const f = await fixture(t);
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const nodes = [...f.agent.session.surface.nodes];
  const selected = nodes.filter((seq: number) => ['user/message', 'assistant/message'].includes(f.agent.session.eventAt(seq).type)).slice(0, 2);
  assert.equal(selected.length, 2);
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  // Public session events establish native current-turn ownership, not a replacement summarizer.
  f.agent.session.append('turn/start', { turn: 3 });
  try {
    const result = await f.ctx.compaction.compactRegion(selected[0], selected[1], f.agent, signal());
    assert.deepEqual(result.shadowedSeqs, selected);
  } finally {
    f.agent.session.append('turn/end', { turn: 3, reason: { kind: 'completed' } });
  }
  const transaction = assertTransaction(f, seq, generation);
  assert.deepEqual(transaction.summary.data.shadowedSeqs, selected);
  assert.ok(nodes.filter((node: number) => !selected.includes(node)).every((node: number) => f.agent.session.surface.nodes.includes(node)));
  assert.equal(f.adapter.calls.length - before, 1);
  assert.equal(f.summaries()[0].reasoningEffort, 'low');
});
