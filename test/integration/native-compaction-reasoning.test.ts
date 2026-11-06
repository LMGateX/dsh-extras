/** Native 0.2.2-alpha.3 entry acceptance; synthetic data and offline adapters only. */
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as compactContext from '../../src/modules/compact-context/index.ts';
import { createRuntime, runTurn, llm, runtimeVersion } from '../modules/retry/runtime.ts';
import { loadHost, loaderFixture } from './loader-harness.ts';
import type { Distribution } from '../../src/types.ts';

const signal = () => new AbortController().signal;
const history = 'Synthetic project history, decisions and implementation details. '.repeat(1200);
const nativePolicy = { auto: false, thresholdRatio: 0.6, headroomTokens: 0, retainTokens: 0, maxTokens: 100, compactionRetries: 0, maxOverflowRetries: 1 };
const inherit = { enabled: true, rules: [{ scope: 'all', mode: 'inherit' }] };

class CaptureAdapter extends llm.LlmAdapter {
  calls: any[] = [];
  windows: Record<string, number> = {};
  overflowNext = false;
  toolNext: string | undefined;
  defaultEffort: string | undefined;
  async resolveModel(provider: string, model: string) {
    return { provider, id: model, name: model, context: { contextWindow: this.windows[model] ?? 1000000 }, defaultMaxTokens: 100,
      reasoning: { efforts: [{ id: 'low', name: 'Low' }, { id: 'high', name: 'High' }], ...(this.defaultEffort ? { defaultEffort: this.defaultEffort } : {}) } };
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
  const rowConfig = { compactTool: false, compactionReasoning: inherit, ...options.plugin };
  const initial = { modules: { 'compact-context': { enabled: true, ...rowConfig } }, migration: { auto: false } };
  const distribution: Distribution = { name: 'dsh-extras-compact-context', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': compactContext } };
  const loader = options.loader ? await loaderFixture(t, distribution, initial, ctx) : undefined;
  const plugin = loader?.fiber ?? ctx.plugin(compactContext, rowConfig);
  if (loader) await loader.ready(); else await plugin.await();
  const adapter = new CaptureAdapter();
  Object.assign(adapter.windows, options.windows);
  adapter.defaultEffort = options.defaultEffort;
  ctx.llm.registerAdapter(['synthetic-native', ...(options.providers ?? [])], adapter);
  const handle = await ctx.agents.create({ sessionId: 'synthetic-native-session', agentOptions: { provider: 'synthetic-native', model: 'large-model', reasoningEffort: 'low', ...options.agentOptions } });
  t.after(() => handle.dispose());
  const agent = handle.agent;
  const events = () => agent.session.snapshotEvents();
  const summaries = () => adapter.calls.filter(call => call.purpose === 'compaction');
  const turns = { ...handle, state: { events: [], frames: [], requests: [] } };
  return { runtime, ctx, plugin, loader, initial, adapter, agent, events, summaries, turns };
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

test('native explicit summary routing matches exact provider-model ahead of broader rules and conversation route', async t => {
  const f = await fixture(t, { providers: ['synthetic-summary'],
    native: { summarizationProvider: 'synthetic-summary', summarizationModel: 'summary-model' },
    plugin: { compactionReasoning: { enabled: true, rules: [
      { scope: 'provider-model', provider: 'synthetic-summary', model: 'summary-model', mode: 'fixed', effort: 'high' },
      { scope: 'all', mode: 'fixed', effort: 'low' },
      { scope: 'provider', provider: 'synthetic-summary', mode: 'fixed', effort: 'low' },
    ] } } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success');
  const transaction = assertTransaction(f, seq, generation);
  assert.equal(f.adapter.calls.length - before, 1);
  assert.deepEqual(f.summaries().map(call => [call.provider, call.model, call.reasoningEffort]), [['synthetic-summary', 'summary-model', 'high']]);
  assert.equal(transaction.summary.data.provider, 'synthetic-summary');
  assert.equal(transaction.summary.data.model, 'summary-model');
  assert.equal(f.agent.session.requestHeader().config.provider, 'synthetic-native');
  assert.equal(f.agent.session.requestHeader().config.reasoningEffort, 'low');
});

test('native manual compaction inherits adapter-default effort materialized in the durable header', async t => {
  const f = await fixture(t, { defaultEffort: 'low', agentOptions: { reasoningEffort: undefined } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const header = f.agent.session.requestHeader();
  assert.equal(header.config.reasoningEffort, 'low');
  assert.equal(header.adapterDefaults.reasoningEffort, true);
  // Remove the adapter default before summary dispatch: only the durable header can supply low now.
  f.adapter.defaultEffort = undefined;
  const before = f.adapter.calls.length;
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success');
  assertTransaction(f, seq, generation);
  assert.equal(f.adapter.calls.length - before, 1);
  assert.equal(f.summaries()[0].reasoningEffort, 'low');
});

test('native summary inheritance treats latest headers as complete snapshots and does not fall back to broader rules', async t => {
  const f = await fixture(t, { plugin: { compactionReasoning: { enabled: true, rules: [
    { scope: 'all', mode: 'fixed', effort: 'high' },
    { scope: 'provider-model', provider: 'synthetic-native', model: 'large-model', mode: 'inherit' },
  ] } } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const original = f.agent.session.requestHeader();
  f.agent.session.append('request/header', { header: { ...original, config: { ...original.config, reasoningEffort: 'high' } }, reason: 'change' });
  assert.equal(f.agent.session.requestHeader().config.reasoningEffort, 'high');
  f.agent.session.append('request/header', { header: { config: { provider: 'synthetic-native', model: 'large-model', maxTokens: 100 } }, reason: 'change' });
  f.agent.model.select({ provider: 'synthetic-native', model: 'large-model', reasoningEffort: 'high' });
  assert.equal(f.agent.options.reasoningEffort, 'low', 'live options disagree with both the pending choice and latest header');
  assert.equal(f.agent.session.requestHeader().config.reasoningEffort, undefined);
  const before = f.adapter.calls.length;
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success');
  assertTransaction(f, seq, generation);
  assert.equal(f.adapter.calls.length - before, 1);
  assert.equal(f.summaries()[0].reasoningEffort, undefined, 'no old snapshot, pending choice, options or broader-rule fallback');
});

test('native /compact remains operational after policy disable and root module disable', async t => {
  const f = await fixture(t, { loader: true });
  async function compact(expected: string | undefined) {
    await runTurn(f.turns, history); await runTurn(f.turns, history);
    const before = f.adapter.calls.length;
    const summaries = f.summaries().length;
    const seq = f.events().at(-1).seq;
    const generation = f.agent.session.surface.replaceGeneration;
    const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
    assert.equal(result.result.kind, 'success');
    assertTransaction(f, seq, generation);
    assert.equal(f.adapter.calls.length - before, 1);
    assert.equal(f.summaries().length - summaries, 1);
    assert.equal(f.summaries().at(-1).reasoningEffort, expected);
  }
  await compact('low');
  const off = { ...f.initial, modules: { 'compact-context': { enabled: true, compactTool: false, compactionReasoning: { enabled: false, rules: inherit.rules } } } };
  await f.loader!.update(off);
  await compact(undefined);
  await f.loader!.update({ ...off, modules: { 'compact-context': { ...off.modules['compact-context'], enabled: false } } });
  assert.equal(f.loader!.status().modules['compact-context'].phase, 'disabled');
  await compact(undefined);
  assert.equal(f.ctx.tools.get('compact_context', f.agent), undefined);
});

test('native unsupported summary effort fails before provider dispatch without tool transient retries', async t => {
  const f = await fixture(t, { plugin: { compactTool: true, retryAttempts: 2, retryDelayMs: 0,
    compactionReasoning: { enabled: true, rules: [
      { scope: 'all', mode: 'fixed', effort: 'low' },
      { scope: 'provider-model', provider: 'synthetic-native', model: 'large-model', mode: 'fixed', effort: 'not-advertised' },
    ] } } });
  await runTurn(f.turns, history); await runTurn(f.turns, history);
  const seq = f.events().at(-1).seq;
  const nodes = [...f.agent.session.surface.nodes];
  const generation = f.agent.session.surface.replaceGeneration;
  const before = f.adapter.calls.length;
  const attempts: any[] = [];
  const remove = f.ctx.on('llm/stream', (options: any, next: any) => { if (options.purpose === 'compaction') attempts.push(options); return next(); });
  t.after(remove);
  f.agent.session.append('turn/start', { turn: 3 });
  let result: any;
  try { result = await f.ctx.tools.get('compact_context', f.agent).execute({}, { agent: f.agent, signal: signal() }); }
  finally { f.agent.session.append('turn/end', { turn: 3, reason: { kind: 'completed' } }); }
  assert.equal(result.ok, false);
  assert.match(result.reason, /does not support reasoning effort.*not-advertised/);
  assert.equal(f.adapter.calls.length - before, 0, 'native exact-model validation must reject before provider dispatch');
  assert.equal(f.agent.session.surface.replaceGeneration, generation);
  assert.deepEqual([...f.agent.session.surface.nodes], nodes);
  assert.equal(attempts.length, 1, 'unsupported effort is deterministic despite configured transient retryAttempts=2');
  const events = f.events().filter((event: any) => event.seq > seq);
  assert.equal(events.filter((event: any) => event.type === 'compaction/start').length, 1);
  assert.equal(events.filter((event: any) => event.type === 'compaction/end').length, 1);
  assert.equal(events.filter((event: any) => event.type === 'compaction/summary').length, 0);
});

test('retained native preset engines compact exact independent sessions across preset revisions', async t => {
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  const ctx = runtime.ctx;
  await ctx.plugin((await loadHost('dsh-token-meter')).default).await();
  const distribution: Distribution = { name: 'dsh-extras-compact-context', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': compactContext } };
  const loader = await loaderFixture(t, distribution, { modules: { 'compact-context': { enabled: true, compactTool: false, compactionReasoning: inherit } }, migration: { auto: false } }, ctx);
  await loader.ready();
  loader.importTable.set('@deepseek-ai/dsh-compaction-basic', (await loadHost('dsh-compaction-basic')).default);
  await ctx.plugin((await loadHost('dsh-agent-preset-registry')).default, { default: 'one' }).await();
  const presets = ctx.get('agentPresets') as any;
  const register = async (id: string, retainTokens: number) => {
    const remove = await presets.register({ id, plugins: [{ id: 'compaction', name: 'cordis:group', group: true, isolate: { compaction: true },
      config: [{ id: 'compaction-basic', name: '@deepseek-ai/dsh-compaction-basic', config: { ...nativePolicy, retainTokens } }] }] });
    t.after(remove); return remove;
  };
  const removeOne = await register('one', 100); await register('two', 300);
  const adapter = new CaptureAdapter(); ctx.llm.registerAdapter(['synthetic-native'], adapter);
  const create = async (preset: string, id: string, effort: string) => {
    const handle = await ctx.agents.create({ sessionId: id, agentOptions: { provider: 'synthetic-native', model: 'large-model', reasoningEffort: effort },
      setup: async (scope: any) => { await scope.get('agentPresets').mount(scope, preset); } });
    t.after(() => handle.dispose());
    return { ...handle, state: { events: [], frames: [], requests: [] } };
  };
  const one = await create('one', 'synthetic-preset-one', 'low');
  const two = await create('two', 'synthetic-preset-two', 'high');
  const engineOne = presets.serviceFor(one.agent, 'compaction');
  const engineTwo = presets.serviceFor(two.agent, 'compaction');
  assert.ok(engineOne); assert.ok(engineTwo); assert.notEqual(engineOne, engineTwo);
  assert.equal(one.agent.ctx.get('compaction'), undefined, 'the nested retained engine is not the outer agent service');
  await removeOne(); await register('one', 200);
  const fresh = await create('one', 'synthetic-preset-fresh', 'low');
  const engineFresh = presets.serviceFor(fresh.agent, 'compaction');
  assert.equal(engineOne.config.retainTokens, 100);
  assert.equal(engineTwo.config.retainTokens, 300);
  assert.equal(engineFresh.config.retainTokens, 200);
  for (const handle of [one, two, fresh]) { await runTurn(handle, history); await runTurn(handle, history); }
  const freshNodes = [...fresh.agent.session.surface.nodes];
  const markers = [one, two, fresh].map(handle => ({ seq: handle.agent.session.snapshotEvents().at(-1).seq, generation: handle.agent.session.surface.replaceGeneration }));
  const before = adapter.calls.length;
  const results = await Promise.all([engineOne.compactNow(one.agent, signal()), engineTwo.compactNow(two.agent, signal())]);
  assert.ok(results.every(result => result && result.shadowedSeqs.length > 0));
  assert.deepEqual([...fresh.agent.session.surface.nodes], freshNodes);
  const oneNodes = [...one.agent.session.surface.nodes]; const twoNodes = [...two.agent.session.surface.nodes];
  await engineFresh.compactNow(fresh.agent, signal());
  assert.deepEqual([...one.agent.session.surface.nodes], oneNodes);
  assert.deepEqual([...two.agent.session.surface.nodes], twoNodes);
  assert.equal(adapter.calls.length - before, 3);
  const summaries = adapter.calls.slice(before);
  assert.ok(summaries.every(call => call.purpose === 'compaction'));
  assert.deepEqual(Object.fromEntries(summaries.map(call => [call.sessionId, call.reasoningEffort])),
    { 'synthetic-preset-one': 'low', 'synthetic-preset-two': 'high', 'synthetic-preset-fresh': 'low' });
  [one, two, fresh].forEach((handle, index) => assertTransaction({ agent: handle.agent, events: () => handle.agent.session.snapshotEvents() }, markers[index]!.seq, markers[index]!.generation));
});

test('native no-op compaction and below-pressure turns issue no reasoning request', async t => {
  const f = await fixture(t, { native: { auto: true } });
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success');
  assert.match(result.result.text, /No compactable history/);
  assert.equal(f.adapter.calls.length, 0);
  await runTurn(f.turns, 'A short synthetic turn.');
  await runTurn(f.turns, 'Another short synthetic turn.');
  assert.equal(f.adapter.calls.length, 2);
  assert.equal(f.summaries().length, 0);
  assert.equal(f.events().filter((event: any) => event.type === 'compaction/start').length, 0);
});

test('native pruner-only surface replacement issues no summary reasoning request', async t => {
  const f = await fixture(t);
  await f.ctx.plugin((await loadHost('dsh-compaction-tool-result-pruner')).default, { thresholdChars: 512, headChars: 64, tailChars: 32 }).await();
  f.ctx.tools.register({ name: 'synthetic_long_result', description: 'Return synthetic text for native pruning.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: { schema: { type: 'string' }, render: (_args: unknown, value: unknown) => [{ type: 'text', text: String(value) }] },
    async execute() { return history; } });
  f.adapter.toolNext = 'synthetic_long_result';
  await runTurn(f.turns, 'Produce a synthetic tool result.');
  assert.equal(f.adapter.calls.length, 2);
  const before = f.adapter.calls.length;
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const result = f.ctx.toolResultPruner.pruneSession(f.agent.session);
  assert.equal(result.pruned.length, 1);
  assert.ok(result.charsRemoved > 0);
  assert.ok(f.agent.session.surface.replaceGeneration > generation);
  assert.equal(f.adapter.calls.length - before, 0);
  assert.equal(f.summaries().length, 0);
  const events = f.events().filter((event: any) => event.seq > seq);
  assert.equal(events.filter((event: any) => event.type === 'compaction/prune').length, 1);
  assert.equal(events.filter((event: any) => event.type === 'compaction/start').length, 0);
});

test('native header-free summary may use agent route fallback but never borrows its effort', async t => {
  const f = await fixture(t);
  for (let index = 0; index < 2; index++) f.agent.session.append('user/message',
    llm.createUserMessage({ content: [{ type: 'text', text: history }], source: { kind: 'user' } }), { surfaceOp: 'append' });
  assert.equal(f.agent.session.requestHeader(), undefined);
  assert.equal(f.agent.options.reasoningEffort, 'low');
  const seq = f.events().at(-1).seq;
  const generation = f.agent.session.surface.replaceGeneration;
  const result = await f.ctx.commands.execute(f.agent, '/compact', [], signal());
  assert.equal(result.result.kind, 'success', JSON.stringify(result));
  assertTransaction(f, seq, generation);
  assert.equal(f.adapter.calls.length, 1);
  assert.equal(f.summaries()[0].provider, 'synthetic-native');
  assert.equal(f.summaries()[0].reasoningEffort, undefined);
  assert.equal(f.agent.session.requestHeader(), undefined);
});
