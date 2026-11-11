/** Runtime-only ownership adapter for the audited native Loader; never writes configuration. */
import { Context, type Fiber } from '@deepseek-ai/cordis';
import { Entry, type Loader } from '@deepseek-ai/cordis-plugin-loader';
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
const driverDigest = '8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c';
const live = (fiber: Fiber | undefined): fiber is Fiber => !!fiber && fiber.uid !== null;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const nativeDisabledDescriptor = Object.getOwnPropertyDescriptor(Entry.prototype, 'disabled');
function sameDescriptor(left: PropertyDescriptor | undefined, right: PropertyDescriptor | undefined): boolean {
  return !!left && !!right && left.get === right.get && left.set === right.set
    && left.value === right.value && left.writable === right.writable
    && left.configurable === right.configurable && left.enumerable === right.enumerable
    && Object.hasOwn(left, 'value') === Object.hasOwn(right, 'value');
}

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
  let restoreTicket: { epoch: number; candidate?: Fiber } | undefined;
  let conflicted: string | undefined;
  let mountingOwned = false;
  let pendingOwned: Fiber | undefined;
  let offGuard: (() => void) | undefined;
  let offStatus = () => {};
  const checkpointOff: (() => void)[] = [];
  let disabledView: { entry: Entry; installed: PropertyDescriptor; before?: PropertyDescriptor; active: boolean } | undefined;
  const draining = new Set<Fiber>();
  const snapshot = (): DriverOwnerSnapshot => {
    const result = { ...state };
    const descriptorFailure = ownershipIssue();
    if (descriptorFailure) return { ...result, effective: 'unknown', phase: 'conflict', reason: descriptorFailure };
    if (!closing && !conflicted && owned && (state.phase === 'active' || state.phase === 'missing-dependency')) {
      const fiber = owned.rawFiber;
      result.effective = live(fiber) && fiber.state === 2 ? 'replacement' : 'none';
      result.phase = !live(fiber) || fiber.state === 3 ? 'failed' : fiber.state === 2 ? 'active' : 'missing-dependency';
      // Retire only this resolved dependency diagnostic, never conflict/failure reasons.
      if (result.phase === 'active' && state.phase === 'missing-dependency'
        && result.reason === 'Replacement driver is waiting for native dependencies') delete result.reason;
    } else if (state.effective === 'stock' && state.phase === 'active' && stock && (!live(stock.fiber) || stock.fiber.state !== 2)) {
      result.effective = 'none'; result.phase = 'missing-dependency';
    }
    return result;
  };
  const publish = (next: Partial<DriverOwnerSnapshot>) => {
    state = { requested: state.requested, effective: 'unknown', phase: 'switching', ...next,
      ...(conflicted ? { phase: 'conflict' as const, effective: 'unknown' as const, reason: conflicted } : {}) };
    if (stock) state.stockEntryId = stock.id;
    if (live(stock?.fiber)) state.stockFiberUid = stock.fiber.uid!;
    if (live(owned?.rawFiber)) state.ownedFiberUid = owned.rawFiber.uid!;
    try { options.onChange?.(snapshot()); } catch { /* Diagnostics cannot break owner cleanup. */ }
    return snapshot();
  };
  const pendingCandidate = (): Fiber | undefined => pendingOwned;
  const isPending = (fiber: Fiber) => fiber === pendingCandidate();
  const currentEntry = () => !!stock && !!loader && [...loader.entries()].includes(stock);
  const disabledDescriptorIssue = (): string | undefined => {
    if (!stock) return undefined;
    if (!(stock instanceof Entry) || !sameDescriptor(Object.getOwnPropertyDescriptor(Entry.prototype, 'disabled'), nativeDisabledDescriptor)
      || !nativeDisabledDescriptor?.get) return 'Unavailable: unverified native effective-disabled getter';
    const own = Object.getOwnPropertyDescriptor(stock, 'disabled');
    if (disabledView) {
      if (disabledView.entry !== stock || !sameDescriptor(own, disabledView.installed)) return 'Native effective-disabled descriptor ownership changed';
    } else if (own) return 'Unavailable: foreign own effective-disabled descriptor';
    return undefined;
  };
  const nativeDisabled = () => !stock || !!nativeDisabledDescriptor!.get!.call(stock);
  // Loader Entry.disabled is effective runtime state (entry.ts:75-84); app-boot
  // inactiveEntries (rc.2 packages/boot/app-boot/src/index.ts:1062-1103) consumes it before
  // classifying a disposed fiber as failure. Entry.options alone remains serialized.
  const installDisabledView = () => {
    const issue = disabledDescriptorIssue();
    if (issue) { conflict(issue); throw new Error(issue); }
    if (disabledView) { disabledView.active = true; return; }
    if (!Object.isExtensible(stock!)) throw new Error('Unavailable: native entry cannot hold a runtime disabled view');
    const record = { entry: stock!, before: Object.getOwnPropertyDescriptor(stock!, 'disabled'), installed: {} as PropertyDescriptor, active: true };
    record.installed = { configurable: true, enumerable: false, get(this: Entry) {
      // Delegate native intent/ancestor/expression handling; only the owned runtime bit is additive.
      return !!nativeDisabledDescriptor!.get!.call(this) || (this === record.entry && record.active);
    } };
    Object.defineProperty(record.entry, 'disabled', record.installed);
    disabledView = record;
  };
  const releaseDisabledView = () => {
    const record = disabledView;
    if (!record) return;
    record.active = false; disabledView = undefined;
    if (!sameDescriptor(Object.getOwnPropertyDescriptor(record.entry, 'disabled'), record.installed)) {
      conflict('Native effective-disabled descriptor ownership changed');
      return; // Never overwrite an external descriptor, even on close.
    }
    if (record.before) Object.defineProperty(record.entry, 'disabled', record.before);
    else Reflect.deleteProperty(record.entry, 'disabled');
  };
  const canRestore = () => currentEntry() && !disabledDescriptorIssue() && !nativeDisabled() && ctx.root.fiber.state === 2
    && stock!.parent.ctx.fiber.uid !== null && stock!.parent.ctx.fiber.state !== 4;
  const drain = async () => {
    let failed = false;
    let failure: unknown;
    while (draining.size) {
      const batch = [...draining];
      const results = await Promise.allSettled(batch.map(fiber => fiber.await()));
      for (const fiber of batch) draining.delete(fiber);
      const rejected = results.find(result => result.status === 'rejected');
      if (!failed && rejected?.status === 'rejected') { failed = true; failure = rejected.reason; }
    }
    if (failed) throw failure;
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
  const cancelRestoreCandidate = (fiber: Fiber) => {
    // This is only our exact speculative Loader root fiber. Fiber.entry is the
    // public mutable Loader/HMR association: rc.2 packages/boot/hmr/src/index.ts
    // :683-689 rebinds fiber.entry and entry.fiber on reload. Only
    // cancel while PENDING (state 0), before native apply; never detach an active
    // stock/foreign fiber. Detach before dispose to avoid Loader's self-disable
    // commit. Never registry.delete(callback): foreign fibers may share it.
    if (!restoreTicket || fiber !== restoreTicket.candidate || !live(fiber) || fiber.state !== 0) return;
    // Loader 1.1.0 lib/index.js:765-781 otherwise reattaches entry during dispose.
    // Isolate only this candidate's public parent metadata; the original context
    // and every active/foreign fiber remain untouched.
    fiber.parent = fiber.parent.extend({ [Entry.key]: undefined });
    fiber.entry = undefined;
    draining.add(fiber);
    void Promise.resolve(fiber.dispose()).catch(() => {});
  };
  const conflict = (reason: string) => {
    if (conflicted) return;
    conflicted = reason; ++generation;
    if (restoreTicket?.candidate) cancelRestoreCandidate(restoreTicket.candidate);
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
    if (requireHost(nativeName + '/package.json').version !== '0.2.2-rc.2'
      || requireHost('@deepseek-ai/cordis/package.json').version !== '4.1.0'
      || requireHost('@deepseek-ai/cordis-plugin-loader/package.json').version !== '1.1.0'
      || createHash('sha256').update(readFileSync(requireHost.resolve(nativeName))).digest('hex') !== driverDigest) {
      throw new Error('Unavailable: unverified native driver/Cordis artifact');
    }
    loader = ctx.get('loader');
    if (!loader || typeof loader.entries !== 'function') throw new Error('Unavailable: native Loader is required; unmanaged composition is not adopted');
    const entries = [...loader.entries()].filter(entry => entry.options.name === nativeName);
    if (entries.length !== 1) throw new Error('Unavailable: expected exactly one native Loader driver entry');
    stock = entries[0]!;
    const descriptorFailure = disabledDescriptorIssue();
    if (descriptorFailure) { conflict(descriptorFailure); throw new Error(descriptorFailure); }
    const module = await stock.parent.tree.import(nativeName);
    const published = await stock.parent.tree.import(pathToFileURL(requireHost.resolve(nativeName)).href);
    const selected = ctx.registry.resolve(loader.unwrapExports(module));
    callback = ctx.registry.resolve(loader.unwrapExports(published));
    if (!callback || callback !== selected) throw new Error('Unavailable: Loader driver is not the verified published native module');
    if (foreignFibers().length) { conflict('Conflicting foreign goal driver is already mounted'); throw new Error(conflicted); }
  };
  const ownedIntentIssue = (): string | undefined => {
    if (!owned && !pendingOwned) return undefined;
    if (!currentEntry()) return 'Native Loader entry was removed during owned execution';
    try { if (nativeDisabled()) return 'Native Loader disabled intent changed during owned execution'; }
    catch { return 'Native Loader disabled intent is unavailable during owned execution'; }
    return undefined;
  };
  const ownershipIssue = () => disabledDescriptorIssue() ?? ownedIntentIssue();
  const checkOwnership = () => {
    if (!claimed) return true;
    const issue = ownershipIssue();
    if (!issue) return true;
    conflict(issue);
    return false;
  };
  const ensureGuard = () => {
    offGuard ??= ctx.root.on('internal/plugin', fiber => {
      if (!claimed || !live(fiber)) return;
      checkOwnership();
      if (fiber === owned?.rawFiber || fiber === pendingOwned) return;
      if (mountingOwned && !pendingOwned && fiber.parent.fiber === ctx.fiber
        && fiber.runtime?.name === 'goal-wait-owned-replacement-driver') {
        pendingOwned = fiber;
        checkOwnership();
        if (conflicted || closing) { draining.add(fiber); void Promise.resolve(fiber.dispose()).catch(() => {}); }
        return;
      }
      if (conflicted && !restoring) return;
      if (fiber.runtime?.callback === callback && fiber.entry === stock && fiber.parent.fiber.entry !== stock) {
        if (restoring && restoreTicket) {
          restoreTicket.candidate = fiber;
          if (foreignFibers().length) conflict('A foreign driver arrived before native restoration could commit');
          if (conflicted || restoreTicket.epoch !== generation || !canRestore()) cancelRestoreCandidate(fiber);
        } else if (suppressed) {
          try { suppress(); } catch (error) { conflict(message(error)); }
        } else if (foreignFibers().length) {
          conflict('The native Loader composition acquired a foreign continuation driver');
        }
      } else if (fiber.runtime?.name === 'goal-round-driver' || fiber.runtime?.name === 'goal-wait-owned-replacement-driver') {
        conflict('A foreign continuation driver mounted during the native lease');
      }
    }, { global: true });
  };
  const restore = async (epoch: number) => {
    const ticket = { epoch } as { epoch: number; candidate?: Fiber };
    const stale = () => epoch !== generation || !!conflicted;
    const foreign = () => {
      if (foreignFibers().length) conflict('Foreign driver remains mounted; stock is not duplicated');
      return !!conflicted;
    };
    publish({ phase: 'restoring' });
    try {
      await stopOwned();
      await drain();
      suppressed = false; restoring = true;
      if (foreign() || stale()) return snapshot();
      if (!canRestore()) {
        restoreOwed = false;
        return publish({ effective: 'none', phase: 'active', reason: 'Stock entry is disabled, removed, or its host is stopping' });
      }
      if (!live(stock!.fiber) && restoreOwed) {
        restoreTicket = ticket;
        await stock!.init(); // Public explicit init bypasses the owned effective-disabled view, not user intent.
        if (foreign() || stale()) { if (ticket.candidate) cancelRestoreCandidate(ticket.candidate); await drain(); return snapshot(); }
      }
      if (live(stock!.fiber)) {
        await stock!.fiber.await();
        if (foreign() || stale()) { if (ticket.candidate) cancelRestoreCandidate(ticket.candidate); await drain(); return snapshot(); }
      }
      await drain();
      if (foreign() || stale()) return snapshot();
      restoreOwed = false;
      if (!canRestore()) return publish({ effective: 'none', phase: 'active', reason: 'Stock entry was disabled or removed during restoration' });
      if (!live(stock!.fiber)) return publish({ effective: 'none', phase: 'failed', reason: 'Native driver failed to restore' });
      return publish({ effective: live(stock!.fiber) && stock!.fiber.state === 2 ? 'stock' : 'none',
        phase: live(stock!.fiber) && stock!.fiber.state === 2 ? 'active' : 'missing-dependency' });
    } finally {
      restoring = false;
      if (restoreTicket === ticket) restoreTicket = undefined;
      // A queued newer off/replacement request retains its view. Settled native,
      // errors, conflict and close always release only our descriptor via CAS.
      if (closing || conflicted || epoch === generation) releaseDisabledView();
    }
  };
  const enqueue = (operation: () => Promise<DriverOwnerSnapshot>) => {
    const task = queue.then(operation).catch(error => publish({ phase: conflicted ? 'conflict' : 'failed', reason: message(error) }));
    queue = task.then(() => {});
    return task;
  };
  const transition = (request: DriverOwnerRequest) => {
    if (closing || conflicted || !checkOwnership()) return Promise.resolve(snapshot());
    const epoch = ++generation;
    state.requested = request.strategy;
    return enqueue(async () => {
      if (closing || epoch !== generation) return snapshot();
      publish({ phase: 'switching' });
      await discover();
      if (closing || epoch !== generation) return snapshot();
      const existing = claims.get(ctx.root);
      if (existing && existing !== claimToken) { conflicted = 'Another Extras distribution already owns the native driver lease'; return publish({ phase: 'conflict', reason: conflicted }); }
      claims.set(ctx.root, claimToken); claimed = true; ensureGuard();
      if (request.strategy === 'activation' || request.strategy === 'native') return restore(epoch);
      if (nativeDisabled()) throw new Error('Unavailable: stock native entry is explicitly disabled');
      await stopOwned();
      if (closing || epoch !== generation) return snapshot();
      if (!canRestore()) throw new Error('Unavailable: native Loader intent changed before suppression');
      installDisabledView();
      suppressed = true;
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
      try {
        if (!stock || !claimed) { await stopOwned(); return snapshot(); }
        return await restore(generation);
      } finally {
        try { await drain(); } finally {
          releaseDisabledView();
          offGuard?.(); offGuard = undefined; offStatus();
          for (const off of checkpointOff.splice(0)) off();
          if (claims.get(ctx.root) === claimToken) claims.delete(ctx.root);
          claimed = false;
        }
      }
    });
    return closeTask;
  };
  offStatus = ctx.root.on('internal/status', fiber => {
    if (!closing) checkOwnership();
    if (closing || conflicted || fiber !== owned?.rawFiber || (state.phase !== 'active' && state.phase !== 'missing-dependency')) return;
    const actual = snapshot();
    if (actual.phase !== state.phase || actual.effective !== state.effective) publish({ phase: actual.phase, effective: actual.effective });
  }, { global: true });
  const onCheckpoint = (event: string, listener: (...args: any[]) => unknown) => {
    checkpointOff.push((ctx.root.on as any)(event, listener, { global: true, prepend: true }));
  };
  for (const event of ['loader/config-update', 'goal/changed', 'agent/status', 'agent/turn-stopping']) {
    onCheckpoint(event, () => { checkOwnership(); });
  }
  onCheckpoint('loader/patch-context', (_entry, next) => { checkOwnership(); return next(); });
  onCheckpoint('agent/pre-step', (_event, next) => { checkOwnership(); return next(); });
  if (options.autoDispose !== false) ctx.effect(() => () => close().then(() => {}));
  return { transition, snapshot, close };
}
