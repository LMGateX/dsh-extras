import test from 'node:test';
import assert from 'node:assert/strict';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime, { type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm';
import { participateCompaction } from '../../src/shared-compaction/index.ts';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import Storage from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
const policy = (effort: string) => ({ enabled: true, rules: [{ scope: 'all' as const, mode: 'fixed' as const, effort }] });
test('native participants elect compact first regardless of arrival and transfer without duplicate dispatch', async (t) => {
    const ctx = new Context();
    t.after(() => ctx.fiber.dispose());
    await ctx.plugin(LlmRuntime).await();
    const seen: GenerateOptions[] = [];
    ctx.on('llm/stream', options => { seen.push(options); return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })(); }, { global: true });
    const raw = (ctx.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
    const before = Object.getOwnPropertyDescriptor(raw, 'stream');
    let model: any, compact: any;
    const one = participateCompaction(ctx, { module: 'model-policy', policy: policy('model') }, s => model = s);
    const two = participateCompaction(ctx, { module: 'compact-context', policy: policy('compact') }, s => compact = s);
    assert.equal(model.phase, 'standby', JSON.stringify(model));
    assert.equal(model.executor, 'compact-context');
    assert.equal(compact.phase, 'active');
    const req = { provider: 'route', model: 'model', messages: [], purpose: 'compaction' } as GenerateOptions;
    const captured = ctx.llm.stream(req);
    two.dispose();
    for await (const _ of captured) { }
    ;
    for await (const _ of ctx.llm.stream(req)) { }
    ;
    assert.deepEqual(seen.map(o => o.reasoningEffort), ['compact', 'model']);
    assert.equal(model.phase, 'active');
    one.dispose();
    assert.deepEqual(Object.getOwnPropertyDescriptor(raw, 'stream'), before);
});
test('foreign stream ownership blocks standby transfer without stacking or stale modifiers', async (t) => {
    const ctx = new Context();
    t.after(() => ctx.fiber.dispose());
    await ctx.plugin(LlmRuntime).await();
    const seen: GenerateOptions[] = [];
    ctx.on('llm/stream', options => { seen.push(options); return (async function* () { yield { type: 'finish', reason: { kind: 'stop' } } as StreamChunk; })(); });
    let ms: any, cs: any;
    const one = participateCompaction(ctx, { module: 'model-policy', policy: policy('model') }, s => ms = s);
    const raw = (ctx.llm as unknown as Record<symbol, unknown>)[symbols.original] as LlmRuntime;
    const owned = raw.stream;
    const foreign = function (this: LlmRuntime, options: GenerateOptions) { return Reflect.apply(owned, this, [options]); };
    Object.defineProperty(raw, 'stream', { value: foreign, writable: true, configurable: true });
    const two = participateCompaction(ctx, { module: 'compact-context', policy: policy('compact') }, s => cs = s);
    assert.equal(cs.phase, 'unavailable');
    assert.equal(ms.phase, 'unavailable');
    assert.equal(raw.stream, foreign);
    const req = { provider: 'route', model: 'model', messages: [], purpose: 'compaction' } as GenerateOptions;
    for await (const _ of ctx.llm.stream(req)) { }
    ;
    assert.equal(seen[0], req);
    assert.equal(seen.length, 1);
    two.dispose();
    one.dispose();
    assert.equal(raw.stream, foreign);
    Reflect.deleteProperty(raw, 'stream');
});
test('independently bundled standalone copies share profile CAS and one executor across reload', async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'compaction-bundles-'));
    const modules = resolve('node_modules');
    // Bundle each consumer independently; host dependencies remain external, exactly as release builds.
    for (const entry of ['compact', 'model'])
        await build({ entryPoints: [resolve('src/shared-compaction/index.ts')], outfile: join(dir, entry + '.mjs'), bundle: true, platform: 'node', format: 'esm', packages: 'external', banner: { js: 'import {createRequire as bundleRequire} from "node:module"; const require=bundleRequire(' + JSON.stringify(resolve('package.json')) + ');'
            } });
    // ESM resolution also needs an explicit link to this dedicated worktree's disposable install.
    const { symlink } = await import('node:fs/promises');
    await symlink(modules, join(dir, 'node_modules'), 'dir');
    const compact = await import(pathToFileURL(join(dir, 'compact.mjs')).href), model = await import(pathToFileURL(join(dir, 'model.mjs')).href);
    const data = join(dir, 'profile-data');
    const mount = async () => { const ctx = new Context(); await ctx.plugin(LlmRuntime).await(); await ctx.plugin(Storage).await(); await ctx.plugin(Json, { root: data }).await(); await ctx.plugin(Domain, { backend: 'json' }).await(); return ctx; };
    const ctx = await mount();
    t.after(() => ctx.fiber.dispose());
    const a = await compact.openSharedCompactionStore(ctx), b = await model.openSharedCompactionStore(ctx);
    const written = await Promise.allSettled([a.write({ expectedRevision: 0, defaults: policy('canonical'), workspaceOverrides: {} }), b.write({ expectedRevision: 0, defaults: policy('racing'), workspaceOverrides: {} })]);
    assert.deepEqual(written.map(x => x.status), ['fulfilled', 'rejected']);
    let ms: any, cs: any;
    const one = model.participateCompaction(ctx, { module: 'model-policy', policy: policy('ignored') }, (s: any) => ms = s);
    await one.ready;
    const two = compact.participateCompaction(ctx, { module: 'compact-context', policy: policy('ignored') }, (s: any) => cs = s);
    await two.ready;
    assert.equal(cs.phase, 'active');
    assert.equal(ms.phase, 'standby');
    assert.equal(ms.revision, 1);
    two.dispose();
    assert.equal(ms.phase, 'active');
    one.dispose();
    await ctx.fiber.dispose();
    const restarted = await mount();
    t.after(() => restarted.fiber.dispose());
    const persisted = await model.openSharedCompactionStore(restarted);
    assert.equal(persisted.read().revision, 1);
    assert.equal(persisted.read().defaults.rules[0].effort, 'canonical');
});
