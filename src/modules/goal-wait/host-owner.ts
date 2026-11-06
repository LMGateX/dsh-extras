/** Runtime-only ownership adapter for the audited native Loader; never writes configuration. */
import { Context, type Fiber } from '@deepseek-ai/cordis';
import type { Entry, Loader } from '@deepseek-ai/cordis-plugin-loader';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export type DriverStrategy = 'activation' | 'native' | 'replacement' | 'off';
export interface DriverOwnerSnapshot {
  requested: DriverStrategy;
  effective: 'stock' | 'replacement' | 'none' | 'unknown';
  phase: 'active' | 'switching' | 'restoring' | 'conflict' | 'failed' | 'missing-dependency';
  stockEntryId?: string;
  stockFiberUid?: number;
  ownedFiberUid?: number;
  reason?: string;
}
export interface OwnedDriver { rawFiber: Fiber; stop(): Promise<void> }
export interface DriverOwnerRequest { strategy: DriverStrategy; mountOwned?: () => Promise<OwnedDriver> }
export interface HostDriverOwner {
  transition(request: DriverOwnerRequest): Promise<DriverOwnerSnapshot>;
  snapshot(): DriverOwnerSnapshot;
  close(): Promise<DriverOwnerSnapshot>;
}
export interface HostDriverOwnerOptions {
  /** Set false when the mode owns a single observed, awaited teardown transaction. */
  autoDispose?: boolean;
  /** Synchronous projection only; do not start another driver from this callback. */
  onChange?(snapshot: DriverOwnerSnapshot): void;
  onConflict?(reason: string): void;
}
const nativeName = '@deepseek-ai/dsh-goal-round-driver';
const requireExtras = createRequire(import.meta.url);
// Shared across combined/split bundles and HMR generations; entries are removed on close.
const claimsKey = Symbol.for('dsh-extras.native-driver-owner.claims.v1');
const globals = globalThis as unknown as Record<symbol, unknown>;
const claims = (globals[claimsKey] ??= new WeakMap<object, object>()) as WeakMap<object, object>;
const driverDigest = '1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de';
const live = (fiber: Fiber | undefined): fiber is Fiber => !!fiber && fiber.uid !== null;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

/**
 * Consumer removes its gate before switching/closing. The adapter drains every
 * owned raw fiber before restoring stock; callers must await close on unload.
 * Unmanaged/manual compositions fail unavailable rather than mutating strangers.
 */
export function createHostDriverOwner(ctx: Context, options: HostDriverOwnerOptions = {}): HostDriverOwner {
  let state: DriverOwnerSnapshot = { requested: 'native', effective: 'unknown', phase: 'switching' };
  let queue = Promise.resolve();
  let closing = false;
  const claimToken = {};
  let claimed = false;
  let restoreOwed = false;
  let closeTask: Promise<DriverOwnerSnapshot> | undefined;
  let generation = 0;
  let stock: Entry | undefined;
  let loader: Loader | undefined;
  let callback: Function | undefined;
  let owned: OwnedDriver | undefined;
  let stopping: Promise<void> | undefined;
  let suppressed = false;
  let restoring = false;
  let conflicted: string | undefined;
  let mountingOwned = false;
  let pendingOwned: Fiber | undefined;
  let offGuard: (() => void) | undefined;
  let offStatus = () => {};
  const draining = new Set<Fiber>();
  const snapshot = (): DriverOwnerSnapshot => {
    const result = { ...state };
    if (!closing && !conflicted && owned && (state.phase === 'active' || state.phase === 'missing-dependency')) {
      const fiber = owned.rawFiber;
      result.effective = live(fiber) && fiber.state === 2 ? 'replacement' : 'none';
      result.phase = !live(fiber) || fiber.state === 3 ? 'failed' : fiber.state === 2 ? 'active' : 'missing-dependency';
    } else if (state.effective === 'stock' && state.phase === 'active' && stock && (!live(stock.fiber) || stock.fiber.state !== 2)) {
      result.effective = 'none'; result.phase = 'missing-dependency';
    }
    return result;
  };
  const publish = (next: Partial<DriverOwnerSnapshot>) => {
    state = { requested: state.requested, effective: 'unknown', phase: 'switching', ...next };
    if (stock) state.stockEntryId = stock.id;
    if (live(stock?.fiber)) state.stockFiberUid = stock.fiber.uid!;
    if (live(owned?.rawFiber)) state.ownedFiberUid = owned.rawFiber.uid!;
    try { options.onChange?.(snapshot()); } catch { /* Diagnostics cannot break owner cleanup. */ }
    return snapshot();
  };
  const pendingCandidate = (): Fiber | undefined => pendingOwned;
  const isPending = (fiber: Fiber) => fiber === pendingCandidate();
  const currentEntry = () => !!stock && !!loader && [...loader.entries()].includes(stock);
  const canRestore = () => currentEntry() && !stock!.disabled && ctx.root.fiber.state === 2
    && stock!.parent.ctx.fiber.uid !== null && stock!.parent.ctx.fiber.state !== 4;
  const drain = async () => {
    while (draining.size) {
      const batch = [...draining];
      await Promise.all(batch.map(fiber => fiber.await()));
      for (const fiber of batch) draining.delete(fiber);
    }
  };
  const stopOwned = (): Promise<void> => {
    if (stopping) return stopping;
    const target = owned;
    if (!target) return Promise.resolve();
    owned = undefined;
    let stopped: Promise<void>;
    try { stopped = Promise.resolve(target.stop()); }
    catch (error) { stopped = Promise.reject(error); }
    // uid is revoked synchronously, including when stop waits on policy cleanup.
    const disposed = Promise.resolve(target.rawFiber.dispose());
    const task = Promise.allSettled([stopped, disposed, target.rawFiber.await()]).then(results => {
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    });
    stopping = task;
    // Failed cleanup remains latched: no subsequent request bypasses its obligation.
    void task.then(() => { if (stopping === task) stopping = undefined; }, () => {});
    return task;
  };
  const suppress = () => {
    if (!callback) return;
    const runtime = ctx.registry.get(callback);
    if (!runtime) return;
    const fibers = [...runtime.fibers].filter(live);
    if (fibers.some(fiber => fiber.entry !== stock || fiber.parent.fiber.entry === stock)) {
      throw new Error('Native driver callback has another unmanaged or duplicate owner');
    }
    restoreOwed = true;
    for (const fiber of fibers) draining.add(fiber);
    // Delete registry identity FIRST: direct fiber.dispose would persist disabled:true.
    ctx.registry.delete(callback);
  };
  const foreignFibers = () => [...ctx.registry.values()].flatMap(runtime => [...runtime.fibers])
    .filter(fiber => live(fiber) && fiber !== owned?.rawFiber
      && (fiber.runtime?.name === 'goal-round-driver' || fiber.runtime?.name === 'goal-wait-owned-replacement-driver')
      && !(fiber.entry === stock && fiber.parent.fiber.entry !== stock && fiber.runtime?.callback === callback));
  const conflict = (reason: string) => {
    if (conflicted) return;
    conflicted = reason; ++generation;
    // Revocation is synchronous, before the just-published foreign fiber applies.
    if (owned) void Promise.resolve(owned.rawFiber.dispose()).catch(() => {});
    if (pendingOwned) { draining.add(pendingOwned); void Promise.resolve(pendingOwned.dispose()).catch(() => {}); }
    publish({ phase: 'conflict', reason });
    try { options.onConflict?.(reason); } catch { /* Keep draining even if projection fails. */ }
    void enqueue(async () => { await stopOwned(); await drain(); return publish({ phase: 'conflict', reason }); });
  };
  const discover = async () => {
    // Prefer the native profile's installation anchor, not a possibly shadowed peer tree.
    const profile = ctx.get('profileContext') as { installAnchor?: string } | undefined;
    const requireHost = createRequire(profile?.installAnchor ?? requireExtras.resolve('@deepseek-ai/dsh/package.json'));
    if (requireHost(nativeName + '/package.json').version !== '0.2.2-alpha.3'
      || requireHost('@deepseek-ai/cordis/package.json').version !== '4.0.6-alpha.2'
      || createHash('sha256').update(readFileSync(requireHost.resolve(nativeName))).digest('hex') !== driverDigest) {
      throw new Error('Unavailable: unverified native driver/Cordis artifact');
    }
    loader = ctx.get('loader');
    if (!loader || typeof loader.entries !== 'function') throw new Error('Unavailable: native Loader is required; unmanaged composition is not adopted');
    const entries = [...loader.entries()].filter(entry => entry.options.name === nativeName);
    if (entries.length !== 1) throw new Error('Unavailable: expected exactly one native Loader driver entry');
    stock = entries[0]!;
    const module = await stock.parent.tree.import(nativeName);
    const published = await stock.parent.tree.import(pathToFileURL(requireHost.resolve(nativeName)).href);
    const selected = ctx.registry.resolve(loader.unwrapExports(module));
    callback = ctx.registry.resolve(loader.unwrapExports(published));
    if (!callback || callback !== selected) throw new Error('Unavailable: Loader driver is not the verified published native module');
    if (foreignFibers().length) { conflict('Conflicting foreign goal driver is already mounted'); throw new Error(conflicted); }
  };
  const restore = async () => {
    publish({ phase: 'restoring' });
    await stopOwned();
    await drain();
    suppressed = false; restoring = true;
    const finishGuard = () => { restoring = false; offGuard?.(); offGuard = undefined; };
    if (foreignFibers().length) {
      finishGuard();
      return publish({ phase: 'conflict', reason: conflicted ?? 'Foreign driver remains mounted; stock is not duplicated' });
    }
    if (!canRestore()) {
      finishGuard(); restoreOwed = false;
      return publish({ effective: 'none', phase: 'active', reason: 'Stock entry is disabled, removed, or its host is stopping' });
    }
    if (!live(stock!.fiber) && restoreOwed) await stock!.init();
    if (live(stock!.fiber)) await stock!.fiber.await();
    await drain();
    restoreOwed = false;
    finishGuard();
    if (!canRestore()) return publish({ effective: 'none', phase: 'active', reason: 'Stock entry was disabled or removed during restoration' });
    return publish({ effective: live(stock!.fiber) && stock!.fiber.state === 2 ? 'stock' : 'none',
      phase: live(stock!.fiber) && stock!.fiber.state === 2 ? 'active' : 'missing-dependency' });
  };
  const enqueue = (operation: () => Promise<DriverOwnerSnapshot>) => {
    const task = queue.then(operation).catch(error => publish({ phase: conflicted ? 'conflict' : 'failed', reason: message(error) }));
    queue = task.then(() => {});
    return task;
  };
  const transition = (request: DriverOwnerRequest) => {
    if (closing || conflicted) return Promise.resolve(snapshot());
    const epoch = ++generation;
    state.requested = request.strategy;
    return enqueue(async () => {
      if (closing || epoch !== generation) return snapshot();
      publish({ phase: 'switching' });
      await discover();
      if (closing || epoch !== generation) return snapshot();
      const existing = claims.get(ctx.root);
      if (existing && existing !== claimToken) { conflicted = 'Another Extras distribution already owns the native driver lease'; return publish({ phase: 'conflict', reason: conflicted }); }
      claims.set(ctx.root, claimToken); claimed = true;
      if (request.strategy === 'activation' || request.strategy === 'native') return restore();
      if (stock!.disabled) throw new Error('Unavailable: stock native entry is explicitly disabled');
      await stopOwned();
      if (closing || epoch !== generation) return snapshot();
      if (!canRestore()) throw new Error('Unavailable: native Loader intent changed before suppression');
      suppressed = true;
      offGuard ??= ctx.root.on('internal/plugin', fiber => {
        if ((!suppressed && !restoring) || !live(fiber)) return;
        if (fiber === owned?.rawFiber || fiber === pendingOwned) return;
        if (mountingOwned && !pendingOwned && fiber.parent.fiber === ctx.fiber
          && fiber.runtime?.name === 'goal-wait-owned-replacement-driver') {
          pendingOwned = fiber; // One exact direct child, never an entire async name-whitelist window.
          return;
        }
        if (fiber.runtime?.callback === callback && fiber.entry === stock && fiber.parent.fiber.entry !== stock) {
          if (suppressed || !canRestore()) {
            try { suppress(); } catch (error) { conflict(message(error)); }
          }
        } else if (fiber.runtime?.name === 'goal-round-driver' || fiber.runtime?.name === 'goal-wait-owned-replacement-driver') {
          conflict('A foreign continuation driver mounted during the native lease');
        }
      }, { global: true });
      suppress();
      await drain();
      if (closing || epoch !== generation) return snapshot();
      if (!canRestore()) throw new Error('Unavailable: native Loader intent changed during drain');
      if (request.strategy === 'replacement') {
        if (!request.mountOwned) throw new Error('Replacement driver factory is required');
        mountingOwned = true; pendingOwned = undefined;
        try { owned = await request.mountOwned(); }
        catch (error) {
          const candidate = pendingCandidate();
          if (candidate) {
            draining.add(candidate);
            await Promise.resolve(candidate.dispose());
            pendingOwned = undefined;
            await drain();
          }
          throw error;
        } finally { mountingOwned = false; }
        if (!isPending(owned.rawFiber)) { await stopOwned(); throw new Error('Replacement factory did not return its exact direct-child candidate'); }
        pendingOwned = undefined;
        await owned.rawFiber.await();
        if (closing || epoch !== generation) { await stopOwned(); return snapshot(); }
        if (live(owned.rawFiber) && owned.rawFiber.state === 0) return publish({ effective: 'none', phase: 'missing-dependency', reason: 'Replacement driver is waiting for native dependencies' });
        if (!live(owned.rawFiber) || owned.rawFiber.state !== 2) throw new Error('Replacement driver did not become active');
      }
      return publish({ effective: request.strategy === 'off' ? 'none' : 'replacement', phase: 'active' });
    });
  };
  const close = () => {
    if (closeTask) return closeTask;
    closing = true; ++generation;
    closeTask = enqueue(async () => {
      if (!stock || !claimed) { await stopOwned(); offGuard?.(); offGuard = undefined; offStatus(); return snapshot(); }
      const result = await restore();
      if (claims.get(ctx.root) === claimToken) claims.delete(ctx.root);
      claimed = false; offStatus();
      return result;
    });
    return closeTask;
  };
  offStatus = ctx.root.on('internal/status', fiber => {
    if (closing || conflicted || fiber !== owned?.rawFiber || (state.phase !== 'active' && state.phase !== 'missing-dependency')) return;
    const actual = snapshot();
    if (actual.phase !== state.phase || actual.effective !== state.effective) publish({ phase: actual.phase, effective: actual.effective });
  }, { global: true });
  if (options.autoDispose !== false) ctx.effect(() => () => close().then(() => {}));
  return { transition, snapshot, close };
}
