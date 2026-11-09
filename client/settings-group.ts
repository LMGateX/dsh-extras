import type { ConfigForm, ConfigFormSnapshot, PathOperation } from './forms.ts';
import { useSettingsText, translateSettingsError, type SettingsLocale } from './settings-ui.ts';

export interface GroupField {
  field: string;
  label: string;
  hint?: string;
  kind?: 'flag' | 'choice' | 'multiline';
  choices?: readonly { value: string; label: string }[];
  format(value: unknown): string | boolean;
  parse(value: string | boolean): unknown;
}
interface GroupDraft {
  values: Record<string, string | boolean>;
  intents: Record<string, 'set' | 'unset'>;
  revision?: number;
  status: ConfigFormSnapshot['status'];
  writable: boolean;
  saving: boolean;
  conflict: boolean;
  error: string;
}
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};

/** One native revision and mutation for a policy, never a queue of sibling saves. */
function createGroupEditor(form: ConfigForm, fields: readonly GroupField[]) {
  const seed = (snapshot: ConfigFormSnapshot): GroupDraft => ({
    values: Object.fromEntries(fields.map(f => [f.field, f.format(record(snapshot.value)[f.field])])),
    intents: {}, revision: snapshot.revision, status: snapshot.status, writable: snapshot.writable,
    saving: false, conflict: false, error: '',
  });
  let state = seed(form.getSnapshot());
  const listeners = new Set<() => void>();
  const publish = (next: GroupDraft) => { state = next; for (const listener of listeners) listener(); };
  const dirty = () => Object.keys(state.intents).length > 0;
  const allowed = () => {
    const current = form.getSnapshot();
    return !state.saving && current.status === 'ready' && current.writable && current.revision !== undefined;
  };
  const sync = () => {
    const next = form.getSnapshot();
    publish(dirty() || state.saving ? { ...state, status: next.status, writable: next.writable,
      conflict: state.conflict || next.revision !== state.revision } : seed(next));
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { const stop = form.subscribe(sync); sync(); return stop; },
    edit(field: string, value: string | boolean) {
      if (allowed()) publish({ ...state, values: { ...state.values, [field]: value }, intents: { ...state.intents, [field]: 'set' }, error: '' });
    },
    reset() {
      if (!allowed() || state.conflict) return;
      const base = record(form.getSnapshot().base);
      publish({ ...state, values: Object.fromEntries(fields.map(f => [f.field, f.format(base[f.field])])),
        intents: Object.fromEntries(fields.map(f => [f.field, 'unset' as const])), error: '' });
    },
    discard() { if (!state.saving) publish(seed(form.getSnapshot())); },
    async save(): Promise<boolean> {
      if (!allowed() || !dirty()) return false;
      const current = form.getSnapshot();
      if (state.conflict || current.revision !== state.revision) {
        publish({ ...state, conflict: true, error: 'Configuration changed. Discard this draft before editing again.' });
        return false;
      }
      let ops: PathOperation[];
      try {
        ops = fields.filter(f => state.intents[f.field]).map(f => state.intents[f.field] === 'unset'
          ? { op: 'unset', path: [f.field] }
          : { op: 'set', path: [f.field], value: f.parse(state.values[f.field]!) });
      } catch (error) {
        publish({ ...state, error: error instanceof Error ? error.message : 'Invalid value.' });
        return false;
      }
      publish({ ...state, saving: true, error: '' });
      try {
        const ok = await form.mutate(ops, state.revision);
        if (ok) {
          const next = form.getSnapshot();
          publish(next.revision !== state.revision ? seed(next) : { ...state, intents: {}, saving: false, conflict: false });
        } else publish({ ...state, saving: false, conflict: true, error: 'Save refused. Discard the draft to load the accepted configuration.' });
        return ok;
      } catch {
        publish({ ...state, saving: false, error: 'Could not save. Check the connection and retry.' });
        return false;
      }
    },
  };
}

export function createSettingsGroupView(React: any, rowId: string, locale?: SettingsLocale) {
  const h = React.createElement;
  return function SettingsGroup({ form, name, label, fields, hint }: {
    form: ConfigForm; name: string; label: string; fields: readonly GroupField[]; hint?: string;
  }) {
    const t = useSettingsText(React, locale);
    const [editor] = React.useState(() => createGroupEditor(form, fields));
    React.useEffect(() => editor.start(), [editor]);
    const draft = React.useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot) as GroupDraft;
    const disabled = draft.status !== 'ready' || !draft.writable || draft.revision === undefined || draft.saving;
    const dirty = Object.keys(draft.intents).length > 0;
    return h('fieldset', { className: 'extras-group', 'data-group': name, 'aria-label': label, 'data-extras-dirty': dirty },
      h('legend', null, label), hint && h('p', null, hint),
      ...fields.map(f => {
        const id = rowId + '-' + f.field;
        const props = { id, 'data-field': f.kind === 'flag' ? f.field : undefined, disabled, value: draft.values[f.field],
          onChange: (event: any) => editor.edit(f.field, f.kind === 'flag' ? Boolean(event.target.checked) : String(event.target.value)) };
        const control = f.kind === 'flag' ? h('input', { ...props, value: undefined, type: 'checkbox', checked: Boolean(draft.values[f.field]) })
          : f.kind === 'choice' ? h('select', props, ...f.choices!.map(choice => h('option', {key:choice.value, value:choice.value}, choice.label)))
          : h(f.kind === 'multiline' ? 'textarea' : 'input', { ...props, type: f.kind === 'multiline' ? undefined : 'text', rows: f.kind === 'multiline' ? 4 : undefined, spellCheck: false });
        return h('div', { key: f.field, className: 'extras-field', 'data-field': f.field },
          f.kind === 'flag' ? h('label', { htmlFor: id }, control, ' ', f.label) : h('label', { htmlFor: id }, f.label),
          f.kind !== 'flag' && control,
          f.hint && h('small', null, f.hint),
          draft.intents[f.field] === 'unset' && h('small', null, t('Will inherit after Save.', '保存后将使用继承值。')));
      }),
      draft.conflict && h('p', {role:'alert'}, t('Configuration changed. Discard the draft to reload; it will not overwrite newer settings.', '配置已更新。请放弃草稿以重新读取；不会覆盖较新的设置。')),
      draft.error && h('p', {role:'alert'}, translateSettingsError(draft.error, t)),
      h('div', { className: 'extras-actions' },
        h('button', {type:'button',className:'extras-primary',disabled:disabled || !dirty || draft.conflict,onClick: () => editor.save()}, t('Save', '保存')),
        h('button', {type:'button',disabled:draft.saving || !dirty && !draft.conflict,onClick: () => editor.discard()}, t('Discard draft', '放弃草稿')),
        h('button', {type:'button',disabled:disabled || draft.conflict,onClick: () => editor.reset()}, t('Reset to inherited', '恢复继承值'))));
  };
}
