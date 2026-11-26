/** Exact served-web alpha.2 page admission. No browser-zone sampling or payload rewriting. */
import { disposeHandle } from './scope.ts';
import { useSettingsText, type SettingsLocale } from './settings-ui.ts';

export interface HostTimezoneMountOptions {
  rowId: string;
  enabled(): boolean | undefined;
  subscribe(listener: () => void): () => void;
}
type Phase = 'disabled' | 'waiting' | 'ready' | 'reload-required' | 'unavailable';
interface Snapshot { phase: Phase; reason: string }
interface PageProof { protocol: string; epoch: string; proofUrl: string; targets: string[] }
interface Source { getSnapshot(): any; subscribe(listener: () => void): () => void }
interface Binding { ctx: any; connection: any; modules: any; sessions: any; rpc: any; wrapper?: Function; generation?: object; records?: Map<string, { record: any; exports: unknown }>; verified: boolean }
interface PageLatch {
  protocol: string; proof: PageProof; proofObject: unknown; closed: boolean; owned: boolean;
  snapshot: Snapshot; listeners: Set<() => void>; requests: Set<AbortController>;
  publish(phase: Phase, reason: string): void; revoke(reason: string, phase?: Phase): void; onRevoke?: () => void;
}
const PROTOCOL = 'dsh-extras.host-timezone.v1';
const PAGE = '__DSH_EXTRAS_HOST_TIMEZONE_PAGE__';
const LATCH = '__DSH_EXTRAS_HOST_TIMEZONE_GUARD_V1__';
const TARGETS = ['@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-client-ui-schedule'];
const FAILURE = 'host-timezone: reload this page before sending time-bearing requests';
// alpha.2 browser artifact 891f407ee38416678095cd9d9fac867b1ad60e5c7fb01f3798518e8693dc76a1.
// Actual installConnection callable SHA-256 cdc2f2cf439765f8fb5e6d100d54a4cd9cdf2d34fc174801d39800f05e244b55.
// Exact native callable source, not a name/arity assertion or a caller-owned toString method.
const STOCK_CALL = "async call(channel,endpoint,payload,signal){assertTarget(channel,endpoint);const rpcId=brandString(randomUuid());const message={type:`client-request`,rpcId,method:endpoint,payload};const response=await send(`${channel}/${endpoint}`.slice(1),{method:`POST`,headers:{\"content-type\":`application/json`},body:JSON.stringify(message),...signal===void 0?{}:{signal}});if(!response.ok)throw new Error(`transport failure for ${channel}/${endpoint}: HTTP ${response.status}`);const full=response.headers.get(`content-type`)?.split(`;`,1)[0]?.trim().toLowerCase()===`multipart/form-data`?await parseBinaryResponse(response):parseConnectionResponse(await response.json());signal?.throwIfAborted();if(full.rpcId!==rpcId)throw new Error(`rpcId mismatch for ${endpoint}: sent ${rpcId}, got ${full.rpcId}`);return full.result}";
const callableSource = Function.prototype.toString;

function pageProof(raw: any): PageProof | undefined {
  if (!raw || raw.protocol !== PROTOCOL || typeof raw.epoch !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/u.test(raw.epoch)
    || raw.proofUrl !== 'extras/host-timezone/' + raw.epoch + '/proof' || !Array.isArray(raw.targets)
    || !raw.targets.includes(TARGETS[0]) || new Set(raw.targets).size !== raw.targets.length
    || raw.targets.some((id: unknown) => typeof id !== 'string' || !TARGETS.includes(id))) return;
  return Object.freeze({ protocol: PROTOCOL, epoch: raw.epoch, proofUrl: raw.proofUrl, targets: Object.freeze([...raw.targets]) as unknown as string[] });
}
function observable(value: any): value is Source {
  return value && typeof value.getSnapshot === 'function' && typeof value.subscribe === 'function';
}
function sensitive(channel: unknown, endpoint: unknown, payload: any): boolean {
  if (channel !== '/api') return false;
  if (endpoint === 'session/prompt' || endpoint === 'subagents/prompt' || endpoint === 'schedule/create') return true;
  const request = payload?.args?.request;
  return endpoint === 'schedule/edit' && request?.action === 'update' && request.patch != null
    && Object.prototype.hasOwnProperty.call(request.patch, 'timing');
}
/** Unknown owners are never authorized, but still need an effective rejection path. */
function installRefusal(connection: any, rpc: any): boolean {
  if (!rpc || (typeof rpc !== 'object' && typeof rpc !== 'function')) return false;
  const descriptor = Object.getOwnPropertyDescriptor(rpc, 'call');
  const original = descriptor && 'value' in descriptor ? descriptor.value : undefined;
  const inherited = descriptor ? undefined : Reflect.get(rpc, 'call', rpc);
  let shadow: any;
  const refusal = async function(this: unknown, channel: unknown, endpoint: unknown, payload: unknown, _signal?: AbortSignal) {
    if (sensitive(channel, endpoint, payload)) throw new Error(FAILURE);
    const receiver = this === shadow ? rpc : this;
    const method = descriptor?.get ? Reflect.apply(descriptor.get, receiver, []) : descriptor ? original : inherited;
    return Reflect.apply(method, receiver, Array.from(arguments));
  };
  try {
    if (descriptor?.configurable || descriptor && 'value' in descriptor && descriptor.writable || !descriptor && Object.isExtensible(rpc)) {
      // A configurable getter is replaced without executing it on the sensitive path.
      const next = descriptor && 'value' in descriptor ? { ...descriptor, value: refusal }
        : { value: refusal, enumerable: descriptor?.enumerable ?? true, configurable: descriptor?.configurable ?? true, writable: false };
      Object.defineProperty(rpc, 'call', next);
      return Object.getOwnPropertyDescriptor(rpc, 'call')?.value === refusal;
    }
    const owner = Object.getOwnPropertyDescriptor(connection, 'rpc');
    if (!owner || !('value' in owner) || owner.value !== rpc || !owner.writable && !owner.configurable) return false;
    // Native alpha.2 Connection owns a replaceable data field. Do not mutate frozen foreign RPCs.
    const descriptors = Object.getOwnPropertyDescriptors(rpc);
    descriptors.call = { value: refusal, enumerable: descriptor?.enumerable ?? true, configurable: false, writable: false };
    shadow = Object.create(Object.getPrototypeOf(rpc), descriptors);
    if (Object.getOwnPropertyDescriptor(connection, 'rpc')?.value !== rpc) return false;
    Object.defineProperty(connection, 'rpc', { ...owner, value: shadow });
    return connection.rpc === shadow;
  } catch { return false; }
}
function createLatch(proof: PageProof, proofObject: unknown): PageLatch {
  const page: PageLatch = {
    protocol: PROTOCOL, proof, proofObject, closed: false, owned: false,
    snapshot: { phase: 'waiting', reason: 'Waiting for current-page source proof.' }, listeners: new Set(), requests: new Set(),
    publish(phase, reason) {
      if (page.snapshot.phase === phase && page.snapshot.reason === reason) return;
      page.snapshot = Object.freeze({ phase, reason });
      for (const listener of [...page.listeners]) { try { listener(); } catch {} }
    },
    revoke(reason, phase = 'reload-required') {
      if (page.closed) return;
      page.closed = true;
      for (const controller of page.requests) controller.abort();
      page.requests.clear();
      page.publish(phase, reason);
      const stop = page.onRevoke; page.onRevoke = undefined; stop?.();
    },
  };
  return page;
}

/** Selected distributions mount once per document; source validity is never rearmed by HMR. */
export function createHostTimezoneAdapter(React: any) {
  let page: PageLatch | undefined;
  let fallback: Snapshot = { phase: 'disabled', reason: 'This page has no protected source proof.' };
  const fallbackListeners = new Set<() => void>();
  let readFallback = () => fallback;
  return {
    mount(ctx: any, options: HostTimezoneMountOptions): () => void {
      const raw = (globalThis as any)[PAGE];
      const proof = pageProof(raw);
      if (!proof) {
        // Existing settings renders supply accepted-intent changes; this page owns no observer.
        readFallback = () => {
          const enabled = options.enabled();
          const phase = raw || enabled === true ? 'reload-required' : enabled === undefined ? 'waiting' : 'disabled';
          if (fallback.phase !== phase) fallback = Object.freeze({ phase, reason: 'Full page reload required to load a protected source.' });
          return fallback;
        };
        readFallback();
        // An unprotected/default-off page owns no guard, subscription or tombstone.
        return () => {};
      }
      const previous = (globalThis as any)[LATCH] as PageLatch | undefined;
      if (previous) {
        page = previous;
        if (previous.closed) {
          // HMR may install a new native Connection on the same permanently revoked page.
          // Fence the current instance once, without acquiring DI or observable ownership.
          const current = typeof ctx?.get === 'function' ? ctx.get('connection') : undefined;
          if (current) installRefusal(current, current.rpc);
          return () => {};
        }
        if (previous.protocol !== PROTOCOL || previous.proofObject !== raw || previous.owned) {
          previous.revoke?.('The protected page guard owner changed.', 'unavailable');
          fallback = { phase: 'unavailable', reason: 'A foreign page guard owns this document.' };
          return () => {};
        }
      } else {
        page = createLatch(proof, raw);
        Object.defineProperty(globalThis, LATCH, { value: page, configurable: true });
      }
      const latch = page;
      latch.owned = true;
      let live = true;
      let binding: Binding | undefined;
      let initialPending = false;
      let handle: unknown;
      let offIntent: () => void = () => {};
      const cleanups = new Set<() => void>();
      let stopped = false;
      const stop = () => {
        if (stopped) return;
        stopped = true; offIntent();
        for (const cleanup of [...cleanups]) cleanup();
        void Promise.resolve(disposeHandle(handle)).catch(() => {});
      };
      latch.onRevoke = stop;
      const close = (reason: string, phase?: Phase) => latch.revoke(reason, phase);
      const readIntent = () => {
        if (options.enabled() === false) close('Protection was disabled; reload before further time-bearing requests.');
      };
      const inspect = (b: Binding): boolean => {
        if (latch.closed || !live) return false;
        readIntent();
        if (latch.closed) return false;
        if ((globalThis as any)[PAGE] !== latch.proofObject || b.ctx.get('connection') !== b.connection
          || b.ctx.get('modules') !== b.modules || b.ctx.get('sessions') !== b.sessions
          || b.connection.rpc !== b.rpc || Object.getOwnPropertyDescriptor(b.rpc, 'call')?.value !== b.wrapper) {
          close('The protected connection or owner changed.'); return false;
        }
        const generation = b.connection.generation.getSnapshot();
        const state = b.connection.state.getSnapshot();
        if (b.generation && (generation !== b.generation || state !== 'connected')) {
          close('The connection changed; this page cannot reuse its prior host zone.'); return false;
        }
        if (!b.generation && generation && state === 'connected') b.generation = generation;
        const entryState = b.modules.entries.state.getSnapshot();
        if (!entryState || typeof entryState.syncing !== 'boolean' || !Array.isArray(entryState.failures)) {
          close('Unsupported native module state.', 'unavailable'); return false;
        }
        if (entryState.failures.some((failure: any) => failure?.id === 'graph' || proof.targets.includes(failure?.id))) {
          close('A protected module failed to load.'); return false;
        }
        if (b.records) {
          for (const [id, expected] of b.records) {
            const record = b.modules.loadCache.get(id);
            if (record !== expected.record || record?.exports !== expected.exports) {
              close('A protected module was removed or rematerialized.'); return false;
            }
          }
        }
        if (entryState.syncing) { latch.publish('waiting', 'Native module synchronization is in progress.'); return false; }
        const manifest = b.modules.manifest;
        if (manifest?.release?.version !== '0.2.3-alpha.2' || !Array.isArray(manifest.modules)) {
          close('Unsupported native client version.', 'unavailable'); return false;
        }
        const present = manifest.modules.filter((row: any) => TARGETS.includes(row?.id)).map((row: any) => row.id);
        if (present.length !== proof.targets.length || proof.targets.some(id => !present.includes(id))) {
          close('The protected target graph changed.'); return false;
        }
        const records = new Map<string, { record: any; exports: unknown }>();
        for (const id of proof.targets) {
          const record = b.modules.loadCache.get(id);
          const descriptor = record && Object.getOwnPropertyDescriptor(record.exports ?? {}, '__dshExtrasHostTimezoneSource');
          const marker = descriptor?.value;
          if (!record || record.id !== id || record.ownerId !== id || !(record.edges instanceof Set)
            || !descriptor || descriptor.enumerable || descriptor.configurable || descriptor.writable
            || !Object.isFrozen(marker) || marker?.protocol !== PROTOCOL || marker?.epoch !== proof.epoch) {
            close('Protected source provenance is unavailable; reload this page.', 'unavailable'); return false;
          }
          records.set(id, { record, exports: record.exports });
        }
        b.records ??= records;
        if (!b.generation || state !== 'connected' || options.enabled() !== true) {
          latch.publish('waiting', 'Waiting for connection and accepted protection intent.'); return false;
        }
        return true;
      };
      const verify = async (b: Binding, signal?: AbortSignal): Promise<void> => {
        if (!inspect(b)) throw new Error(FAILURE);
        signal?.throwIfAborted();
        const controller = new AbortController();
        latch.requests.add(controller);
        let answered = false;
        try {
          const response = await globalThis.fetch(proof.proofUrl, {
            method: 'GET', credentials: 'same-origin', cache: 'no-store', redirect: 'error',
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(2500), ...(signal ? [signal] : [])]),
          });
          answered = true;
          if (!inspect(b)) throw new Error(FAILURE);
          if (response.status !== 204) { close('The current host refused this page source proof.'); throw new Error(FAILURE); }
          b.verified = true;
          latch.publish('ready', 'This page source is verified for the current connection.');
        } catch (error) {
          if (!answered && !signal?.aborted && !latch.closed) close('Current-page source proof is unavailable.');
          throw error;
        } finally { latch.requests.delete(controller); }
      };
      const sync = () => {
        readIntent();
        const b = binding;
        if (!b || !inspect(b)) return;
        if (b.verified) latch.publish('ready', 'This page source is verified for the current connection.');
        else if (!initialPending) {
          initialPending = true;
          void verify(b).catch(() => {}).finally(() => {
            initialPending = false;
            // A completed proof may have met a transient sync/unknown intent.
            // Retry only when that event has ended, never on a timer.
            if (!latch.closed && live && !b.verified) sync();
          });
        }
      };
      if (typeof ctx?.inject !== 'function' || typeof ctx?.get !== 'function') {
        close('Native client services are unavailable.', 'unavailable');
        return () => { live = false; latch.owned = false; };
      }
      handle = ctx.inject(['connection', 'modules', 'sessions'], (scope: any) => {
        const connection = scope.get('connection'); const modules = scope.get('modules');
        const b: Binding = { ctx: scope, connection, modules, sessions: scope.get('sessions'), rpc: connection?.rpc, verified: false };
        if (binding) close('The native client service owner changed.');
        binding = b;
        if (latch.closed) { installRefusal(connection, b.rpc); return; }
        const descriptor = Object.getOwnPropertyDescriptor(b.rpc ?? {}, 'call');
        const rpcOwner = Object.getOwnPropertyDescriptor(connection ?? {}, 'rpc');
        const supported = (globalThis as any).__DSH_TRANSPORT__ === undefined && connection?.interactions === 'answer' && typeof connection?.isLoopback === 'boolean'
          && b.rpc?.open === undefined && b.rpc && Object.getPrototypeOf(b.rpc) === Object.prototype
          && rpcOwner && 'value' in rpcOwner && rpcOwner.value === b.rpc && rpcOwner.writable && rpcOwner.configurable
          && descriptor && typeof descriptor.value === 'function' && descriptor.configurable && descriptor.writable
          && callableSource.call(descriptor.value) === STOCK_CALL;
        if (!supported) {
          const fenced = installRefusal(connection, b.rpc);
          close(fenced ? 'Unsupported RPC owner; sensitive calls are refused.' : 'No controllable same-Connection RPC refusal path is available.', 'unavailable');
          return;
        }
        const original = descriptor.value;
        const wrapper = async function(this: unknown, channel: unknown, endpoint: unknown, payload: unknown, signal?: AbortSignal) {
          if (sensitive(channel, endpoint, payload)) {
            if (latch.closed || !live) throw new Error(FAILURE);
            await verify(b, signal);
            if (!inspect(b)) throw new Error(FAILURE);
            signal?.throwIfAborted();
          }
          return Reflect.apply(original, this, Array.from(arguments));
        };
        b.wrapper = wrapper;
        Object.defineProperty(b.rpc, 'call', { ...descriptor, value: wrapper });
        if (!observable(connection?.generation) || !observable(connection?.state) || modules?.version !== 'client'
          || !observable(modules?.entries?.state) || !(modules?.loadCache instanceof Map)) {
          close('Unsupported native connection/module interface.', 'unavailable'); return;
        }
        const offs = [connection.generation.subscribe(sync), connection.state.subscribe(sync), modules.entries.state.subscribe(sync)];
        const cleanup = () => {
          close('The protected native client owner was disposed.');
          for (const off of offs) off();
          cleanups.delete(cleanup);
          // Refusal-only tombstone deliberately remains on this exact native RPC instance.
        };
        cleanups.add(cleanup);
        scope.effect(() => cleanup, 'host-timezone: native source validity');
        sync();
      });
      if (latch.closed) void Promise.resolve(disposeHandle(handle)).catch(() => {});
      else {
        offIntent = options.subscribe(sync);
        if (latch.closed) offIntent();
        else sync();
      }
      return () => {
        if (!live) return;
        live = false; close('This protected page owner was disposed; full reload required.');
        stop(); latch.owned = false; binding = undefined;
      };
    },
    createView(ctx: any, settingsLocale?: SettingsLocale): unknown {
      return function HostTimezonePageStatus() {
        const candidate = settingsLocale ?? (typeof ctx?.get === 'function' ? ctx.get('locale') : undefined);
        const locale = candidate && typeof candidate.getLocale === 'function' && typeof candidate.subscribe === 'function' && typeof candidate.resolveText === 'function' ? candidate as SettingsLocale : undefined;
        const t = useSettingsText(React, locale);
        const snapshot = React.useSyncExternalStore(
          (listener: () => void) => { const listeners = page?.listeners ?? fallbackListeners; listeners.add(listener); return () => listeners.delete(listener); },
          () => page?.snapshot ?? readFallback(),
          () => page?.snapshot ?? readFallback(),
        ) as Snapshot;
        const labels: Record<Phase, string> = { disabled: '未启用', waiting: '等待验证', ready: '已验证', 'reload-required': '需要重新加载', unavailable: '不可用' };
        const reasons: Record<Phase, string> = {
          disabled: '当前页面未加载受保护来源；启用后需要完整重新加载页面。',
          waiting: '正在等待连接、模块同步或已接受的启用配置；暂不发送带时间信息的请求。',
          ready: '当前页面来源已通过当前连接的宿主验证。每次相关提交仍需重新验证。',
          'reload-required': '当前页面来源尚未生效或已经失效；请完整重新加载页面。草稿保持不变。',
          unavailable: '无法验证原生接口或来源身份；请检查版本及宿主状态后重新加载页面。',
        };
        return React.createElement('div', { role: 'status', 'data-host-timezone-phase': snapshot.phase, 'data-host-timezone-page-status': snapshot.phase },
          t('Current page: ', '当前页面：') + t(snapshot.phase, labels[snapshot.phase]) + '。' + t(snapshot.reason, reasons[snapshot.phase]));
      };
    },
  };
}
