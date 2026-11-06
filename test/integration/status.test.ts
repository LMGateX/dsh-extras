import test from 'node:test';
import assert from 'node:assert/strict';
import * as chime from '../../src/modules/chime/index.ts';
import * as context from '../../src/modules/compact-context/index.ts';
import type { Distribution } from '../../src/types.ts';
import { loaderFixture, until } from './loader-harness.ts';

const distribution: Distribution = { name: 'dsh-extras-chime', moduleIds: ['chime'], modulePlugins: { chime } };

test('status route uses actual native owner cookies, Host and Origin admission and GET-only policy', { timeout: 10000 }, async t => {
  const f = await loaderFixture(t, distribution, { modules: { chime: { enabled: true } }, migration: { auto: false } });
  await f.ready();
  const owner = f.request(); assert.equal(owner.code, 200);
  assert.equal(owner.headers['Cache-Control'], 'no-store');
  assert.equal(owner.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(JSON.parse(owner.body).distribution, distribution.name);
  assert.equal(f.request('GET', { host: f.host }).code, 401);
  assert.equal(f.request('GET', { host: 'untrusted.invalid', cookie: f.ownerCookie }).code, 403);
  assert.equal(f.request('GET', { host: f.host, cookie: f.ownerCookie, origin: 'http://untrusted.invalid' }).code, 403);
  assert.equal(f.request('POST').code, 405); assert.equal(f.request('HEAD').code, 405);
  assert.equal(f.request('POST', { host: f.host }).code, 401, 'authentication runs before method handling');
  const connection = f.ctx.get('connection') as any; const admit = connection.admit;
  connection.admit = () => ({ peer: { principal: { kind: 'untrusted-test-principal' } } });
  try { assert.equal(f.request().code, 403, 'an admitted non-owner never sees status'); } finally { connection.admit = admit; }
  const table: any[] = []; (f.ctx.emit as any)('webserver/index-inject', table);
  assert.ok(table.some(item => item.name === '__DSH_EXTRAS_PAGE_dsh_extras_chime__' && Number.isFinite(item.value.servedAt)));
  await f.entry.update({ disabled: true }); await f.loader.await();
  assert.equal(f.request().code, 404, 'route is removed with its owner fiber');
});

test('a configured peer capability fails closed and is reported as a conflict, not an ordinary disable', { timeout: 10000 }, async t => {
  const d: Distribution = { name: 'dsh-extras-compact-context', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': context } };
  const f = await loaderFixture(t, d, { modules: { 'compact-context': { enabled: true } }, migration: { auto: false } }, undefined,
    [{ id: 'other-owner', name: 'dsh-extras', config: { modules: { 'compact-context': { enabled: true } } } }]);
  const state = await f.ready();
  assert.equal(state.modules['compact-context'].ready, false);
  assert.equal(state.report.modules['compact-context'].phase, 'conflict');
  assert.equal(state.modules['compact-context'].phase, 'conflict');
  assert.match(state.modules['compact-context'].reason, /another Extras distribution/);
});

test('owner status reports independent live capabilities only while their exact feature fiber is active', { timeout: 10000 }, async t => {
  let mounted: any;
  let reads = 0;
  let phase: 'active' | 'unavailable' = 'active';
  const feature = {
    name: 'capability-status-fixture', Config: context.Config, inject: [],
    apply(ctx: any) { mounted = ctx; },
    runtimeStatus(ctx: any) {
      reads++;
      assert.equal(ctx.fiber, mounted.fiber, 'status belongs to the mounted feature, not the shell fiber');
      return { capabilities: { compactionReasoning: { phase }, tools: { phase: 'unavailable' as const, reason: 'Tool services are absent.' } } };
    },
  };
  const d: Distribution = { name: 'dsh-extras-compact-context', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': feature } };
  const initial = { modules: { 'compact-context': { enabled: true, compactTool: false } }, migration: { auto: false } };
  const f = await loaderFixture(t, d, initial); await f.ready();
  assert.deepEqual(f.status().modules['compact-context'].capabilities, {
    compactionReasoning: { phase: 'active' }, tools: { phase: 'unavailable', reason: 'Tool services are absent.' },
  });
  phase = 'unavailable';
  assert.equal(f.status().modules['compact-context'].phase, 'active', 'a capability failure does not masquerade as shell disposal');
  assert.equal(f.status().modules['compact-context'].capabilities.compactionReasoning.phase, 'unavailable');
  await f.update({ ...initial, modules: { 'compact-context': { enabled: false, compactTool: false } } });
  await until(() => f.status().modules['compact-context'].phase, value => value === 'disabled', 'feature disable');
  const before = reads;
  assert.equal(f.status().modules['compact-context'].capabilities, undefined, 'disabled features expose no stale capability snapshot');
  assert.equal(reads, before, 'disabled features are not inspected');
});
