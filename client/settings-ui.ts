/** Native optional locale port, shared by settings only; no provider/feature metadata. */
export interface SettingsLocale {
  getLocale(): { readonly active: string };
  subscribe(listener: () => void): () => void;
  resolveText(text: unknown): string;
}
export type SettingsText = (en: string, zh: string) => string;
const fallbackSubscribe = () => () => {};
const fallbackSnapshot = () => 'zh';
const localeCallbacks = new WeakMap<SettingsLocale, { subscribe: SettingsLocale['subscribe']; read: () => string }>();

/** Bind public service methods without losing their receiver; keep hook callbacks stable. */
export function useSettingsText(React: any, locale?: SettingsLocale): SettingsText {
  let callbacks = locale && localeCallbacks.get(locale);
  if (locale && !callbacks) {
    callbacks = { subscribe: listener => locale.subscribe(listener), read: () => locale.getLocale().active };
    localeCallbacks.set(locale, callbacks);
  }
  React.useSyncExternalStore(callbacks?.subscribe ?? fallbackSubscribe, callbacks?.read ?? fallbackSnapshot, callbacks?.read ?? fallbackSnapshot);
  return (en, zh) => locale ? locale.resolveText({ en, zh }) : zh;
}

/** Owned validation/transport messages only. Technical data and unknown diagnostics stay intact. */
export function translateSettingsError(error: string, t: SettingsText): string {
  const translations: Record<string, string> = {
    'Enter a number; use Reset to inherit.': '请输入数字；使用“恢复继承值”可移除覆盖。',
    'Number is outside the allowed range.': '数字超出允许范围。',
    'Duration must fit whole milliseconds.': '时长必须可表示为安全范围内的整数毫秒。',
    'Guidance is limited to 8000 characters.': '引导文字最多为 8000 个字符。',
    'Use at most 100 identifiers of 200 characters; providers cannot contain whitespace and error codes cannot contain quotes, colons or control characters.': '最多填写 100 个标识符，每个不超过 200 个字符；提供方不能包含空白，错误码不能包含引号、冒号或控制字符。',
    'Use provider/model = seconds, one per line.': '请按 provider/model = 秒数 的格式填写，每行一项。',
    'Model timeouts must be positive and keys unique.': '模型超时必须为正数，且模型标识不能重复。',
    'Enter a non-negative whole number.': '请输入非负整数。',
    'Notify ratio must be at least 0 and less than 1.': '压力提示比例必须大于等于 0 且小于 1。',
    'Pressure step must be a whole percentage from 1 to 50.': '压力步长必须为 1 到 50 的整数百分比。',
    'Configuration changed. Discard this draft before editing again.': '配置已更新，请先放弃草稿并重新读取，再继续编辑。',
    'Invalid value.': '输入值无效。',
    'Invalid policy.': '策略无效。',
    'Choose a supported continuation strategy.': '请选择受支持的续跑策略。',
    'tool dependencies are unavailable': '工具所需依赖不可用',
    'Feature activation failed; inspect the host log.': '功能激活失败，请检查宿主日志。',
    'Feature lifecycle transition in progress.': '正在切换功能生命周期状态。',
    'Waiting for safe migration and ownership discovery.': '正在等待安全迁移和所有权检测。',
    'Feature activation failed': '功能激活失败',
    'Reload this page after the legacy chime has been disabled.': '停用旧版提示音插件后，请刷新此页面。',
    'Save refused. Discard the draft to load the accepted configuration.': '保存未被接受，请放弃草稿以读取已接受的配置。',
    'Could not save. Check the connection and retry.': '无法保存，请检查连接后重试。',
    'Save refused; reload the accepted configuration.': '保存未被接受，请重新读取已接受的配置。',
  };
  const servicePrefix = 'Waiting for services: ';
  if (error.startsWith(servicePrefix)) return t(servicePrefix, '等待服务：') + error.slice(servicePrefix.length);
  return Object.hasOwn(translations, error) ? t(error, translations[error]) : error;
}

/** Local style element lifetime follows the editor. Never style the shell or preserved chime editor. */
export const SETTINGS_CSS = `
[data-extras-settings] { display:grid; gap:20px; min-width:0; color:var(--dsw-alias-label-primary, #20242b); font-size:13px; line-height:1.6; }
[data-extras-settings] > h2 { margin:0; font-size:18px; font-weight:600; }
[data-extras-settings] .extras-module { display:grid; gap:14px; min-width:0; padding:16px; border:1px solid var(--dsw-alias-border-l1, #d9dde4); border-radius:var(--dsw-radius-lg, 12px); background:var(--dsw-alias-bg-layer-2, #f8f9fb); }
[data-extras-settings] .extras-module > h3 { margin:0; padding-left:10px; border-left:3px solid var(--dsw-alias-state-business-primary, #526de1); font-size:15px; font-weight:600; }
[data-extras-settings] .extras-module > p, [data-extras-settings] .extras-module:not([data-module="chime"]) p { margin:0; overflow-wrap:anywhere; }
[data-extras-settings] .extras-module > [role="status"], [data-extras-settings] .extras-module:not([data-module="chime"]) small, [data-extras-settings] .extras-module:not([data-module="chime"]) [role="status"] { color:var(--dsw-alias-label-secondary, #5c6370); font-size:12px; }
[data-extras-settings] .extras-module:not([data-module="chime"]) [role="alert"] { color:var(--dsw-alias-state-error-primary, #b3261e); }
[data-extras-settings] .extras-field { display:grid; gap:8px; min-width:0; }
[data-extras-settings] .extras-module:not([data-module="chime"]) label { display:grid; gap:7px; min-width:0; font-weight:500; overflow-wrap:anywhere; }
[data-extras-settings] .extras-module:not([data-module="chime"]) label:has(input[type="checkbox"]) { display:flex; align-items:center; gap:9px; font-weight:400; }
[data-extras-settings] .extras-module:not([data-module="chime"]) input:not([type="checkbox"]), [data-extras-settings] .extras-module:not([data-module="chime"]) textarea, [data-extras-settings] .extras-module:not([data-module="chime"]) select { box-sizing:border-box; width:100%; min-width:0; max-width:100%; padding:8px 10px; border:1px solid var(--dsw-alias-border-l2, #c5cbd5); border-radius:var(--dsw-radius-md, 8px); background:var(--dsw-alias-bg-layer-3, #fff); color:var(--dsw-alias-label-primary, #20242b); font:inherit; }
[data-extras-settings] .extras-module:not([data-module="chime"]) textarea { resize:vertical; min-height:96px; }
[data-extras-settings] .extras-module:not([data-module="chime"]) input[type="checkbox"] { width:16px; height:16px; flex-shrink:0; accent-color:var(--dsw-alias-state-business-primary, #526de1); }
[data-extras-settings] .extras-module:not([data-module="chime"]) fieldset { display:grid; gap:12px; min-width:0; margin:0; padding:14px; border:1px solid var(--dsw-alias-border-l1, #d9dde4); border-radius:var(--dsw-radius-md, 8px); }
[data-extras-settings] .extras-module:not([data-module="chime"]) legend { padding:0 6px; font-size:13px; font-weight:600; }
[data-extras-settings] .extras-rule { background:var(--dsw-alias-bg-layer-3, #fff); }
[data-extras-settings] .extras-actions { display:flex; flex-wrap:wrap; gap:8px; }
[data-extras-settings] .extras-module:not([data-module="chime"]) button { justify-self:start; max-width:100%; white-space:normal; padding:7px 12px; border:1px solid var(--dsw-alias-border-l2, #c5cbd5); border-radius:var(--dsw-radius-md, 8px); background:var(--dsw-alias-bg-layer-3, #fff); color:var(--dsw-alias-label-primary, #20242b); font:inherit; cursor:pointer; }
[data-extras-settings] .extras-module:not([data-module="chime"]) button.extras-primary:not(:disabled) { background:var(--dsw-alias-button-primary-fill, #526de1); color:var(--dsw-alias-label-primary-foreground, #fff); border-color:transparent; }
[data-extras-settings] .extras-module:not([data-module="chime"]) :is(input, textarea, select, button):focus-visible { outline:2px solid var(--dsw-alias-state-business-primary, #526de1); outline-offset:2px; }
[data-extras-settings] .extras-module:not([data-module="chime"]) :disabled { opacity:.55; cursor:not-allowed; }
[data-extras-settings] > details { min-width:0; padding:12px 16px; border:1px solid var(--dsw-alias-border-l1, #d9dde4); border-radius:var(--dsw-radius-lg, 12px); }
[data-extras-settings] > details > summary { cursor:pointer; font-weight:500; }
[data-extras-settings] > details > pre { max-width:100%; overflow:auto; font-size:12px; }
[data-extras-settings] [data-collapse-body]:not([hidden]) { display:grid; gap:14px; min-width:0; }
[data-extras-settings] [data-collapse-body][hidden] { display:none; }
[data-extras-settings] .extras-collapse-group { display:grid; gap:10px; min-width:0; }
[data-extras-settings] .extras-collapse-group > h4 { margin:0; font-size:13px; }
[data-extras-settings] :is(.extras-collapse-actions, .extras-module > h3, .extras-collapse-group > h4) button { box-sizing:border-box; max-width:100%; white-space:normal; overflow-wrap:anywhere; padding:7px 12px; border:1px solid var(--dsw-alias-border-l2, #c5cbd5); border-radius:var(--dsw-radius-md, 8px); background:var(--dsw-alias-bg-layer-3, #fff); color:var(--dsw-alias-label-primary, #20242b); font:inherit; text-align:start; cursor:pointer; }
[data-extras-settings] :is(.extras-module > h3, .extras-collapse-group > h4) button::before { content:'▾'; display:inline-block; width:1.2em; }
[data-extras-settings] :is(.extras-module > h3, .extras-collapse-group > h4) button[aria-expanded="false"]::before { content:'▸'; }
[data-extras-settings] :is(.extras-collapse-actions, .extras-module > h3, .extras-collapse-group > h4) button:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary, #526de1); outline-offset:2px; }
[data-extras-settings] [data-collapse-summary] { color:var(--dsw-alias-label-secondary, #5c6370); font-size:12px; overflow-wrap:anywhere; }
@media (max-width:480px) { [data-extras-settings] .extras-module { padding:12px; } [data-extras-settings] .extras-module:not([data-module="chime"]) fieldset { padding:10px; } }
`;
