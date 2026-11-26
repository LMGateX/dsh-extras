import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { createHostTimezoneAdapter } from '../../client/host-timezone.ts';

const consumer = createRequire(import.meta.url);
const runtime = createRequire(process.env.DSH_RUNTIME_ROOT ? join(process.env.DSH_RUNTIME_ROOT, 'package.json') : consumer.resolve('@deepseek-ai/dsh/package.json'));
const nativeConnectionSource = readFileSync(join(dirname(runtime.resolve('@deepseek-ai/dsh-client-connection/package.json')), 'lib/client.browser.js'), 'utf8');
let nativeConnectionApi: any;
vm.runInThisContext('(window=>{' + nativeConnectionSource + '\n})')({ __ModuleLoader__: { load(spec: any) { nativeConnectionApi = spec.factory(() => { throw new Error('unexpected native dependency'); }); } } });
function installStockConnection(): any {
  let connection: any;
  nativeConnectionApi.installConnection({ provide(name: string, value: unknown) { assert.equal(name, 'connection'); connection = value; } }, { location: { hostname: 'localhost' } });
  return connection;
}

const PAGE = '__DSH_EXTRAS_HOST_TIMEZONE_PAGE__';
const LATCH = '__DSH_EXTRAS_HOST_TIMEZONE_GUARD_V1__';
const ids = ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'];
function observable<T>(initial: T) {
  let value = initial; const listeners = new Set<() => void>();
  return { getSnapshot: () => value, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    set(next: T) { value = next; for (const fn of [...listeners]) fn(); }, listeners };
}
function fixture(protectedPage = true, initialEnabled: boolean | undefined = true, nativeHandle?: any, beforeMount?: (services: Record<string, any>) => void) {
  Reflect.deleteProperty(globalThis, LATCH); Reflect.deleteProperty(globalThis, PAGE);
  const previousFetch = globalThis.fetch;
  const proof = { protocol: 'dsh-extras.host-timezone.v1', epoch: 'epoch-a', proofUrl: 'extras/host-timezone/epoch-a/proof', targets: ids };
  if (protectedPage) Reflect.set(globalThis, PAGE, proof);
  const generation = observable<any>(undefined); const state = observable<any>(undefined);
  const entries = observable({ syncing: false, failures: [] as { id: string; message: string }[] });
  const records = new Map(ids.map(id => {
    const exports = {}; Object.defineProperty(exports, '__dshExtrasHostTimezoneSource', { value: Object.freeze({ protocol: proof.protocol, epoch: proof.epoch }) });
    return [id, { id, ownerId: id, exports, edges: new Set() }];
  }));
  const calls: unknown[][] = [];
  const connection = nativeHandle ?? installStockConnection();
  const originalCall = connection.rpc.call;
  connection.generation = generation; connection.state = state;
  const modules = { version: 'client', manifest: { release: { version: '0.2.3-alpha.2' }, modules: ids.map(id => ({ id, rev: 'same' })) }, entries: { state: entries }, loadCache: records };
  const services: Record<string, unknown> = { connection, modules, sessions: {} };
  let intentSubscriptions = 0;
  let enabled: boolean | undefined = initialEnabled; const intentListeners = new Set<() => void>(); const effects: (() => unknown)[] = [];
  const ctx = { get: (key: string) => services[key], effect(fn: () => (() => unknown)) { const off = fn(); effects.push(off); return off; },
    inject(_deps: unknown, fn: Function) { fn(ctx); return { dispose() { for (const off of effects.splice(0).reverse()) off(); } }; } };
  const proofRequests: { input: unknown; init?: RequestInit }[] = [];
  const acceptFetch = (async (input: unknown, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const message = JSON.parse(String(init.body)); calls.push([input, '/api', message.method, message.payload, init.signal]);
      return Response.json({ type: 'server-response', rpcId: message.rpcId, result: { ok: true, value: 'accepted' } });
    }
    proofRequests.push({ input, init }); return new Response(null, { status: 204 });
  }) as typeof fetch;
  globalThis.fetch = acceptFetch;
  const React = { createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props, children }), useSyncExternalStore: (_subscribe: unknown, read: Function) => read() };
  const adapter = createHostTimezoneAdapter(React);
  beforeMount?.(services);
  const off = adapter.mount(ctx, { rowId: 'dsh-extras', enabled: () => enabled, subscribe(fn) { intentSubscriptions++; intentListeners.add(fn); return () => { intentListeners.delete(fn); }; } });
  const View = adapter.createView(ctx) as () => any;
  return { connection, modules, generation, state, records, entries, calls, originalCall, proofRequests, services, ctx, adapter, off, acceptFetch,
    phase: () => View().props['data-host-timezone-phase'],
    intentSubscriptions: () => intentSubscriptions,
    setEnabled(next: boolean | undefined) { enabled = next; for (const fn of intentListeners) fn(); },
    async ready() { state.set('connected'); generation.set({ id: 1, host: { home: '/irrelevant' } }); await new Promise(resolve => setImmediate(resolve)); },
    close() { off(); globalThis.fetch = previousFetch; Reflect.deleteProperty(globalThis, LATCH); Reflect.deleteProperty(globalThis, PAGE); } };
}

test('protected page admits unchanged requests only after same-generation proof, including connected-before-generation warmup', async () => {
  const h = fixture(); try {
    h.state.set('connected');
    await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', { args: { request: {} } }), /host-timezone/);
    await h.ready();
    const payload = { args: { request: { clientTimeZone: 'Asia/Singapore', content: [] } } };
    const signal = new AbortController().signal;
    const result = await h.connection.rpc.call('/api', 'session/prompt', payload, signal);
    assert.deepEqual(result, { ok: true, value: 'accepted' });
    assert.equal(h.calls.length, 1); assert.deepEqual(h.calls[0]![3], payload); assert.equal(h.calls[0]![4], signal);
    assert.equal(h.phase(), 'ready');
    assert.ok(h.proofRequests.length >= 2);
    for (const request of h.proofRequests) { assert.equal(request.input, 'extras/host-timezone/epoch-a/proof'); assert.equal(request.init?.cache, 'no-store'); assert.equal(request.init?.credentials, 'same-origin'); }
  } finally { h.close(); }
});

const tick = () => new Promise(resolve => setImmediate(resolve));
test('unknown accepted intent pauses but never permanently disables a protected source', async () => {
  const h = fixture(); try {
    h.setEnabled(undefined); await h.ready();
    await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', {}));
    h.setEnabled(true); await tick();
    let finish!: (response: Response) => void;
    globalThis.fetch = (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch;
    const pending = h.connection.rpc.call('/api', 'session/prompt', {});
    h.setEnabled(undefined); finish(new Response(null, { status: 204 }));
    await assert.rejects(() => pending);
    assert.equal(h.phase(), 'waiting');
    h.setEnabled(true); globalThis.fetch = h.acceptFetch;
    await h.connection.rpc.call('/api', 'session/prompt', {});
    assert.equal(h.calls.length, 1);
  } finally { h.close(); }
});

test('connection loss and replacement permanently revoke even after reconnect at the same client revision', async () => {
  const h = fixture(); try {
    await h.ready(); h.generation.set(undefined); h.state.set('connecting');
    h.state.set('connected'); h.generation.set({ id: 2, host: { home: '/irrelevant' } });
    for (const endpoint of ['session/prompt', 'subagents/prompt', 'schedule/create']) {
      await assert.rejects(() => h.connection.rpc.call('/api', endpoint, {}), /host-timezone/);
    }
    const draft = { args: { request: { action: 'update', patch: { timing: { kind: 'rrule', rrule: 'USER RULE UNCHANGED' } } } } };
    const before = JSON.stringify(draft);
    await assert.rejects(() => h.connection.rpc.call('/api', 'schedule/edit', draft));
    assert.equal(JSON.stringify(draft), before); assert.equal(h.calls.length, 0); assert.equal(h.phase(), 'reload-required');
    for (const endpoint of ['schedule/history', 'schedule/run']) await h.connection.rpc.call('/api', endpoint, {});
    await h.connection.rpc.call('/api', 'schedule/edit', { args: { request: { action: 'delete' } } });
    await h.connection.rpc.call('/api', 'schedule/edit', { args: { request: { action: 'update', patch: { title: 'kept' } } } });
    assert.equal(h.calls.length, 4);
  } finally { h.close(); }
});

test('cached raw rematerialization, failure and service replacement cannot reauthorize a page', async () => {
  for (const change of ['raw', 'marker', 'missing', 'failure', 'service']) {
    const h = fixture(); try {
      await h.ready();
      const record = h.records.get(ids[1]!)!;
      if (change === 'raw') h.records.set(ids[1]!, { ...record, exports: {} });
      if (change === 'marker') h.records.set(ids[1]!, { ...record });
      if (change === 'missing') h.records.delete(ids[1]!);
      if (change === 'failure') h.entries.set({ syncing: false, failures: [{ id: ids[1]!, message: 'cached import failed' }] });
      if (change === 'service') h.services.sessions = {};
      await assert.rejects(() => h.connection.rpc.call('/api', 'schedule/create', {}));
      h.records.set(ids[1]!, record); h.entries.set({ syncing: false, failures: [] });
      await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', {}));
      assert.equal(h.calls.length, 0);
    } finally { h.close(); }
  }
});

test('syncing blocks sensitive requests without revoking unchanged protected exports', async () => {
  const h = fixture(); try {
    await h.ready(); h.entries.set({ syncing: true, failures: [] });
    await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', {}));
    h.entries.set({ syncing: false, failures: [] });
    await h.connection.rpc.call('/api', 'session/prompt', {});
    assert.equal(h.calls.length, 1); assert.equal(h.phase(), 'ready');
  } finally { h.close(); }
});

test('proof refusal and post-await generation/record/sync changes send no sensitive RPC', async () => {
  for (const change of ['refused', 'generation', 'records', 'sync']) {
    const h = fixture(); try {
      await h.ready(); let finish!: (response: Response) => void;
      globalThis.fetch = (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch;
      const pending = h.connection.rpc.call('/api', 'session/prompt', {});
      if (change === 'generation') h.generation.set({ id: 2, host: { home: '/irrelevant' } });
      if (change === 'records') h.records.delete(ids[0]!);
      if (change === 'sync') h.entries.set({ syncing: true, failures: [] });
      finish(new Response(null, { status: change === 'refused' ? 404 : 204 }));
      await assert.rejects(() => pending); assert.equal(h.calls.length, 0);
    } finally { h.close(); }
  }
});

test('owner disposal leaves refusal-only tombstone without listeners and HMR cannot rearm', async () => {
  const h = fixture(); try {
    await h.ready(); const wrapped = h.connection.rpc.call;
    h.off();
    assert.equal(h.generation.listeners.size, 0); assert.equal(h.state.listeners.size, 0); assert.equal(h.entries.listeners.size, 0);
    await assert.rejects(() => wrapped.call(h.connection.rpc, '/api', 'session/prompt', {}));
    const React = { createElement() {}, useSyncExternalStore() {} };
    const next = createHostTimezoneAdapter(React).mount(h.ctx, { rowId: 'again', enabled: () => true, subscribe: () => () => {} });
    await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', {}));
    next(); assert.equal(h.calls.length, 0);
  } finally { h.close(); }
});

test('fresh disabled page never registers a guard, proof request or connection listener', async () => {
  const h = fixture(false, false); try {
    h.setEnabled(false);
    assert.equal(h.connection.rpc.call, h.originalCall); assert.equal(h.generation.listeners.size, 0); assert.equal(h.proofRequests.length, 0);
    assert.equal(Reflect.has(globalThis, LATCH), false); assert.equal(h.phase(), 'disabled');
  } finally { h.close(); }
});

test('actual alpha.2 installConnection own plain method passes admission before native JSON serialization', async () => {
  const connection = installStockConnection();
  assert.equal(createHash('sha256').update(nativeConnectionSource).digest('hex'), '891f407ee38416678095cd9d9fac867b1ad60e5c7fb01f3798518e8693dc76a1');
  assert.equal(createHash('sha256').update(Function.prototype.toString.call(connection.rpc.call)).digest('hex'), 'cdc2f2cf439765f8fb5e6d100d54a4cd9cdf2d34fc174801d39800f05e244b55');
  const rpcDescriptor = Object.getOwnPropertyDescriptor(connection, 'rpc')!;
  assert.equal(rpcDescriptor.writable, true); assert.equal(rpcDescriptor.configurable, true);
  const descriptor = Object.getOwnPropertyDescriptor(connection.rpc, 'call')!;
  assert.equal(descriptor.value.name, 'call'); assert.equal(descriptor.value.length, 4); assert.equal(descriptor.enumerable, true);
  const h = fixture(true, true, connection); try {
    const serialized: any[] = [];
    globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
      if (init?.method !== 'POST') return new Response(null, { status: 204 });
      const message = JSON.parse(String(init.body)); serialized.push(message);
      return Response.json({ type: 'server-response', rpcId: message.rpcId, result: { ok: true, value: 'accepted' } });
    }) as typeof fetch;
    await h.ready();
    const payload = Object.freeze({ args: Object.freeze({ request: Object.freeze({ clientTimeZone: 'Asia/Singapore', content: [] }) }) });
    await connection.rpc.call('/api', 'session/prompt', payload);
    assert.equal(serialized.length, 1); assert.deepEqual(serialized[0].payload, payload);
    h.generation.set(undefined);
    await assert.rejects(() => connection.rpc.call('/api', 'session/prompt', payload));
    assert.equal(serialized.length, 1, 'revoked source never reaches the native JSON carrier');
  } finally { h.close(); }
});

test('caller cancellation during proof never reaches original RPC and does not revoke the page', async () => {
  const h = fixture(); try {
    await h.ready(); let finish!: (response: Response) => void;
    globalThis.fetch = (() => new Promise<Response>(resolve => { finish = resolve; })) as typeof fetch;
    const controller = new AbortController();
    const pending = h.connection.rpc.call('/api', 'session/prompt', {}, controller.signal);
    controller.abort(); finish(new Response(null, { status: 204 }));
    await assert.rejects(() => pending);
    assert.equal(h.calls.length, 0); assert.equal(h.phase(), 'ready');
  } finally { h.close(); }
});

test('initial proof retries only after a transient module sync ends, without needing a submit', async () => {
  const h = fixture(); try {
    let finish!: (response: Response) => void; let requests = 0;
    globalThis.fetch = (() => { requests++; return requests === 1 ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(new Response(null, { status: 204 })); }) as typeof fetch;
    await h.ready(); h.entries.set({ syncing: true, failures: [] });
    finish(new Response(null, { status: 204 })); await tick();
    assert.equal(h.phase(), 'waiting'); assert.equal(requests, 1);
    h.entries.set({ syncing: false, failures: [] }); await tick();
    assert.equal(requests, 2); assert.equal(h.phase(), 'ready');
  } finally { h.close(); }
});

test('accepted disable immediately removes native observers and reenable cannot remount observers', async () => {
  const h = fixture(); try {
    await h.ready(); h.setEnabled(false);
    assert.equal(h.generation.listeners.size, 0); assert.equal(h.state.listeners.size, 0); assert.equal(h.entries.listeners.size, 0);
    h.setEnabled(true);
    await assert.rejects(() => h.connection.rpc.call('/api', 'session/prompt', {}));
    const next = createHostTimezoneAdapter({}).mount(h.ctx, { rowId: 'again', enabled: () => true, subscribe() { assert.fail('closed page never resubscribes'); } });
    assert.equal(h.generation.listeners.size, 0); next();
  } finally { h.close(); }
});

test('unprotected status reads accepted-intent transitions on render without owning observers', () => {
  const h = fixture(false, false); try {
    h.setEnabled(undefined); assert.equal(h.phase(), 'waiting');
    h.setEnabled(false); assert.equal(h.phase(), 'disabled');
    h.setEnabled(true); assert.equal(h.phase(), 'reload-required');
    assert.equal(h.intentSubscriptions(), 0); assert.equal(h.generation.listeners.size, 0); assert.equal(h.state.listeners.size, 0); assert.equal(h.entries.listeners.size, 0);
    assert.equal(h.proofRequests.length, 0); assert.equal(h.connection.rpc.call, h.originalCall); assert.equal(Reflect.has(globalThis, LATCH), false);
  } finally { h.close(); }
});

test('foreign own methods get refusal-only fences, including a fake native name and arity', async () => {
  for (const frozen of [false, true]) {
    const connection = installStockConnection(); const dispatched: any[] = [];
    const foreign = { async call(this: unknown, channel: unknown, endpoint: unknown, payload: unknown, signal?: AbortSignal) { dispatched.push({ receiver: this, channel, endpoint, payload, signal }); return 'foreign-response'; } };
    if (frozen) Object.freeze(foreign);
    const before = Object.getOwnPropertyDescriptor(foreign, 'call');
    connection.rpc = foreign;
    const h = fixture(true, true, connection); try {
      await h.ready(); assert.equal(h.phase(), 'unavailable');
      for (const endpoint of ['session/prompt', 'subagents/prompt', 'schedule/create']) await assert.rejects(() => connection.rpc.call('/api', endpoint, {}), /host-timezone/);
      await assert.rejects(() => connection.rpc.call('/api', 'schedule/edit', { args: { request: { action: 'update', patch: { timing: null } } } }));
      assert.equal(dispatched.length, 0); assert.equal(h.proofRequests.length, 0);
      const signal = new AbortController().signal; const payload = { title: 'kept' };
      assert.equal(await connection.rpc.call('/api', 'schedule/history', payload, signal), 'foreign-response');
      assert.equal(dispatched.length, 1); assert.equal(dispatched[0].payload, payload); assert.equal(dispatched[0].signal, signal);
      assert.equal(dispatched[0].receiver, foreign, 'unrelated RPC keeps the original RPC owner as receiver');
      if (frozen) { assert.notEqual(connection.rpc, foreign); assert.deepEqual(Object.getOwnPropertyDescriptor(foreign, 'call'), before); }
      h.off(); await assert.rejects(() => connection.rpc.call('/api', 'session/prompt', {}));
      assert.equal(dispatched.length, 1); assert.equal(h.generation.listeners.size, 0);
    } finally { h.close(); }
  }
});

test('getter, short-arity and own-toString-spoof owners are refused before their dispatch functions run', async () => {
  for (const kind of ['getter', 'short-arity', 'toString-spoof']) {
    const connection = installStockConnection(); let dispatched = 0; let getterReads = 0;
    const stockSource = Function.prototype.toString.call(connection.rpc.call);
    const foreign: any = { async call(_channel: unknown, _endpoint: unknown, _payload: unknown, _signal?: AbortSignal) { dispatched++; return 'kept'; } };
    if (kind === 'short-arity') foreign.call = async function tracedCall() { dispatched++; return 'kept'; };
    if (kind === 'toString-spoof') Object.defineProperty(foreign.call, 'toString', { value: () => stockSource });
    if (kind === 'getter') { const method = foreign.call; Object.defineProperty(foreign, 'call', { configurable: true, get() { getterReads++; return method; } }); }
    connection.rpc = foreign;
    const h = fixture(true, true, connection); try {
      await h.ready(); const readsAfterMount = getterReads;
      assert.equal(h.phase(), 'unavailable');
      await assert.rejects(() => connection.rpc.call('/api', 'session/prompt', {}), /host-timezone/);
      assert.equal(dispatched, 0); assert.equal(getterReads, readsAfterMount); assert.equal(h.proofRequests.length, 0);
      assert.equal(await connection.rpc.call('/api', 'schedule/history', {}), 'kept'); assert.equal(dispatched, 1);
    } finally { h.close(); }
  }
});

test('a frozen actual stock RPC remains untouched while the native Connection owns a refusal shadow', async () => {
  const connection = installStockConnection(); const originalRpc = connection.rpc; const originalCall = originalRpc.call;
  Object.freeze(originalRpc);
  const h = fixture(true, true, connection); try {
    await h.ready(); assert.equal(h.phase(), 'unavailable'); assert.notEqual(connection.rpc, originalRpc); assert.equal(originalRpc.call, originalCall);
    await assert.rejects(() => connection.rpc.call('/api', 'session/prompt', {}));
    assert.equal(h.calls.length, 0); assert.equal(h.proofRequests.length, 0);
    await connection.rpc.call('/api', 'schedule/history', {}); assert.equal(h.calls.length, 1);
  } finally { h.close(); }
});

test('unsupported module ports keep sensitive native calls fenced rather than returning to a raw RPC', async () => {
  const changes: ((services: Record<string, any>) => void)[] = [
    services => { services.modules.version = 'server'; },
    services => { services.modules.loadCache = {}; },
    services => { services.modules.entries.state = {}; },
    services => { services.modules.manifest.release.version = 'unsupported'; },
    services => { services.modules.manifest.release.version = '0.2.2-rc.4'; },
    services => { services.modules.loadCache.get(ids[0]).ownerId = 'foreign-owner'; },
    services => { services.modules.loadCache.get(ids[0]).exports = {}; },
  ];
  for (const change of changes) {
    const h = fixture(true, true, undefined, change); try {
      await h.ready(); assert.equal(h.phase(), 'unavailable');
      for (const endpoint of ['session/prompt', 'subagents/prompt', 'schedule/create']) await assert.rejects(() => h.connection.rpc.call('/api', endpoint, {}));
      await assert.rejects(() => h.connection.rpc.call('/api', 'schedule/edit', { args: { request: { action: 'update', patch: { timing: null } } } }));
      assert.equal(h.calls.length, 0); assert.equal(h.proofRequests.length, 0); assert.equal(h.intentSubscriptions(), 0);
      assert.equal(h.generation.listeners.size, 0); assert.equal(h.state.listeners.size, 0); assert.equal(h.entries.listeners.size, 0);
      await h.connection.rpc.call('/api', 'schedule/history', {}); assert.equal(h.calls.length, 1);
    } finally { h.close(); }
  }
});

test('a fully immutable foreign Connection is explicitly unavailable and never claimed as a guarded native ABI', async () => {
  const h = fixture(true, true, undefined, services => { Object.freeze(services.connection.rpc); Object.freeze(services.connection); });
  try {
    await h.ready(); assert.equal(h.phase(), 'unavailable'); assert.equal(h.proofRequests.length, 0); assert.equal(h.intentSubscriptions(), 0);
    const owner = Object.getOwnPropertyDescriptor(h.connection, 'rpc')!;
    assert.equal(owner.writable, false); assert.equal(owner.configurable, false);
    assert.equal(h.connection.rpc.call, h.originalCall, 'immutable non-native ownership is not overwritten or represented as guarded');
  } finally { h.close(); }
});

test('closed-page remount fences a fresh stock Connection once without rearming or installing observers', async () => {
  const h = fixture(); try {
    await h.ready(); const page = (globalThis as any)[PAGE]; const latch = (globalThis as any)[LATCH];
    h.off(); assert.equal(h.phase(), 'reload-required');
    const beforeProofs = h.proofRequests.length; const fresh = installStockConnection();
    const originalCall = fresh.rpc.call; let subscriptions = 0;
    for (const source of [fresh.generation, fresh.state]) {
      const subscribe = source.subscribe;
      source.subscribe = function(this: unknown, listener: () => void) { subscriptions++; return subscribe.call(this, listener); };
    }
    h.services.connection = fresh;
    h.ctx.inject = () => { assert.fail('closed remount must not register a DI owner'); };
    const React = { createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props, children }), useSyncExternalStore: (_subscribe: unknown, read: Function) => read() };
    const adapter = createHostTimezoneAdapter(React);
    const off = adapter.mount(h.ctx, { rowId: 'remount', enabled: () => true, subscribe() { assert.fail('closed page never observes accepted intent again'); } });
    const View = adapter.createView(h.ctx) as () => any;
    assert.equal(View().props['data-host-timezone-page-status'], 'reload-required');
    for (const endpoint of ['session/prompt', 'subagents/prompt', 'schedule/create']) await assert.rejects(() => fresh.rpc.call('/api', endpoint, {}), /host-timezone/);
    await assert.rejects(() => fresh.rpc.call('/api', 'schedule/edit', { args: { request: { action: 'update', patch: { timing: null } } } }));
    assert.notEqual(fresh.rpc.call, originalCall); assert.equal(h.calls.length, 0); assert.equal(h.proofRequests.length, beforeProofs); assert.equal(subscriptions, 0);
    assert.equal((globalThis as any)[PAGE], page); assert.equal((globalThis as any)[LATCH], latch);
    off(); await assert.rejects(() => fresh.rpc.call('/api', 'session/prompt', {}));
    await fresh.rpc.call('/api', 'schedule/history', {}); assert.equal(h.calls.length, 1);
  } finally { h.close(); }
});
