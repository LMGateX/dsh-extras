import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
import { createSettingsView } from '../../client/settings.ts';
import { useSettingsText, translateSettingsError } from '../../client/settings-ui.ts';

const descriptor = { rowId: 'dsh-extras', packageName: 'dsh-extras', moduleIds: ['compact-context', 'retry', 'goalWait'] as const };
const snapshot = { status: 'ready' as const, writable: true, revision: 1, value: { modules: {} } };
const form = { getSnapshot: () => snapshot, subscribe: () => () => {}, mutate: async () => true };
function markup(locale?: Parameters<typeof createSettingsView>[5]) { return renderToStaticMarkup(React.createElement(createSettingsView(React, descriptor, undefined, undefined, undefined, locale) as any, { configForm: form })); }

test('all non-chime settings have Chinese titles, labels, units and actions without a locale service', () => {
  const html = markup();
  for (const text of ['Extras 设置', '上下文压缩', '流式与空响应重试', '目标等待', '保存', '放弃草稿', '秒', '毫秒']) assert.ok(html.includes(text), 'Missing Chinese UI: ' + text);
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
