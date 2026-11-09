import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { Context } from '@deepseek-ai/cordis';
import Storage from '@deepseek-ai/dsh-storage';
import * as Domain from '@deepseek-ai/dsh-storage-domain';
import * as Json from '@deepseek-ai/dsh-storage-json';
import * as chime from '../../src/modules/chime/index.ts';
import { loaderFixture, response } from '../integration/loader-harness.ts';
import { mountSharedCompactionRoutes } from '../../src/shared-compaction/routes.ts';
import { SettingsForms } from '@deepseek-ai/dsh-settings';
import ConfigEditor from '@deepseek-ai/dsh-config-editor';
test('two settings entries share owner-admitted CAS authority and reject bad origin before body handling', async (t) => {
    const f = await loaderFixture(t, { name: 'shared-route-fixture', moduleIds: ['chime'], modulePlugins: { chime } }, { modules: { chime: { enabled: false } }, migration: { auto: false } });
    await f.ready();
    await f.ctx.plugin(Storage).await();
    await f.ctx.plugin(Json, { root: f.profile + '/native-data' }).await();
    await f.ctx.plugin(Domain, { backend: 'json' }).await();
    const fork = f.ctx.plugin({ name: 'shared-form-test', apply(ctx: Context) { mountSharedCompactionRoutes(ctx, '/one'); mountSharedCompactionRoutes(ctx, '/one'); mountSharedCompactionRoutes(ctx, '/two'); } });
    await fork.await();
    const request = async (path: string, method = 'GET', headers: any = { host: f.host, cookie: f.ownerCookie }, body?: any) => { const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]) as any; req.method = method; req.headers = headers; const res = response(); await f.routes.get(path).handler(req, res); return res; };
    assert.equal((await request('/one', 'GET', { host: f.host })).code, 401);
    assert.equal((await request('/one', 'PUT', { host: f.host, cookie: f.ownerCookie, origin: 'http://evil.invalid' }, {})).code, 403);
    const a = JSON.parse((await request('/one')).body);
    assert.equal(a.revision, 0);
    const candidate = { expectedRevision: 0, defaults: { enabled: true, rules: [] }, workspaceOverrides: {} };
    assert.equal((await request('/one', 'PUT', undefined, candidate)).code, 200);
    assert.equal(JSON.parse((await request('/two')).body).revision, 1);
    assert.equal((await request('/two', 'PUT', undefined, candidate)).code, 409);
    assert.equal((await request('/one', 'PUT', undefined, { ...candidate, expectedRevision: 1, extra: true })).code, 400);
    await f.ctx.plugin(ConfigEditor).await();
    class ReadOnlySettings extends SettingsForms {
        override get writable() { return false; }
    }
    await f.ctx.plugin(ReadOnlySettings).await();
    assert.equal((await request('/one', 'PUT', undefined, { ...candidate, expectedRevision: 1 })).code, 403);
    assert.equal(JSON.parse((await request('/two')).body).revision, 1, 'read-only refusal does not persist');
    const peer = f.ctx.plugin({name: 'shared-form-peer', apply(ctx: Context) { mountSharedCompactionRoutes(ctx, '/one'); }});
    await peer.await();
    await fork.dispose();
    assert.equal(f.routes.has('/one'), true);
    assert.equal(f.routes.has('/two'), false);
    assert.equal((await request('/one')).code, 200, 'surviving participant retains the shared route');
    await peer.dispose();
    assert.equal(f.routes.has('/one'), false);
});
