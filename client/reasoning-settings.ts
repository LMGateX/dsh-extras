import { bindSection, type ConfigForm } from './forms.ts';
import { createReasoningEditor } from './reasoning.ts';
import { capabilityText, type SettingsStatus } from './settings-core.ts';
import { useSettingsText, translateSettingsError, type SettingsLocale } from './settings-ui.ts';
import type { CapabilityStatus } from './status.ts';
import { MAX_REASONING_RULES, MAX_REASONING_ID_LENGTH, type CompactionReasoningRule } from '../src/modules/compact-context/reasoning-policy.ts';

/** Read-only native metadata; an absent optional remote returns undefined. */
export interface ReasoningCatalogSource { load(): Promise<unknown> | undefined; }
interface NativeEffort { id: string; name: string; description?: string; }
interface NativeCatalogGroup { id: string; models: {id: string; reasoning?: {efforts: NativeEffort[]}}[]; }
type MetadataNotice = '' | 'unavailable' | 'partial' | 'loaded';

/** Keep selected-feature validation copy out of unrelated split payloads. */
function translateReasoningError(error: string, t: (en: string, zh: string) => string): string {
  const messages: Record<string, string> = {
    'plain data object required': '必须使用普通数据对象',
    'unknown or inapplicable field': '存在未知或不适用的字段',
    'enumerable inert fields required': '字段必须可枚举且为静态数据，不能使用访问器',
    'identifier must be nonempty, control-free and at most 200 characters': '标识符不能为空、不能包含控制字符，且最多为 200 个字符',
    'enabled must be boolean': '启用状态必须为布尔值',
    'rules must be an ordinary array of at most 100 rules': '规则必须为普通数组，且最多包含 100 条规则',
    'rules must be dense inert array data': '规则必须为无空缺的静态数据数组，不能使用访问器',
    'unknown rule scope': '未知的规则匹配范围',
    'unknown rule mode': '未知的规则操作模式',
    'unknown or inapplicable rule field': '规则中存在未知或不适用的字段',
    'duplicate match target': '存在重复的匹配目标',
  };
  const prefix = 'compactionReasoning: ';
  const message = error.startsWith(prefix) ? messages[error.slice(prefix.length)] : undefined;
  return message ? t(error, '压缩请求推理策略：' + message) : translateSettingsError(error, t);
}

/** Selected feature source shared by combined, split, and source consumers. */
export function createReasoningSettingsView(React: any, catalog?: ReasoningCatalogSource, locale?: SettingsLocale) {
  const h = React.createElement;
  function ReasoningControl({ form, runtime }: { form: ConfigForm; runtime?: CapabilityStatus }) {
    const t = useSettingsText(React, locale);
    const [editor] = React.useState(() => createReasoningEditor(form));
    const [metadata, setMetadata] = React.useState({ busy: false, notice: '' as MetadataNotice, groups: [] as NativeCatalogGroup[] });
    const [lifetime] = React.useState(() => ({live: true, generation: 0}));
    React.useEffect(() => { lifetime.live = true; return () => {lifetime.live = false; lifetime.generation++;}; }, [lifetime]);
    async function refresh() {
      if (!lifetime.live || metadata.busy) return;
      const token = ++lifetime.generation;
      setMetadata({busy:true,notice:'',groups:[]});
      let notice: MetadataNotice = 'unavailable';
      let groups: NativeCatalogGroup[] = [];
      try {
        const result = await catalog?.load() as any;
        if (result?.ok && Array.isArray(result.value?.groups)) {
          groups = result.value.groups.filter((group: any) => typeof group?.id === 'string' && Array.isArray(group.models))
            .map((group: any) => ({id:group.id,models:group.models.filter((model:any)=>typeof model?.id === 'string').map((model:any)=>({
              id:model.id,reasoning:{efforts:Array.isArray(model.reasoning?.efforts) ? model.reasoning.efforts.filter((effort:any)=>typeof effort?.id === 'string' && effort.id.length > 0 && typeof effort.name === 'string') : []},
            }))}));
          notice = result.value.failures?.length ? 'partial' : 'loaded';
        }
      } catch { /* Never display raw remote/provider errors. */ }
      if (lifetime.live && token === lifetime.generation) setMetadata({busy:false,notice,groups});
    }
    React.useEffect(() => editor.start(), [editor]);
    const draft = React.useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
    const disabled = draft.status !== 'ready' || !draft.writable || draft.revision === undefined || draft.saving;
    const notices: Record<MetadataNotice, string> = {
      '': '',
      unavailable: t('Native metadata unavailable. Enter exact native IDs manually.', '原生元数据不可用。请手动输入准确的原生 ID。'),
      partial: t('Some native metadata is unavailable. Exact-ID entry remains available.', '部分原生元数据不可用。仍可输入准确的 ID。'),
      loaded: t('Native metadata loaded. Choices apply only to an exact provider and model.', '原生元数据已加载。选项仅适用于完全匹配的供应商和模型。'),
    };
    return h('fieldset', { 'aria-label': t('Compaction-request reasoning', '压缩请求推理'), className: 'extras-group' },
      h('legend', null, t('Compaction-request reasoning', '压缩请求推理')),
      h('p', {role:'status'}, capabilityText(t('Reasoning', '推理'), runtime, t) + t('. Saved configuration does not confirm runtime activation.', '。保存配置不代表运行时已激活。')),
      h('label', null, h('input', {type: 'checkbox', checked: draft.value.enabled, disabled,
        onChange: (event: any) => editor.setEnabled(event.target.checked)}), t(' Enable compaction-request reasoning', ' 启用压缩请求推理')),
      h('p', null, t('Priority: provider + model > provider > all. Rule order is not precedence. The winning rule never falls back to a broader rule.', '优先级：供应商 + 模型 > 供应商 > 全部。规则排列顺序不影响优先级。命中的规则不会回退到匹配范围更广的规则。')),
      h('small', null, t('Use exact, case-sensitive native IDs, not display names or URLs. Inherit reads the same session’s latest durable reasoning effort; missing inheritance preserves the original request. Fixed replaces the request effort; unsupported IDs fail explicitly at native dispatch.', '请使用准确且区分大小写的原生 ID，而非显示名称或 URL。继承会读取同一会话最近持久化的推理强度；没有可继承值时保留原始请求。固定模式会替换请求的推理强度；不受支持的 ID 会在原生派发时明确报错。')),
      ...draft.value.rules.map((rule: CompactionReasoningRule, index: number) => {
        const input = (field: 'provider' | 'model' | 'effort', label: string) => h('label', {key:field}, label, h('input', {
          type:'text', 'aria-label':label, value:(rule as any)[field] ?? '', maxLength:MAX_REASONING_ID_LENGTH, disabled, spellCheck:false,
          onChange:(event:any)=>editor.updateRule(index,{[field]:event.target.value}),
        }));
        const efforts: NativeEffort[] = rule.scope === 'provider-model'
          ? metadata.groups.find((group: NativeCatalogGroup)=>group.id === rule.provider)?.models.find((model: NativeCatalogGroup['models'][number])=>model.id === rule.model)?.reasoning?.efforts ?? [] : [];
        const ruleLabel = t('Rule ' + (index + 1), '规则 ' + (index + 1));
        return h('fieldset', {key:index,'aria-label':ruleLabel,className:'extras-rule'},
          h('legend', null, ruleLabel),
          h('label', null, t('Match scope', '匹配范围'), h('select', {'aria-label':t('Match scope', '匹配范围'),value:rule.scope,disabled,onChange:(event:any)=>editor.updateRule(index,{scope:event.target.value})},
            h('option',{value:'all'},t('All providers and models', '所有供应商和模型')),h('option',{value:'provider'},t('Provider', '供应商')),h('option',{value:'provider-model'},t('Provider + model', '供应商 + 模型')))),
          rule.scope !== 'all' && input('provider',t('Provider route ID', '供应商路由 ID')),
          rule.scope === 'provider-model' && input('model',t('Model ID', '模型 ID')),
          h('label', null, t('Action', '操作'), h('select', {'aria-label':t('Action', '操作'),value:rule.mode,disabled,onChange:(event:any)=>editor.updateRule(index,{mode:event.target.value})},
            h('option',{value:'inherit'},t('Inherit session reasoning', '继承会话推理强度')),h('option',{value:'fixed'},t('Fixed native effort', '固定原生推理强度')))),
          rule.mode === 'fixed' && efforts.length > 0 && h('label', null, t('Advertised effort for exact model', '该精确模型提供的推理强度'), h('select', {
            'aria-label':t('Advertised effort for exact model', '该精确模型提供的推理强度'), disabled, value:efforts.some(effort=>effort.id === rule.effort) ? rule.effort : '',
            onChange:(event:any)=>{if(event.target.value !== '') editor.updateRule(index,{effort:event.target.value});},
          }, h('option', {value:''}, t('Choose an advertised native effort…', '选择模型提供的原生推理强度…')), ...efforts.map(effort=>h('option', {key:effort.id,value:effort.id}, effort.name.slice(0,200)+' ('+effort.id+')')))),
          rule.mode === 'fixed' && input('effort',t('Native effort ID', '原生推理强度 ID')),
          rule.mode === 'fixed' && h('small', null, rule.scope !== 'provider-model'
            ? t('No universal effort choices exist for all/provider rules. Enter the exact native effort ID.', '全部或供应商范围的规则没有通用的推理强度选项。请输入准确的原生推理强度 ID。')
            : efforts.length ? t('Or enter an exact native ID. The host validates support when dispatching this model.', '也可输入准确的原生 ID。宿主会在派发此模型时验证是否支持。')
              : t('No advertised choices for this exact route and model. Enter the exact native effort ID or refresh metadata.', '此精确路由和模型没有提供选项。请输入准确的原生推理强度 ID，或刷新元数据。')),
          h('div', {className:'extras-actions'}, h('button', {type:'button',disabled,onClick:()=>editor.removeRule(index)}, t('Remove rule', '删除规则'))));
      }),
      draft.value.rules.length === 0 && h('p', null, t('No rules. Saving preserves an explicit empty list (no reasoning override).', '没有规则。保存会保留显式空列表（不覆盖推理强度）。')),
      h('div', {className:'extras-actions'},
        h('button', {type:'button',disabled:disabled || draft.value.rules.length >= MAX_REASONING_RULES,onClick:()=>editor.addRule()}, t('Add rule', '添加规则')),
        h('button', {type:'button',disabled: metadata.busy,onClick:()=>{void refresh();}}, t('Refresh native effort choices', '刷新原生推理强度选项'))),
      h('small', null, t('At most '+MAX_REASONING_RULES+' rules; IDs at most '+MAX_REASONING_ID_LENGTH+' characters.', '最多 '+MAX_REASONING_RULES+' 条规则；ID 最多为 '+MAX_REASONING_ID_LENGTH+' 个字符。')),
      metadata.busy && h('p', {role:'status'}, t('Loading native metadata…', '正在加载原生元数据…')),
      metadata.notice && h('p', {role:'status'}, notices[metadata.notice as MetadataNotice]),
      draft.conflict && h('p', {role:'alert'}, t('Configuration changed. Discard the draft to reload; newer settings will not be overwritten.', '配置已更改。请丢弃草稿以重新加载；不会覆盖较新的设置。')),
      draft.error && h('p', {role:'alert'}, translateReasoningError(draft.error, t)),
      h('div', {className:'extras-actions'},
        h('button', {type:'button',className:'extras-primary',disabled: disabled || !draft.dirty || draft.conflict,onClick:()=>{void editor.save();}}, t('Save policy', '保存策略')),
        h('button', {type:'button',disabled: draft.saving || !draft.dirty && !draft.conflict,onClick:()=>editor.discard()}, t('Discard policy draft', '丢弃策略草稿')),
        h('button', {type:'button',disabled:disabled || draft.conflict,onClick:()=>{void editor.reset();}}, t('Reset policy to inherited', '将策略重置为继承'))));
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
      let locale: SettingsLocale | undefined;
      try { locale = ctx.get('locale'); } catch { /* Optional host locale service. */ }
      ctx.inject(['remote'], (scope: any) => {
        catalogRemote = scope.get('remote');
        return () => { catalogRemote = undefined; };
      });
      return createReasoningSettingsView(React, { load: () => catalogRemote?.session?.modelCatalog() }, locale);
    },
  };
}
