/** Native profile authority. No path discovery, private backend access or profile-file IO. */
import { createRequire } from 'node:module';
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
const spec = defineDomain({ name: 'dsh_extras_compaction', version: 1, global: { schema, initial }, tables: { legacy: { valueSchema: legacySchema } } });
export interface SharedCompactionStore {
    read(): SharedCompactionSnapshot;
    write(candidate: SharedCompactionWrite): Promise<SharedCompactionSnapshot>;
    subscribe(listener: () => void): () => void;
    importLegacy(source: 'compact-context' | 'model-policy', policy: CompactionReasoningPolicy, apply?: boolean): Promise<'imported' | 'preserved' | 'conflict'>;
    recoverLegacy(source: 'compact-context' | 'model-policy', expectedRevision: number): Promise<SharedCompactionSnapshot>;
}
const KEY = Symbol.for('dsh-extras.shared-compaction.store.v1');
interface StoreSlot {
    facility: DomainFacility;
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
    if (previous) {
        if (previous.facility !== facility)
            return Promise.reject(new Error('profile authority changed'));
        return previous.promise;
    }
    const slot: StoreSlot = { facility, promise: Promise.resolve(undefined as never) };
    Object.defineProperty(root, KEY, { value: slot, configurable: true });
    slot.promise = (async () => {
        const domain = await facility.open(spec);
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
        return { async importLegacy(source, policy, apply = true) {
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
