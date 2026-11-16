// Characterization only: real installed time-context plugin with fake projection/event ports.
// This does not start a host, mutate sessions, contact a provider, or implement an override.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

assert.ok(process.env.DSH_AUDIT_INSTALL_ROOT, 'Set DSH_AUDIT_INSTALL_ROOT to the audited DSH installation root');
const entry = resolve(process.env.DSH_AUDIT_INSTALL_ROOT, 'node_modules/@deepseek-ai/dsh-time-context/lib/index.js');
const manifest = JSON.parse(readFileSync(resolve(entry, '../../package.json'), 'utf8'));
assert.equal(manifest.name, '@deepseek-ai/dsh-time-context');
assert.equal(manifest.version, '0.2.2-rc.3', 'This evidence fixture is pinned to the audited rc.3 package');
const { apply } = await import(pathToFileURL(entry).href);
const now = Date.parse('2026-11-16T08:00:00Z');
const originalNow = Date.now;
const message = (timeZone, kind = 'user') => ({
  role: 'user', source: { kind, rpcId: 'fixture', clientTimeZone: timeZone },
  content: [{ type: 'text', text: '明天九点' }],
});

async function replay(messages, options = {}) {
  let listener;
  let state;
  const ctx = {
    fiber: { assertActive() {} },
    sessionProjections: { register(spec) {
      state = { ...spec.init(), browserTurn: 1, ...options.state };
      return Promise.resolve({ stateOf() { return state; } });
    } },
    on(event, handler) { assert.equal(event, 'agent/pre-step'); listener = handler; },
  };
  await apply(ctx, { timeZone: 'Asia/Singapore', refreshIntervalMs: options.refreshIntervalMs ?? 0 });
  const signal = options.aborted ? AbortSignal.abort() : new AbortController().signal;
  const result = await listener({ agent: { session: {} }, turn: 1, step: 1, signal },
    async () => options.rejected ? { kind: 'reject' } : { kind: 'enter', messages });
  const injected = result.kind === 'enter' ? result.messages.slice(messages.length) : [];
  return { result, injected, text: injected[0]?.content[0]?.text ?? '' };
}

Date.now = () => now;
try {
  let r = await replay([message('Asia/Shanghai')]);
  assert.ok(r.text.includes("[Asia/Shanghai]"), r.text);
  assert.ok(r.text.includes("Asia/Shanghai. Interpret"), r.text);
  console.log('PASS browser beats configured fallback');

  r = await replay([message('Asia/Singapore')]);
  assert.ok(r.text.includes("[Asia/Singapore]"), r.text);
  assert.ok(r.text.includes("Asia/Singapore. Interpret"), r.text);
  console.log('PASS selected wire zone reaches clock and policy');

  r = await replay([]);
  assert.ok(r.text.includes("[Asia/Singapore]"), r.text);
  assert.match(r.text, /unavailable\. Ask/);
  console.log('PASS missing browser uses clock fallback but asks for interpretation');

  r = await replay([message('America/New_York', 'retry')]);
  assert.match(r.text, /unavailable\. Ask/);
  console.log('PASS retry source zone is not a user-rpc browser fact');

  r = await replay([message('Asia/Shanghai'), message('Asia/Singapore')]);
  assert.match(r.text, /mixed/);
  assert.match(r.text, /Ask the user/);
  console.log('PASS same-offset distinct IANA zones remain mixed');

  r = await replay([message('America/New_York')], { refreshIntervalMs: 600000, state: { lastInjectionTime: now - 60000 } });
  assert.equal(r.injected.length, 0);
  console.log('PASS recent injection suppresses changed request zone');

  r = await replay([message('Asia/Singapore')], { state: { browserTimeZones: ['Asia/Shanghai'] } });
  assert.match(r.text, /mixed/);
  console.log('PASS committed and proposed zones mix within the open turn');

  r = await replay([message('Asia/Singapore')], { rejected: true });
  assert.equal(r.result.kind, 'reject');
  assert.equal(r.injected.length, 0);
  r = await replay([message('Asia/Singapore')], { aborted: true });
  assert.equal(r.injected.length, 0);
  console.log('PASS rejection and cancellation do not inject');
} finally {
  Date.now = originalNow;
}
