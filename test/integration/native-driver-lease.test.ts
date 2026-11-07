/** Published native Loader/registry/driver lifecycle; no profile or network access. */
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import Loader, { Group, type EntryChange } from '@deepseek-ai/cordis-plugin-loader';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRuntime } from '../modules/retry/runtime.ts';
import { loadHost, requireHost, loaderFixture } from './loader-harness.ts';
import Schema from '@deepseek-ai/schemastery';
import { readFile, mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import type { Distribution, FeaturePlugin } from '../../src/types.ts';
import { parse as parseYaml } from 'yaml';
import { createHostDriverOwner, type HostDriverOwnerOptions } from '../../src/modules/goal-wait/host-owner.ts';

async function fixture(t: TestContext, options: HostDriverOwnerOptions = {}, beforeOwner?: (ctx: any, entry: any) => (() => void), grouped = false) {
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  const { ctx } = runtime;
  await ctx.plugin((await loadHost('dsh-goal')).default).await();
  const commits: EntryChange[] = [];
  let blocked: { entered: ReturnType<typeof Promise.withResolvers<void>>; release: ReturnType<typeof Promise.withResolvers<void>> } | undefined;
  class RecordingLoader extends Loader {
    override commit(change: EntryChange) { commits.push(change); }
    override async import(name: string, stack?: () => string[]) {
      const block = blocked;
      if (name === '@deepseek-ai/dsh-goal-round-driver' && block) {
        block.entered.resolve(); await block.release.promise;
        if (blocked === block) blocked = undefined;
      }
      return super.import(name, stack);
    }
  }
  const loader = new RecordingLoader(ctx, { baseUrl: pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href });
  await new Promise<void>(done => setImmediate(done)); // Allow Loader's isolation plugin to install its public hooks.
  loader.builtins.group = Group;
  const nativeRow = { id: 'goal-round-driver', name: '@deepseek-ai/dsh-goal-round-driver' };
  await ctx.loader.create((grouped ? { id: 'native-ancestor', name: 'cordis:group', group: true, config: [nativeRow] } : nativeRow) as any);
  await ctx.loader.await();
  const entry = loader.resolve('goal-round-driver');
  await entry.fiber!.await();
  commits.length = 0;
  if (beforeOwner) t.after(beforeOwner(ctx, entry));
  let owner: ReturnType<typeof createHostDriverOwner>;
  const row = ctx.plugin({ name: 'synthetic-extras-row', apply(scope: any) { owner = createHostDriverOwner(scope, options); } });
  await row.await();
  const native = await loadHost('dsh-goal-round-driver');
  const live = () => [...ctx.registry.get(native)?.fibers ?? []].filter((fiber: any) => fiber.uid !== null);
  t.after(async () => { await owner.close(); });
  const blockImport = () => {
    blocked = { entered: Promise.withResolvers<void>(), release: Promise.withResolvers<void>() };
    return blocked;
  };
  return { runtime, ctx, loader, entry, commits, owner: owner!, row, live, native, blockImport };
}

test('unverified native version or changed rc driver bytes never acquire the stock slot', async t => {
  for (const kind of ['unknown-version', 'changed-artifact']) await t.test(kind, async t => {
    const root = await mkdtemp(join(tmpdir(), 'ex-owner-refusal-'));
    t.after(async () => { assert.ok(root.startsWith(join(tmpdir(), 'ex-owner-refusal-'))); await rm(root, {recursive:true,force:true}); });
    const anchor = join(root, 'package.json');
    const scope = join(root, 'node_modules', '@deepseek-ai');
    await mkdir(scope, {recursive:true});
    await writeFile(anchor, JSON.stringify({name:'unverified-native-host',type:'module'}));
    for (const name of ['cordis', 'cordis-plugin-loader']) await symlink(dirname(requireHost.resolve('@deepseek-ai/' + name + '/package.json')), join(scope, name), 'dir');
    const driver = join(scope, 'dsh-goal-round-driver');
    await mkdir(driver);
    await writeFile(join(driver, 'package.json'), JSON.stringify({name:'@deepseek-ai/dsh-goal-round-driver',version:kind === 'unknown-version' ? '99.0.0' : '0.2.2-rc.1',type:'module',exports:{'.':'./index.js','./package.json':'./package.json'}}));
    await writeFile(join(driver, 'index.js'), 'export function apply() {}\n');
    const f = await fixture(t, {}, ctx => { ctx.reflect.provide('profileContext', {installAnchor:anchor}); return () => {}; });
    const original = f.entry.fiber!.ctx.fiber;
    const options = structuredClone(f.entry.options);
    const denied = await f.owner.transition({strategy:'off'});
    assert.equal(denied.phase, 'failed');
    assert.match(denied.reason ?? '', /unverified native driver\/Cordis artifact/);
    assert.equal(original.uid === null, false, 'stock authority was not revoked');
    assert.deepEqual(f.live(), [original]);
    assert.deepEqual(f.entry.options, options);
    assert.equal(Object.hasOwn(f.entry, 'disabled'), false);
    assert.deepEqual(f.commits, []);
  });
});

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
  const changes: string[] = [];
  const f = await fixture(t, { onChange: state => changes.push(state.phase) });
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
  assert.equal(changes.at(-1), 'active', 'live status projection also observes native dependency activation');
  assert.equal(f.owner.snapshot().reason, undefined);
  await raw.dispose();
  assert.notEqual(f.owner.snapshot().phase, 'active');
});

test('user disable during awaited stock restoration import is respected, not overwritten by late init', async t => {
  const f = await fixture(t);
  await f.owner.transition({ strategy: 'off' });
  const blocked = f.blockImport();
  const closing = f.owner.close();
  await blocked.entered.promise;
  try { await f.entry.update({ disabled: true }); }
  finally { blocked.release.resolve(); }
  const state = await closing;
  assert.equal(f.entry.options.disabled, true);
  assert.equal(f.live().length, 0, 'late native init cannot resurrect explicitly disabled stock');
  assert.equal(state.effective, 'none');
});

test('explicit stock disable/removal is preserved and unmanaged composition stays unavailable', async t => {
  for (const operation of ['disable', 'remove'] as const) {
    const f = await fixture(t);
    await f.owner.transition({ strategy: 'off' });
    if (operation === 'disable') await f.entry.update({ disabled: true });
    else f.loader.remove(f.entry.id);
    const result = await f.owner.close();
    assert.equal(result.effective, 'none');
    assert.equal(f.live().length, 0);
    if (operation === 'disable') assert.equal(f.entry.options.disabled, true);
  }
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  await runtime.ctx.plugin((await loadHost('dsh-goal')).default).await();
  const native = runtime.ctx.plugin(await loadHost('dsh-goal-round-driver')); await native.await();
  const owner = createHostDriverOwner(runtime.ctx);
  const unavailable = await owner.transition({ strategy: 'off' });
  assert.equal(unavailable.phase, 'failed');
  assert.match(unavailable.reason!, /Loader is required/);
  assert.notEqual(native.uid, null, 'manual native callback is never disposed or adopted');
  await owner.close();
});

test('the public native HMR exclusive transaction can contain owner transition and unload without nested locks', async t => {
  if (!process.execArgv.includes('--expose-internals')) {
    const child = spawnSync(process.execPath, ['--expose-internals', '--test', '--test-name-pattern=public native HMR', fileURLToPath(import.meta.url)], { encoding: 'utf8', env: process.env, timeout: 15000 });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    t.diagnostic('Executed real native HMR in a disposable test process with --expose-internals');
    return;
  }
  const f = await fixture(t);
  f.ctx.baseUrl = pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href;
  await f.ctx.plugin((await loadHost('cordis-plugin-timer')).default).await();
  const Hmr = (await loadHost('dsh-hmr')).default;
  const hmrFiber = f.ctx.plugin(Hmr, { root: [], debounce: 0 }); await hmrFiber.await();
  assert.equal(hmrFiber.state, 2, 'actual HMR service starts: ' + JSON.stringify(hmrFiber.inject));
  assert.ok(f.ctx.get('hmr'), 'actual HMR service is provided');
  await f.ctx.hmr.runExclusive(async () => {
    assert.equal((await f.owner.transition({ strategy: 'off' })).effective, 'none');
    await f.row.dispose();
    assert.equal(f.owner.snapshot().effective, 'stock');
  });
  assert.equal(f.live().length, 1);
  assert.deepEqual(f.commits, []);
});

test('a same-name foreign mount during an awaited factory revokes the exact pending candidate before foreign apply', async t => {
  const f = await fixture(t);
  const ready = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let candidate: any;
  const mounting = f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    candidate = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply() {} }).ctx.fiber;
    await candidate.await(); ready.resolve(); await release.promise;
    return { rawFiber: candidate, stop: async () => { await candidate.dispose(); } };
  } });
  await ready.promise;
  let revokedBeforeApply = false;
  const foreign = f.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply() { revokedBeforeApply = candidate.uid === null; } });
  try {
    assert.equal(candidate.uid, null);
    await foreign.await();
    assert.equal(revokedBeforeApply, true);
  } finally { release.resolve(); }
  await mounting;
  assert.equal(f.owner.snapshot().phase, 'conflict');
  assert.equal(f.live().length, 0);
});

test('autoDispose false gives the mode exactly one observed unload transaction', async t => {
  const f = await fixture(t, { autoDispose: false });
  await f.owner.transition({ strategy: 'off' });
  const events: string[] = [];
  let observing = false;
  const off = f.ctx.on('internal/plugin', (fiber: any) => {
    if (fiber.uid !== null && fiber.runtime?.name === 'goal-round-driver') events.push(observing ? 'observed-native' : 'unobserved-native');
  }, { global: true });
  f.row.ctx.effect(() => async () => {
    observing = true; events.push('observer-on');
    try { await f.owner.close(); } finally { observing = false; events.push('observer-off'); }
  });
  await f.row.dispose(); off();
  assert.deepEqual(events, ['observer-on', 'observed-native', 'observer-off']);
  assert.equal(f.live().length, 1);
});

test('a factory that mounts then throws cannot leave an unreturned candidate active', async t => {
  const f = await fixture(t);
  let raw: any;
  const result = await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply() {} }).ctx.fiber;
    await raw.await();
    throw new Error('synthetic factory failure after mount');
  } });
  assert.equal(result.phase, 'failed');
  assert.equal(raw.uid, null);
  await f.owner.close();
  assert.equal(f.live().length, 1);
});

test('native stock intent is revalidated after drain before a replacement factory is admitted', async t => {
  const f = await fixture(t);
  const release = Promise.withResolvers<void>();
  f.entry.fiber!.ctx.effect(() => () => release.promise);
  let mounted = false;
  const taking = f.owner.transition({ strategy: 'replacement', mountOwned: async () => { mounted = true; throw new Error('must not mount'); } });
  await new Promise<void>(done => setImmediate(done));
  const disabling = f.entry.update({ disabled: true });
  release.resolve();
  await disabling; await taking;
  assert.equal(mounted, false);
  assert.notEqual(f.owner.snapshot().phase, 'active');
  await f.owner.close(); assert.equal(f.live().length, 0);
});

test('foreign native arriving inside blocked restoration import is not duplicated or killed by close', async t => {
  const conflicts: string[] = [];
  const f = await fixture(t, { onConflict: reason => conflicts.push(reason) });
  await f.owner.transition({ strategy: 'off' });
  const blocked = f.blockImport();
  const closing = f.owner.close();
  await blocked.entered.promise;
  const foreign = f.ctx.plugin(f.native); await foreign.await();
  const foreignUid = foreign.uid;
  blocked.release.resolve();
  const result = await closing;
  assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 1, 'restoration must not create a second executable native callback');
  assert.equal(foreign.uid, foreignUid, 'foreign fiber is not ours to kill');
  assert.equal(foreign.state, 2);
  assert.equal(result.phase, 'conflict');
  assert.notEqual(result.effective, 'stock');
  assert.equal(f.owner.snapshot().phase, 'conflict');
  assert.equal(conflicts.length, 1);
  assert.deepEqual(f.commits, []);
  // Failed speculative restoration neither poisons the original entry nor leaves
  // a root-lifetime claim: after the foreign owner exits a fresh mode can recover.
  await foreign.dispose();
  await f.entry.init(); await f.entry.fiber!.await();
  let fresh: ReturnType<typeof createHostDriverOwner>;
  const freshRow = f.ctx.plugin({ name: 'fresh-mode-after-conflict', apply(scope: any) { fresh = createHostDriverOwner(scope); } });
  await freshRow.await();
  assert.equal((await fresh!.transition({ strategy: 'native' })).effective, 'stock');
  await fresh!.close();
  assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 1);
  assert.deepEqual(f.commits, []);
});

test('activation/native retain read-only foreign observation without stopping either externally managed native fiber', async t => {
  for (const strategy of ['activation', 'native'] as const) {
    let withdrewGate = false;
    const f = await fixture(t, { onConflict: () => { withdrewGate = true; } });
    await f.owner.transition({ strategy });
    const stock = f.entry.fiber!.ctx.fiber;
    const stockUid = stock.uid;
    const foreign = f.ctx.plugin(f.native); await foreign.await();
    assert.equal(withdrewGate, true, strategy + ' must synchronously notify the feature to withdraw its gate');
    assert.equal(f.owner.snapshot().phase, 'conflict');
    assert.equal(stock.uid, stockUid, 'observer does not own the original stock callback');
    assert.notEqual(foreign.uid, null);
    assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 2, 'observer reports the pre-existing foreign composition instead of pretending to repair unknown owners');
    await f.owner.close();
    assert.equal(f.owner.snapshot().phase, 'conflict');
    assert.equal(f.live().length, 2, 'close adds no third driver and kills neither existing native fiber');
    assert.deepEqual(f.commits, []);
  }
});

test('foreign arriving before restoration publication cancels only the exact PENDING candidate before apply', async t => {
  let pending: any;
  let publishedState: number | undefined;
  const f = await fixture(t, {}, (ctx, entry) => ctx.on('internal/plugin', (fiber: any) => {
    if (fiber.uid === null || fiber.entry !== entry || fiber.runtime?.name !== 'goal-round-driver') return;
    pending = fiber; publishedState = fiber.state;
  }, { global: true }));
  await f.owner.transition({ strategy: 'off' });
  const blocked = f.blockImport();
  const closing = f.owner.close();
  await blocked.entered.promise;
  const foreign = f.ctx.plugin(f.native); await foreign.await();
  blocked.release.resolve();
  const result = await closing;
  assert.equal(publishedState, 0, 'only a not-yet-applied candidate is cancelled');
  assert.equal(pending.uid, null);
  assert.equal(pending.entry === undefined, true, 'candidate remains detached after Loader disposal observers');
  assert.notEqual(foreign.uid, null); assert.equal(foreign.state, 2);
  assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 1);
  assert.equal(result.phase, 'conflict');
  assert.deepEqual(f.commits, []);
});

test('a newer strategy epoch cancels stale native restoration before apply and the following close still recovers', async t => {
  const f = await fixture(t);
  await f.owner.transition({ strategy: 'off' });
  let activeNativePublications = 0;
  const off = f.ctx.on('internal/status', (fiber: any) => {
    if (fiber.runtime?.name === 'goal-round-driver' && fiber.state === 2) activeNativePublications++;
  }, { global: true });
  const blocked = f.blockImport();
  const restoring = f.owner.transition({ strategy: 'native' });
  await blocked.entered.promise;
  const backOff = f.owner.transition({ strategy: 'off' });
  blocked.release.resolve();
  await restoring;
  assert.equal((await backOff).effective, 'none');
  assert.equal(activeNativePublications, 0, 'stale restore never executes native apply');
  assert.equal(f.live().length, 0);
  assert.equal((await f.owner.close()).effective, 'stock'); off();
  assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 1);
  assert.deepEqual(f.commits, []);
});

test('public native HMR restoration race with concurrent row disposal preserves only the arriving foreign driver', async t => {
  if (!process.execArgv.includes('--expose-internals')) {
    const child = spawnSync(process.execPath, ['--expose-internals', '--test', '--test-name-pattern=public native HMR restoration race', fileURLToPath(import.meta.url)], { encoding: 'utf8', env: process.env, timeout: 15000 });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    return;
  }
  const f = await fixture(t);
  f.ctx.baseUrl = pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href;
  await f.ctx.plugin((await loadHost('cordis-plugin-timer')).default).await();
  await f.ctx.plugin((await loadHost('dsh-hmr')).default, { root: [], debounce: 0 }).await();
  assert.ok(f.ctx.get('hmr'));
  await f.owner.transition({ strategy: 'off' });
  const blocked = f.blockImport();
  const restoring = f.ctx.hmr.runExclusive(() => f.owner.close());
  await blocked.entered.promise;
  const unloading = f.row.dispose();
  const foreign = f.ctx.plugin(f.native); await foreign.await();
  const uid = foreign.uid;
  blocked.release.resolve();
  const [result] = await Promise.all([restoring, unloading]);
  assert.equal(result.phase, 'conflict');
  assert.equal(f.owner.snapshot().phase, 'conflict');
  assert.equal(foreign.uid, uid); assert.equal(foreign.state, 2);
  assert.equal(f.live().filter((fiber: any) => fiber.state === 2).length, 1);
  assert.deepEqual(f.commits, []);
});

test('late real jobs activation clears only the obsolete dependency reason even before owner status projection runs', async t => {
  let raw: any;
  let readOwner: (() => ReturnType<ReturnType<typeof createHostDriverOwner>['snapshot']>) | undefined;
  let atActivation: ReturnType<ReturnType<typeof createHostDriverOwner>['snapshot']> | undefined;
  const f = await fixture(t, {}, ctx => ctx.on('internal/status', (fiber: any) => {
    if (fiber === raw && fiber.state === 2) atActivation = readOwner?.();
  }, { global: true }));
  readOwner = () => f.owner.snapshot();
  const pending = await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', inject: ['jobs'], apply() {} } as any).ctx.fiber;
    return { rawFiber: raw, stop: async () => { await raw.dispose(); } };
  } });
  assert.equal(pending.phase, 'missing-dependency');
  assert.equal(pending.reason, 'Replacement driver is waiting for native dependencies');
  await f.ctx.plugin((await loadHost('dsh-jobs-local')).default, {}).await();
  await raw.await();
  assert.equal(atActivation?.phase, 'active');
  assert.equal(atActivation?.reason, undefined, 'active must not retain a dependency fallback before the later projection listener runs');
  assert.equal(f.owner.snapshot().reason, undefined);
});

test('real ConfigEditor Save/recompose recognizes intentional runtime suppression without native disabled profile writes', async t => {
  const runtime = await createRuntime({ product: false, retry: false });
  t.after(() => runtime.dispose());
  await runtime.ctx.plugin((await loadHost('dsh-goal')).default).await();
  let owner: ReturnType<typeof createHostDriverOwner>;
  const primitive = {
    name: 'synthetic-native-owner-save',
    Config: Schema.object({ strategy: Schema.string().default('activation') }),
    async apply(scope: any, config: { strategy: 'activation' | 'off' | 'native' }) {
      owner = createHostDriverOwner(scope);
      await owner.transition({ strategy: config.strategy });
    },
  } as FeaturePlugin;
  const distribution: Distribution = { name: 'synthetic-native-owner-save', moduleIds: ['goalWait'], modulePlugins: {} };
  const f = await loaderFixture(t, distribution, { strategy: 'activation' }, runtime.ctx,
    [{ id: 'goal-round-driver', name: '@deepseek-ai/dsh-goal-round-driver' }], primitive);
  const stock = [...f.loader.entries()].find(entry => entry.options.name === '@deepseek-ai/dsh-goal-round-driver')!;
  // Older shared fixture has no suppliedImports parameter: install the real native
  // namespace into its public import table, then recover the initial import once.
  f.importTable.set('@deepseek-ai/dsh-goal-round-driver', await loadHost('dsh-goal-round-driver'));
  await stock.init(); await stock.fiber!.await();
  assert.equal(stock.fiber!.state, 2, 'real stock driver is healthy before the public Save');
  const before = structuredClone(stock.options);
  const descriptor = Object.getOwnPropertyDescriptor(stock, 'disabled');
  await f.update({ strategy: 'off' }); // Public ConfigEditor.edit -> native Include recompose + inactiveEntries.
  assert.equal(owner!.snapshot().effective, 'none', JSON.stringify(owner!.snapshot()));
  assert.equal(stock.fiber!.uid, null);
  assert.deepEqual(stock.options, before);
  const patches = parseYaml(await readFile(join(f.profile, 'cordis.patch.yml'), 'utf8'));
  assert.equal(JSON.stringify(patches).includes('"disabled"'), false);
  await f.update({ strategy: 'native' });
  assert.equal(owner!.snapshot().effective, 'stock');
  assert.equal(stock.fiber!.state, 2);
  assert.equal(stock.disabled, false);
  assert.deepEqual(stock.options, before);
  assert.deepEqual(Object.getOwnPropertyDescriptor(stock, 'disabled'), descriptor);
});

test('runtime disabled view delegates native intent and only CAS-restores a descriptor it still owns', async t => {
  const f = await fixture(t);
  const before = Object.getOwnPropertyDescriptor(f.entry, 'disabled');
  const prototype = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f.entry), 'disabled')!;
  const options = structuredClone(f.entry.options);
  let raw: any;
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', apply() {} }).ctx.fiber;
    await raw.await();
    return { rawFiber: raw, stop: async () => { await raw.dispose(); } };
  } });
  assert.equal(f.entry.disabled, true);
  assert.equal(prototype.get!.call(f.entry), false, 'original native user/ancestor intent stays enabled');
  assert.deepEqual(f.entry.options, options);
  const foreign = { configurable: true, enumerable: true, get() { return true; } };
  Object.defineProperty(f.entry, 'disabled', foreign);
  assert.equal(f.owner.snapshot().phase, 'conflict');
  assert.notEqual(raw.uid, null, 'a pure snapshot must not dispose a driver');
  f.ctx.emit('loader/config-update');
  assert.equal(raw.uid, null, 'next public checkpoint revokes owned execution');
  assert.equal((await f.owner.close()).phase, 'conflict');
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.entry, 'disabled'), { ...foreign, set: undefined });
  assert.deepEqual(f.entry.options, options);
  assert.deepEqual(f.commits, []);
  // The external descriptor owner, not the adapter, removes its own view.
  Reflect.deleteProperty(f.entry, 'disabled');
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.entry, 'disabled'), before);
});

test('unknown initial disabled getter is not adopted or overwritten', async t => {
  const f = await fixture(t);
  const uid = f.entry.fiber!.uid;
  const foreign = { configurable: true, enumerable: false, get() { return false; } };
  Object.defineProperty(f.entry, 'disabled', foreign);
  const result = await f.owner.transition({ strategy: 'off' });
  assert.equal(result.phase, 'conflict');
  assert.equal(f.entry.fiber!.uid, uid);
  await f.owner.close();
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.entry, 'disabled'), { ...foreign, set: undefined });
  assert.deepEqual(f.commits, []);
  Reflect.deleteProperty(f.entry, 'disabled');
});

test('descriptor takeover at a real native Agent pre-step revokes owned driver before any provider request', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  let raw: any;
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', inject: f.native.inject, apply: f.native.apply }).ctx.fiber;
    await raw.await();
    return { rawFiber: raw, stop: async () => { await raw.dispose(); } };
  } });
  const handle = await f.runtime.createAgent({ sessionId: 'native-descriptor-pre-step', adapter: { failures: 0 } });
  const changed = Promise.withResolvers<void>();
  const foreign = { configurable: true, enumerable: false, get() { return true; } };
  let changedOnce = false;
  const off = f.ctx.on('agent/pre-step', async (event: any, next: () => Promise<any>) => {
    if (event.agent === handle.agent && !changedOnce) {
      changedOnce = true;
      Object.defineProperty(f.entry, 'disabled', foreign);
      changed.resolve();
    }
    return next();
  }, { global: true, prepend: true });
  f.ctx.goals.create(handle.agent, { objective: 'Synthetic native descriptor ownership fence', maxGoalRounds: 1 });
  await changed.promise;
  await handle.agent.whenIdle();
  await raw.await(); off();
  assert.equal(handle.state.requests.length, 0, 'no offline provider call crossed the invalid lease');
  assert.equal(raw.uid, null);
  assert.equal(f.owner.snapshot().phase, 'conflict');
  await f.owner.close();
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.entry, 'disabled'), { ...foreign, set: undefined });
  assert.deepEqual(f.commits, []);
  Reflect.deleteProperty(f.entry, 'disabled');
});

test('effective-disabled view remains owned through explicit restore import and releases on a real import failure', async t => {
  const f = await fixture(t);
  const before = Object.getOwnPropertyDescriptor(f.entry, 'disabled');
  const nativeGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(f.entry), 'disabled')!.get!;
  await f.owner.transition({ strategy: 'off' });
  const blocked = f.blockImport();
  const closing = f.owner.close(); await blocked.entered.promise;
  try {
    assert.equal(f.entry.disabled, true, 'parallel native health checks see intentional suspension until init settles');
    assert.equal(nativeGetter.call(f.entry), false, 'the users native intent was never disabled');
  } finally { blocked.release.resolve(); }
  assert.equal((await closing).effective, 'stock');
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.entry, 'disabled'), before);

  const g = await fixture(t);
  const original = g.loader.import.bind(g.loader);
  await g.owner.transition({ strategy: 'off' });
  g.loader.import = async (name: string, stack?: () => string[]) => {
    if (name === '@deepseek-ai/dsh-goal-round-driver') throw new Error('synthetic native restoration import failure');
    return original(name, stack);
  };
  const failed = await g.owner.close();
  g.loader.import = original;
  assert.equal(failed.phase, 'failed');
  assert.equal(failed.effective, 'none');
  assert.equal(Object.hasOwn(g.entry, 'disabled'), false, 'failure cannot leave an owned health-check mask');
  assert.equal(g.entry.disabled, false);
  assert.equal(g.entry.options.disabled, undefined);
  await g.entry.init(); await g.entry.fiber!.await();
  assert.equal(g.live().filter((fiber: any) => fiber.state === 2).length, 1);
});

test('native ancestor disabled intent survives view cleanup and descriptor flags participate in CAS', async t => {
  const f = await fixture(t, {}, undefined, true);
  await f.owner.transition({ strategy: 'off' });
  const ancestor = f.loader.resolve('native-ancestor');
  await ancestor.update({ disabled: true });
  assert.equal((await f.owner.close()).effective, 'none');
  assert.equal(f.entry.disabled, true);
  assert.equal(f.entry.options.disabled, undefined);
  assert.equal(ancestor.options.disabled, true);
  assert.equal(Object.hasOwn(f.entry, 'disabled'), false);
  assert.equal(f.live().length, 0);

  const g = await fixture(t);
  await g.owner.transition({ strategy: 'off' });
  const ours = Object.getOwnPropertyDescriptor(g.entry, 'disabled')!;
  const external = { ...ours, enumerable: !ours.enumerable };
  Object.defineProperty(g.entry, 'disabled', external);
  assert.equal(g.owner.snapshot().phase, 'conflict', 'matching getter identity is insufficient when descriptor flags changed');
  g.ctx.emit('loader/config-update');
  await g.owner.close();
  assert.deepEqual(Object.getOwnPropertyDescriptor(g.entry, 'disabled'), external);
  Reflect.deleteProperty(g.entry, 'disabled');
});

test('native user disable at a real owned pre-step also revokes execution without changing that user intent', { timeout: 10000 }, async t => {
  const f = await fixture(t);
  let raw: any;
  await f.owner.transition({ strategy: 'replacement', mountOwned: async () => {
    raw = f.row.ctx.plugin({ name: 'goal-wait-owned-replacement-driver', inject: f.native.inject, apply: f.native.apply }).ctx.fiber;
    await raw.await();
    return { rawFiber: raw, stop: async () => { await raw.dispose(); } };
  } });
  const handle = await f.runtime.createAgent({ sessionId: 'native-user-disable-pre-step', adapter: { failures: 0 } });
  const changed = Promise.withResolvers<void>();
  let once = false;
  const off = f.ctx.on('agent/pre-step', async (event: any, next: () => Promise<any>) => {
    if (event.agent === handle.agent && !once) {
      once = true;
      await f.entry.update({ disabled: true });
      changed.resolve();
    }
    return next();
  }, { global: true, prepend: true });
  f.ctx.goals.create(handle.agent, { objective: 'Synthetic native user-disabled intent fence', maxGoalRounds: 1 });
  await changed.promise;
  await handle.agent.whenIdle(); off();
  assert.equal(handle.state.requests.length, 0, 'native user-disabled intent fences the next owned provider dispatch');
  assert.equal(raw.uid, null);
  await f.owner.close();
  assert.equal(f.entry.options.disabled, true);
  assert.equal(f.entry.disabled, true);
  assert.equal(Object.hasOwn(f.entry, 'disabled'), false);
  assert.equal(f.live().length, 0);
});
