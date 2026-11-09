import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as Json from '@deepseek-ai/dsh-storage-json';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import { nativeProfileFixture, nativeProfileAnchor } from '../native-profile-fixture.ts';
import { openSharedCompactionStore } from '../../src/shared-compaction/store.ts';

const fixed = (effort: string) => ({ enabled: true, rules: [{ scope: 'all' as const, mode: 'fixed' as const, effort }] });
async function mountStore(fixture: Awaited<ReturnType<typeof nativeProfileFixture>>, root: string) {
    const ctx = new Context(); fixture.provide(ctx);
    await ctx.plugin(Storage).await(); await ctx.plugin(Json, { root }).await();
    await ctx.plugin(Domain, { backend: 'json' }).await();
    return { ctx, store: await openSharedCompactionStore(ctx) };
}

test('native CLI profiles sharing one stock backend retain independent canonical revisions and workspace overrides across full reopen', async t => {
    const root = await mkdtemp(join(tmpdir(), 'extras-profile-boundary-'));
    const home = join(root, 'dsh'); const storage = join(home, 'storages');
    const previousHome = process.env.HOME, previousDsh = process.env.DSH_HOME;
    process.env.HOME = join(root, 'home'); process.env.DSH_HOME = home;
    await mkdir(process.env.HOME, { recursive: true });
    const opened: Context[] = [];
    t.after(async () => {
        for (const ctx of opened) await ctx.fiber.dispose();
        if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
        if (previousDsh === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousDsh;
        assert.equal(dirname(root), resolve(tmpdir())); assert.ok(basename(root).startsWith('extras-profile-boundary-'));
        await rm(root, { recursive: true, force: true });
    });
    const a = await nativeProfileFixture(t, { home, name: 'a', bundles: ['@deepseek-ai/dsh-base'] });
    const b = await nativeProfileFixture(t, { home, name: 'b', bundles: ['@deepseek-ai/dsh-base'] });
    assert.notEqual(await realpath(a.profile.dir), await realpath(b.profile.dir));
    const mount = async (fixture: typeof a) => {
        const { boot, context, profile } = fixture;
        const rows = boot.composeEntries(boot.readProfilePatches('extras-test', context, profile)).filter((row: any) =>
            ['@deepseek-ai/dsh-storage', '@deepseek-ai/dsh-storage-json', '@deepseek-ai/dsh-storage-domain'].includes(row.name));
        assert.equal(rows.length, 3);
        assert.deepEqual(rows.find((row: any) => row.id === 'storage-json').config.root, { __jsExpr: "dshHomePath('storages')" });
        const base = join(profile.dir, 'cordis.yml'); await writeFile(base, '[]\n');
        const ctx: Context = await boot.boot('extras-test', base, [{ insert: rows }], (host: Context) => fixture.provide(host), pathToFileURL(nativeProfileAnchor).href);
        opened.push(ctx);
        const json = [...ctx.loader.entries()].find((row: any) => row.options.id === 'storage-json')!;
        assert.equal((json.fiber!.effectiveConfig as { root: string }).root, storage, 'native Loader must interpret the unchanged stock expression to the identical backend root');
        return { ctx, store: await openSharedCompactionStore(ctx) };
    };
    const firstA = await mount(a);
    assert.equal(firstA.store.read().revision, 0);
    await firstA.store.write({ expectedRevision: 0, defaults: fixed('a'), workspaceOverrides: { sameWorkspace: fixed('a-workspace') } });
    await firstA.ctx.fiber.dispose();
    const firstB = await mount(b);
    assert.notEqual(firstA.ctx.root, firstB.ctx.root);
    assert.deepEqual(firstB.store.read(), { revision: 0, defaults: { enabled: false, rules: [{ scope: 'all', mode: 'inherit' }] }, workspaceOverrides: {} }, 'fresh B must not read A canonical authority');
    await firstB.store.write({ expectedRevision: 0, defaults: fixed('b'), workspaceOverrides: { sameWorkspace: fixed('b-workspace') } });
    await firstB.ctx.fiber.dispose();
    const againA = await mount(a);
    assert.deepEqual(againA.store.read(), { revision: 1, defaults: fixed('a'), workspaceOverrides: { sameWorkspace: fixed('a-workspace') } });
    await againA.ctx.fiber.dispose();
    const againB = await mount(b);
    assert.deepEqual(againB.store.read(), { revision: 1, defaults: fixed('b'), workspaceOverrides: { sameWorkspace: fixed('b-workspace') } });
    await againB.ctx.fiber.dispose();
    const files = (await readdir(storage)).filter(name => name.startsWith('dsh_extras_compaction_') && name.endsWith('.json'));
    assert.equal(files.length, 2, 'both isolated authorities must be durable units in the same native backend');
    const globals = await Promise.all(files.map(async name => JSON.parse(await readFile(join(storage, name), 'utf8')).global));
    assert.deepEqual(globals.map(value => value.defaults.rules[0].effort).sort(), ['a', 'b']);
});

test('native profile units isolate recoverable legacy inputs, bootstrap consumption and adoption receipts after reopen', async t => {
    const a = await nativeProfileFixture(t, { name: 'a' });
    const b = await nativeProfileFixture(t, { home: a.context.home, name: 'b' });
    const root = join(a.context.home, 'storages');
    const opened: Context[] = []; t.after(async () => { for (const ctx of opened) await ctx.fiber.dispose(); });
    const mount = async (fixture: typeof a) => { const value = await mountStore(fixture, root); opened.push(value.ctx); return value; };
    const firstA = await mount(a);
    assert.equal(await firstA.store.importLegacy('compact-context', fixed('legacy-a'), false), 'conflict');
    await firstA.store.captureLegacyBootstrap('same-source', { policy: fixed('bootstrap-a'), moduleEnabled: true }, () => true);
    await firstA.store.completeLegacyBootstrap('same-source', () => true);
    assert.equal(await firstA.store.adoptLegacyReceipt('same-operation', 'model-policy', fixed('adoption-a'), () => true, false), 'conflict');
    await firstA.ctx.fiber.dispose();
    const firstB = await mount(b);
    await assert.rejects(firstB.store.recoverLegacy('compact-context', 0), /backup unavailable/);
    await assert.rejects(firstB.store.recoverLegacyAdoption('same-operation', 0), /backup unavailable/);
    assert.deepEqual(await firstB.store.captureLegacyBootstrap('same-source', { policy: fixed('bootstrap-b'), moduleEnabled: false }, () => true),
        { policy: fixed('bootstrap-b'), moduleEnabled: false, consumed: false }, 'A consumption must not consume the same source key in B');
    assert.equal(await firstB.store.importLegacy('compact-context', fixed('legacy-b'), false), 'conflict');
    assert.equal(await firstB.store.adoptLegacyReceipt('same-operation', 'model-policy', fixed('adoption-b'), () => true, false), 'conflict');
    assert.deepEqual((await firstB.store.recoverLegacyAdoption('same-operation', 0)).defaults, fixed('adoption-b'));
    await firstB.ctx.fiber.dispose();
    const againA = await mount(a);
    assert.equal(againA.store.read().revision, 0, 'recovering B must not advance A');
    assert.deepEqual(await againA.store.captureLegacyBootstrap('same-source', { policy: fixed('replacement'), moduleEnabled: false }, () => true),
        { policy: fixed('bootstrap-a'), moduleEnabled: true, consumed: true });
    assert.deepEqual((await againA.store.recoverLegacy('compact-context', 0)).defaults, fixed('legacy-a'));
    assert.deepEqual((await againA.store.recoverLegacyAdoption('same-operation', 1)).defaults, fixed('adoption-a'));
    await againA.ctx.fiber.dispose();
    const againB = await mount(b);
    assert.equal(againB.store.read().revision, 1);
    assert.deepEqual(await againB.store.captureLegacyBootstrap('same-source', { policy: fixed('replacement'), moduleEnabled: true }, () => true),
        { policy: fixed('bootstrap-b'), moduleEnabled: false, consumed: false });
    assert.deepEqual((await againB.store.recoverLegacy('compact-context', 1)).defaults, fixed('legacy-b'));
    await againB.ctx.fiber.dispose();
});

test('unqualified preview bytes are never assigned or imported while profile-local legacy configuration remains seedable', async t => {
    const a = await nativeProfileFixture(t, { name: 'a' });
    const b = await nativeProfileFixture(t, { home: a.context.home, name: 'b' });
    const root = join(a.context.home, 'storages'); await mkdir(root, { recursive: true });
    const preview = join(root, 'dsh_extras_compaction.json');
    const original = JSON.stringify({ unit: { name: 'dsh_extras_compaction', version: 1 },
        global: { revision: 7, defaults: fixed('ambiguous-preview'), workspaceOverrides: { opaque: fixed('preview-workspace') } },
        tables: { legacy: { 'compact-context': fixed('preview-legacy') }, bootstrap: {
            source: { policy: fixed('preview-bootstrap'), moduleEnabled: true, consumed: true },
        }, adoptions: { operation: { policy: fixed('preview-adoption'), consumed: true } } },
    }, null, 3) + '\n';
    await writeFile(preview, original);
    const firstA = await mountStore(a, root); t.after(() => firstA.ctx.fiber.dispose());
    assert.equal(firstA.store.read().revision, 0); assert.equal(firstA.store.read().defaults.enabled, false);
    assert.deepEqual(firstA.store.read().workspaceOverrides, {});
    await assert.rejects(firstA.store.recoverLegacy('compact-context', 0), /backup unavailable/);
    await assert.rejects(firstA.store.recoverLegacyAdoption('operation', 0), /backup unavailable/);
    assert.deepEqual(await firstA.store.captureLegacyBootstrap('source', { policy: fixed('profile-legacy'), moduleEnabled: false }, () => true),
        { policy: fixed('profile-legacy'), moduleEnabled: false, consumed: false });
    assert.equal(await firstA.store.seedLegacyBootstrap(fixed('profile-legacy'), () => true), 'imported');
    assert.deepEqual(firstA.store.read().defaults, fixed('profile-legacy'));
    await firstA.ctx.fiber.dispose();
    assert.equal(await readFile(preview, 'utf8'), original);
    const firstB = await mountStore(b, root); t.after(() => firstB.ctx.fiber.dispose());
    assert.equal(firstB.store.read().revision, 0); assert.equal(firstB.store.read().defaults.enabled, false);
    await firstB.store.write({ expectedRevision: 0, defaults: fixed('profile-b-save'), workspaceOverrides: {} });
    await firstB.ctx.fiber.dispose();
    assert.equal(await readFile(preview, 'utf8'), original, 'native qualified writes must leave every byte of ambiguous preview evidence untouched');
});

test('missing and malformed native profile authority fail closed without creating any native unit', async t => {
    const fixture = await nativeProfileFixture(t);
    const other = await nativeProfileFixture(t, { home: fixture.context.home, name: 'other' });
    const root = join(fixture.context.home, 'rejected-storage'); await mkdir(root);
    const valid = fixture.context;
    const cases: { label: string; value: unknown }[] = [
        { label: 'missing', value: undefined }, { label: 'array', value: [] }, { label: 'incomplete', value: { dir: valid.dir } },
        { label: 'relative directory', value: { ...valid, dir: 'relative' } },
        { label: 'relative patch', value: { ...valid, patchPath: 'cordis.patch.yml' } },
        { label: 'relative home', value: { ...valid, home: 'relative' } },
        { label: 'missing anchor', value: { ...valid, installAnchor: join(valid.home, 'absent-package.json') } },
        { label: 'non-directory identity', value: { ...valid, dir: valid.installAnchor } },
        { label: 'foreign patch parent', value: { ...valid, patchPath: other.context.patchPath } },
        { label: 'wrong native patch basename', value: { ...valid, patchPath: join(valid.dir, 'not-native.yml') } },
        { label: 'throwing native view', value: { ...valid, get dir() { throw new Error('untrusted native getter'); } } },
    ];
    for (const { label, value } of cases) {
        const ctx = new Context(); if (value !== undefined) ctx.provide('profileContext', value as any);
        await ctx.plugin(Storage).await(); await ctx.plugin(Json, { root }).await(); await ctx.plugin(Domain, { backend: 'json' }).await();
        try { await assert.rejects(openSharedCompactionStore(ctx), /native profile authority unavailable/, label); }
        finally { await ctx.fiber.dispose(); }
        assert.deepEqual(await readdir(root), [], label + ' must not create a canonical or backup unit');
    }
});

test('a root with accepted native authority refuses a replacement profile without opening another unit', async t => {
    const a = await nativeProfileFixture(t, { name: 'a' });
    const b = await nativeProfileFixture(t, { home: a.context.home, name: 'b' });
    const root = join(a.context.home, 'storages');
    const mounted = await mountStore(a, root); t.after(() => mounted.ctx.fiber.dispose());
    await mounted.store.write({ expectedRevision: 0, defaults: fixed('accepted-a'), workspaceOverrides: {} });
    const before = await readdir(root);
    Object.assign(mounted.ctx.get('profileContext')!, b.context);
    await assert.rejects(openSharedCompactionStore(mounted.ctx), /profile authority changed/);
    assert.deepEqual(await readdir(root), before, 'a rejected profile replacement must not create or rewrite a second authority');
    await mounted.ctx.fiber.dispose();
    const freshB = await mountStore(b, root); t.after(() => freshB.ctx.fiber.dispose());
    assert.equal(freshB.store.read().revision, 0); assert.equal(freshB.store.read().defaults.enabled, false);
    await freshB.ctx.fiber.dispose();
});

test('native authority changing while initial canonicalization is pending cannot open a unit', async t => {
    const a = await nativeProfileFixture(t, { name: 'a' });
    const b = await nativeProfileFixture(t, { home: a.context.home, name: 'b' });
    const root = join(a.context.home, 'storages'); await mkdir(root);
    const ctx = new Context(); a.provide(ctx); t.after(() => ctx.fiber.dispose());
    await ctx.plugin(Storage).await(); await ctx.plugin(Json, { root }).await(); await ctx.plugin(Domain, { backend: 'json' }).await();
    const pending = openSharedCompactionStore(ctx);
    Object.assign(ctx.get('profileContext')!, b.context);
    await assert.rejects(pending, /profile authority changed/);
    assert.deepEqual(await readdir(root), []);
    await ctx.fiber.dispose();
});

test('native profile aliases reopen the same canonical physical authority rather than creating a name-based unit', async t => {
    const a = await nativeProfileFixture(t, { name: 'a' });
    const aliasDir = join(dirname(a.profile.dir), 'alias');
    const { symlink } = await import('node:fs/promises');
    await symlink(a.profile.dir, aliasDir, 'dir');
    const alias = await nativeProfileFixture(t, { home: a.context.home, name: 'alias' });
    assert.notEqual(a.context.dir, alias.context.dir);
    assert.equal(await realpath(a.context.dir), await realpath(alias.context.dir));
    const root = join(a.context.home, 'storages');
    const first = await mountStore(a, root); t.after(() => first.ctx.fiber.dispose());
    await first.store.write({ expectedRevision: 0, defaults: fixed('canonical-physical-profile'), workspaceOverrides: { opaque: fixed('alias-workspace') } });
    await first.ctx.fiber.dispose();
    const reopened = await mountStore(alias, root); t.after(() => reopened.ctx.fiber.dispose());
    assert.deepEqual(reopened.store.read(), { revision: 1, defaults: fixed('canonical-physical-profile'), workspaceOverrides: { opaque: fixed('alias-workspace') } });
    await reopened.ctx.fiber.dispose();
    const files = (await readdir(root)).filter(name => /^dsh_extras_compaction_[0-9a-f]{64}[.]json$/.test(name));
    assert.equal(files.length, 1, 'one real native profile has one qualified unit even through a native profile directory alias');
});
