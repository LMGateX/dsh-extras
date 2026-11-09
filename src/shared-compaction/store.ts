/** Native profile authority. Only supplied launcher identity and native domain IO. */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import { basename, dirname, isAbsolute } from 'node:path';
import type { Context } from '@deepseek-ai/cordis';
import { defineDomain, type DomainFacility } from '@deepseek-ai/dsh-storage-domain';
import { resolveCompactionReasoning, validateCompactionReasoning, type CompactionReasoningPolicy } from '../modules/compact-context/reasoning-policy.ts';
const requireHost = createRequire(import.meta.url);
// The domain facility's public contract uses its own Zod schemas, not Schemastery.
const { z } = createRequire(requireHost.resolve('@deepseek-ai/dsh-storage-domain'))('zod');
export interface SharedCompactionSnapshot {
    revision: number;
    defaults: CompactionReasoningPolicy;
    workspaceOverrides: Record<string, CompactionReasoningPolicy>;
}
export interface SharedCompactionWrite {
    expectedRevision: number;
    defaults: CompactionReasoningPolicy;
    workspaceOverrides: Record<string, CompactionReasoningPolicy>;
}
export class CompactionConflictError extends Error {
    readonly code = 'revision-conflict';
    constructor() { super('shared compaction revision conflict'); }
}
function data(value: unknown, fields?: string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
        throw new TypeError('plain data required');
    for (const key of Reflect.ownKeys(value)) {
        const d = Object.getOwnPropertyDescriptor(value, key)!;
        if (typeof key !== 'string' || (fields && !fields.includes(key)) || !d.enumerable || !Object.hasOwn(d, 'value'))
            throw new TypeError('unknown or non-data field');
    }
    return value as Record<string, unknown>;
}
function validate(value: unknown): asserts value is SharedCompactionSnapshot {
    const v = data(value, ['revision', 'defaults', 'workspaceOverrides']);
    if (Object.keys(v).length !== 3 || !Number.isSafeInteger(v.revision) || (v.revision as number) < 0)
        throw new TypeError('invalid revision');
    validateCompactionReasoning(v.defaults);
    const overrides = data(v.workspaceOverrides);
    if (Object.keys(overrides).length > 1000)
        throw new TypeError('too many workspace overrides');
    for (const [id, policy] of Object.entries(overrides)) {
        if (!id || id.length > 200 || /[\u0000-\u001f\u007f-\u009f]/u.test(id) || ['__proto__', 'constructor', 'prototype'].includes(id))
            throw new TypeError('invalid workspace id');
        validateCompactionReasoning(policy);
    }
}
const initial: SharedCompactionSnapshot = { revision: 0, defaults: resolveCompactionReasoning(), workspaceOverrides: {} };
const schema = z.custom((value: unknown) => { try {
    validate(value);
    return true;
}
catch {
    return false;
} });
const legacySchema = z.custom((value: unknown) => { try {
    validateCompactionReasoning(value);
    return true;
}
catch {
    return false;
} });
export interface LegacyBootstrapSnapshot {
    policy: CompactionReasoningPolicy;
    moduleEnabled: boolean;
    consumed: boolean;
}
interface LegacyAdoptionSnapshot { policy: CompactionReasoningPolicy; consumed: boolean }
function validateSeed(value: unknown, bootstrap: boolean): void {
    const record = data(value, bootstrap ? ['policy', 'moduleEnabled', 'consumed'] : ['policy', 'consumed']);
    if (Object.keys(record).length !== (bootstrap ? 3 : 2) || typeof record.consumed !== 'boolean'
        || (bootstrap && typeof record.moduleEnabled !== 'boolean')) throw new TypeError('invalid legacy seed record');
    validateCompactionReasoning(record.policy);
}
const seedSchema = (bootstrap: boolean) => z.custom((value: unknown) => { try { validateSeed(value, bootstrap); return true; } catch { return false; } });
function seedKey(source: string): void {
    if (!source || source.length > 2000 || /[\u0000-\u001f\u007f-\u009f]/u.test(source)) throw new TypeError('invalid legacy source');
}
const spec = (profileKey: string) => defineDomain({ name: 'dsh_extras_compaction_' + profileKey, version: 1, global: { schema, initial }, tables: {
    legacy: { valueSchema: legacySchema },
    bootstrap: { valueSchema: seedSchema(true) },
    adoptions: { valueSchema: seedSchema(false) },
} });
/** Called synchronously before irreversible global IO. Direct callers own any
 * lifecycle drain; the completion includes durable receipt acknowledgement. */
export type LegacyCommitObserver = (completion: Promise<void>) => void;
async function irreversibleCommit<T>(onCommit: LegacyCommitObserver | undefined, work: () => Promise<T>): Promise<T> {
    let resolve!: () => void; let reject!: (error: unknown) => void;
    const completion = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
    // A lifecycle observer may join later; the operation's original rejection is
    // still returned to its caller, not converted into a successful ticket.
    void completion.catch(() => {});
    try {
        onCommit?.(completion);
        const result = await work(); resolve(); return result;
    } catch (error) { reject(error); throw error; }
}
export interface SharedCompactionStore {
    read(): SharedCompactionSnapshot;
    write(candidate: SharedCompactionWrite): Promise<SharedCompactionSnapshot>;
    subscribe(listener: () => void): () => void;
    importLegacy(source: 'compact-context' | 'model-policy', policy: CompactionReasoningPolicy, apply?: boolean): Promise<'imported' | 'preserved' | 'conflict'>;
    recoverLegacy(source: 'compact-context' | 'model-policy', expectedRevision: number): Promise<SharedCompactionSnapshot>;
    captureLegacyBootstrap(source: string, candidate: Omit<LegacyBootstrapSnapshot, 'consumed'>, admitted: () => boolean): Promise<LegacyBootstrapSnapshot>;
    completeLegacyBootstrap(source: string, admitted: () => boolean): Promise<void>;
    seedLegacyBootstrap(policy: CompactionReasoningPolicy, admitted: () => boolean, onCommit?: LegacyCommitObserver): Promise<'imported' | 'preserved' | 'cancelled'>;
    adoptLegacyReceipt(source: string, module: 'compact-context' | 'model-policy', policy: CompactionReasoningPolicy, admitted: () => boolean, apply?: boolean, onCommit?: LegacyCommitObserver): Promise<'imported' | 'preserved' | 'conflict' | 'cancelled'>;
    recoverLegacyAdoption(source: string, expectedRevision: number): Promise<SharedCompactionSnapshot>;
}
const PROFILE_FIELDS = ['dir', 'patchPath', 'home', 'installAnchor'] as const;
type NativeProfile = Record<typeof PROFILE_FIELDS[number], string>;
function nativeProfile(ctx: Context): NativeProfile {
    try {
        const value = ctx.get('profileContext') as Partial<NativeProfile> | undefined;
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        const snapshot = {} as NativeProfile;
        for (const field of PROFILE_FIELDS) {
            const path = value[field];
            if (typeof path !== 'string' || !path || !isAbsolute(path) || path.includes('\0')) throw new Error();
            snapshot[field] = path;
        }
        return snapshot;
    } catch { throw new Error('native profile authority unavailable'); }
}
function assertProfile(ctx: Context, expected: NativeProfile): void {
    const current = nativeProfile(ctx);
    if (PROFILE_FIELDS.some(field => current[field] !== expected[field])) throw new Error('profile authority changed');
}
async function nativeProfileKey(ctx: Context, profile: NativeProfile): Promise<string> {
    let directory: string;
    try {
        const [dir, patchDirectory, home] = await Promise.all([
            realpath(profile.dir), realpath(dirname(profile.patchPath)), realpath(profile.home), realpath(profile.installAnchor),
        ]);
        const [directoryInfo, homeInfo] = await Promise.all([stat(dir), stat(home)]);
        if (!directoryInfo.isDirectory() || !homeInfo.isDirectory() || patchDirectory !== dir
            || basename(profile.patchPath) !== 'cordis.patch.yml') throw new Error();
        directory = dir;
    } catch { throw new Error('native profile authority unavailable'); }
    // Refuse a mutable launcher view changing while native metadata was awaited.
    // The key itself uses exactly migration's canonical realpath(dir) basis.
    assertProfile(ctx, profile);
    return createHash('sha256').update(directory).digest('hex');
}
const KEY = Symbol.for('dsh-extras.shared-compaction.store.v1');
interface StoreSlot {
    facility: DomainFacility;
    profileKey: Promise<string>;
    promise: Promise<SharedCompactionStore>;
}
/** All bundled copies in a service root share the exact same domain and CAS chain. */
export function openSharedCompactionStore(ctx: Context): Promise<SharedCompactionStore> {
    const root = ctx.root as Context & {
        [KEY]?: StoreSlot;
    };
    const facility = ctx.get('storageDomain') as DomainFacility | undefined;
    if (!facility)
        return Promise.reject(new Error('native storageDomain unavailable'));
    const previous = root[KEY];
    if (previous && previous.facility !== facility) return Promise.reject(new Error('profile authority changed'));
    let profile: NativeProfile;
    try { profile = nativeProfile(ctx); } catch (error) { return Promise.reject(error); }
    const profileKey = nativeProfileKey(ctx, profile);
    const assertAuthority = () => {
        assertProfile(ctx, profile);
        if (ctx.get('storageDomain') !== facility) throw new Error('profile authority changed');
    };
    if (previous) return Promise.all([profileKey, previous.profileKey]).then(([current, accepted]) => {
        assertAuthority();
        if (current !== accepted) throw new Error('profile authority changed');
        return previous.promise;
    });
    // Reserve synchronously before realpath resolves, so independently bundled
    // callers share one native open and one CAS chain even during cold startup.
    const slot: StoreSlot = { facility, profileKey, promise: Promise.resolve(undefined as never) };
    Object.defineProperty(root, KEY, { value: slot, configurable: true });
    slot.promise = (async () => {
        const key = await profileKey;
        assertAuthority();
        const domain = await facility.open(spec(key));
        try { assertAuthority(); } catch (error) { await domain.close(); throw error; }
        let queue: Promise<unknown> = Promise.resolve();
        let closed = false;
        const listeners = new Set<() => void>();
        root.effect(() => async () => { closed = true; await queue; await domain.close(); if (root[KEY] === slot)
            Reflect.deleteProperty(root, KEY); });
        const notify = () => { for (const listener of listeners) {
            try {
                listener();
            }
            catch { /* durable success */ }
        } };
        const enqueue = <T>(work: () => Promise<T>): Promise<T> => { const result = queue.then(() => { if (closed)
            throw new Error('profile authority closed'); return work(); }); queue = result.catch(() => { }); return result; };
        const legacy = domain.table('legacy');
        const bootstrap = domain.table('bootstrap');
        const adoptions = domain.table('adoptions');
        return {
            captureLegacyBootstrap(source, candidate, admitted) {
                seedKey(source);
                const snapshot: LegacyBootstrapSnapshot = { policy: resolveCompactionReasoning(candidate.policy), moduleEnabled: candidate.moduleEnabled, consumed: false };
                validateSeed(snapshot, true);
                return enqueue(async () => {
                    const previous = bootstrap.get(source) as LegacyBootstrapSnapshot | undefined;
                    if (previous) { validateSeed(previous, true); return structuredClone(previous); }
                    if (!admitted()) throw new Error('legacy bootstrap owner disposed');
                    await bootstrap.put(source, snapshot);
                    return structuredClone(snapshot);
                });
            },
            completeLegacyBootstrap(source, admitted) {
                seedKey(source);
                return enqueue(async () => {
                    if (!admitted()) return;
                    const previous = bootstrap.get(source) as LegacyBootstrapSnapshot | undefined;
                    if (!previous) throw new Error('legacy bootstrap snapshot unavailable');
                    validateSeed(previous, true);
                    if (!previous.consumed) await bootstrap.put(source, { ...previous, consumed: true });
                });
            },
            seedLegacyBootstrap(policy, admitted, onCommit) {
                const backup = resolveCompactionReasoning(policy);
                return enqueue(async () => {
                    if (!admitted()) return 'cancelled';
                    const current = domain.global.get(); validate(current);
                    if (current.revision !== 0) return 'preserved';
                    const next = { ...current, revision: 1, defaults: backup };
                    validate(next);
                    return irreversibleCommit(onCommit, async () => {
                        if (!admitted()) return 'cancelled' as const;
                        await domain.global.set(next); notify(); return 'imported' as const;
                    });
                });
            },
            adoptLegacyReceipt(source, module, policy, admitted, apply = true, onCommit) {
                seedKey(source);
                const backup = resolveCompactionReasoning(policy);
                return enqueue(async () => {
                    if (!admitted()) return 'cancelled';
                    const previous = adoptions.get(source) as LegacyAdoptionSnapshot | undefined;
                    if (previous) {
                        validateSeed(previous, false);
                        if (JSON.stringify(previous.policy) !== JSON.stringify(backup)) throw new TypeError('legacy adoption receipt reused with different policy');
                        if (previous.consumed) return domain.global.get().revision === 0 ? 'conflict' : 'preserved';
                    } else await adoptions.put(source, { policy: backup, consumed: false });
                    if (!admitted()) return 'cancelled';
                    if (!legacy.get(module)) await legacy.put(module, backup);
                    if (!admitted()) return 'cancelled';
                    const current = domain.global.get(); validate(current);
                    const result = current.revision !== 0 ? 'preserved' : apply ? 'imported' : 'conflict';
                    if (result === 'imported') return irreversibleCommit(onCommit, async () => {
                        // This final fence ends cancellable admission. A later owner
                        // closure must drain, not relabel a durable write cancelled.
                        if (!admitted()) return 'cancelled' as const;
                        await domain.global.set({ ...current, revision: 1, defaults: backup });
                        notify();
                        // A failed acknowledgement rejects honestly with the global
                        // already committed; the immutable pending receipt can retry.
                        await adoptions.put(source, { policy: backup, consumed: true });
                        return 'imported' as const;
                    });
                    if (!admitted()) return 'cancelled';
                    await adoptions.put(source, { policy: backup, consumed: true });
                    return result;
                });
            },
            recoverLegacyAdoption(source, expectedRevision) {
                seedKey(source);
                return enqueue(async () => {
                    const current = domain.global.get(); validate(current);
                    if (current.revision !== expectedRevision) throw new CompactionConflictError();
                    const previous = adoptions.get(source) as LegacyAdoptionSnapshot | undefined;
                    if (!previous) throw new TypeError('legacy adoption backup unavailable');
                    validateSeed(previous, false);
                    const next = { ...current, revision: current.revision + 1, defaults: previous.policy };
                    validate(next); await domain.global.set(next); notify(); return structuredClone(next);
                });
            },
            async importLegacy(source, policy, apply = true) {
                const backup = resolveCompactionReasoning(policy);
                return enqueue(async () => {
                    const previous = legacy.get(source);
                    const current = domain.global.get();
                    validate(current);
                    // Save the exact inert input before any import. Retries never rewrite this backup.
                    if (!previous)
                        await legacy.put(source, backup);
                    if (!apply)
                        return 'conflict';
                    if (current.revision !== 0)
                        return JSON.stringify(current.defaults) === JSON.stringify(backup) || previous ? 'preserved' : 'conflict';
                    const next = { ...current, revision: 1, defaults: previous ?? backup };
                    validate(next);
                    await domain.global.set(next);
                    notify();
                    return 'imported';
                });
            }, recoverLegacy(source, expectedRevision) {
                return enqueue(async () => {
                    const current = domain.global.get();
                    validate(current);
                    if (current.revision !== expectedRevision)
                        throw new CompactionConflictError();
                    const backup = legacy.get(source);
                    if (!backup)
                        throw new TypeError('legacy backup unavailable');
                    const next = { ...current, revision: current.revision + 1, defaults: backup };
                    validate(next);
                    await domain.global.set(next);
                    notify();
                    return structuredClone(next);
                });
            }, read() { if (closed)
                throw new Error('profile authority closed'); const value = domain.global.get(); validate(value); return structuredClone(value); },
            write(candidate: SharedCompactionWrite) {
                // Detach before queuing: a caller cannot mutate a pending candidate.
                let next: SharedCompactionSnapshot;
                try {
                    const input = data(candidate, ['expectedRevision', 'defaults', 'workspaceOverrides']);
                    if (Object.keys(input).length !== 3)
                        throw new TypeError('incomplete candidate');
                    next = { revision: input.expectedRevision as number, defaults: input.defaults as CompactionReasoningPolicy, workspaceOverrides: input.workspaceOverrides as Record<string, CompactionReasoningPolicy> };
                    validate(next);
                    next = structuredClone(next);
                }
                catch (error) {
                    return Promise.reject(error);
                }
                const result = queue.then(async () => { if (closed)
                    throw new Error('profile authority closed'); const current = domain.global.get(); validate(current); if (current.revision !== next.revision)
                    throw new CompactionConflictError(); next.revision++; validate(next); await domain.global.set(next); for (const listener of listeners) {
                    try {
                        listener();
                    }
                    catch { /* notifications cannot roll back durable success */ }
                } return structuredClone(next); });
                queue = result.catch(() => { });
                return result;
            }, subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; } };
    })();
    slot.promise.catch(() => { if (root[KEY] === slot)
        Reflect.deleteProperty(root, KEY); });
    return slot.promise;
}
