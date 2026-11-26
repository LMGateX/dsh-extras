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

async function fixture(t: any, enabled = true, options: { missingAnchor?: boolean; configure?: (value: any) => void | Promise<void>; overrideBoot?: (value: any) => any } = {}) {
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
  const graph = { rev: 'graph-v1', release: { version: '0.2.3-alpha.2' }, entries: [
    ...ids.map(id => ({ id, url: targetUrl, rev: 'native-v1' })),
    { id: 'unrelated', url: foreignUrl, rev: 'foreign-v1' },
  ], batches: [ { phase: 'application', url: targetUrl, rev: 'native-v1', entries: [...ids] },
    { phase: 'application', url: foreignUrl, rev: 'foreign-v1', entries: ['unrelated'] } ] };
  const routes = new Map<string, any>();
  const fetches: string[] = [];
  const graphListeners = new Set<() => void>();
  const rebuildListeners = new Set<(id: string, rev: string) => void>();
  const native = { graph: () => graph,
    graphFor: (principal?: { kind: string }) => principal?.kind === 'owner' || !principal ? graph : {
      ...graph, entries: graph.entries.map(row => ({ ...row, config: { preference: 'default' } })),
    },
    clientPath: (id: string) => paths.get(id),
    onGraphChanged(listener: () => void) { graphListeners.add(listener); return () => { graphListeners.delete(listener); }; },
    onRebuilt(listener: (id: string, rev: string) => void) { rebuildListeners.add(listener); return () => { rebuildListeners.delete(listener); }; },
    async fetchBundle(request: Request) { fetches.push(request.url); return new Response([...sources.values()].join('\n;\n'), { headers: { 'content-type': 'text/javascript', 'cache-control': 'public, max-age=31536000, immutable' } }); } };
  routes.set('/plugins', {kind:'prefix', path:'/plugins', resource:(request:Request)=>native.fetchBundle(request)});
  ctx.reflect.provide('clientModules', native);
  if (!options.missingAnchor) ctx.reflect.provide('profileContext', { installAnchor: require.resolve('@deepseek-ai/dsh/package.json') });
  ctx.reflect.provide('webServer', { register(route: any) {
    if (routes.has(route.path)) throw new Error('duplicate route');
    routes.set(route.path, route); return () => { if (routes.get(route.path) === route) routes.delete(route.path); };
  } });
  ctx.on('webserver/index-inject' as any, ((table: any[], peer: { principal: { kind: string } }) => {
    const projected = native.graphFor(peer.principal);
    table.push({ kind: 'global', name: '__DSH_BOOT__', value: options.overrideBoot ? options.overrideBoot(projected) : projected },
      { kind: 'script-preload', src: targetUrl }, { kind: 'script-src', placement: 'head', src: foreignUrl });
  }) as any);
  await options.configure?.({ ctx, paths, sources, routes, graph, native });
  const raw = { enabled };
  const fiber = ctx.plugin({ name: hostTimezone.name, apply: hostTimezone.apply }, raw);
  await fiber.await();
  const table = (kind = 'owner') => { const rows: any[] = []; (ctx.emit as any)('webserver/index-inject', rows, { principal: { kind } }); return rows; };
  const request = (url: string, method = 'GET') => {
    const value = new URL(url, 'http://isolated.invalid/');
    const route = routes.get(value.pathname) ?? [...routes.values()].filter(row => row.kind === 'prefix' && value.pathname.startsWith(row.path + '/')).sort((a,b)=>b.path.length-a.path.length)[0];
    return route ? route.resource(new Request(value, { method })) as Promise<Response> : Promise.resolve(new Response(null, {status:404}));
  };
  const graphChanged=()=>{for(const listener of [...graphListeners])listener();};
  const rebuilt=(id:string,rev="same-rev")=>{for(const listener of [...rebuildListeners])listener(id,rev);};
  return { ctx, fiber, raw, graph, targetUrl, foreignUrl, table, routes, native, paths, sources, fetches, request, graphChanged, rebuilt, graphListeners, rebuildListeners };
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

test('peer-projected boot keeps the native peer defaults and only retargets owned resource URLs', async t => {
  const f = await fixture(t, true, { configure: ({ graph }) => {
    graph.entries[0].config = { preference: 'owner-private' };
    graph.entries[2].config = { preference: 'unrelated-owner-private' };
  } });
  const ownerBoot = f.table().find(row => row.name === '__DSH_BOOT__').value;
  const peerTable = f.table('member');
  const peerBoot = peerTable.find(row => row.name === '__DSH_BOOT__').value;
  assert.equal(ownerBoot.entries[0].config.preference, 'owner-private');
  assert.equal(peerBoot.entries[0].config.preference, 'default');
  assert.equal(peerBoot.entries[2].config.preference, 'default');
  assert.doesNotMatch(JSON.stringify(peerTable), /owner-private/);
  assert.equal(peerBoot.entries[0].url, ownerBoot.entries[0].url);
  assert.equal(peerBoot.entries[2].url, f.foreignUrl);
  assert.equal(f.graph.entries[0].url, f.targetUrl);
  assert.equal((await f.request(peerBoot.entries[0].url)).status, 200);
});

test('a peer boot row altered outside the native projection is not rewritten or authorized', async t => {
  let tamper = false;
  const f = await fixture(t, true, { overrideBoot: projection => {
    if (!tamper) return projection;
    const changed = structuredClone(projection);
    changed.entries[2].config = { preference: 'foreign' };
    return changed;
  } });
  const proofUrl = f.table('member').find(row => row.name === '__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value.proofUrl;
  tamper = true;
  assert.throws(() => f.table('member'), /protected boot unavailable/);
  assert.equal((await f.request(proofUrl)).status, 503);
});

test('native target reload URLs fail closed while unrelated native combos stay untouched', async t => {
  const f = await fixture(t);
  const rows = f.table();
  const protectedUrl = rows.find(row=>row.name==='__DSH_BOOT__').value.batches[0].url;
  assert.equal((await f.request(protectedUrl)).status, 200);
  assert.equal(f.routes.get('/plugins/').auth, 'anonymous', 'exact guard preserves the native bundle route admission');
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
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.failureStage,'native-response-fingerprint','a bounded native-only reason identifies the failing verification stage');
});

test('unknown package source bytes never mount the adapter even with the expected name and version', async t => {
  const root=await mkdtemp(join(tmpdir(),'host-zone-unknown-'));
  assert.equal(dirname(root),tmpdir());
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'lib'));
  const path=join(root,'lib/client.js');
  const f=await fixture(t,true,{configure:async({paths,sources}:any)=>{
    await writeFile(join(root,'package.json'),JSON.stringify({name:ids[0],version:'0.2.3-alpha.2'}));
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

test('protected boot publishes a generation-bound no-store proof with no zone selector', async t => {
  const f=await fixture(t);
  const rows=f.table();
  const page=rows.find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__')?.value;
  assert.ok(page,'protected page has explicit source proof metadata');
  assert.equal(page.protocol,'dsh-extras.host-timezone.v1');
  assert.deepEqual(page.targets,ids);
  assert.match(page.proofUrl,/^extras[/]host-timezone[/][^/]+[/]proof$/);
  assert.ok(!page.proofUrl.startsWith('/'),'proof resolves beneath the served document mount');
  const proof=await f.request(page.proofUrl);
  assert.equal(proof.status,204);
  assert.equal(proof.headers.get('cache-control'),'no-store');
  assert.equal(await proof.text(),'');
  assert.equal((await f.request(page.proofUrl+'?timeZone=UTC')).status,404);
  assert.equal((await f.request(page.proofUrl,'POST')).status,405);
  assert.equal((await f.request(page.proofUrl.replace(page.epoch,'foreign-epoch'))).status,404);
});

test('fresh index synchronously rebuilds pinned source for a changed host zone and retires old proofs', async t => {
  const previous=process.env.TZ;
  t.after(()=>{ if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous; });
  process.env.TZ='Asia/Singapore';
  const f=await fixture(t);
  const oldRows=f.table();
  const oldPage=oldRows.find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  assert.equal((await f.request(oldPage.proofUrl)).status,204);
  assert.equal(f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value.epoch,oldPage.epoch,'unchanged index does not retire other tabs');
  process.env.TZ='America/Los_Angeles';
  assert.equal((await f.request(oldPage.proofUrl)).status,503);
  const newRows=f.table();
  const page=newRows.find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  assert.notEqual(page.epoch,oldPage.epoch);
  assert.equal((await f.request(oldPage.proofUrl)).status,404);
  assert.equal((await f.request(page.proofUrl)).status,204);
  const response=await f.request(newRows.find(row=>row.name==='__DSH_BOOT__').value.batches[0].url);
  assert.equal(response.status,200);
  const body=await response.text();
  assert.ok(body.includes('function resolvedClientTimeZone(){return "America/Los_Angeles"}'));
  assert.equal(body.split('"epoch":"'+page.epoch+'"').length-1,2,'both transformed target markers use the new page epoch');
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.timeZone,'America/Los_Angeles');
});

test('target rebuild and remove/readd rotate source nonces even with the same native revision', async t => {
  const f=await fixture(t);
  const page=()=>f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  const first=page();
  f.rebuilt('unrelated');
  assert.equal((await f.request(first.proofUrl)).status,204,'unrelated rebuilt cannot revoke protected sources');
  f.graphChanged();
  assert.equal((await f.request(first.proofUrl)).status,204,'same graph advertisement does not revoke unchanged sources');
  f.graph.rev = 'graph-config-update';
  Object.assign(f.graph.entries[0]!, { config: { preference: 'changed' } });
  f.graphChanged();
  assert.equal(page().epoch, first.epoch, 'alpha.2 config-only graph publication does not rotate a target source');
  assert.equal((await f.request(first.proofUrl)).status, 204);
  f.rebuilt(ids[0]!);
  assert.notEqual((await f.request(first.proofUrl)).status,204,'same-revision target rebuild must revoke the prior source nonce');
  const second=page();
  assert.notEqual(second.epoch,first.epoch);
  const original=structuredClone(f.graph);
  f.graph.entries.splice(0,2);
  f.graph.batches.splice(0,1);
  f.graphChanged();
  assert.notEqual((await f.request(second.proofUrl)).status,204);
  Object.assign(f.graph,original);
  f.graphChanged();
  const third=page();
  assert.notEqual(third.epoch,second.epoch);
  assert.notEqual(third.epoch,first.epoch);
  assert.equal((await f.request(second.proofUrl)).status,404);
  assert.equal((await f.request(third.proofUrl)).status,204);
  assert.equal(f.graphListeners.size,1);
  assert.equal(f.rebuildListeners.size,1);
  f.raw.enabled=false;
  await (f.ctx.emit as any)('loader/volatile-update',[]);
  assert.equal(f.graphListeners.size,0);
  assert.equal(f.rebuildListeners.size,0);
  assert.equal((await f.request(third.proofUrl)).status,404);
});

test('native rendered page proof metadata remains readonly and frozen in the browser realm', async t => {
  const f=await fixture(t);
  const {stripTypeScriptTypes}=await import('node:module');
  const {runInNewContext}=await import('node:vm');
  const rendererPath=join(dirname(require.resolve('@deepseek-ai/dsh-host-webserver/package.json')),'src/injections.ts');
  const renderer=stripTypeScriptTypes(await readFile(rendererPath,'utf8'));
  const {renderIndexInjections}=await import('data:text/javascript;base64,'+Buffer.from(renderer).toString('base64'));
  const rows=f.table().filter(row=>row.kind!=='script-src'&&row.kind!=='script-preload');
  const html=renderIndexInjections('<html><head></head><body></body></html>',rows);
  const realm:any={};
  for(const script of html.split('<script>').slice(1)) runInNewContext(script.split('</script>')[0]!,realm);
  const descriptor=Object.getOwnPropertyDescriptor(realm,'__DSH_EXTRAS_HOST_TIMEZONE_PAGE__')!;
  assert.equal(descriptor.writable,false);
  assert.equal(descriptor.configurable,false);
  assert.equal(Object.isFrozen(descriptor.value),true);
  assert.equal(Object.isFrozen(descriptor.value.targets),true);
});

test('proof approval cannot outlive an asynchronous source-generation replacement', async t => {
  const f=await fixture(t);
  const before=f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  const pending=f.request(before.proofUrl);
  f.rebuilt(ids[0]!);
  assert.equal((await pending).status,503,'proof captured the old generation before native manifest awaits');
  const after=f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  assert.equal((await f.request(after.proofUrl)).status,204);
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.status,'needs-full-reload','stale catch cannot poison the new generation');
});

for(const hold of ['fetch','body'] as const)test('resource identity fence rejects generation replacement during native '+hold+' await',async t=>{
  const f=await fixture(t);
  const before=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  const nativeFetch=f.native.fetchBundle.bind(f.native);
  let enter!:()=>void;
  let resume!:()=>void;
  const entered=new Promise<void>(resolve=>{enter=resolve;});
  const resumed=new Promise<void>(resolve=>{resume=resolve;});
  const body=[...f.sources.values()].join('\n;\n');
  f.native.fetchBundle=async()=>{
    if(hold==='fetch'){enter();await resumed;}
    const response=new Response(body,{headers:{'content-type':'text/javascript'}});
    if(hold==='body')response.text=async()=>{enter();await resumed;return body;};
    return response;
  };
  const pending=f.request(before);
  await entered;
  f.rebuilt(ids[0]!);
  resume();
  assert.equal((await pending).status,503);
  assert.equal((await f.request(before)).status,404);
  f.native.fetchBundle=nativeFetch;
  const after=f.table().find(row=>row.name==='__DSH_BOOT__').value.entries[0].url;
  assert.equal((await f.request(after)).status,200);
});

test('proof revalidates target bytes and versions on disk instead of trusting cached preparation',async t=>{
  const root=await mkdtemp(join(tmpdir(),'host-zone-proof-'));
  assert.equal(dirname(root),tmpdir());
  t.after(()=>rm(root,{recursive:true,force:true}));
  await mkdir(join(root,'lib'));
  const path=join(root,'lib/client.js');
  const manifest=join(root,'package.json');
  const f=await fixture(t,true,{configure:async({paths,sources}:any)=>{
    await writeFile(manifest,JSON.stringify({name:ids[0],version:'0.2.3-alpha.2'}));
    await writeFile(path,sources.get(ids[0]));
    paths.set(ids[0],path);
  }});
  const page=f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
  assert.equal((await f.request(page.proofUrl)).status,204);
  await writeFile(path,f.sources.get(ids[0]!)+'\n// changed bytes\n');
  assert.equal((await f.request(page.proofUrl)).status,503);
  await writeFile(path,f.sources.get(ids[0]!)!);
  await writeFile(manifest,JSON.stringify({name:ids[0],version:'0.2.2-rc.3'}));
  assert.equal((await f.request(page.proofUrl)).status,503);
  await writeFile(manifest,JSON.stringify({name:ids[0],version:'0.2.2-rc.99'}));
  assert.equal((await f.request(page.proofUrl)).status,503);
});

test('unsupported native lifecycle seam refuses serving rather than retaining unrevokable proofs',async t=>{
  const f=await fixture(t,true,{configure:({native}:any)=>{native.onGraphChanged=undefined;}});
  assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
  assert.equal(f.routes.has('/extras/host-timezone'),false);
});

for(const phase of ['mount','proof'] as const)test('connection package pin rejects unsupported native rpc implementation at '+phase,async t=>{
  const root=await mkdtemp(join(tmpdir(),'host-zone-connection-pin-'));
  assert.equal(dirname(root),tmpdir());
  t.after(()=>rm(root,{recursive:true,force:true}));
  const packages=['dsh','dsh-client-modules','dsh-host-webserver','dsh-client-connection'];
  for(const name of packages){
    const directory=join(root,'node_modules/@deepseek-ai',name);
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'package.json'),JSON.stringify({name:'@deepseek-ai/'+name,version:name==='dsh-client-connection'&&phase==='mount'?'0.2.2-rc.99':'0.2.3-alpha.2'}));
  }
  const connectionLib=join(root,'node_modules/@deepseek-ai/dsh-client-connection/lib');
  await mkdir(connectionLib);
  await writeFile(join(connectionLib,'client.browser.js'),await readFile(join(dirname(require.resolve('@deepseek-ai/dsh-client-connection/package.json')),'lib/client.browser.js')));
  const f=await fixture(t,true,{configure:({ctx}:any)=>{ctx.get('profileContext').installAnchor=join(root,'entry.js');}});
  if(phase==='mount'){
    assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable');
    assert.equal(f.routes.has('/extras/host-timezone'),false);
  }else{
    const page=f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
    assert.equal((await f.request(page.proofUrl)).status,204);
    await writeFile(join(root,'node_modules/@deepseek-ai/dsh-client-connection/package.json'),JSON.stringify({name:'@deepseek-ai/dsh-client-connection',version:'0.2.2-rc.99'}));
    assert.equal((await f.request(page.proofUrl)).status,503);
  }
});

test('owned multi-plugin native combo transforms target markers without rejecting an unrelated shared export suffix',async t=>{
  const thirdId='@deepseek-ai/dsh-client-ui-renderer';
  const thirdPath=join(dirname(require.resolve(thirdId+'/package.json')),'lib/client.js');
  const thirdSource=await readFile(thirdPath,'utf8');
  const generic='exports.apply=apply;exports.inject=inject;return module.exports';
  assert.ok(thirdSource.includes(generic),'real third native factory shares the formerly ambiguous suffix');
  const f=await fixture(t,true,{configure:({graph,sources}:any)=>{
    const all=[...ids,thirdId];
    const url='plugins/??'+all.map(id=>id+'/client.js').join(',')+'&rev=native-v1';
    graph.entries=all.map(id=>({id,url,rev:'native-v1'}));
    graph.batches=[{phase:'application',url,rev:'native-v1',entries:all}];
    sources.set(thirdId,thirdSource);
  }});
  const rows=f.table();
  const response=await f.request(rows.find(row=>row.name==='__DSH_BOOT__').value.batches[0].url);
  assert.equal(response.status,200,'a real unrelated factory cannot make a target-only transform reject the whole native combo');
  const body=await response.text();
  const thirdBody=thirdSource.slice(0,thirdSource.lastIndexOf('//# sourceMappingURL=')).trimEnd();
  assert.ok(body.includes(thirdBody),'unrelated native factory bytes stay untouched');
  assert.equal(body.split('__dshExtrasHostTimezoneSource').length-1,2,'only target factories receive markers');
  assert.equal(body.split(generic).length-1,1,'unrelated generic native export suffix remains unchanged');
});

for(const phase of ['mount','proof'] as const)for(const corruption of ['missing','changed'] as const)test('connection raw bytes pin rejects '+corruption+' browser artifact at '+phase,async t=>{
  const root=await mkdtemp(join(tmpdir(),'host-zone-connection-bytes-'));
  assert.equal(dirname(root),tmpdir());
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const name of ['dsh','dsh-client-modules','dsh-host-webserver','dsh-client-connection']){
    const directory=join(root,'node_modules/@deepseek-ai',name);
    await mkdir(directory,{recursive:true});
    await writeFile(join(directory,'package.json'),JSON.stringify({name:'@deepseek-ai/'+name,version:'0.2.3-alpha.2'}));
  }
  const lib=join(root,'node_modules/@deepseek-ai/dsh-client-connection/lib');
  await mkdir(lib);
  const path=join(lib,'client.browser.js');
  const native=await readFile(join(dirname(require.resolve('@deepseek-ai/dsh-client-connection/package.json')),'lib/client.browser.js'));
  const changed=Buffer.concat([native,Buffer.from('\n// non-stock closed-over support bytes\n')]);
  if(phase==='proof'||corruption==='changed')await writeFile(path,phase==='mount'?changed:native);
  const f=await fixture(t,true,{configure:({ctx}:any)=>{ctx.get('profileContext').installAnchor=join(root,'entry.js');}});
  if(phase==='mount'){
    assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).capabilities.hostTimezone.phase,'unavailable','valid workspace bytes must not hide an unsupported installAnchor artifact');
    assert.equal(f.routes.has('/extras/host-timezone'),false);
  }else{
    const page=f.table().find(row=>row.name==='__DSH_EXTRAS_HOST_TIMEZONE_PAGE__').value;
    assert.equal((await f.request(page.proofUrl)).status,204);
    if(corruption==='missing'){
      assert.equal(dirname(path),lib);
      await rm(path);
    }else await writeFile(path,changed);
    assert.equal((await f.request(page.proofUrl)).status,503,'every proof revalidates the untransformed connection support bytes');
    assert.equal(hostTimezone.runtimeStatus(f.fiber.ctx).details.hostTimezone.failureStage,'host-and-artifact-verification');
  }
});
