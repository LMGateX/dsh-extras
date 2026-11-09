import { createSettingsCollapse } from './collapse.ts';
import { SETTINGS_CSS, useSettingsText, translateSettingsError, type SettingsLocale, type SettingsText } from './settings-ui.ts';
import { bindSection, createPageFormAdapter } from './forms.ts';
import { createSettingsGroupView, type GroupField } from './settings-group.ts';
import type { CapabilityStatus, GoalWaitStatus } from './status.ts';
import type { ConfigForm, ConfigFormSnapshot, ConfigPageForm, PathOperation, AcceptedConfigSource } from './forms.ts';

export type ModuleId = 'compact-context' | 'retry' | 'chime' | 'goalWait' | 'model-policy';
export interface SettingsDescriptor {
  rowId: string;
  packageName: string;
  moduleIds: readonly ModuleId[];
}
export interface SettingsStatus {
  modules?: Partial<Record<ModuleId, { phase?: string; ready?: boolean; enabled?: boolean; reason?: string; capabilities?: { compactionReasoning?: CapabilityStatus; tools?: CapabilityStatus; continuation?: CapabilityStatus }; details?: { goalWait?: GoalWaitStatus } }>>;
  report?: unknown;
}
export interface SettingsStatusStore {
  getSnapshot(): SettingsStatus | undefined;
  subscribe(listener: () => void): () => void;
}
export interface SettingsProps {
  view?: string;
  form?: ConfigPageForm;
  configForm?: ConfigForm;
  status?: SettingsStatusStore;
}

type TextField = 'guidanceText' | 'retryAttempts' | 'retryDelayMs' | 'ptcTimeoutMs'
  | 'ptcModelTimeouts' | 'errorCodes' | 'providers' | 'maxHoldMs' | 'notifyAtRatio' | 'pressureStep';
interface DraftState {
  text: string;
  revision?: number;
  status: ConfigFormSnapshot['status'];
  writable: boolean;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  error: string;
}
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};

function format(field: TextField, value: unknown): string {
  if (field === 'errorCodes' || field === 'providers') return Array.isArray(value) ? value.join('\n') : '';
  if (field === 'ptcModelTimeouts') return Object.entries(record(value))
    .map(([key, ms]) => key + ' = ' + Number(ms) / 1000).join('\n');
  if (field === 'retryDelayMs' || field === 'ptcTimeoutMs') return String(Number(value ?? 0) / 1000);
  return String(value ?? '');
}
function number(text: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!text.trim()) throw new Error('Enter a number; use Reset to inherit.');
  const value = Number(text);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error('Number is outside the allowed range.');
  return value;
}
function milliseconds(text: string, maxSeconds = Number.MAX_SAFE_INTEGER / 1000): number {
  const ms = Math.round(number(text, 0, maxSeconds) * 1000);
  if (!Number.isSafeInteger(ms)) throw new Error('Duration must fit whole milliseconds.');
  return ms;
}
function parse(field: TextField, text: string): unknown {
  if (field === 'notifyAtRatio') {
    const value = number(text, 0, 1);
    if (value >= 1) throw new Error('Notify ratio must be at least 0 and less than 1.');
    return value;
  }
  if (field === 'pressureStep') {
    const value = number(text, 1, 50);
    if (!Number.isSafeInteger(value)) throw new Error('Pressure step must be a whole percentage from 1 to 50.');
    return value;
  }
  if (field === 'guidanceText') {
    if (text.length > 8000) throw new Error('Guidance is limited to 8000 characters.');
    return text;
  }
  if (field === 'errorCodes' || field === 'providers') {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length > 100 || lines.some(line => line.length > 200
      || (field === 'providers' ? /\s/.test(line) : /[:"'\x00-\x1f\x7f]/.test(line) || line.includes(String.fromCharCode(96))))) {
      throw new Error('Use at most 100 identifiers of 200 characters; providers cannot contain whitespace and error codes cannot contain quotes, colons or control characters.');
    }
    return lines; // Deliberately [] for blank: Reset, not blank, removes the override.
  }
  if (field === 'ptcModelTimeouts') {
    const entries: [string, number][] = [];
    for (const line of text.split(/\r?\n/).map(line => line.trim())) {
      if (!line || line.startsWith('#')) continue;
      const equals = line.indexOf('=');
      const key = line.slice(0, equals).trim();
      if (equals <= 0 || !/^[^\s/]+\/[^\s]+$/.test(key)) throw new Error('Use provider/model = seconds, one per line.');
      const ms = milliseconds(line.slice(equals + 1));
      if (ms <= 0 || entries.some(([name]) => name === key)) throw new Error('Model timeouts must be positive and keys unique.');
      entries.push([key, ms]);
    }
    return Object.fromEntries(entries);
  }
  if (field === 'retryDelayMs' || field === 'ptcTimeoutMs') return milliseconds(text, field === 'retryDelayMs' ? 60 : undefined);
  const value = number(text, 0, field === 'retryAttempts' ? 5 : undefined);
  if (!Number.isSafeInteger(value)) throw new Error('Enter a non-negative whole number.');
  return value;
}

/** One staged native field. Drafts keep the exact revision read, even across sibling edits. */
export function createFieldEditor(form: ConfigForm, field: TextField) {
  const seed = (snapshot: ConfigFormSnapshot): DraftState => ({
    text: format(field, record(snapshot.value)[field]), revision: snapshot.revision,
    status: snapshot.status, writable: snapshot.writable,
    dirty: false, saving: false, conflict: false, error: '',
  });
  let state = seed(form.getSnapshot());
  const listeners = new Set<() => void>();
  const publish = (next: DraftState) => { state = next; for (const listener of listeners) listener(); };
  const sync = () => {
    const next = form.getSnapshot();
    publish(state.dirty || state.saving ? {
      ...state, status: next.status, writable: next.writable,
      conflict: state.conflict || next.revision !== state.revision,
    } : seed(next));
  };
  async function submit(reset: boolean): Promise<boolean> {
    const current = form.getSnapshot();
    if (state.saving || current.status !== 'ready' || !current.writable
      || current.revision === undefined) return false;
    if (state.conflict || current.revision !== state.revision) {
      publish({ ...state, conflict: true, error: 'Configuration changed. Discard this draft before editing again.' });
      return false;
    }
    let ops: PathOperation[];
    try {
      ops = reset ? [{ op: 'unset', path: [field] }]
        : [{ op: 'set', path: [field], value: parse(field, state.text) }];
    } catch (error) {
      publish({ ...state, error: error instanceof Error ? error.message : 'Invalid value.' });
      return false;
    }
    publish({ ...state, saving: true, error: '' });
    try {
      const ok = await form.mutate(ops, state.revision);
      if (ok) {
        // Page adapters may receive acceptance in the following React render.
        const next = form.getSnapshot();
        publish(next.revision !== state.revision ? seed(next) : {
          ...state, saving: false, dirty: false, conflict: false,
        });
      } else publish({ ...state, saving: false, conflict: true, error: 'Save refused. Discard the draft to load the accepted configuration.' });
      return ok;
    } catch {
      publish({ ...state, saving: false, error: 'Could not save. Check the connection and retry.' });
      return false;
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start() { const stop = form.subscribe(sync); sync(); return stop; },
    edit(text: string) { if (!state.saving) publish({ ...state, text, dirty: true, error: '' }); },
    discard() { if (!state.saving) publish(seed(form.getSnapshot())); },
    save: () => submit(false),
    reset: () => submit(true),
  };
}

const labels: Record<ModuleId, { en: string; zh: string }> = {
  'compact-context': { en: 'Compact-context', zh: '上下文压缩' },
  'model-policy': { en: 'Model policy', zh: '模型策略' },
  retry: { en: 'Stream and empty-response retry', zh: '流式与空响应重试' },
  chime: { en: 'Session chime', zh: '会话提示音' },
  goalWait: { en: 'Goal wait', zh: '目标等待' },
};

function phaseText(phase: string, t: SettingsText): string {
  const names: Record<string, string> = { standby: '待命', handover: '交接中', active: '运行中', disabled: '已禁用', unavailable: '不可用', conflict: '所有权冲突', 'reload-required': '需要刷新页面', 'restart-required': '需要重启', 'saved/restart-required': '已保存，需重启', loading: '加载中', 'missing-dependency': '缺少依赖', 'migration-pending': '等待迁移', failed: '运行失败', 'Status unknown': '状态未知' };
  return Object.hasOwn(names, phase) ? t(phase, names[phase]) : phase;
}
const emptyStatus: SettingsStatusStore = { getSnapshot: () => undefined, subscribe: () => () => {} };
export function capabilityText(label: string, status?: CapabilityStatus, t: SettingsText = en => en): string {
  const phase = ['disabled', 'active', 'unavailable', 'standby', 'handover'].includes(status?.phase ?? '') ? status!.phase : 'unavailable';
  const reason = typeof status?.reason === 'string' ? status.reason.slice(0, 200) : '';
  return label + t(' runtime: ', '运行状态：') + phaseText(phase, t) + (reason ? ' · ' + translateSettingsError(reason, t) : '');
}

/** Uses the platform React instance. The chime component is the preserved custom editor. */
export function createSettingsView(
  React: any, descriptor: SettingsDescriptor, chimeEditor?: unknown, status?: SettingsStatusStore, reasoningEditor?: unknown,
  accepted?: AcceptedConfigSource, locale?: SettingsLocale, modelPolicyEditor?: unknown, retryEditor?: unknown,
): (props: SettingsProps) => unknown {
  const h = React.createElement;
  const { Provider: CollapseProvider, Actions: CollapseActions, Group: CollapseGroup, useCollapse } = createSettingsCollapse(React, locale);
  const SettingsGroup = createSettingsGroupView(React, descriptor.rowId, locale);
  const formCallbacks = new WeakMap<ConfigForm, { subscribe: ConfigForm['subscribe']; getSnapshot: ConfigForm['getSnapshot'] }>();
  const useSnapshot = (form: ConfigForm): ConfigFormSnapshot => {
    let callbacks = formCallbacks.get(form);
    if (!callbacks) {
      // Native provider forms are class instances; neither method may lose its receiver.
      callbacks = { subscribe: listener => form.subscribe(listener), getSnapshot: () => form.getSnapshot() };
      formCallbacks.set(form, callbacks);
    }
    return React.useSyncExternalStore(callbacks.subscribe, callbacks.getSnapshot, callbacks.getSnapshot) as ConfigFormSnapshot;
  };

  function TextControl({ form, field, label, hint }: { form: ConfigForm; field: TextField; label: string; hint?: string }) {
    const t = useSettingsText(React, locale);
    const [editor] = React.useState(() => createFieldEditor(form, field));
    React.useEffect(() => editor.start(), [editor]);
    const draft = React.useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot) as DraftState;
    const disabled = draft.status !== 'ready' || !draft.writable || draft.revision === undefined || draft.saving;
    const id = descriptor.rowId + '-' + field;
    const multiline = ['guidanceText', 'errorCodes', 'providers', 'ptcModelTimeouts'].includes(field);
    return h('div', { className: 'extras-field', 'data-field': field, 'data-extras-dirty': draft.dirty },
      h('label', { htmlFor: id }, label),
      h(multiline ? 'textarea' : 'input', {
        id, value: draft.text, disabled, rows: multiline ? 4 : undefined,
        type: multiline ? undefined : 'text', spellCheck: false,
        onChange: (event: any) => editor.edit(String(event.target.value)),
      }),
      hint && h('small', null, hint),
      draft.conflict && h('p', { role: 'alert' }, t("Configuration changed. Discard the draft to reload; it will not overwrite newer settings.", "配置已更新。请放弃草稿以重新读取；不会覆盖较新的设置。")),
      draft.error && h('p', { role: 'alert' }, translateSettingsError(draft.error, t)),
      h('div', { className: 'extras-actions' },
        h('button', { type: 'button', className: 'extras-primary', disabled: disabled || !draft.dirty || draft.conflict, onClick: () => { void editor.save(); } }, t("Save", "保存")),
        h('button', { type: 'button', disabled: draft.saving || !draft.dirty && !draft.conflict, onClick: () => editor.discard() }, t("Discard draft", "放弃草稿")),
        h('button', { type: 'button', disabled: disabled || draft.conflict, onClick: () => { void editor.reset(); } }, t("Reset to inherited", "恢复继承值"))));
  }

  function Switch({ form, field, label, fallback = false }: { form: ConfigForm; field: string; label: string; fallback?: boolean }) {
    const t = useSettingsText(React, locale);
    const snapshot = useSnapshot(form);
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState('');
    const value = record(snapshot.value)[field];
    return h('div', null,
      h('label', null, h('input', {
        type: 'checkbox', 'data-field': field, checked: typeof value === 'boolean' ? value : fallback,
        disabled: busy || snapshot.status !== 'ready' || !snapshot.writable || snapshot.revision === undefined,
        onChange: async (event: any) => {
          const current = form.getSnapshot();
          if (busy || current.status !== 'ready' || !current.writable || current.revision !== snapshot.revision) return;
          const checked = Boolean(event.target.checked);
          setBusy(true); setError('');
          try {
            if (!await form.mutate([{ op: 'set', path: [field], value: checked }], snapshot.revision)) setError('Save refused; reload the accepted configuration.');
          } catch { setError('Could not save. Check the connection and retry.'); }
          finally { setBusy(false); }
        },
      }), ' ', label),
      error && h('p', { role: 'alert' }, translateSettingsError(error, t)));
  }


  function GoalDriverStatus({ runtime }: { runtime?: NonNullable<SettingsStatus['modules']>['goalWait'] }) {
    const t = useSettingsText(React, locale);
    const detail = runtime?.details?.goalWait as GoalWaitStatus | undefined;
    if (!detail) return h('p', {role:'status','data-goal-driver':''}, t('Goal driver status unavailable; saved strategy does not confirm activation.', '目标驱动状态不可用；已保存的策略并不代表已生效。'));
    const strategy: Record<string, string> = {
      activation:t('activation (native driver + activation gate)', 'activation（原生驱动与激活门控）'),
      replacement:t('replacement (ported driver)', 'replacement（移植驱动）'),
      native:t('native (unmodified continuation)', 'native（未修改的原生续跑）'),
      off:t('off (no automatic continuation)', 'off（无自动续跑）'),
    };
    const mounted: Record<string,string> = {
      'replacement-port':t('replacement-port (ported driver)', 'replacement-port（移植驱动）'),
      'host-driver+gate':t('host-driver+gate (native driver + activation gate)', 'host-driver+gate（原生驱动与激活门控）'),
      'host-driver':t('host-driver (native driver)', 'host-driver（原生驱动）'),
      none:t('none (no driver mounted)', 'none（未挂载驱动）'),
    };
    const active = runtime?.phase === 'active' && runtime.ready === true && runtime.enabled === true
      && runtime.capabilities?.continuation?.phase === 'active';
    const host = detail.host;
    const hostText = host && [host.version ?? host.distribution, host.cordis && 'Cordis '+host.cordis,
      (host.driverDigest ?? host.driverSha256) && 'SHA256 '+(host.driverDigest ?? host.driverSha256)].filter(Boolean).join(' · ');
    return h('div', {role:'status','data-goal-driver':''},
      h('p', null, capabilityText(t('Continuation', '续跑'), runtime?.capabilities?.continuation, t)),
      h('p', null, t('Requested: ', '请求策略：') + (strategy[detail.requested] ?? detail.requested)),
      h('p', null, active ? t('Mounted: ', '实际挂载：') + (mounted[detail.mounted] ?? t('unknown', '未知'))
        : t('Actual driver not confirmed active; reported mount: ', '尚未确认实际驱动已生效；报告的挂载：') + (mounted[detail.mounted] ?? t('unknown', '未知'))),
      h('p', null, t('Fallback: ', '回退原因：') + (detail.fallback ? translateSettingsError(detail.fallback, t) : t('none reported', '未报告回退'))),
      h('p', null, t('Host: ', '宿主：') + (hostText || t('unavailable', '不可用'))));
  }

  function ModuleSection({ root, id, runtime, liveRuntime }: { root: ConfigForm; id: ModuleId; runtime?: SettingsStatus; liveRuntime?: SettingsStatus }) {
    const t = useSettingsText(React, locale);
    const collapse = useCollapse();
    const moduleLabel = t(labels[id].en, labels[id].zh);
    const form = bindSection(root, ['modules', id]);
    const snapshot = useSnapshot(form);
    const moduleStatus = runtime?.modules?.[id];
    const text = (field: TextField, label: string, hint?: string) => h(TextControl, { key: field, form, field, label, hint });
    const flag = (field: string, label: string, fallback = false) => h(Switch, { key: field, form, field, label, fallback });
    let fields: unknown[];
    if (id === 'model-policy') fields = [
      modelPolicyEditor ? h(modelPolicyEditor, { key: 'model-policy', form, runtime: liveRuntime?.modules?.[id], rowId: descriptor.rowId })
        : h('p', { role: 'status' }, t('Model policy editor unavailable.', '模型策略编辑器不可用。')),
      reasoningEditor && h(reasoningEditor, { key: 'reasoning', form, runtime: liveRuntime?.modules?.[id], moduleId: id, rowId: descriptor.rowId }),
    ];
    else if (id === 'compact-context') fields = [
      h('fieldset', {key:'agent-tools','aria-label':t("Agent-facing compaction tools", "代理可用的压缩工具"),className:'extras-group'},
        h('legend', null, t("Agent-facing compaction tools", "代理可用的压缩工具")),
        h('p', {role:'status'}, capabilityText(t('Tools', '工具'), liveRuntime?.modules?.[id]?.capabilities?.tools, t)),
        flag('compactTool', t("Expose compact_context", "开放 compact_context 工具"), true), flag('statusTool', t("Expose context_status (opt-in)", "开放 context_status 工具（可选）"))),
      reasoningEditor && h(reasoningEditor, {key:'reasoning',form,runtime:liveRuntime?.modules?.[id],moduleId:id,rowId:descriptor.rowId}),
      flag('guidance', t("Add context guidance to the system prompt", "将上下文引导添加到系统提示词")),
      text('guidanceText', t("Custom guidance text", "自定义引导文字"), t("Empty uses built-in guidance; at most 8000 characters.", "留空使用内置引导；最多 8000 个字符。")),
      flag('pressureContext', t("Experimental context-pressure line", "实验性上下文压力提示")),
      h(SettingsGroup, {key:'compact-timeouts',form,name:'compact-timeouts',label:t('Compaction retry and PTC timeouts', '压缩重试与 PTC 超时'),fields:[
        {field:'retryAttempts',label:t('Additional compaction retry attempts (0–5)', '额外压缩重试次数（0–5）')},
        {field:'retryDelayMs',label:t('Retry base delay (seconds)', '重试基础延迟（秒）'),hint:t('0–60 seconds; doubles per attempt.', '0–60 秒；每次重试翻倍。')},
        {field:'ptcTimeoutMs',label:t('Default PTC timeout (seconds)', '默认 PTC 超时（秒）'),hint:t('0 keeps the deployment default.', '0 表示保留部署默认值。')},
        {field:'ptcModelTimeouts',kind:'multiline',label:t('Per-model PTC timeouts (seconds)', '各模型 PTC 超时（秒）'),hint:t('One provider/model = seconds per line. Blank saves an explicit empty map.', '每行一项，格式为 provider/model = 秒数。留空将保存显式空映射。')},
      ].map(f => ({...f,format:(value: unknown)=>format(f.field as TextField,value),parse:(value: string | boolean)=>parse(f.field as TextField,String(value))}))}),
      text('notifyAtRatio', t('Pressure notify ratio (0 ≤ ratio < 1)', '压力提示水位（0 ≤ 比例 < 1）'), t('Updates live for the next optional pressure prompt when pressure context and the compact tool are enabled. This is not the native compaction threshold.', '热更新作用于下一次可选压力提示；需启用压力提示与压缩工具。这不是原生压缩阈值。')),
      text('pressureStep', t('Pressure quantization step (1–50%)', '压力量化步长（1–50%）'), t('Whole percentage; updates live for the next pressure prompt and status calculation. Native compaction thresholds and retention remain host-owned.', '整数百分比；热更新作用于下一次压力提示与状态计算。原生压缩阈值和保留策略仍由宿主管理。')),
    ];
    else if (id === 'retry') fields = [
      h(SettingsGroup, {key:'retry-policy',form,name:'retry-policy',label:t('Retry policy', '重试策略'),fields:[
        {field:'errorCodes',kind:'multiline',label:t('Error codes', '错误码'),hint:t('One exact, case-sensitive identifier per line. Blank saves []; Reset removes the override after Save.', '每行填写一个精确标识符，区分大小写。留空保存 []；恢复继承值并保存后移除覆盖。'),format:(value: unknown)=>format('errorCodes',value),parse:(value: string | boolean)=>parse('errorCodes',String(value))},
        {field:'providers',kind:'multiline',label:t('Provider routes', '提供方路由'),hint:t('One route per line, no whitespace. Blank saves [] (all routes). Never enter credentials.', '每行一个路由，不能包含空白。留空保存 []（所有路由）。请勿填写凭据。'),format:(value: unknown)=>format('providers',value),parse:(value: string | boolean)=>parse('providers',String(value))},
        {field:'retryEmptyResponse',kind:'flag',label:t('Retry empty model responses', '重试模型空响应'),format:(value: unknown)=>typeof value === 'boolean' ? value : true,parse:(value: string | boolean)=>Boolean(value)},
      ] satisfies GroupField[]}),
      retryEditor && h(retryEditor, { key: 'native-retry', form, runtime: liveRuntime?.modules?.[id], rowId: descriptor.rowId }),
    ];
    else if (id === 'goalWait') fields = [
      h(GoalDriverStatus, {key:'goal-status',runtime:liveRuntime?.modules?.goalWait}),
      h(SettingsGroup, {key:'goal-policy',form,name:'goal-policy',label:t('Goal continuation strategy and wait policy', '目标续跑策略与等待政策'),hint:t('Save applies the strategy and dirty policy fields together. Native keeps official continuation; off stops automatic continuation. Disabling the module restores official native continuation.', '保存将同时提交策略和已编辑的政策字段。native 保留官方续跑；off 停止自动续跑。禁用模块则恢复官方原生续跑。'),fields:[
        {field:'strategy',kind:'choice',label:t('Continuation strategy', '续跑策略'),choices:[
          {value:'activation',label:t('Activation gate (native driver)', '激活门控（原生驱动）')},
          {value:'replacement',label:t('Replacement (ported driver)', '替换（移植驱动）')},
          {value:'native',label:t('Native continuation', '原生续跑')},
          {value:'off',label:t('Off (no automatic continuation)', '关闭（无自动续跑）')},
        ],format:(value: unknown)=>String(value ?? 'activation'),parse:(value: string | boolean)=>{
          if (!['activation','replacement','native','off'].includes(String(value))) throw new Error('Choose a supported continuation strategy.');
          return value;
        }},
        {field:'waitForJobs',kind:'flag',label:t('Wait for running and stopping jobs', '等待运行中及停止中的后台作业'),format:(value: unknown)=>typeof value === 'boolean' ? value : true,parse:(value: string | boolean)=>Boolean(value)},
        {field:'waitForSubagents',kind:'flag',label:t('Wait for live subagent descendants', '等待仍在工作的后代子代理'),format:(value: unknown)=>typeof value === 'boolean' ? value : true,parse:(value: string | boolean)=>Boolean(value)},
        {field:'maxHoldMs',label:t('Maximum hold (milliseconds)', '最长等待时长（毫秒）'),hint:t('0 holds indefinitely. A new limit applies to the next hold. Does not change durable goal phase.', '0 表示无限期等待。新时长作用于下一次等待。不会更改持久化的目标阶段。'),format:(value: unknown)=>format('maxHoldMs',value ?? 0),parse:(value: string | boolean)=>parse('maxHoldMs',String(value))},
      ] satisfies GroupField[]}),
      h('p', {key:'activation-limitation'}, t('Activation limitation: repeated external disarm during an owned hold can be indistinguishable from the gate’s own disarm; release may rearm that goal. Use replacement to wait without changing activation. Reliable observed revocations still fail closed; no strategy changes durable goal phase.', '激活门控的历史限制：已持有等待期间，外部重复撤销激活可能与门控自身的撤销无法区分；释放等待时可能重新激活该目标。可选择 replacement，在不改变激活状态的情况下等待。可靠观测到的撤权仍会安全拒绝续跑；任何策略均不更改持久化目标阶段。')),
    ];
    else fields = chimeEditor
      ? [h(chimeEditor, { key: 'chime-editor', configForm: form })]
      : [h('p', { key: 'chime-unavailable', role: 'status' }, t("The custom chime editor is unavailable in this distribution.", "此分发版本的提示音编辑器不可用。"))];
    const group = (name: string, label: string, children: unknown[]) => h(CollapseGroup, { key: name, name, label }, ...children);
    if (id === 'compact-context') fields = [
      group('agent-tools', t('Agent tools', '代理工具'), fields.slice(0, 1)),
      group('compaction-reasoning', t('Compaction reasoning', '压缩推理'), fields.slice(1, 2)),
      group('guidance', t('Prompt guidance', '提示词引导'), fields.slice(2, 4)),
      group('compact-timeouts', t('Compaction retries and timeouts', '压缩重试与超时'), fields.slice(5, 6)),
      group('pressure', t('Context pressure', '上下文压力'), [fields[4], ...fields.slice(6)]),
    ];
    else if (id === 'model-policy') fields = [
      group('workspace-models', t('Workspace model defaults', '工作区模型默认值'), fields.slice(0, 1)),
      group('compaction-reasoning', t('Shared compaction reasoning', '共享压缩推理'), fields.slice(1)),
    ];
    else if (id === 'retry') fields = [
      group('retry-classification', t('Response classification', '响应分类'), fields.slice(0, 1)),
      ...(retryEditor ? [group('native-retry', t('Native provider retry', '原生提供方重试'), fields.slice(1))] : []),
    ];
    else fields = [group(id + '-settings', moduleLabel, fields)];
    return h('section', { key: id, className: 'extras-module', 'data-module': id, 'aria-label': moduleLabel },
      h('h3', null, h('button', collapse.buttonProps, moduleLabel)),
      collapse.summary,
      h('p', { 'data-saved-enable': '', role: 'status' }, t('Saved enable intent: ', '已保存的启用意图：') + ((record(snapshot.value).enabled ?? id !== 'model-policy') ? t('enabled', '已启用') : t('disabled', '已禁用'))),
      // The original custom editor already owns the same chime.enabled switch.
      (id !== 'chime' || !chimeEditor) && flag('enabled', t('Enable ', '启用') + moduleLabel, id !== 'model-policy'),
      h('p', { role: 'status' }, moduleStatus
        ? [phaseText(moduleStatus.phase ?? 'Status unknown', t), moduleStatus.ready === undefined ? '' : moduleStatus.ready ? t('ready', '已就绪') : t('not ready', '未就绪'),
          moduleStatus.enabled === undefined ? '' : moduleStatus.enabled ? t('enabled', '已启用') : t('disabled', '已禁用'), translateSettingsError(moduleStatus.reason ?? '', t)].filter(Boolean).join(' · ')
        : t("Runtime status unavailable; saved configuration alone does not confirm activation.", "运行状态不可用；配置已保存并不代表功能已生效。")),
      snapshot.status !== 'ready' && h('p', { role: 'status' }, snapshot.status === 'loading' ? t("Loading configuration…", "正在加载配置…") : t("Configuration unavailable.", "配置不可用。")),
      snapshot.status === 'ready' && !snapshot.writable && h('p', { role: 'status' }, t("Read-only configuration.", "配置为只读。")),
      h('div', collapse.bodyProps, ...fields));
  }

  function Editor({ root, status: suppliedStatus }: { root: ConfigForm; status?: SettingsStatusStore }) {
    const t = useSettingsText(React, locale);
    const snapshot = useSnapshot(root);
    const source = suppliedStatus ?? status ?? emptyStatus;
    const remote = React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot) as SettingsStatus | undefined;
    const value = record(snapshot.value);
    const metadata = record(value.metadata);
    const runtime = remote ?? (value.status ?? metadata.status ?? metadata) as SettingsStatus;
    const report = runtime?.report ?? value.report;
    return h(CollapseProvider, null, h('div', { 'data-extras-settings': '', 'data-package': descriptor.packageName },
      h('style', null, SETTINGS_CSS),
      h('h2', null, t("Extras settings", "Extras 设置")),
      h(CollapseActions, { t }),
      ...descriptor.moduleIds.map(id => h(ModuleSection, { key: id, root, id, runtime, liveRuntime: remote })),
      report !== undefined && h('details', null, h('summary', null, t("Migration report", "迁移报告")), h('pre', null, JSON.stringify(report, null, 2)))));
  }
  function PageEditor({ form, status }: { form: ConfigPageForm; status?: SettingsStatusStore }) {
    const [adapter] = React.useState(() => createPageFormAdapter(form, accepted));
    React.useEffect(() => { adapter.update(form); }, [adapter, form, form.state]);
    return h(Editor, { root: adapter, status });
  }
  return function SettingsView(props: SettingsProps) {
    // Summary cards must not subscribe, allocate editors, or access form services.
    if (props.view === 'summary') return descriptor.moduleIds.map(id => locale ? locale.resolveText(labels[id]) : labels[id].zh).join(' · ');
    if (props.form) return h(PageEditor, { form: props.form, status: props.status });
    if (props.configForm) return h(Editor, { key: descriptor.rowId, root: props.configForm, status: props.status });
    return h('p', { role: 'status' }, locale ? locale.resolveText({ en: 'Configuration unavailable.', zh: '配置不可用。' }) : '配置不可用。');
  };
}
