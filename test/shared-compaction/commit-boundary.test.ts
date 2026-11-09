import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import Storage, { storageBackendServiceKey, type StorageBackend } from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openSharedCompactionStore } from '../../src/shared-compaction/store.ts';
import { resolveCompactionReasoning } from '../../src/modules/compact-context/reasoning-policy.ts';
import { mountLegacyCompactionSeed, prepareLegacyCompactionSeeds, adoptLegacyCompactionSeed, legacyCompactionSeedStatus } from '../../src/shared-compaction/legacy-seed.ts';

const inherit = () => resolveCompactionReasoning({ enabled: true, rules: [{ scope: 'all', mode: 'inherit' }] });
const different = () => resolveCompactionReasoning({ enabled: true, rules: [{ scope: 'all', mode: 'fixed', effort: 'subsequent-original' }] });
const nativeTurn = () => new Promise<void>(resolve => setImmediate(resolve));
async function pausedContext(options: { pauseAt?: 'global' | 'legacy'; failGlobal?: boolean; failAck?: boolean; pauseAck?: boolean } = {}) {
    const ctx = new Context(); await ctx.plugin(Storage).await();
    await ctx.plugin(Json, { root: await mkdtemp(join(tmpdir(), 'compaction-final-global-')) }).await();
    const native = ctx.get(storageBackendServiceKey('json')) as StorageBackend;
    const kv = native.kv; assert.ok(kv);
    let entered!: () => void; let release!: () => void; let paused = false; let failed = false;
    const backing = new Promise<void>(resolve => { entered = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    let acknowledge!: () => void; let releaseAck!: () => void;
    const acknowledging = new Promise<void>(resolve => { acknowledge = resolve; });
    const acknowledgementGate = new Promise<void>(resolve => { releaseAck = resolve; });
    const stats = { acknowledgementAttempts: 0 };
    const pause = async () => { if (!paused) { paused = true; entered(); await gate; } };
    const delayed: StorageBackend = { kv: { open: async descriptor => {
        const unit = await kv.open(descriptor);
        return { loadAll: () => unit.loadAll(), putRecord: async (table, key, value) => {
            if (options.pauseAt === 'legacy' && table === 'legacy') await pause();
            if (table === 'adoptions' && (value as { consumed?: boolean })?.consumed) {
                stats.acknowledgementAttempts++;
                if (options.pauseAck && stats.acknowledgementAttempts === 1) { acknowledge(); await acknowledgementGate; }
                if (options.failAck && stats.acknowledgementAttempts === 1) throw new Error('native receipt acknowledgement failed');
            }
            return unit.putRecord(table, key, value);
        }, deleteRecord: (table, key) => unit.deleteRecord(table, key), deleteRecords: (table, keys) => unit.deleteRecords(table, keys),
        setGlobal: async value => {
            if ((value as { revision?: number })?.revision === 1) {
                if (options.pauseAt !== 'legacy') await pause();
                if (options.failGlobal && !failed) { failed = true; throw new Error('native global durability failed'); }
            }
            return unit.setGlobal(value);
        }, close: () => unit.close() };
    } }, close: () => native.close() };
    await ctx.plugin({ name: 'final-global-backend', inject: ['storage'], apply(scope: Context) {
        scope.effect(() => { const off = scope.storage.backend.register('final-global', delayed); return async () => { off(); await delayed.close(); }; });
        scope.provide(storageBackendServiceKey('final-global'), delayed);
    } }).await();
    await ctx.plugin(Domain, { backend: 'final-global' }).await();
    return { ctx, backing, release, stats, acknowledging, releaseAck };
}
async function settings(ctx: Context, module: 'compact-context' | 'model-policy', distribution: string, policy?: ReturnType<typeof inherit>) {
    let scope!: Context;
    const owner = ctx.plugin({ name: distribution, apply(value: Context) {
        scope = value;
        mountLegacyCompactionSeed(scope, module, distribution, () => ({ enabled: false, ...(policy ? { compactionReasoning: policy } : {}) }));
    } });
    await owner.await(); return { owner, scope };
}

test('public native async effect disposer is a real disposal-completion barrier', async t => {
    const ctx = new Context(); let enter!: () => void; let release!: () => void;
    const entered = new Promise<void>(resolve => { enter = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    const owner = ctx.plugin({ name: 'native-effect-barrier', apply(scope: Context) { scope.effect(() => async () => { enter(); await gate; }); } });
    await owner.await(); let disposed = false;
    const disposing = owner.dispose().then(() => { disposed = true; });
    await entered; assert.equal(disposed, false); release(); await disposing; assert.equal(disposed, true);
});

test('an admitted bootstrap global write keeps its native settings owner disposal pending until durability', async t => {
    const { ctx, backing, release } = await pausedContext();
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    const { owner } = await settings(ctx, 'compact-context', 'bootstrap-commit-owner', inherit());
    const originalPreparation = prepareLegacyCompactionSeeds(ctx); await backing;
    const store = await openSharedCompactionStore(ctx); assert.equal(store.read().revision, 0);
    let disposed = false; const disposing = owner.dispose().then(() => { disposed = true; });
    try {
        // This owner has no teardown IO except the deliberately paused global
        // commit. A full native turn drains its other Promise-only disposers.
        await nativeTurn(); assert.equal(disposed, false, 'disposal must drain the already-admitted global write');
        assert.equal(store.read().revision, 0);
    } finally { release(); }
    await Promise.all([disposing, originalPreparation]);
    assert.equal(disposed, true); assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
    await nativeTurn(); assert.equal(store.read().revision, 1, 'no authority write remains after disposal completion');
});

test('a committed helper adoption survives owner closure without a false cancellation or dead-owner publication', async t => {
    const { ctx, backing, release, acknowledging, releaseAck } = await pausedContext({ pauseAck: true });
    t.after(async () => { releaseAck(); release(); await ctx.fiber.dispose(); });
    const { owner, scope } = await settings(ctx, 'compact-context', 'adoption-commit-owner');
    await prepareLegacyCompactionSeeds(ctx);
    const receipt = { operationId: 'admitted-helper-operation', sourceModuleId: 'compact-context' };
    const operation = adoptLegacyCompactionSeed(scope, 'compact-context', { enabled: false, compactionReasoning: inherit() }, receipt);
    const outcome = Promise.allSettled([operation]); await backing;
    let disposed = false; const disposing = owner.dispose().then(() => { disposed = true; });
    try { await nativeTurn(); assert.equal(disposed, false, 'adoption commit and receipt completion are owner-owned work'); }
    finally { release(); }
    await acknowledging;
    const store = await openSharedCompactionStore(ctx); assert.equal(store.read().revision, 1);
    try { await nativeTurn(); assert.equal(disposed, false, 'global success does not release the owner before its receipt acknowledgement'); }
    finally { releaseAck(); }
    const [result] = await outcome; await disposing;
    assert.equal(result!.status, 'fulfilled', 'durable import must not throw owner-disposed/cancelled after committing');
    assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
    assert.notEqual(legacyCompactionSeedStatus(ctx)?.phase, 'imported', 'closed settings owner must not publish a new UI status');
    const remounted = await settings(ctx, 'compact-context', 'adoption-commit-owner');
    await adoptLegacyCompactionSeed(remounted.scope, 'compact-context', { enabled: false, compactionReasoning: inherit() }, receipt);
    assert.equal(store.read().revision, 1);
});

test('direct store callers can reserve the actual commit and receive imported after post-admission liveness changes', async t => {
    const { ctx, backing, release } = await pausedContext();
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    const store = await openSharedCompactionStore(ctx); let live = true; let ticket: Promise<void> | undefined;
    const operation = store.adoptLegacyReceipt('direct-admitted-operation', 'compact-context', inherit(), () => live, true,
        completion => { ticket = completion; void completion.catch(() => {}); });
    const outcome = Promise.allSettled([operation]); await backing;
    try { assert.ok(ticket, 'the caller must receive its reservation before native global IO is entered'); live = false; }
    finally { release(); }
    assert.equal(await operation, 'imported'); await outcome; await ticket;
    assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
});

test('a source enrolled after irreversible admission is subsequent preserved input with its exact backup', async t => {
    const { ctx, backing, release } = await pausedContext();
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    await settings(ctx, 'compact-context', 'first-admitted-source', inherit());
    const originalPreparation = prepareLegacyCompactionSeeds(ctx); await backing;
    await settings(ctx, 'model-policy', 'subsequent-source', different());
    release(); await originalPreparation;
    const store = await openSharedCompactionStore(ctx); assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
    const status = legacyCompactionSeedStatus(ctx, store.read()); assert.equal(status?.phase, 'preserved');
    assert.match(status?.reason ?? '', /admission.*subsequent|subsequent.*admission/);
    assert.deepEqual((await store.recoverLegacy('model-policy', 1)).defaults, different());
});

test('conflicting source enrollment before final global admission still backs up both originals and seeds nothing', async t => {
    const { ctx, backing, release } = await pausedContext({ pauseAt: 'legacy' });
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    await settings(ctx, 'compact-context', 'pre-admitted-first', inherit());
    const originalPreparation = prepareLegacyCompactionSeeds(ctx); await backing;
    await settings(ctx, 'model-policy', 'pre-admitted-second', different());
    release(); await originalPreparation;
    const store = await openSharedCompactionStore(ctx); assert.equal(store.read().revision, 0); assert.equal(store.read().defaults.enabled, false);
    assert.equal(legacyCompactionSeedStatus(ctx)?.phase, 'conflict');
    assert.deepEqual((await store.recoverLegacy('compact-context', 0)).defaults, inherit());
    assert.deepEqual((await store.recoverLegacy('model-policy', 1)).defaults, different());
});

test('rejected native global durability leaves the original receipt unconsumed and retryable', async t => {
    const { ctx, backing, release } = await pausedContext({ failGlobal: true });
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    const store = await openSharedCompactionStore(ctx);
    const operation = store.adoptLegacyReceipt('failed-global-operation', 'compact-context', inherit(), () => true);
    const rejected = assert.rejects(operation, /native global durability failed/);
    await backing; release(); await rejected;
    assert.equal(store.read().revision, 0); assert.equal(store.read().defaults.enabled, false);
    assert.equal(await store.adoptLegacyReceipt('failed-global-operation', 'compact-context', inherit(), () => true), 'imported');
    assert.equal(store.read().revision, 1);
});

test('failed receipt acknowledgement after committed global IO is neither fabricated cancellation nor a consumed marker', async t => {
    const { ctx, backing, release, stats } = await pausedContext({ failAck: true });
    t.after(async () => { release(); await ctx.fiber.dispose(); });
    const store = await openSharedCompactionStore(ctx);
    const operation = store.adoptLegacyReceipt('failed-ack-operation', 'compact-context', inherit(), () => true);
    const rejected = assert.rejects(operation, /native receipt acknowledgement failed/);
    await backing; release(); await rejected;
    assert.equal(store.read().revision, 1); assert.deepEqual(store.read().defaults, inherit());
    assert.equal(stats.acknowledgementAttempts, 1);
    assert.equal(await store.adoptLegacyReceipt('failed-ack-operation', 'compact-context', inherit(), () => true), 'preserved');
    assert.equal(stats.acknowledgementAttempts, 2, 'the failed acknowledgement must really be retried, not read as consumed');
    assert.equal(store.read().revision, 1);
});
