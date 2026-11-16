import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
import { createSettingsView } from '../../client/settings.ts';
import {createSettingsView as createCoreSettingsView} from '../../client/settings-core.ts';
import { useSettingsText, translateSettingsError } from '../../client/settings-ui.ts';

const descriptor = { rowId: 'dsh-extras', packageName: 'dsh-extras', moduleIds: ['compact-context', 'retry', 'goalWait'] as const };
const snapshot = { status: 'ready' as const, writable: true, revision: 1, value: { modules: {} } };
const form = { getSnapshot: () => snapshot, subscribe: () => () => {}, mutate: async () => true };
function markup(locale?: Parameters<typeof createSettingsView>[5]) { return renderToStaticMarkup(React.createElement(createSettingsView(React, descriptor, undefined, undefined, undefined, locale) as any, { configForm: form })); }

test('all non-chime settings have Chinese titles, labels, units and actions without a locale service', () => {
  const html = markup();
  for (const text of ['Extras 设置', '上下文压缩', '流式与空响应重试', '目标等待', '保存', '放弃草稿', '秒', '毫秒']) assert.ok(html.includes(text), 'Missing Chinese UI: ' + text);
});

test('host timezone has a default-off switch and explicit full-page reload limits without a page-status adapter', () => {
  const View = createSettingsView(React, {rowId:'dsh-extras-host-timezone',packageName:'dsh-extras-host-timezone',moduleIds:['host-timezone']});
  const html = renderToStaticMarkup(React.createElement(View as any, {configForm:form}));
  assert.match(html, /请求时区跟随 DSH 本机/);
  assert.match(html, /完整重新加载页面/);
  assert.match(html, /已打开的页面/);
  assert.match(html, /已保存的启用意图：已禁用/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length,1);
  assert.doesNotMatch(html, /checked=/);
  assert.doesNotMatch(html, /提示音编辑器不可用/);
});

test('host adapter readiness explicitly reports reload-required rather than protection of the loaded page', () => {
  const status = {getSnapshot:()=>({modules:{'host-timezone':{phase:'active',ready:true,enabled:true,capabilities:{hostTimezone:{phase:'standby' as const}},details:{hostTimezone:{requested:true,status:'needs-full-reload' as const,timeZone:'Asia/Singapore',adapterVersion:'0.2.2-rc.3' as const}}}}}),subscribe:()=>()=>{}};
  const View = createSettingsView(React,{rowId:'dsh-extras-host-timezone',packageName:'dsh-extras-host-timezone',moduleIds:['host-timezone']},undefined,status);
  const html = renderToStaticMarkup(React.createElement(View as any,{configForm:form}));
  assert.match(html,/重载状态：需要刷新页面/);
  assert.match(html,/服务器资源适配器运行状态：待命/);
  assert.match(html,/DSH 宿主时区：Asia\/Singapore/);
  assert.match(html,/不代表已打开的页面受到保护/);
});

test('host module presents readonly current-page status separately from server readiness in both languages', () => {
  for(const language of ['zh','en']) {
    const locale={getLocale:()=>({active:language}),subscribe:()=>()=>{},resolveText:(text:any)=>text[language]};
    const PageStatus=()=>React.createElement('p',{'data-page-guard-fixture':'',role:'status'},language==='zh'?'页面已撤销，需完整重新加载':'Page revoked; full page reload required');
    const View=createCoreSettingsView(React,{rowId:'timezone-view',packageName:'timezone-view',moduleIds:['host-timezone']},undefined,undefined,undefined,undefined,locale,undefined,undefined,PageStatus);
    const html=renderToStaticMarkup(React.createElement(View as any,{configForm:form}));
    assert.match(html,/data-page-guard-fixture/);
    assert.ok(html.includes(language==='zh'?'当前页面状态':'Current page status'));
    assert.ok(html.includes(language==='zh'?'服务器状态':'Server status'));
    assert.ok(html.includes(language==='zh'?'页面已撤销':'Page revoked'));
    assert.equal((html.match(/type="checkbox"/g)??[]).length,1,'page diagnostics add no selector or switch');
    assert.doesNotMatch(html,/<select|<textarea|type="text"/);
  }
});

test('non-chime controls and module cards ship explicit theme-aware styling', () => {
  const html = markup();
  assert.match(html, /data-extras-settings/);
  assert.ok(html.includes('var(--'));
  assert.match(html, /border-radius/);
  assert.match(html, /<style/);
});

test('explicit English locale renders every common setting in English', () => {
  const html = markup({ getLocale: () => ({ active: 'en' }), subscribe: () => () => {}, resolveText: (text: any) => text.en });
  for (const text of ['Extras settings', 'Compact-context', 'Stream and empty-response retry', 'Goal wait', 'Save', 'Discard draft', 'seconds', 'milliseconds']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Extras 设置'));
});

test('locale subscriptions and snapshots preserve the native receiver and stable callbacks', () => {
  let active = 'en';
  const listeners = new Set<() => void>();
  const locale = {
    getLocale() { assert.equal(this, locale); return { active }; },
    subscribe(fn: () => void) { assert.equal(this, locale); listeners.add(fn); return () => { listeners.delete(fn); }; },
    resolveText(text: any) { assert.equal(this, locale); return text[active]; },
  };
  const calls: any[] = [];
  const runtime = { useSyncExternalStore(subscribe: any, read: any) { calls.push({ subscribe, read }); return read(); } };
  const t = useSettingsText(runtime, locale);
  assert.equal(t('English', '中文'), 'English');
  const off = calls[0].subscribe(() => {});
  active = 'zh';
  assert.equal(calls[0].read(), 'zh');
  assert.equal(useSettingsText(runtime, locale)('English', '中文'), '中文');
  assert.equal(calls[0].subscribe, calls[1].subscribe);
  assert.equal(calls[0].read, calls[1].read);
  off(); assert.equal(listeners.size, 0);
});

test('owned validation and save diagnostics translate without changing unknown technical data', () => {
  const zh = (_en: string, value: string) => value;
  for (const message of ['Enter a number; use Reset to inherit.', 'Number is outside the allowed range.', 'Duration must fit whole milliseconds.', 'Guidance is limited to 8000 characters.', 'Use provider/model = seconds, one per line.', 'Model timeouts must be positive and keys unique.', 'Enter a non-negative whole number.', 'Configuration changed. Discard this draft before editing again.', 'Invalid value.', 'Invalid policy.', 'Save refused. Discard the draft to load the accepted configuration.', 'Could not save. Check the connection and retry.', 'Save refused; reload the accepted configuration.']) {
    assert.match(translateSettingsError(message, zh), /[一-鿿]/);
    assert.equal(translateSettingsError(message, en => en), message);
  }
  assert.equal(translateSettingsError('Opaque/Case/ID', zh), 'Opaque/Case/ID');
});
