import { Context, type Fiber } from '@deepseek-ai/cordis';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import type { Distribution, NativeMigrationHost, Source } from './types.ts';

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
export async function inspectNativeGoalOwner(host: NativeMigrationHost, target: Distribution, sources: Source[]): Promise<NativeGoalOwner> {
  const ctx = host.continuationContext;
  if (!ctx) return {verified:false,stockActive:false,reason:'programmatic goal continuation ownership cannot be verified offline; restart with native runtime verification required'};
  const key = Symbol.for('goal-wait-startup.root-lifetime.v1');
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, key);
  const leases = descriptor?.value;
  if (leases instanceof WeakMap && leases.has(ctx.root[Context.isolate])) return {verified:false,stockActive:false,reason:'unsupported startup root lifetime owner; restart without the experimental startup owner'};
  let originalNative: unknown;
  try {
    const path = createRequire(host.profileContext.installAnchor).resolve('@deepseek-ai/dsh-goal-round-driver');
    originalNative = (await import(pathToFileURL(path).href)).apply;
    if (typeof originalNative !== 'function') throw new Error('native callback unavailable');
  } catch { return {verified:false,stockActive:false,reason:'native continuation callback identity cannot be verified'}; }
  let stockActive = false;
  let stockCount = 0;
  const marker = Symbol.for('goal-wait-startup.owner-callback.v1');
  const entries = [...host.loader.entries()];
  const allowed = entries.filter(entry => entry.options.id === target.rowId && entry.options.name === (target.packageName ?? target.rowId) || sources.some(source => source.moduleId === 'goalWait' && !source.problem && source.rowId === entry.options.id && (source.moduleName ?? source.packageName) === entry.options.name));
  for (const runtime of ctx.registry.values()) {
    if ([...runtime.fibers].length && Object.getOwnPropertyDescriptor(runtime.callback, marker)?.value === true) return {verified:false,stockActive:false,reason:'unsupported programmatic startup owner callback'};
    if (runtime.callback === originalNative) {
      for (const fiber of runtime.fibers) if (!allowed.some(entry => within(fiber, entry.fiber))) {
        stockCount++; if (fiber.state === 2) stockActive = true;
      }
    } else if (ownerNames.has(runtime.name ?? '')) for (const fiber of runtime.fibers) {
      if (!allowed.some(entry => within(fiber, entry.fiber))) return {verified:false,stockActive:false,reason:'unverified foreign continuation owner in the actual runtime registry'};
    }
  }
  if (stockCount > 1) return {verified:false,stockActive:false,reason:'multiple native continuation owners require explicit repair'};
  return {verified:true,stockActive};
}
