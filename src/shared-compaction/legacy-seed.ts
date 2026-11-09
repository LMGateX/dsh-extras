/** Accepted root configuration is the only seed input. Never infer raw/profile provenance. */
import type { Context } from '@deepseek-ai/cordis';
import { resolveCompactionReasoning, type CompactionReasoningPolicy } from '../modules/compact-context/reasoning-policy.ts';
import { openSharedCompactionStore, type SharedCompactionSnapshot } from './store.ts';
type Module = 'compact-context' | 'model-policy';
interface Entry {
    module: Module;
    distribution: string;
    getConfig: () => Record<string, unknown>;
    live: boolean;
}
export interface LegacySeedDiagnostic {
    phase: 'none' | 'pending' | 'imported' | 'preserved' | 'conflict' | 'unavailable';
    sources: {
        module: Module;
        distribution: string;
        provenance: 'accepted-module-config';
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
    const entry: Entry = { module, distribution, getConfig, live: true };
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
    state.pending = Promise.resolve().then(async () => {
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
            for (const entry of entries) {
                const config = entry.getConfig();
                const policy = resolveCompactionReasoning(config.compactionReasoning);
                // A resolved getter cannot prove explicit/raw source provenance. Only nondefault
                // data is a safe import candidate; exact defaults remain an unmaterialized placeholder.
                if (JSON.stringify(policy) === placeholder)
                    continue;
                const moduleEnabled = config.enabled === undefined ? entry.module === 'compact-context' : config.enabled === true;
                sources.push({ module: entry.module, distribution: entry.distribution, provenance: 'accepted-module-config', explicitness: 'unverified', moduleEnabled, participationEnabled: policy.enabled });
                candidates.push({ entry, policy });
            }
            state.diagnostic = { phase: 'pending', sources };
            if (!candidates.length) {
                state.diagnostic = { phase: 'none', sources };
                return;
            }
            const store = await openSharedCompactionStore(ctx.root);
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
                return;
            }
            if (candidates.some(c => JSON.stringify(c.policy) !== JSON.stringify(candidates[0]!.policy))) {
                state.diagnostic = { phase: 'conflict', sources, reason: 'inconsistent accepted legacy inputs; explicit canonical save required' };
                return;
            }
            if (!admitted())
                return;
            try {
                await store.write({ expectedRevision: 0, defaults: candidates[0]!.policy, workspaceOverrides: current.workspaceOverrides });
                state.diagnostic = { phase: 'imported', sources };
            }
            catch (error) {
                if ((error as {
                    code?: string;
                })?.code !== 'revision-conflict')
                    throw error;
                state.diagnostic = { phase: 'preserved', sources, reason: 'accepted canonical policy wins over legacy input' };
            }
        }
        catch {
            if (admitted())
                state.diagnostic = { phase: 'unavailable', sources: state.diagnostic.sources, reason: 'accepted legacy input or native profile authority unavailable' };
        }
    }).finally(() => { state.pending = undefined; });
    return state.pending;
}
