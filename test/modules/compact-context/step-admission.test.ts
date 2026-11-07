/** Public rc.1 tool admission and prompt assembly; offline adapter, no private runtime state. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as compactContext from '../../../src/modules/compact-context/index.ts';
import { createRuntime } from '../retry/runtime.ts';
import { loadHost } from '../../integration/loader-harness.ts';

test('prompt guidance follows exact step admission, disposal and scope instead of per-agent registry caching', async t => {
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  const ctx = runtime.ctx;
  await ctx.plugin((await loadHost('dsh-token-meter')).default).await();
  await ctx.plugin(compactContext, { guidance: true }).await();
  const one = await runtime.createAgent({ sessionId: 'step-one' });
  const two = await runtime.createAgent({ sessionId: 'step-two', route: 'step-two-route' });
  let admitted = true;
  const definition = ctx.tools.get('compact_context', one.agent);
  one.agent.ctx.tools.register(definition, { when: () => admitted });
  const resolve = () => ctx.tools.resolve({ agent: one.agent, modelSelection: one.agent.model.current(), signal: new AbortController().signal });
  const guidance = async (agent: any, toolSet?: any) => (await ctx.systemPrompt.assemble({ agent, scope: agent, toolSet })).sections.find((s: any) => s.name === 'tool-compact-context:guidance')?.text ?? '';
  const first = await resolve();
  assert.ok(ctx.tools.executable('compact_context', one.agent, first));
  assert.match(await guidance(one.agent, first), /Context management/);
  admitted = false; // No tools/change: only the next step's condition differs.
  const second = await resolve();
  assert.equal(ctx.tools.executable('compact_context', one.agent, second), undefined);
  assert.equal(await guidance(one.agent, second), '');
  assert.equal(await guidance(two.agent, first), '', 'an admission cannot be borrowed by another agent');
  assert.equal(await guidance(one.agent), '', 'conditional registrations need an admitted step');
  assert.match(await guidance(one.agent, first), /Context management/, 'an admitted earlier step retains its selection');
  first.dispose();
  assert.equal(await guidance(one.agent, first), '', 'closed admissions cannot advertise the tool');
  second.dispose();
  assert.match(await guidance(two.agent), /Context management/, 'unconditional tools remain usable outside a step');
});
