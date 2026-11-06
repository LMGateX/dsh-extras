/** Published native Loader/registry/driver lifecycle; no profile or network access. */
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import Loader, { type EntryChange } from '@deepseek-ai/cordis-plugin-loader';
import { pathToFileURL } from 'node:url';
import { createRuntime } from '../modules/retry/runtime.ts';
import { loadHost, requireHost } from './loader-harness.ts';
import { createHostDriverOwner, type HostDriverOwnerOptions } from '../../src/modules/goal-wait/host-owner.ts';

async function fixture(t: TestContext, options: HostDriverOwnerOptions = {}) {
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  const { ctx } = runtime;
  await ctx.plugin((await loadHost('dsh-goal')).default).await();
  const commits: EntryChange[] = [];
  class RecordingLoader extends Loader { override commit(change: EntryChange) { commits.push(change); } }
  const loader = new RecordingLoader(ctx, { baseUrl: pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href });
  await new Promise<void>(done => setImmediate(done)); // Allow Loader's isolation plugin to install its public hooks.
  await ctx.loader.create({ id: 'goal-round-driver', name: '@deepseek-ai/dsh-goal-round-driver' } as any);
  const entry = loader.resolve('goal-round-driver');
  await entry.fiber!.await();
  commits.length = 0;
  let owner: ReturnType<typeof createHostDriverOwner>;
  const row = ctx.plugin({ name: 'synthetic-extras-row', apply(scope: any) { owner = createHostDriverOwner(scope, options); } });
  await row.await();
  const native = await loadHost('dsh-goal-round-driver');
  const live = () => [...ctx.registry.get(native)?.fibers ?? []].filter((fiber: any) => fiber.uid !== null);
  t.after(async () => { await owner.close(); });
  return { ctx, loader, entry, commits, owner: owner!, row, live, native };
}

test('off suppresses only runtime, then close restores the original enabled Loader entry', async t => {
  const f = await fixture(t);
  const old = f.entry.fiber!.ctx.fiber;
  const options = structuredClone(f.entry.options);
  const held = await f.owner.transition({ strategy: 'off' });
  assert.equal(held.phase, 'active');
  assert.equal(held.effective, 'none');
  assert.equal(old.uid, null);
  assert.equal(f.live().length, 0);
  assert.deepEqual(f.entry.options, options);
  assert.deepEqual(f.commits, [], 'no implicit self-dispose disabled write');
  const restored = await f.owner.close();
  assert.equal(restored.effective, 'stock');
  assert.equal(restored.phase, 'active');
  assert.equal(f.live().length, 1);
  assert.notEqual(f.entry.fiber!.ctx.fiber, old);
  assert.equal(f.entry.fiber!.state, 2);
  assert.deepEqual(f.entry.options, options);
  assert.deepEqual(f.commits, []);
});

test('late foreign native mount synchronously revokes replacement and reports conflict', async t => {
  const changes: string[] = [];
  const conflicts: string[] = [];
  const f = await fixture(t, { onChange: state => changes.push(state.phase), onConflict: reason => conflicts.push(reason) });
  let replacement: any;
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    replacement = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply() {} }).ctx.fiber;
    await replacement.await();
    return { rawFiber: replacement, stop: async () => { await replacement.dispose(); } };
  } });
  const stranger = f.ctx.plugin(f.native);
  assert.equal(replacement.uid, null, 'old owner is revoked before foreign driver can apply');
  await stranger.await();
  assert.equal(f.owner.snapshot().phase, 'conflict');
  assert.ok(changes.includes('conflict'));
  assert.equal(conflicts.length, 1);
  await f.owner.close();
  assert.equal(f.live().length, 1, 'close never starts a second stock driver beside the foreign one');
  assert.deepEqual(f.commits, []);
});

test('two distribution owners cannot both acquire off, and rejected close cannot restore underneath the winner', async t => {
  const f = await fixture(t);
  await f.owner.transition({ strategy: 'off' });
  let peer: ReturnType<typeof createHostDriverOwner>;
  const peerRow = f.ctx.plugin({ name: 'synthetic-split-peer', apply(scope: any) { peer = createHostDriverOwner(scope); } });
  await peerRow.await();
  const rejected = await peer!.transition({ strategy: 'off' });
  assert.equal(rejected.phase, 'conflict');
  await peer!.close();
  assert.equal(f.live().length, 0);
  await f.owner.close();
  assert.equal(f.live().length, 1);
});

test('activation/native keep stock identity and known Loader remounts stay suppressed until row unload', async t => {
  const f = await fixture(t);
  const first = f.entry.fiber!.ctx.fiber;
  assert.equal((await f.owner.transition({ strategy: 'activation' })).effective, 'stock');
  assert.equal((await f.owner.transition({ strategy: 'native' })).effective, 'stock');
  assert.equal(f.entry.fiber!.ctx.fiber, first);
  await f.owner.transition({ strategy: 'off' });
  await f.entry.init(); // The public path used when configuration/HMR remounts this entry.
  await f.entry.fiber!.await();
  assert.equal(f.entry.fiber!.uid, null);
  assert.equal(f.live().length, 0);
  await f.row.dispose();
  assert.equal(f.owner.snapshot().effective, 'stock');
  assert.equal(f.live().length, 1);
  // Root guard was unregistered, not left as a lifetime tombstone.
  const restored = f.entry.fiber!.ctx.fiber;
  f.ctx.registry.delete(f.native); await restored.await();
  await f.entry.init(); await f.entry.fiber!.await();
  assert.equal(f.live().length, 1);
  assert.deepEqual(f.commits, []);
});

test('a rejected stop still drains the raw fiber before reporting failure and never admits the next owner', async t => {
  const f = await fixture(t);
  const release = Promise.withResolvers<void>();
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    const rawFiber = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply(scope: any) {
      scope.effect(() => () => release.promise);
    } }).ctx.fiber;
    await rawFiber.await();
    return { rawFiber, stop: async () => { throw new Error('synthetic stop failure'); } };
  } });
  const switching = f.owner.transition({ strategy: 'native' });
  await new Promise<void>(done => setImmediate(done));
  try {
    assert.equal(f.owner.snapshot().phase, 'restoring', 'error cannot outrun raw teardown');
    assert.equal(f.live().length, 0);
  } finally { release.resolve(); }
  assert.equal((await switching).phase, 'failed');
  let mounted = false;
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => { mounted = true; throw new Error('must not run'); } });
  assert.equal(mounted, false);
  assert.equal(f.live().length, 0);
});

test('close during native drain skips late mount, and close during owned drain keeps the root guard alive', async t => {
  const f = await fixture(t);
  const nativeRelease = Promise.withResolvers<void>();
  f.entry.fiber!.ctx.effect(() => () => nativeRelease.promise);
  let mounts = 0;
  const acquiring = f.owner.transition({ strategy: 'replacement', mountOwned: async () => { mounts++; throw new Error('must not mount'); } });
  await new Promise<void>(done => setImmediate(done));
  const closing = f.owner.close();
  assert.equal(f.owner.close(), closing, 'close is idempotent even during acquisition');
  try { assert.equal(f.live().length, 0); assert.equal(mounts, 0); }
  finally { nativeRelease.resolve(); }
  await acquiring;
  assert.equal((await closing).effective, 'stock');
  assert.equal(mounts, 0);
  assert.equal(f.live().length, 1);

  const g = await fixture(t);
  const ownedRelease = Promise.withResolvers<void>();
  await g.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    const rawFiber = g.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply(scope: any) {
      scope.effect(() => () => ownedRelease.promise);
    } }).ctx.fiber;
    await rawFiber.await();
    return { rawFiber, stop: async () => { await rawFiber.dispose(); } };
  } });
  const unloading = g.row.dispose();
  await new Promise<void>(done => setImmediate(done));
  try {
    await g.entry.init(); await g.entry.fiber!.await();
    assert.equal(g.live().length, 0, 'ordinary row observers may unload, but temporary root guard still protects drain');
  } finally { ownedRelease.resolve(); }
  await unloading;
  assert.equal(g.live().length, 1);
  assert.deepEqual(g.commits, []);
});

test('pending replacement dependency is not reported active, then snapshot follows actual native fiber state', async t => {
  const f = await fixture(t);
  let raw: any;
  const pending = await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', inject: ['syntheticLeaseDependency'], apply() {} } as any).ctx.fiber;
    return { rawFiber: raw, stop: async () => { await raw.dispose(); } };
  } });
  assert.equal(pending.phase, 'missing-dependency');
  assert.notEqual(pending.effective, 'replacement');
  f.ctx.reflect.provide('syntheticLeaseDependency', {});
  await new Promise<void>(done => setImmediate(done)); await raw.await();
  assert.equal(f.owner.snapshot().effective, 'replacement');
  assert.equal(f.owner.snapshot().phase, 'active');
  await raw.dispose();
  assert.notEqual(f.owner.snapshot().phase, 'active');
});
