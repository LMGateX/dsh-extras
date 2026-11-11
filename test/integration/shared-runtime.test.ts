/** Regressions for the shared fixtures against public rc.2 packages, never a service facsimile. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRuntime, events, llm, startChild } from '../modules/retry/runtime.ts';

test('native batch append publishes every event once in order after the complete surface commit', { timeout: 10000 }, async t => {
  const runtime = await createRuntime({ product: false, retry: false, persistent: true });
  t.after(() => runtime.dispose());
  const handle = await runtime.createAgent({ sessionId: 'fixture-batch', adapter: { failures: 0 } });
  const session = handle.agent.session;
  const before = session.snapshotEvents().length;
  const observed: { event: any; length: number; messages: unknown; current: unknown }[] = [];
  runtime.ctx.on('session/event', (subject: any, event: any) => {
    if (subject === session) observed.push({ event, length: subject.snapshotEvents().length, messages: subject.deriveMessages(), current: subject.currentBatchPublication });
  });
  const first = llm.createUserMessage({ content: [{ type: 'text', text: 'BATCH_FIRST' }], source: { kind: 'user' } });
  const second = llm.createUserMessage({ content: [{ type: 'text', text: 'BATCH_SECOND' }], source: { kind: 'user' } });
  const committed = session.append([
    ['user/message', first, { surfaceOp: 'append' }],
    ['user/message', second, { surfaceOp: 'append' }],
  ]);
  assert.equal(committed.length, 2);
  assert.deepEqual(committed.map((event: any) => event.seq), [before, before + 1]);
  assert.deepEqual(observed.map(({ event }) => event), committed);
  assert.deepEqual(events(handle.state, 'user/message'), committed, 'common flattened event assertions lose no batch member');
  for (const observation of observed) {
    assert.equal(observation.length, before + 2, 'every publication sees the entire batch');
    assert.deepEqual(observation.messages, [first, second], 'every publication sees the final ordered surface');
    assert.equal(observation.current, observation.event);
  }
  assert.equal(session.currentBatchPublication, undefined);
  await runtime.ctx.sessions.flush(session);
  await handle.dispose();
  const restored = (await runtime.ctx.sessionQuery.readSession(session.id)).events;
  assert.deepEqual(restored.slice(before), committed, 'real persistence preserves exact batch order and payloads');
  assert.equal(handle.state.requests.length, 0, 'append alone never dispatches a provider');
});

test('shared child helper preserves native deep hierarchy and teardown cancels progressing descendants', { timeout: 10000 }, async () => {
  const runtime = await createRuntime({ product: false, retry: false, subagents: true });
  const started = new Map<string, ReturnType<typeof Promise.withResolvers<void>>>();
  for (const route of ['fixture-child-route', 'fixture-deep-route']) started.set(route, Promise.withResolvers<void>());
  class BlockingAdapter extends llm.LlmAdapter {
    async *stream(options: any) {
      started.get(options.provider)!.resolve();
      await new Promise<void>(resolve => {
        if (options.signal.aborted) resolve();
        else options.signal.addEventListener('abort', () => resolve(), { once: true });
      });
      options.signal.throwIfAborted();
    }
  }
  const runs: Awaited<ReturnType<typeof startChild>>[] = [];
  try {
    const root = await runtime.createAgent({ sessionId: 'fixture-tree-root', adapter: { failures: 0 } });
    for (const route of started.keys()) runtime.ctx.llm.registerAdapter([route], new BlockingAdapter());
    const create = async (id: string, route: string, parent: any) => {
      const run = await startChild(runtime.ctx, { provider: 'spawn', label: id, name: id, childId: id, signal: new AbortController().signal,
        request: { parent, prompt: [{ type: 'text', text: id }], agentOptions: { provider: route, model: 'integration-model' } } });
      runs.push(run);
      await started.get(route)!.promise;
      assert.equal(run.childId, id);
      assert.ok(run.messageId);
      assert.equal(run.local, true);
      assert.ok(run.result);
      return runtime.ctx.agents.get(id);
    };
    const child = await create('fixture-tree-child', 'fixture-child-route', root.agent);
    const deep = await create('fixture-tree-deep', 'fixture-deep-route', child);
    assert.equal(runtime.ctx.subagents.rootOf(root.agent), root.agent);
    assert.equal(runtime.ctx.subagents.rootOf(child), root.agent);
    assert.equal(runtime.ctx.subagents.rootOf(deep), root.agent);
    assert.deepEqual(runtime.ctx.subagents.namesOf(child), { self: 'fixture-tree-child', parent: 'lead' });
    assert.deepEqual(runtime.ctx.subagents.namesOf(deep), { self: 'fixture-tree-child/fixture-tree-deep', parent: 'fixture-tree-child' });
    const registry = runtime.ctx.agents;
    assert.equal(await runtime.ctx.subagents.waitForTreeWork(child), false, 'only the tree root joins progressing tree work');
    const join = runtime.ctx.subagents.waitForTreeWork(root.agent);
    await runtime.dispose();
    await join;
    const results = await Promise.all(runs.map(run => run.result));
    assert.deepEqual(results.map(result => result!.stopReason), ['aborted', 'aborted']);
    for (const id of ['fixture-tree-root', 'fixture-tree-child', 'fixture-tree-deep']) assert.equal(registry.get(id), undefined);
    assert.equal(runtime.ctx.get('agents'), undefined, 'teardown removes the native registry service too');
  } finally {
    for (const run of runs) await run.dispose();
    await runtime.dispose();
  }
});
