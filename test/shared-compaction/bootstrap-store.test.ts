import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import Storage, { storageBackendServiceKey, type StorageBackend } from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openSharedCompactionStore, CompactionConflictError } from '../../src/shared-compaction/store.ts';
import { resolveCompactionReasoning } from '../../src/modules/compact-context/reasoning-policy.ts';
import { mountLegacyCompactionSeed, prepareLegacyCompactionSeeds, legacyCompactionSeedStatus } from '../../src/shared-compaction/legacy-seed.ts';

const fixed = (effort: string) => resolveCompactionReasoning({ enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort }] });
const inherit = () => resolveCompactionReasoning({ enabled: true, rules: [{ scope: 'all', mode: 'inherit' }] });
const admitted = () => true;
async function context(root: string) {
    const ctx = new Context(); await ctx.plugin(Storage).await();
    await ctx.plugin(Json, { root }).await(); await ctx.plugin(Domain, { backend: 'json' }).await();
    return ctx;
}

test('native bootstrap snapshot and consumed metadata survive service-root restart without materializing canonical revision', async t => {
    const root = await mkdtemp(join(tmpdir(), 'compaction-bootstrap-restart-'));
    const first = await context(root); t.after(() => first.fiber.dispose());
    const store = await openSharedCompactionStore(first);
    const initial = store.read(); const source = 'bootstrap-source';
    const captured = await store.captureLegacyBootstrap(source, { policy: resolveCompactionReasoning(), moduleEnabled: false }, admitted);
    assert.equal(captured.consumed, false);
    await store.completeLegacyBootstrap(source, admitted);
    assert.deepEqual(store.read(), initial);
    await first.fiber.dispose();
    const second = await context(root); t.after(() => second.fiber.dispose());
    const reloaded = await openSharedCompactionStore(second);
    const remembered = await reloaded.captureLegacyBootstrap(source, { policy: inherit(), moduleEnabled: true }, admitted);
    assert.deepEqual(remembered, { policy: resolveCompactionReasoning(), moduleEnabled: false, consumed: true });
    remembered.policy.enabled = true;
    const detached = await reloaded.captureLegacyBootstrap(source, { policy: fixed('not-legacy'), moduleEnabled: true }, admitted);
    assert.equal(detached.policy.enabled, false);
    assert.deepEqual(reloaded.read(), initial);
});

test('native migration receipts retain exact immutable backups, reject reuse and preserve accepted canonical edits and overrides', async t => {
    const root = await mkdtemp(join(tmpdir(), 'compaction-adoption-receipts-'));
    const ctx = await context(root); t.after(() => ctx.fiber.dispose());
    const store = await openSharedCompactionStore(ctx);
    const original = inherit();
    const pending = store.adoptLegacyReceipt('operation-a', 'compact-context', original, admitted);
    original.enabled = false; original.rules.length = 0;
    assert.equal(await pending, 'imported');
    assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
    assert.equal(await store.adoptLegacyReceipt('operation-a', 'compact-context', inherit(), admitted), 'preserved');
    assert.equal(store.read().revision, 1);
    const overrides = { 'opaque workspace': { enabled: false, rules: [] } };
    const saved = await store.write({ expectedRevision: 1, defaults: fixed('user-accepted'), workspaceOverrides: overrides });
    assert.equal(await store.adoptLegacyReceipt('operation-b', 'compact-context', fixed('late-original'), admitted), 'preserved');
    assert.deepEqual(store.read(), saved);
    await assert.rejects(store.adoptLegacyReceipt('operation-a', 'compact-context', fixed('reused-id'), admitted), /reused/);
    await assert.rejects(store.recoverLegacyAdoption('operation-b', 1), CompactionConflictError);
    const recovered = await store.recoverLegacyAdoption('operation-b', 2);
    assert.equal(recovered.revision, 3); assert.deepEqual(recovered.defaults, fixed('late-original'));
    assert.deepEqual(recovered.workspaceOverrides, overrides);
    await ctx.fiber.dispose();
    const cold = await context(root); t.after(() => cold.fiber.dispose());
    const persisted = await openSharedCompactionStore(cold);
    assert.equal(await persisted.adoptLegacyReceipt('operation-b', 'compact-context', fixed('late-original'), admitted), 'preserved');
    assert.equal(persisted.read().revision, 3);
    assert.deepEqual((await persisted.recoverLegacyAdoption('operation-a', 3)).defaults, inherit());
});

test('consumed conflicting bootstrap cannot pick a master when another settings owner unloads', async t => {
    const ctx = await context(await mkdtemp(join(tmpdir(), 'compaction-consumed-conflict-')));
    t.after(() => ctx.fiber.dispose());
    const first = ctx.plugin({ name: 'compact-conflict-settings', apply(scope: Context) {
        mountLegacyCompactionSeed(scope, 'compact-context', 'compact-conflict', () => ({ enabled: false, compactionReasoning: inherit() }));
    } });
    const second = ctx.plugin({ name: 'model-conflict-settings', apply(scope: Context) {
        mountLegacyCompactionSeed(scope, 'model-policy', 'model-conflict', () => ({ enabled: false, compactionReasoning: fixed('other-original') }));
    } });
    await Promise.all([first.await(), second.await()]); await prepareLegacyCompactionSeeds(ctx);
    const store = await openSharedCompactionStore(ctx);
    assert.equal(store.read().revision, 0); assert.equal(legacyCompactionSeedStatus(ctx)?.phase, 'conflict');
    await second.dispose(); await prepareLegacyCompactionSeeds(ctx);
    assert.equal(store.read().revision, 0); assert.equal(store.read().defaults.enabled, false);
    assert.equal(legacyCompactionSeedStatus(ctx)?.phase, 'conflict', 'consumed ambiguity still requires an explicit canonical save');
    await store.write({ expectedRevision: 0, defaults: inherit(), workspaceOverrides: {} });
    await prepareLegacyCompactionSeeds(ctx); assert.equal(store.read().revision, 1);
});

test('a receipt cannot resolve conflicting bootstrap inputs by load order', async t => {
    const ctx = await context(await mkdtemp(join(tmpdir(), 'compaction-adoption-conflict-')));
    t.after(() => ctx.fiber.dispose()); const store = await openSharedCompactionStore(ctx);
    assert.equal(await store.adoptLegacyReceipt('operation-conflict', 'compact-context', inherit(), admitted, false), 'conflict');
    assert.equal(store.read().revision, 0); assert.equal(store.read().defaults.enabled, false);
    assert.equal(await store.adoptLegacyReceipt('operation-conflict', 'compact-context', inherit(), admitted), 'conflict');
    assert.equal(store.read().revision, 0);
    assert.deepEqual((await store.recoverLegacyAdoption('operation-conflict', 0)).defaults, inherit());
});

async function pausedContext(tableName: string) {
    const ctx = new Context(); await ctx.plugin(Storage).await();
    await ctx.plugin(Json, { root: await mkdtemp(join(tmpdir(), 'compaction-adoption-paused-')) }).await();
    const native = ctx.get(storageBackendServiceKey('json')) as StorageBackend;
    const kv = native.kv; assert.ok(kv, 'native JSON must expose its public KV backend');
    let entered!: () => void; let release!: () => void; let paused = false;
    const backing = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const delayed: StorageBackend = { kv: { open: async descriptor => {
        const unit = await kv.open(descriptor);
        return { loadAll: () => unit.loadAll(), putRecord: async (table, key, value) => {
            if (table === tableName && !paused) { paused = true; entered(); await gate; }
            return unit.putRecord(table, key, value);
        }, deleteRecord: (table, key) => unit.deleteRecord(table, key), deleteRecords: (table, keys) => unit.deleteRecords(table, keys),
        setGlobal: value => unit.setGlobal(value), close: () => unit.close() };
    } }, close: () => native.close() };
    await ctx.plugin({ name: 'paused-adoption-backend', inject: ['storage'], apply(scope: Context) {
        scope.effect(() => { const off = scope.storage.backend.register('paused-adoption', delayed); return async () => { off(); await delayed.close(); }; });
        scope.provide(storageBackendServiceKey('paused-adoption'), delayed);
    } }).await();
    await ctx.plugin(Domain, { backend: 'paused-adoption' }).await();
    return { ctx, backing, release };
}

test('a settings source admitted during pending bootstrap is included before the shared preparation promise resolves', async t => {
    const { ctx, backing, release } = await pausedContext('bootstrap');
    t.after(() => ctx.fiber.dispose()); t.after(() => release());
    await ctx.plugin({ name: 'initial-compact-settings', apply(scope: Context) {
        mountLegacyCompactionSeed(scope, 'compact-context', 'initial-compact', () => ({ enabled: false, compactionReasoning: inherit() }));
    } }).await();
    await backing;
    await ctx.plugin({ name: 'later-model-settings', apply(scope: Context) {
        mountLegacyCompactionSeed(scope, 'model-policy', 'later-model', () => ({ enabled: false, compactionReasoning: inherit() }));
    } }).await();
    const preparation = prepareLegacyCompactionSeeds(ctx);
    release(); await preparation;
    const accepted = (await openSharedCompactionStore(ctx)).read();
    assert.equal(accepted.revision, 1, 'a changed source generation must not silently cancel all bootstrap work');
    assert.deepEqual(accepted.defaults, inherit());
});

test('a paused native receipt backup cannot seed after admission expires and remains retryable rather than consumed', async t => {
    const { ctx, backing, release } = await pausedContext('adoptions');
    t.after(() => ctx.fiber.dispose()); t.after(() => release());
    const store = await openSharedCompactionStore(ctx); let live = true;
    const pending = store.adoptLegacyReceipt('operation-paused', 'compact-context', inherit(), () => live);
    try { await backing; live = false; } finally { release(); }
    assert.equal(await pending, 'cancelled');
    assert.equal(store.read().revision, 0); assert.equal(store.read().defaults.enabled, false);
    await assert.rejects(store.adoptLegacyReceipt('operation-paused', 'compact-context', fixed('rewritten'), admitted), /reused/);
    assert.equal(await store.adoptLegacyReceipt('operation-paused', 'compact-context', inherit(), admitted), 'imported');
    assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
});
