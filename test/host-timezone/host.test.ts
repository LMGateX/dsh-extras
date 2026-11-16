import test from 'node:test';
import assert from 'node:assert/strict';
import { Context } from '@deepseek-ai/cordis';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as hostTimezone from '../../src/modules/host-timezone/index.ts';

const require = createRequire(import.meta.url);
const ids = ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'];

async function fixture(t: any, enabled = true, options: { missingAnchor?: boolean; configure?: (value: any) => void | Promise<void> } = {}) {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  const sources = new Map<string, string>();
  const paths = new Map<string, string>();
  for (const id of ids) {
    const path = join(dirname(require.resolve(id + '/package.json')), 'lib/client.js');
    paths.set(id, path); sources.set(id, await readFile(path, 'utf8'));
  }
  const targetUrl = 'plugins/??' + ids.map(id => id + '/client.js').join(',') + '&rev=native-v1';
  const foreignUrl = 'plugins/??unrelated/client.js&rev=foreign-v1';
  const graph = { rev: 'graph-v1', release: { version: '0.2.2-rc.3' }, entries: [
    ...ids.map(id => ({ id, url: targetUrl, rev: 'native-v1' })),
    { id: 'unrelated', url: foreignUrl, rev: 'foreign-v1' },
  ], batches: [ { phase: 'application', url: targetUrl, rev: 'native-v1', entries: [...ids] },
    { phase: 'application', url: foreignUrl, rev: 'foreign-v1', entries: ['unrelated'] } ] };
  const routes = new Map<string, any>();
  const fetches: string[] = [];
  const native = { graph: () => graph, clientPath: (id: string) => paths.get(id),
    async fetchBundle(request: Request) { fetches.push(request.url); return new Response([...sources.values()].join('\n;\n'), { headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=31536000, immutable' } }); } };
  routes.set('/plugins', {kind:'prefix', path:'/plugins', resource:(request:Request)=>native.fetchBundle(request)});
  ctx.reflect.provide('clientModules', native);
  if (!options.missingAnchor) ctx.reflect.provide('profileContext', { installAnchor: require.resolve('@deepseek-ai/dsh/package.json') });
  ctx.reflect.provide('webServer', { register(route: any) {
    if (routes.has(route.path)) throw new Error('duplicate route');
    routes.set(route.path, route); return () => { if (routes.get(route.path) === route) routes.delete(route.path); };
  } });
  ctx.on('webserver/index-inject' as any, ((table: any[]) => {
    table.push({ kind: 'global', name: '__DSH_BOOT__', value: graph },
      { kind: 'script-preload', src: targetUrl }, { kind: 'script-src', placement: 'head', src: foreignUrl });
  }) as any);
  await options.configure?.({ ctx, paths, sources, routes, graph, native });
  const raw = { enabled };
  const fiber = ctx.plugin({ name: hostTimezone.name, apply: hostTimezone.apply }, raw);
  await fiber.await();
  const table = () => { const rows: any[] = []; (ctx.emit as any)('webserver/index-inject', rows); return rows; };
  const request = (url: string, method = 'GET') => {
    const value = new URL(url, 'http://isolated.invalid/');
    const route = routes.get(value.pathname) ?? [...routes.values()].filter(row => row.kind === 'prefix' && value.pathname.startsWith(row.path + '/')).sort((a,b)=>b.path.length-a.path.length)[0];
    return route ? route.resource(new Request(value, { method })) as Promise<Response> : Promise.resolve(new Response(null, {status:404}));
  };
  return { ctx, fiber, raw, graph, targetUrl, foreignUrl, table, routes, native, paths, sources, fetches, request };
}

test('host-timezone is default-off and never installs resource or boot hooks while disabled', async t => {
  const ctx = new Context();
  t.after(() => ctx.fiber.dispose());
  const fiber = ctx.plugin({ name: hostTimezone.name, apply: hostTimezone.apply }, {});
  await fiber.await();
  const status = hostTimezone.runtimeStatus(fiber.ctx);
  assert.equal(status.capabilities.hostTimezone.phase, 'disabled');
  assert.equal(status.details.hostTimezone.status, 'disabled');
  const table: unknown[] = [];
  (ctx.emit as any)('webserver/index-inject', table);
  assert.deepEqual(table, []);
});

test('enabled plugin clones only target boot URLs and serves transformed bytes under owned no-store URLs', async t => {
  const f = await fixture(t);
  const original = structuredClone(f.graph);
  const rows = f.table();
  const boot = rows.find(row => row.name === '__DSH_BOOT__').value;
  assert.deepEqual(f.graph, original, 'native graph is never modified');
  assert.notEqual(boot.entries[0].url, f.targetUrl);
  assert.match(boot.entries[0].url, /^extras[/]host-timezone[/]/);
  assert.equal(boot.entries[2].url, f.foreignUrl);
  assert.equal(boot.batches[1].url, f.foreignUrl);
  assert.equal(rows.find(row => row.kind === 'script-preload').src, boot.batches[0].url);
  const response = await f.request(boot.entries[0].url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(response.headers.get('etag'));
  const body = await response.text();
  assert.notEqual(body, [...f.sources.values()].join('\n;\n'));
  assert.ok(!body.includes('function resolvedClientTimeZone(){const timeZone=new Intl.DateTimeFormat'));
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.status, 'needs-full-reload');
  assert.equal(f.fetches.length, 1);
});

test('native target reload URLs fail closed while unrelated native combos stay untouched', async t => {
  const f = await fixture(t);
  const rows = f.table();
  const protectedUrl = rows.find(row=>row.name==='__DSH_BOOT__').value.batches[0].url;
  assert.equal((await f.request(protectedUrl)).status, 200);
  const native = await f.request(f.targetUrl);
  assert.equal(native.status, 503, 'HMR native graph/rebuilt cannot reload the raw browser sampler');
  assert.equal(native.headers.get('cache-control'), 'no-store');
  const unrelated = await f.request(f.foreignUrl);
  assert.equal(unrelated.status, 200);
  assert.equal(unrelated.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('disable owns cleanup and stale asynchronous failures cannot revive unavailable status', async t => {
  const f = await fixture(t);
  const url = f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  let enter!:()=>void; let release!:(response:Response)=>void;
  const entered = new Promise<void>(resolve=>{enter=resolve});
  f.native.fetchBundle = async()=>{enter(); return new Promise<Response>(resolve=>{release=resolve});};
  const pending = f.request(url); await entered;
  f.raw.enabled=false; await (f.ctx.parallel as any)('loader/volatile-update');
  assert.equal(f.routes.has('/extras/host-timezone'), false);
  assert.equal(f.routes.has('/plugins/'), false);
  release(new Response('changed unknown body', {headers:{'content-type':'text/javascript'}}));
  assert.equal((await pending).status, 503);
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase, 'disabled');
  assert.equal((await f.request(url)).status, 404);
  f.raw.enabled=true; await (f.ctx.parallel as any)('loader/volatile-update');
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.status, 'needs-full-reload');
  const next=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  assert.notEqual(next,url,'a new enable lifetime cannot reuse an owned URL');
  await f.fiber.dispose();
  assert.equal(f.routes.has('/plugins/'),false);
  assert.equal(f.routes.has('/plugins'),true,'native owner is never removed');
});

test('a supported target artifact does not authorize an unverified native host anchor', async t => {
  const f = await fixture(t, true, {missingAnchor:true});
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase, 'unavailable');
  assert.equal(f.routes.has('/extras/host-timezone'), false);
});

for (const conflictPath of ['/extras/host-timezone', '/plugins/']) test('route conflict rolls back only owned registrations: ' + conflictPath, async t => {
  const foreign = { kind: 'exact', path: conflictPath, resource: async()=>new Response('foreign') };
  const f = await fixture(t, true, { configure: ({routes}: any)=>{ routes.set(conflictPath,foreign); } });
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal(f.routes.get(conflictPath),foreign);
  if(conflictPath==='/plugins/') assert.equal(f.routes.has('/extras/host-timezone'),false,'first registration is rolled back after second conflicts');
  await f.fiber.dispose();
  assert.equal(f.routes.get(conflictPath),foreign,'unload never deletes a foreign owner');
});

test('an unknown response byte outside the sampler never passes the full artifact proof', async t => {
  const f=await fixture(t);
  const url=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  const source=f.sources.get(ids[0]!)!;
  assert.ok(source.includes('function historyEntries'));
  f.sources.set(ids[0]!,source.replace('function historyEntries','function changedEntries'));
  assert.equal((await f.request(url)).status,503);
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
});

test('unknown package source bytes never mount the adapter even with the expected name and version', async t => {
  const root=await mkdtemp(join(tmpdir(),'host-zone-unknown-'));
  assert.equal(dirname(root),tmpdir());
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'lib'));
  const path=join(root,'lib/client.js');
  const f=await fixture(t,true,{configure:async({paths,sources}:any)=>{
    await writeFile(join(root,'package.json'),JSON.stringify({name:ids[0],version:'0.2.2-rc.3'}));
    await writeFile(path,sources.get(ids[0])+'\n// unknown build\n');
    paths.set(ids[0],path);
  }});
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal(f.routes.has('/extras/host-timezone'),false);
  assert.equal(f.table().find(row=>row.name==='__DSH_BOOT__').value,f.graph);
});

test('unavailable host zone refuses protection without a browser or query fallback', async t => {
  t.mock.method(Intl,'DateTimeFormat',function(){return {resolvedOptions(){return {timeZone:undefined};}}} as any);
  const f=await fixture(t);
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal(f.routes.has('/extras/host-timezone'),false);
});

test('owned resource paths reject unknown epochs, query zone selectors, wrong methods, and return HEAD without a body', async t => {
  const f=await fixture(t);
  const url=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  assert.equal((await f.request(url+'?timeZone=Asia/Tokyo')).status,404);
  assert.equal((await f.request(url.replace(/[a-f0-9]{64}/,'0'.repeat(64)))).status,404);
  assert.equal((await f.request(url,'POST')).status,405);
  const head=await f.request(url,'HEAD');
  assert.equal(head.status,200);assert.equal(await head.text(),'');
});

test('unknown graph versions and unsafe advertised target resources never report serving-ready', async t => {
  const f=await fixture(t);
  f.graph.release.version='next-unknown';
  assert.throws(()=>f.table(),/protected boot unavailable/);
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
});


test('a host zone change rejects the prior owned generation and never accepts a query override', async t => {
  const previous = process.env.TZ;
  t.after(()=>{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;});
  process.env.TZ='UTC';
  const f=await fixture(t);
  const url=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  assert.equal((await f.request(url)).status,200);
  process.env.TZ='Pacific/Honolulu';
  const rejected=await f.request(url);
  assert.equal(rejected.status,503);
  assert.equal(rejected.headers.get('cache-control'),'no-store');
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal((await f.request(url+'?timeZone=UTC')).status,404);
});

test('unknown boot scheduling phases do not inherit support from pinned target bytes', async t => {
  const f=await fixture(t,true,{configure:({graph}:any)=>{graph.batches[0].phase='unknown-future-phase';}});
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal(f.routes.has('/extras/host-timezone'),false);
});
