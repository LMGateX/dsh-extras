import type { ConfigForm, ConfigFormSnapshot } from './forms.ts';
import {
  resolveCompactionReasoning, validateCompactionReasoning, MAX_REASONING_RULES,
  type CompactionReasoningRule,
} from '../src/modules/compact-context/reasoning-policy.ts';

type RulePatch = {
  scope?: CompactionReasoningRule['scope'];
  mode?: CompactionReasoningRule['mode'];
  provider?: string;
  model?: string;
  effort?: string;
};

/** Staged policy at the native configForms seam. Dirty drafts never rebase Host revisions. */
export function createReasoningEditor(form: ConfigForm) {
  const seed = (snapshot: ConfigFormSnapshot) => ({
    value: resolveCompactionReasoning(snapshot.value), revision: snapshot.revision,
    status: snapshot.status, writable: snapshot.writable,
    dirty: false, saving: false, conflict: false, error: '',
  });
  let state = seed(form.getSnapshot());
  const listeners = new Set<() => void>();
  let live = false;
  let generation = 0;
  const publish = (next: typeof state) => {
    state = next;
    for (const listener of listeners) listener();
  };
  const sync = () => {
    if (!live) return;
    const next = form.getSnapshot();
    publish(state.dirty || state.saving ? {
      ...state, status: next.status, writable: next.writable,
      conflict: state.conflict || state.revision !== next.revision,
    } : seed(next));
  };
  async function submit(reset: boolean): Promise<boolean> {
    const current = form.getSnapshot();
    if (!live || state.saving || current.status !== 'ready' || !current.writable
      || current.revision === undefined) return false;
    if (state.conflict || current.revision !== state.revision) {
      publish({ ...state, conflict: true });
      return false;
    }
    if (!reset) {
      try { validateCompactionReasoning(state.value); }
      catch (error) {
        publish({ ...state, error: error instanceof Error ? error.message : 'Invalid policy.' });
        return false;
      }
    }
    const token = generation;
    const revision = state.revision;
    publish({ ...state, saving: true, error: '' });
    try {
      const ok = await form.mutate(reset
        ? [{ op: 'unset', path: [] }]
        : [{ op: 'set', path: [], value: structuredClone(state.value) }], revision);
      // Native writes have no cancellation port; stop fences every late acknowledgement.
      if (!live || token !== generation) return false;
      if (ok) {
        const next = form.getSnapshot();
        // Native page acceptance may arrive in the following render; never invent a revision.
        publish(next.revision !== revision ? seed(next) : {
          ...state, saving: false, dirty: false, conflict: false,
        });
      } else publish({
        ...state, saving: false, conflict: true,
        error: 'Save refused. Discard the draft to load the accepted configuration.',
      });
      return ok;
    } catch {
      if (live && token === generation) publish({
        ...state, saving: false, error: 'Could not save. Check the connection and retry.',
      });
      return false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start() {
      live = true;
      const token = ++generation;
      const stop = form.subscribe(sync);
      if (state.saving) publish({ ...state, saving: false });
      sync();
      return () => {
        stop();
        if (token === generation) { live = false; generation++; }
      };
    },
    setEnabled(enabled: boolean) {
      if (!state.saving) publish({ ...state, value: { ...state.value, enabled }, dirty: true, error: '' });
    },
    addRule() {
      if (!state.saving && state.value.rules.length < MAX_REASONING_RULES) publish({
        ...state, dirty: true, error: '',
        value: { ...state.value, rules: [...state.value.rules, { scope: 'all', mode: 'inherit' }] },
      });
    },
    removeRule(index: number) {
      if (!state.saving) publish({
        ...state, dirty: true, error: '',
        value: { ...state.value, rules: state.value.rules.filter((_, i) => i !== index) },
      });
    },
    updateRule(index: number, patch: RulePatch) {
      if (state.saving) return;
      const rules = state.value.rules.map((rule, i) => {
        if (i !== index) return rule;
        const next = { ...rule, ...patch };
        const match = next.scope === 'all' ? { scope: 'all' }
          : next.scope === 'provider' ? { scope: 'provider', provider: next.provider ?? '' }
            : { scope: 'provider-model', provider: next.provider ?? '', model: next.model ?? '' };
        const action = next.mode === 'inherit' ? { mode: 'inherit' }
          : { mode: 'fixed', effort: next.effort ?? '' };
        return { ...match, ...action } as CompactionReasoningRule;
      });
      publish({ ...state, dirty: true, error: '', value: { ...state.value, rules } });
    },
    discard() { if (!state.saving) publish(seed(form.getSnapshot())); },
    save: () => submit(false),
    reset: () => submit(true),
  };
}
