import test from 'node:test';
import assert from 'node:assert/strict';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime from '@deepseek-ai/dsh-llm';
import Storage, { storageBackendServiceKey, type StorageBackend } from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import * as compact from '../../src/modules/compact-context/index.ts';
import * as model from '../../src/modules/model-policy/index.ts';
import { loaderFixture, response, until } from '../integration/loader-harness.ts';
import { openSharedCompactionStore } from '../../src/shared-compaction/store.ts';
const policy = (effort: string) => ({ enabled: true, rules: [{ scope: 'all' as const, mode: 'fixed' as const, effort }] });
async function context() { const ctx = new Context(); await ctx.plugin(LlmRuntime).await(); await ctx.plugin(Storage).await(); await ctx.plugin(Json, { root: await mkdtemp(join(tmpdir(), 'disabled-compaction-seed-')) }).await(); await ctx.plugin(Domain, { backend: 'json' }).await(); return ctx; }
async function request(f: any, method = 'GET', body?: unknown) { const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as any; req.method = method; req.headers = { host: f.host, cookie: f.ownerCookie }; const res = response(); await f.routes.get('/extras/' + f.entry.options.id + '/shared-compaction').handler(req, res); return { code: res.code, body: JSON.parse(res.body) }; }
test('native Loader disabled module preserves exact nested legacy policy while execution is off and never installs an executor', async (t) => {
    const ctx = await context();
    t.after(() => ctx.fiber.dispose());
    const raw = (ctx.llm as any)[symbols.original];
    const initial = { migration: { auto: false }, modules: { 'compact-context': { enabled: false, compactTool: false, compactionReasoning: policy('old-custom') } } };
    const f = await loaderFixture(t, { name: 'disabled-seed', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': compact } }, initial, ctx);
    await f.ready();
    const first = await request(f);
    assert.equal(first.code, 200);
    assert.deepEqual(first.body.defaults, policy('old-custom'));
    assert.equal(first.body.revision, 1);
    assert.equal(Object.hasOwn(raw, 'stream'), false);
    assert.equal(f.status().modules['compact-context'].phase, 'disabled');
    assert.equal(first.body.legacyImport.sources[0].explicitness, 'unverified');
    const saved = await request(f, 'PUT', { expectedRevision: 1, defaults: policy('canonical-user'), workspaceOverrides: {} });
    assert.equal(saved.code, 200);
    await f.update({ ...initial, modules: { 'compact-context': { ...initial.modules['compact-context'], enabled: true } } });
    await until(() => f.status().modules['compact-context'].capabilities?.compactionReasoning.phase, v => v === 'active', 'enabled participant uses accepted canonical');
    const final = await request(f);
    assert.deepEqual(final.body.defaults, policy('canonical-user'));
    assert.equal(final.body.revision, 2);
    const store = await openSharedCompactionStore(ctx);
    const restored = await store.recoverLegacy('compact-context', 2);
    assert.deepEqual(restored.defaults, policy('old-custom'));
    assert.equal(restored.defaults.enabled, true);
});
test('two disabled native settings sources diagnose conflicting seeds without choosing load-order policy', async (t) => {
    const ctx = await context();
    t.after(() => ctx.fiber.dispose());
    const f = await loaderFixture(t, { name: 'conflicting-disabled-seeds', moduleIds: ['compact-context', 'model-policy'], modulePlugins: { 'compact-context': compact, 'model-policy': model } }, { migration: { auto: false }, modules: { 'compact-context': { enabled: false, compactionReasoning: policy('private-seed-a') }, 'model-policy': { enabled: false, compactionReasoning: policy('private-seed-b') } } }, ctx);
    await f.ready();
    const first = await request(f);
    assert.equal(first.body.revision, 0);
    assert.equal(first.body.defaults.enabled, false);
    assert.equal(first.body.legacyImport.phase, 'conflict');
    assert.equal(first.body.legacyImport.sources.length, 2);
    assert.equal(JSON.stringify(first.body.legacyImport).includes('private-seed'), false);
    assert.equal(Object.hasOwn((ctx.llm as any)[symbols.original], 'stream'), false);
    const again = await request(f);
    assert.equal(again.body.revision, 0);
    assert.equal(again.body.legacyImport.phase, 'conflict');
    assert.equal((await request(f, 'PUT', { expectedRevision: 0, defaults: policy('user-resolved'), workspaceOverrides: {} })).code, 200);
    const final = await request(f);
    assert.equal(final.body.revision, 1);
    assert.equal(final.body.legacyImport.phase, 'preserved');
    assert.deepEqual(final.body.defaults, policy('user-resolved'));
});
test('duplicate equal disabled seeds import once and schema placeholders never win', async (t) => {
    const ctx = await context();
    t.after(() => ctx.fiber.dispose());
    const f = await loaderFixture(t, { name: 'equal-disabled-seeds', moduleIds: ['compact-context', 'model-policy'], modulePlugins: { 'compact-context': compact, 'model-policy': model } }, { migration: { auto: false }, modules: { 'compact-context': { enabled: false, compactionReasoning: policy('same') }, 'model-policy': { enabled: true, compactionReasoning: policy('same') } } }, ctx);
    await f.ready();
    const first = await request(f);
    assert.equal(first.body.revision, 1);
    assert.deepEqual(first.body.defaults, policy('same'));
    assert.notEqual(first.body.legacyImport.phase, 'conflict');
    for (let i = 0; i < 3; i++) {
        const again = await request(f);
        assert.equal(again.body.revision, 1);
        assert.deepEqual(again.body.defaults, first.body.defaults);
    }
    const blankCtx = await context();
    t.after(() => blankCtx.fiber.dispose());
    const blank = await loaderFixture(t, { name: 'default-placeholder', moduleIds: ['compact-context', 'model-policy'], modulePlugins: { 'compact-context': compact, 'model-policy': model } }, { migration: { auto: false }, modules: { 'compact-context': { enabled: false }, 'model-policy': { enabled: false } } }, blankCtx);
    await blank.ready();
    const defaults = await request(blank);
    assert.equal(defaults.body.revision, 0);
    assert.equal(defaults.body.legacyImport.phase, 'none');
    assert.deepEqual(defaults.body.legacyImport.sources, []);
});
test('disposing a native settings root during backup prevents late canonical seed admission', { timeout: 10000 }, async (t) => {
    const ctx = new Context();
    await ctx.plugin(Storage).await();
    const native = new Json.JsonStorageBackend(await mkdtemp(join(tmpdir(), 'disposed-seed-backend-')));
    let release!: () => void, entered!: () => void;
    const gate = new Promise<void>(r => release = r), backing = new Promise<void>(r => entered = r);
    const delayed: StorageBackend = { kv: { open: async (descriptor) => {
                const unit = await native.kv.open(descriptor);
                return { loadAll: () => unit.loadAll(), putRecord: async (table, key, value) => { if (table === 'legacy') {
                        entered();
                        await gate;
                    } return unit.putRecord(table, key, value); }, deleteRecord: (table, key) => unit.deleteRecord(table, key), deleteRecords: (table, keys) => unit.deleteRecords(table, keys), setGlobal: value => unit.setGlobal(value), close: () => unit.close() };
            } }, close: () => native.close() };
    await ctx.plugin({ name: 'paused-seed-backend', inject: ['storage'], apply(scope: Context) { scope.effect(() => { const off = scope.storage.backend.register('paused', delayed); return async () => { off(); await delayed.close(); }; }); scope.provide(storageBackendServiceKey('paused'), delayed); } }).await();
    await ctx.plugin(Domain, { backend: 'paused' }).await();
    t.after(() => ctx.fiber.dispose());
    t.after(() => release());
    const f = await loaderFixture(t, { name: 'disposed-seed', moduleIds: ['compact-context'], modulePlugins: { 'compact-context': compact } }, { migration: { auto: false }, modules: { 'compact-context': { enabled: false, compactionReasoning: policy('expired-source') } } }, ctx);
    await f.ready();
    const pending = request(f);
    try {
        await backing;
        await f.entry.update({ disabled: true });
        await f.loader.await();
    }
    finally {
        release();
    }
    const result = await pending;
    assert.equal(result.body.revision, 0);
    assert.equal(result.body.defaults.enabled, false);
    const store = await openSharedCompactionStore(ctx);
    assert.equal(store.read().revision, 0);
    assert.deepEqual(store.read().defaults.rules, [{ scope: 'all', mode: 'inherit' }]);
});
