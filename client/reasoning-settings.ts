import { bindSection, type ConfigForm } from './forms.ts';
import { createReasoningEditor } from './reasoning.ts';
import { capabilityText, type SettingsStatus } from './settings-core.ts';
import type { CapabilityStatus } from './status.ts';
import { MAX_REASONING_RULES, MAX_REASONING_ID_LENGTH, type CompactionReasoningRule } from '../src/modules/compact-context/reasoning-policy.ts';

/** Read-only native metadata; an absent optional remote returns undefined. */
export interface ReasoningCatalogSource { load(): Promise<unknown> | undefined; }
interface NativeEffort { id: string; name: string; description?: string; }
interface NativeCatalogGroup { id: string; models: {id: string; reasoning?: {efforts: NativeEffort[]}}[]; }

/** Selected feature source shared by combined, split, and source consumers. */
export function createReasoningSettingsView(React: any, catalog?: ReasoningCatalogSource) {
  const h = React.createElement;
  const style = { display: 'grid', gap: 12 };
  function ReasoningControl({ form, runtime }: { form: ConfigForm; runtime?: CapabilityStatus }) {
    const [editor] = React.useState(() => createReasoningEditor(form));
    const [metadata, setMetadata] = React.useState({ busy: false, notice: '', groups: [] as NativeCatalogGroup[] });
    const [lifetime] = React.useState(() => ({live: true, generation: 0}));
    React.useEffect(() => { lifetime.live = true; return () => {lifetime.live = false; lifetime.generation++;}; }, [lifetime]);
    async function refresh() {
      if (!lifetime.live || metadata.busy) return;
      const token = ++lifetime.generation;
      setMetadata({busy:true,notice:'',groups:[]});
      let notice = 'Native metadata unavailable. Enter exact native IDs manually.';
      let groups: NativeCatalogGroup[] = [];
      try {
        const result = await catalog?.load() as any;
        if (result?.ok && Array.isArray(result.value?.groups)) {
          groups = result.value.groups.filter((group: any) => typeof group?.id === 'string' && Array.isArray(group.models))
            .map((group: any) => ({id:group.id,models:group.models.filter((model:any)=>typeof model?.id === 'string').map((model:any)=>({
              id:model.id,reasoning:{efforts:Array.isArray(model.reasoning?.efforts) ? model.reasoning.efforts.filter((effort:any)=>typeof effort?.id === 'string' && effort.id.length > 0 && typeof effort.name === 'string') : []},
            }))}));
          notice = result.value.failures?.length ? 'Some native metadata is unavailable. Exact-ID entry remains available.' : 'Native metadata loaded. Choices apply only to an exact provider and model.';
        }
      } catch { /* Never display raw remote/provider errors. */ }
      if (lifetime.live && token === lifetime.generation) setMetadata({busy:false,notice,groups});
    }
    React.useEffect(() => editor.start(), [editor]);
    const draft = React.useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
    const disabled = draft.status !== 'ready' || !draft.writable || draft.revision === undefined || draft.saving;
    return h('fieldset', { 'aria-label': 'Compaction-request reasoning', style },
      h('legend', null, 'Compaction-request reasoning'),
      h('p', {role:'status'}, capabilityText('Reasoning', runtime) + '. Saved configuration does not confirm runtime activation.'),
      h('label', null, h('input', {type: 'checkbox', checked: draft.value.enabled, disabled,
        onChange: (event: any) => editor.setEnabled(event.target.checked)}), ' Enable compaction-request reasoning'),
      h('p', null, 'Priority: provider + model > provider > all. Rule order is not precedence. The winning rule never falls back to a broader rule.'),
      h('small', null, 'Use exact, case-sensitive native IDs, not display names or URLs. Inherit reads the same session’s latest durable reasoning effort; missing inheritance preserves the original request. Fixed replaces the request effort; unsupported IDs fail explicitly at native dispatch.'),
      ...draft.value.rules.map((rule: CompactionReasoningRule, index: number) => {
        const input = (field: 'provider' | 'model' | 'effort', label: string) => h('label', {key:field}, label, h('input', {
          type:'text', 'aria-label':label, value:(rule as any)[field] ?? '', maxLength:MAX_REASONING_ID_LENGTH, disabled, spellCheck:false,
          onChange:(event:any)=>editor.updateRule(index,{[field]:event.target.value}),
        }));
        const efforts: NativeEffort[] = rule.scope === 'provider-model'
          ? metadata.groups.find((group: NativeCatalogGroup)=>group.id === rule.provider)?.models.find((model: NativeCatalogGroup['models'][number])=>model.id === rule.model)?.reasoning?.efforts ?? [] : [];
        return h('fieldset', {key:index,'aria-label':'Rule '+(index+1),style},
          h('legend', null, 'Rule '+(index+1)),
          h('label', null, 'Match scope', h('select', {'aria-label':'Match scope',value:rule.scope,disabled,onChange:(event:any)=>editor.updateRule(index,{scope:event.target.value})},
            h('option',{value:'all'},'All providers and models'),h('option',{value:'provider'},'Provider'),h('option',{value:'provider-model'},'Provider + model'))),
          rule.scope !== 'all' && input('provider','Provider route ID'),
          rule.scope === 'provider-model' && input('model','Model ID'),
          h('label', null, 'Action', h('select', {'aria-label':'Action',value:rule.mode,disabled,onChange:(event:any)=>editor.updateRule(index,{mode:event.target.value})},
            h('option',{value:'inherit'},'Inherit session reasoning'),h('option',{value:'fixed'},'Fixed native effort'))),
          rule.mode === 'fixed' && efforts.length > 0 && h('label', null, 'Advertised effort for exact model', h('select', {
            'aria-label':'Advertised effort for exact model', disabled, value:efforts.some(effort=>effort.id === rule.effort) ? rule.effort : '',
            onChange:(event:any)=>{if(event.target.value !== '') editor.updateRule(index,{effort:event.target.value});},
          }, h('option', {value:''}, 'Choose an advertised native effort…'), ...efforts.map(effort=>h('option', {key:effort.id,value:effort.id}, effort.name.slice(0,200)+' ('+effort.id+')')))),
          rule.mode === 'fixed' && input('effort','Native effort ID'),
          rule.mode === 'fixed' && h('small', null, rule.scope !== 'provider-model' ? 'No universal effort choices exist for all/provider rules. Enter the exact native effort ID.' : efforts.length ? 'Or enter an exact native ID. The host validates support when dispatching this model.' : 'No advertised choices for this exact route and model. Enter the exact native effort ID or refresh metadata.'),
          h('button', {type:'button',disabled,onClick:()=>editor.removeRule(index)}, 'Remove rule'));
      }),
      draft.value.rules.length === 0 && h('p', null, 'No rules. Saving preserves an explicit empty list (no reasoning override).'),
      h('button', {type:'button',disabled:disabled || draft.value.rules.length >= MAX_REASONING_RULES,onClick:()=>editor.addRule()}, 'Add rule'),
      h('small', null, 'At most '+MAX_REASONING_RULES+' rules; IDs at most '+MAX_REASONING_ID_LENGTH+' characters.'),
      h('button', {type:'button',disabled: metadata.busy,onClick:()=>{void refresh();}}, 'Refresh native effort choices'),
      metadata.notice && h('p', {role:'status'}, metadata.notice),
      draft.conflict && h('p', {role:'alert'}, 'Configuration changed. Discard the draft to reload; newer settings will not be overwritten.'),
      draft.error && h('p', {role:'alert'}, draft.error),
      h('button', {type:'button',disabled: disabled || !draft.dirty || draft.conflict,onClick:()=>{void editor.save();}}, 'Save policy'),
      h('button', {type:'button',disabled: draft.saving || !draft.dirty && !draft.conflict,onClick:()=>editor.discard()}, 'Discard policy draft'),
      h('button', {type:'button',disabled:disabled || draft.conflict,onClick:()=>{void editor.reset();}}, 'Reset policy to inherited'));
  }

  return function ReasoningSection({ form, runtime }: { form: ConfigForm; runtime?: NonNullable<SettingsStatus['modules']>['compact-context'] }) {
    return h(ReasoningControl, {
      form: bindSection(form, ['compactionReasoning']), runtime: runtime?.capabilities?.compactionReasoning,
    });
  };
}

/** Optional remote lifetime belongs only to selected reasoning distributions. */
export function createReasoningAdapter(React: any) {
  return {
    createView(ctx: any) {
      let catalogRemote: any;
      ctx.inject(['remote'], (scope: any) => {
        catalogRemote = scope.get('remote');
        return () => { catalogRemote = undefined; };
      });
      return createReasoningSettingsView(React, { load: () => catalogRemote?.session?.modelCatalog() });
    },
  };
}
