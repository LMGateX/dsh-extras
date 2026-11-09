/** Accepted root configuration is the only seed input. Never infer raw/profile provenance. */
import type { Context } from '@deepseek-ai/cordis';
import { resolveCompactionReasoning, type CompactionReasoningPolicy } from '../modules/compact-context/reasoning-policy.ts';
import { openSharedCompactionStore, type SharedCompactionSnapshot, type LegacyBootstrapSnapshot } from './store.ts';
type Module = 'compact-context' | 'model-policy';
export interface LegacyCompactionAdoptionReceipt { operationId: string; sourceModuleId: string }
/** Server-only handoff from a journal-proven applied migration, never a live config edit. */
export async function adoptLegacyCompactionSeed(ctx: Context, module: Module, config: Record<string, unknown>, receipt: LegacyCompactionAdoptionReceipt): Promise<void> {
    if (!receipt || receipt.sourceModuleId !== module || typeof receipt.operationId !== 'string'
        || !receipt.operationId || receipt.operationId.length > 256 || /[\u0000-\u001f\u007f-\u009f]/u.test(receipt.operationId))
        throw new TypeError('invalid legacy adoption receipt');
    // Capture before awaiting: neither a caller nor a later accepted local edit can
    // rewrite this migration's input while the native backend is busy.
    const policy = resolveCompactionReasoning(config.compactionReasoning);
    const moduleEnabled = config.enabled === undefined ? module === 'compact-context' : config.enabled === true;
    const state = registry(ctx);
    const owners = [...(state?.entries ?? [])].filter(e => e.live && e.owner === ctx.fiber && e.module === module);
    if (!state || owners.length !== 1) throw new Error('legacy adoption settings owner unavailable or ambiguous');
    const entry = owners[0]!;
    const operationId = receipt.operationId;
    const source = JSON.stringify(['migration', entry.distribution, module, operationId, receipt.sourceModuleId]);
    await prepareLegacyCompactionSeeds(ctx);
    const generation = state.generation;
    const admitted = () => entry.live && entry.owner === ctx.fiber && state.entries.has(entry) && state.generation === generation;
    if (!admitted()) throw new Error('legacy adoption owner disposed');
    const store = await openSharedCompactionStore(ctx.root);
    const result = await store.adoptLegacyReceipt(source, module, policy, admitted, state.diagnostic.phase !== 'conflict');
    if (result === 'cancelled' || !admitted()) throw new Error('legacy adoption owner disposed');
    state.diagnostic = { phase: result, sources: [{ module, distribution: entry.distribution, provenance: 'migration-operation',
        explicitness: 'unverified', operationId, moduleEnabled, participationEnabled: policy.enabled }] };
    state.adopted = true;
}
interface Entry {
    module: Module;
    distribution: string;
    initial?: Omit<LegacyBootstrapSnapshot, 'consumed'>;
    owner: Context['fiber'];
    live: boolean;
}
export interface LegacySeedDiagnostic {
    phase: 'none' | 'pending' | 'imported' | 'preserved' | 'conflict' | 'unavailable';
    sources: {
        module: Module;
        distribution: string;
        provenance: 'accepted-module-config' | 'migration-operation';
        operationId?: string;
        explicitness: 'unverified';
        moduleEnabled: boolean;
        participationEnabled: boolean;
    }[];
    reason?: string;
}
interface Registry {
    entries: Set<Entry>;
    generation: number;
    pending?: Promise<void>;
    diagnostic: LegacySeedDiagnostic;
    adopted?: boolean;
}
const KEY = Symbol.for('dsh-extras.shared-compaction.legacy-seeds.v1');
function registry(ctx: Context, create = false): Registry | undefined {
    const root = ctx.root as Context & {
        [KEY]?: Registry;
    };
    if (!root[KEY] && create)
        Object.defineProperty(root, KEY, { value: { entries: new Set(), generation: 0, diagnostic: { phase: 'none', sources: [] } }, configurable: true });
    return root[KEY];
}
export function hasLegacyCompactionSeeds(ctx: Context): boolean { return !!registry(ctx)?.entries.size; }
export function legacyCompactionSeedStatus(ctx: Context, snapshot?: SharedCompactionSnapshot): LegacySeedDiagnostic | undefined {
    const value = registry(ctx)?.diagnostic;
    if (!value)
        return;
    return structuredClone(value.phase === 'conflict' && snapshot && snapshot.revision > 0 ? { ...value, phase: 'preserved' as const, reason: 'accepted canonical policy wins over legacy input' } : value);
}
/** Register settings-root input even when the whole feature fiber is absent. */
export function mountLegacyCompactionSeed(ctx: Context, module: Module, distribution: string, getConfig?: () => Record<string, unknown>): void {
    if (!getConfig)
        return;
    const state = registry(ctx, true)!;
    let initial: Entry['initial'];
    try {
        const config = getConfig();
        initial = { policy: resolveCompactionReasoning(config.compactionReasoning),
            moduleEnabled: config.enabled === undefined ? module === 'compact-context' : config.enabled === true };
    } catch { /* Invalid accepted input is reported fail closed by preparation. */ }
    const entry: Entry = { module, distribution, initial, owner: ctx.fiber, live: true };
    state.entries.add(entry);
    state.generation++;
    ctx.effect(() => () => { entry.live = false; state.entries.delete(entry); state.generation++; });
    ctx.inject(['storageDomain'], () => { void prepareLegacyCompactionSeeds(ctx); });
}
/** Deferred same-root batch, so two settings surfaces cannot import by load order. */
export function prepareLegacyCompactionSeeds(ctx: Context): Promise<void> {
    const state = registry(ctx);
    if (!state || !state.entries.size)
        return Promise.resolve();
    if (state.pending)
        return state.pending;
    let processedGeneration = state.generation;
    const batch = async () => {
        const generation = state.generation;
        const entries = [...state.entries].filter(e => e.live);
        const admitted = () => generation === state.generation && entries.every(e => e.live) && entries.length > 0;
        try {
            const candidates: {
                entry: Entry;
                policy: CompactionReasoningPolicy;
            }[] = [];
            const sources: LegacySeedDiagnostic['sources'] = [];
            const placeholder = JSON.stringify(resolveCompactionReasoning());
            let consumedNondefault = false;
            const store = await openSharedCompactionStore(ctx.root);
            const sourceKey = (entry: Entry) => JSON.stringify(['bootstrap', entry.distribution, entry.module]);
            const complete = async () => { for (const entry of entries) await store.completeLegacyBootstrap(sourceKey(entry), admitted); };
            for (const entry of entries) {
                if (!admitted()) return;
                if (!entry.initial) throw new TypeError('invalid accepted bootstrap input');
                const snapshot = await store.captureLegacyBootstrap(sourceKey(entry), entry.initial, admitted);
                if (!admitted()) return;
                const policy = snapshot.policy;
                // A resolved getter cannot prove explicit/raw source provenance. Only nondefault
                // data is a safe import candidate; exact defaults remain an unmaterialized placeholder.
                if (JSON.stringify(policy) === placeholder)
                    continue;
                if (snapshot.consumed) consumedNondefault = true;
                const moduleEnabled = snapshot.moduleEnabled;
                sources.push({ module: entry.module, distribution: entry.distribution, provenance: 'accepted-module-config', explicitness: 'unverified', moduleEnabled, participationEnabled: policy.enabled });
                candidates.push({ entry, policy });
            }
            if (!candidates.length) {
                if (!state.adopted) state.diagnostic = { phase: 'none', sources };
                await complete();
                return;
            }
            state.diagnostic = { phase: 'pending', sources };
            if (!admitted())
                return;
            // Backup-only operations never choose a winner and never alter the authority.
            for (const candidate of candidates) {
                if (!admitted())
                    return;
                await store.importLegacy(candidate.entry.module, candidate.policy, false);
            }
            if (!admitted())
                return;
            const current = store.read();
            if (current.revision !== 0) {
                state.diagnostic = { phase: 'preserved', sources, reason: 'accepted canonical policy wins over legacy input' };
                await complete();
                return;
            }
            if (consumedNondefault || candidates.some(c => JSON.stringify(c.policy) !== JSON.stringify(candidates[0]!.policy))) {
                state.diagnostic = { phase: 'conflict', sources, reason: 'inconsistent accepted legacy inputs; explicit canonical save required' };
                await complete();
                return;
            }
            if (!admitted())
                return;
            const result = await store.seedLegacyBootstrap(candidates[0]!.policy, admitted);
            if (result === 'cancelled') return;
            state.diagnostic = { phase: result, sources };
            await complete();
        }
        catch {
            if (admitted())
                state.diagnostic = { phase: 'unavailable', sources: state.diagnostic.sources, reason: 'accepted legacy input or native profile authority unavailable' };
        }
    };
    // A joining/remounting source invalidates the old batch; drain that actual
    // generation change before releasing existing participants. Never retry an
    // unchanged failed input or native IO operation by polling.
    state.pending = Promise.resolve().then(async () => {
        do {
            processedGeneration = state.generation;
            await batch();
        } while (state.entries.size > 0 && state.generation !== processedGeneration);
    }).finally(() => { state.pending = undefined; }).then(() => {
        // Catch an enrollment between batch completion and this promise turn.
        if (state.entries.size > 0 && state.generation !== processedGeneration) return prepareLegacyCompactionSeeds(ctx.root);
    });
    return state.pending;
}
