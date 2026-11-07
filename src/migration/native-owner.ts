import type { Fiber } from '@deepseek-ai/cordis';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import type { Distribution, LoaderEntry, NativeMigrationHost, Source, Values } from './types.ts';

const ownerNames = new Set(['goal-round-driver', 'goal-wait-gate', 'goal-wait-startup', 'background-aware-goal-driver', 'goal-wait-owned-native-compatible-driver', 'goal-wait-owned-replacement-driver']);
function within(fiber: Fiber, ancestor: unknown): boolean {
  // Native Loader retains Cordis's public Fiber proxy; registry iteration yields
  // raw fibers. Normalize through the public context rather than comparing proxies.
  const raw = (ancestor as {ctx?: {fiber?: Fiber}} | undefined)?.ctx?.fiber ?? ancestor;
  for (let current: Fiber | undefined = fiber; current; current = current.parent?.fiber) {
    if (current === raw) return true;
    if (current.parent?.fiber === current) break;
  }
  return false;
}

/** Read-only runtime evidence; never acquires a driver slot or edits composition. */
export interface NativeGoalOwner { verified: boolean; stockActive: boolean; reason?: string }
export async function inspectNativeGoalOwner(host: NativeMigrationHost, target: Distribution, sources: Source[], nativeRows: readonly {value: Values; disabled: boolean; dynamic: boolean}[]): Promise<NativeGoalOwner> {
  const ctx = host.continuationContext;
  if (!ctx) return {verified:false,stockActive:false,reason:'programmatic goal continuation ownership cannot be verified offline; restart with native runtime verification required'};
  // Standalone migration has no host peer loader. The explicit installation
  // anchor, never consumer-local resolution, supplies the audited runtime proof.
  let rootLifetime: object;
  try {
    const anchored = createRequire(host.profileContext.installAnchor);
    const manifest = JSON.parse(await readFile(anchored.resolve('@deepseek-ai/cordis/package.json'), 'utf8')) as {name?: unknown; version?: unknown};
    if (manifest.name !== '@deepseek-ai/cordis' || manifest.version !== '4.1.0') return {verified:false,stockActive:false,reason:'unsupported anchored Cordis version; supported native runtime verification required'};
    const { Context } = await import(pathToFileURL(anchored.resolve('@deepseek-ai/cordis')).href) as typeof import('@deepseek-ai/cordis');
    const root = ctx.root;
    if (typeof Context !== 'function' || typeof Context.isolate !== 'symbol' || !(ctx instanceof Context) || !(root instanceof Context) ||
      root.root !== root || root.fiber?.ctx?.root !== root || typeof ctx.get !== 'function' || typeof ctx.registry?.values !== 'function' ||
      !root[Context.isolate] || typeof root[Context.isolate] !== 'object') return {verified:false,stockActive:false,reason:'anchored Cordis Context/root shape cannot be verified; supported native runtime verification required'};
    rootLifetime = root[Context.isolate];
  } catch { return {verified:false,stockActive:false,reason:'anchored Cordis runtime unavailable; verify the explicit host installation and restart with native runtime verification'}; }
  let nativeLoader: {entries(): Iterable<unknown>} | undefined;
  try {
    const anchored = createRequire(host.profileContext.installAnchor);
    const manifest = JSON.parse(await readFile(anchored.resolve('@deepseek-ai/cordis-plugin-loader/package.json'), 'utf8')) as {name?: unknown; version?: unknown};
    if (manifest.name !== '@deepseek-ai/cordis-plugin-loader' || manifest.version !== '1.1.0') return {verified:false,stockActive:false,reason:'unsupported anchored Loader version; supported native runtime verification required'};
    const {default: Loader} = await import(pathToFileURL(anchored.resolve('@deepseek-ai/cordis-plugin-loader')).href) as typeof import('@deepseek-ai/cordis-plugin-loader');
    nativeLoader = ctx.get('loader');
    if (typeof Loader !== 'function' || nativeLoader !== undefined && (!(nativeLoader instanceof Loader) || typeof nativeLoader.entries !== 'function')) return {verified:false,stockActive:false,reason:'anchored Loader runtime identity cannot be verified'};
  } catch { return {verified:false,stockActive:false,reason:'anchored Loader runtime unavailable; supported native runtime verification required'}; }
  const key = Symbol.for('goal-wait-startup.root-lifetime.v1');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  const leases = descriptor?.value;
  if (leases instanceof WeakMap && leases.has(rootLifetime)) return {verified:false,stockActive:false,reason:'unsupported startup root lifetime owner; restart without the experimental startup owner'};
  let originalNative: unknown;
  try {
    const anchored = createRequire(host.profileContext.installAnchor);
    const manifest = JSON.parse(await readFile(anchored.resolve('@deepseek-ai/dsh-goal-round-driver/package.json'), 'utf8')) as {name?: unknown; version?: unknown};
    if (manifest.name !== '@deepseek-ai/dsh-goal-round-driver' || manifest.version !== '0.2.2-rc.1') return {verified:false,stockActive:false,reason:'unsupported anchored native driver version; supported native runtime verification required'};
    const path = anchored.resolve('@deepseek-ai/dsh-goal-round-driver');
    if (createHash('sha256').update(await readFile(path)).digest('hex') !== '1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de') return {verified:false,stockActive:false,reason:'anchored native driver source fingerprint mismatch; supported native runtime verification required'};
    originalNative = (await import(pathToFileURL(path).href)).apply;
    if (typeof originalNative !== 'function') throw new Error('native callback unavailable');
  } catch { return {verified:false,stockActive:false,reason:'native continuation callback identity cannot be verified'}; }
  let stockActive = false;
  let stockCount = 0;
  const marker = Symbol.for('goal-wait-startup.owner-callback.v1');
  const entries = [...host.loader.entries()];
  // Context service access can return distinct scoped proxies. Correlate actual
  // entry objects, not service-proxy identity, against the native service inventory.
  const nativeInventory = new Set<unknown>(nativeLoader?.entries() ?? []);
  const nativeEntries = entries.filter(entry => entry.options.id === 'goal-round-driver' && entry.options.name === '@deepseek-ai/dsh-goal-round-driver');
  const stockEntry = nativeEntries.length === 1 ? nativeEntries[0] : undefined;
  const stockRow = nativeRows.length === 1 ? nativeRows[0] : undefined;
  const nativeFibers = new Set([...ctx.registry.values()].filter(runtime => runtime.callback === originalNative).flatMap(runtime => [...runtime.fibers]));
  const stockTupleMatches = (fiber: Fiber | undefined): boolean => !!fiber && !!stockEntry && nativeInventory.has(stockEntry) &&
    stockEntry.moduleNamespace?.apply === originalNative && stockEntry.fiber?.ctx?.fiber === fiber && fiber.runtime?.callback === originalNative &&
    fiber.ctx.root === ctx.root && (fiber as Fiber & {entry?: unknown}).entry === stockEntry &&
    !!stockRow && stockRow.value.name === '@deepseek-ai/dsh-goal-round-driver' && !stockRow.disabled && !stockRow.dynamic;
  const stockMatches = (fiber: Fiber | undefined): boolean => !!fiber && stockTupleMatches(fiber) && fiber.uid !== null && nativeFibers.has(fiber);
  const stockRaw = stockEntry?.fiber?.ctx?.fiber;
  // Runtime-only suppression leaves the exact disposed Loader pointer in place.
  // It proves known inactivity only, never a new live-stock restoration grant.
  const retiredStock = !!stockRaw && stockTupleMatches(stockRaw) && stockRaw.uid === null && ![...nativeFibers].some(fiber => fiber.uid !== null);
  const mismatch = (): NativeGoalOwner => ({verified:false,stockActive:false,reason:'unverified programmatic native continuation callback: no matching native Loader ownership'});
  if (nativeEntries.length > 1 || nativeEntries.some(entry => !!entry.fiber) && !stockMatches(stockRaw) && !retiredStock) return mismatch();
  const ownsLoaderEntry = (entry: LoaderEntry): boolean => {
    const raw = entry.fiber?.ctx?.fiber;
    return !!raw && nativeInventory.has(entry) && raw.ctx.root === ctx.root && (raw as Fiber & {entry?: unknown}).entry === entry;
  };
  const allowed = entries.filter(entry => ownsLoaderEntry(entry) && (entry.options.id === target.rowId && entry.options.name === (target.packageName ?? target.rowId) || sources.some(source => source.moduleId === 'goalWait' && !source.problem && source.rowId === entry.options.id && (source.moduleName ?? source.packageName) === entry.options.name)));
  for (const runtime of ctx.registry.values()) {
    if ([...runtime.fibers].length && Object.getOwnPropertyDescriptor(runtime.callback, marker)?.value === true) return {verified:false,stockActive:false,reason:'unsupported programmatic startup owner callback'};
    if (runtime.callback === originalNative) {
      for (const fiber of runtime.fibers) if (!allowed.some(entry => within(fiber, entry.fiber))) {
        if (fiber === stockRaw && retiredStock) continue;
        // Callback identity says what runs, not who owns it. A programmatic
        // mount of the exact official callback must never impersonate stock.
        if (!stockMatches(fiber)) return mismatch();
        stockCount++; if (fiber.state === 2) stockActive = true;
      }
    } else if (ownerNames.has(runtime.name ?? '')) for (const fiber of runtime.fibers) {
      if (!allowed.some(entry => within(fiber, entry.fiber))) return {verified:false,stockActive:false,reason:'unverified foreign continuation owner in the actual runtime registry'};
    }
  }
  if (stockCount > 1) return {verified:false,stockActive:false,reason:'multiple native continuation owners require explicit repair'};
  return {verified:true,stockActive};
}
