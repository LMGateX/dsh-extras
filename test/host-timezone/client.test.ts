import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHostTimezoneAdapter } from '../../client/host-timezone.ts';

const PAGE = '__DSH_EXTRAS_HOST_TIMEZONE_PAGE__';
const LATCH = '__DSH_EXTRAS_HOST_TIMEZONE_GUARD_V1__';
const ids = ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'];
function observable<T>(initial: T) {
  let value = initial; const listeners = new Set<() => void>();
  return { getSnapshot: () => value, subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    set(next: T) { value = next; for (const fn of [...listeners]) fn(); }, listeners };
}
function fixture(protectedPage = true, initialEnabled: boolean | undefined = true, nativeHandle?: any) {
  Reflect.deleteProperty(globalThis, LATCH); Reflect.deleteProperty(globalThis, PAGE);
  const previousFetch = globalThis.fetch;
  const proof = { protocol: 'dsh-extras.host-timezone.v1', epoch: 'epoch-a', proofUrl: 'extras/host-timezone/epoch-a/proof', targets: ids };
  if (protectedPage) Reflect.set(globalThis, PAGE, proof);
  const generation = observable<any>(undefined); const state = observable<any>(undefined);
  const entries = observable({ syncing: false, failures: [] as { id: string; message: string }[] });
  const records = new Map(ids.map(id => {
    const exports = {}; Object.defineProperty(exports, '__dshExtrasHostTimezoneSource', { value: Object.freeze({ protocol: proof.protocol, epoch: proof.epoch }) });
    return [id, { id, exports, styles: [], edges: new Set() }];
  }));
  const calls: unknown[][] = [];
  const rpc = { async call(this: unknown, channel: unknown, endpoint: unknown, payload: unknown, signal?: AbortSignal) { calls.push([this, channel, endpoint, payload, signal]); return { ok: true, value: 'accepted' }; } };
  const originalCall = rpc.call;
  const connection = nativeHandle ?? { generation, state, rpc, interactions: 'answer', isLoopback: true };
  connection.generation = generation; connection.state = state;
  const modules = { version: 'client', manifest: { release: { version: '0.2.2-rc.3' }, modules: ids.map(id => ({ id, rev: 'same' })) }, entries: { state: entries }, loadCache: records };
  const services: Record<string, unknown> = { connection, modules, sessions: {} };
  let intentSubscriptions = 0;
  let enabled: boolean | undefined = initialEnabled; const intentListeners = new Set<() => void>(); const effects: (() => unknown)[] = [];
  const ctx = { get: (key: string) => services[key], effect(fn: () => (() => unknown)) { const off = fn(); effects.push(off); return off; },
    inject(_deps: unknown, fn: Function) { fn(ctx); return { dispose() { for (const off of effects.splice(0).reverse()) off(); } }; } };
  const proofRequests: { input: unknown; init?: RequestInit }[] = [];
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => { proofRequests.push({ input, init }); return new Response(null, { status: 204 }); }) as typeof fetch;
  const React = { createElement: (type: unknown, props: any, ...children: unknown[]) => ({ type, props, children }), useSyncExternalStore: (_subscribe: unknown, read: Function) => read() };
  const adapter = createHostTimezoneAdapter(React);
  const off = adapter.mount(ctx, { rowId: 'dsh-extras', enabled: () => enabled, subscribe(fn) { intentSubscriptions++; intentListeners.add(fn); return () => { intentListeners.delete(fn); }; } });
  const View = adapter.createView(ctx) as () => any;
  return { connection, modules, generation, state, records, entries, calls, originalCall, proofRequests, services, ctx, adapter, off,
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
    assert.equal(h.calls.length, 1); assert.equal(h.calls[0]![0], h.connection.rpc); assert.equal(h.calls[0]![3], payload); assert.equal(h.calls[0]![4], signal);
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
    h.setEnabled(true); globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
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

test('actual rc.3 installConnection own plain method passes admission before native JSON serialization', async () => {
  const consumer = createRequire(import.meta.url);
  const runtime = createRequire(process.env.DSH_RUNTIME_ROOT ? join(process.env.DSH_RUNTIME_ROOT, 'package.json') : consumer.resolve('@deepseek-ai/dsh/package.json'));
  const native = await import(pathToFileURL(runtime.resolve('@deepseek-ai/dsh-client-connection/client')).href);
  let connection: any;
  native.installConnection({ provide(name: string, value: unknown) { assert.equal(name, 'connection'); connection = value; } }, { location: { hostname: 'localhost' } });
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
