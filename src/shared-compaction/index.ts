import type { Context } from '@deepseek-ai/cordis';
import type { GenerateOptions } from '@deepseek-ai/dsh-llm';
import { installCompactionReasoning, type ReasoningCapability } from './runtime.ts';
import { resolveCompactionReasoning, type CompactionReasoningPolicy } from '../modules/compact-context/reasoning-policy.ts';
import { openSharedCompactionStore, type SharedCompactionStore, type SharedCompactionSnapshot } from './store.ts';
import { canonicalCompactionRequired } from './routes.ts';
import { resolveSessionWorkspace } from './workspace.ts';
import { prepareLegacyCompactionSeeds, hasLegacyCompactionSeeds, legacyCompactionSeedStatus } from './legacy-seed.ts';
export { mountSharedCompactionRoutes } from './routes.ts';
export { openSharedCompactionStore } from './store.ts';
export type { SharedCompactionSnapshot, SharedCompactionWrite } from './store.ts';
export type { CompactionReasoningPolicy } from '../modules/compact-context/reasoning-policy.ts';
export type CompactionParticipant = 'compact-context' | 'model-policy';
export interface SharedCompactionStatus {
    phase: 'disabled' | 'active' | 'standby' | 'handover' | 'unavailable';
    executor?: CompactionParticipant;
    reason?: string;
    revision?: number;
    participating?: boolean;
    acceptedEnabled?: boolean;
    legacyPolicy?: 'imported' | 'preserved' | 'conflict';
}
export interface ParticipationOptions {
    module: CompactionParticipant;
    policy: CompactionReasoningPolicy;
    workspaceForSession?: (sessionId: string, ctx: Context) => string | undefined | Promise<string | undefined>;
}
interface Participant {
    ctx: Context;
    options: ParticipationOptions;
    status: (value: SharedCompactionStatus) => void;
    legacyPolicy?: 'imported' | 'preserved' | 'conflict';
}
interface Coordinator {
    participants: Set<Participant>;
    selected?: Participant;
    stop?: () => void;
    capability: ReasoningCapability;
    store?: SharedCompactionStore;
    opening?: Promise<void>;
    storeError?: boolean;
    reconcile(): void;
    ready(): Promise<void>;
}
const KEY = Symbol.for('dsh-extras.shared-compaction.v1');
const OFF = resolveCompactionReasoning();
const meaningful = (policy: CompactionReasoningPolicy): boolean => policy.enabled || JSON.stringify(policy) !== JSON.stringify(OFF);
function ambiguousSeeds(state: Coordinator): boolean {
    const policies = [...state.participants].map(p => p.options.policy).filter(meaningful);
    return policies.some(p => JSON.stringify(p) !== JSON.stringify(policies[0]));
}
function coordinator(ctx: Context): Coordinator {
    const root = ctx.root as Context & {
        [KEY]?: Coordinator;
    };
    if (root[KEY])
        return root[KEY];
    const state: Coordinator = {
        participants: new Set(), capability: { phase: 'disabled' },
        ready() {
            if (!state.opening && (root.get('storageDomain') || canonicalCompactionRequired(root))) {
                state.opening = openSharedCompactionStore(root).then(async store => {
                    await prepareLegacyCompactionSeeds(root);
                    state.store = store;
                    store.subscribe(() => state.reconcile());
                }, () => { state.storeError = true; }).then(() => state.reconcile());
            }
            return state.opening ?? Promise.resolve();
        },
        reconcile() {
            const enabled = [...state.participants].filter(p => p.options.policy.enabled);
            const duplicates = enabled.some((p, i) => enabled.slice(i + 1).some(q => p.options.module === q.options.module));
            let snapshot: SharedCompactionSnapshot | undefined;
            try {
                snapshot = state.store?.read();
            }
            catch {
                state.storeError = true;
            }
            const waiting = state.storeError || (!!state.opening && !state.store) || (!state.store && canonicalCompactionRequired(root));
            const ambiguous = snapshot?.revision === 0 && (ambiguousSeeds(state) || legacyCompactionSeedStatus(root, snapshot)?.phase === 'conflict');
            const acceptedEnabled = snapshot ? snapshot.defaults.enabled || Object.values(snapshot.workspaceOverrides).some(p => p.enabled) : true;
            const selected = duplicates || waiting || ambiguous || !acceptedEnabled ? undefined
                : enabled.find(p => p.options.module === 'compact-context') ?? enabled[0];
            if (selected !== state.selected) {
                state.stop?.();
                state.stop = undefined;
                state.selected = selected;
                state.capability = { phase: 'disabled' };
                if (selected)
                    state.stop = installCompactionReasoning(root, (callCtx, options) => capturePolicy(selected, callCtx, options), value => { state.capability = value; publish(); });
            }
            publish();
            function capturePolicy(selected: Participant, callCtx: Context, options: GenerateOptions): CompactionReasoningPolicy | Promise<CompactionReasoningPolicy> {
                if (!state.store)
                    return selected.options.policy;
                const captured = state.store.read();
                if (Object.keys(captured.workspaceOverrides).length === 0)
                    return captured.defaults;
                if (typeof options.sessionId !== 'string')
                    return OFF;
                const resolve = selected.options.workspaceForSession ?? ((id: string, ctx: Context) => resolveSessionWorkspace(ctx, id, options.signal));
                // The canonical snapshot is detached before the asynchronous native identity read.
                return Promise.resolve(resolve(options.sessionId, callCtx)).then(id => id ? (Object.hasOwn(captured.workspaceOverrides, id) ? captured.workspaceOverrides[id]! : captured.defaults) : OFF, () => OFF);
            }
            function publish(): void {
                for (const p of state.participants) {
                    const common = { participating: p.options.policy.enabled, acceptedEnabled,
                        ...(snapshot ? { revision: snapshot.revision } : {}), ...(p.legacyPolicy ? { legacyPolicy: p.legacyPolicy } : {}) };
                    let value: SharedCompactionStatus;
                    if (!p.options.policy.enabled)
                        value = { phase: 'disabled', ...common };
                    else if (duplicates || ambiguous)
                        value = { phase: 'unavailable', reason: duplicates ? 'duplicate module participation' : 'inconsistent legacy compaction inputs; explicit canonical save required', ...common };
                    else if (waiting)
                        value = { phase: state.storeError ? 'unavailable' : 'handover', reason: state.storeError ? 'canonical profile authority unavailable' : 'opening canonical profile authority', ...common };
                    else if (!acceptedEnabled)
                        value = { phase: 'disabled', ...common };
                    else if (p === state.selected)
                        value = { ...state.capability, executor: selected?.options.module, ...common };
                    else
                        value = { phase: state.capability.phase === 'unavailable' ? 'unavailable' : 'standby', executor: selected?.options.module, ...common, ...(state.capability.reason ? { reason: state.capability.reason } : {}) };
                    p.status(value);
                }
            }
        },
    };
    Object.defineProperty(root, KEY, { value: state, configurable: true });
    return state;
}
/** One participant owns effects; all distribution copies share the host-root coordinator. */
export function participateCompaction(ctx: Context, options: ParticipationOptions, status: (value: SharedCompactionStatus) => void) {
    const state = coordinator(ctx);
    const p: Participant = { ctx, options: { ...options, policy: resolveCompactionReasoning(options.policy) }, status };
    state.participants.add(p);
    let disposed = false;
    const ready = state.ready().then(async () => {
        if (disposed || !state.store)
            return;
        // Disabled new-module placeholders must not preempt an old explicit seed.
        if (!hasLegacyCompactionSeeds(ctx) && meaningful(p.options.policy))
            p.legacyPolicy = await state.store.importLegacy(p.options.module, p.options.policy, state.store.read().revision !== 0 || !ambiguousSeeds(state));
        if (!disposed)
            state.reconcile();
    }).catch(() => { state.storeError = true; if (!disposed)
        state.reconcile(); });
    state.reconcile();
    const handle = {
        ready,
        update(policy: CompactionReasoningPolicy) {
            if (disposed)
                return;
            p.options = { ...p.options, policy: resolveCompactionReasoning(policy) };
            state.reconcile();
        },
        dispose() {
            if (disposed)
                return;
            disposed = true;
            state.participants.delete(p);
            state.reconcile();
        },
    };
    ctx.effect(() => () => handle.dispose());
    return handle;
}
