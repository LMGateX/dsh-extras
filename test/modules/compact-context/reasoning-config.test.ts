import test from 'node:test';
import assert from 'node:assert/strict';
import { Config, resolveConfig, validateConfig } from '../../../src/modules/compact-context/config.ts';
import { resolveCompactionReasoning, validateCompactionReasoning } from '../../../src/modules/compact-context/reasoning-policy.ts';
import { validateModuleConfig } from '../../../src/migration/validation.ts';

test('request reasoning is default-off independently from agent tool visibility', () => {
  assert.deepEqual(resolveConfig().compactionReasoning, { enabled: false, rules: [{ scope: 'all', mode: 'inherit' }] });
  assert.deepEqual(resolveConfig({ compactTool: false, compactionReasoning: { enabled: true, rules: [] } }).compactionReasoning, { enabled: true, rules: [] });
});

test('reasoning rules validate exact action/scope shapes without losing explicit values', () => {
  const rules = [{ scope: 'provider-model', provider: 'route/A', model: 'Case Model', mode: 'fixed', effort: 'opaque-effort' }];
  assert.deepEqual(resolveCompactionReasoning({ rules }), { enabled: false, rules });
  assert.doesNotThrow(() => validateConfig(resolveConfig({ compactionReasoning: { enabled: true, rules } })));
  for (const policy of [null, { enabled: null }, { rules: null }, { rules: [{ scope: 'all', mode: 'fixed' }] },
    { rules: [{ scope: 'all', mode: 'inherit', provider: 'x' }] }, { rules: [{ scope: 'provider', provider: '', mode: 'inherit' }] },
    { rules: [{ scope: 'all', mode: 'inherit' }, { scope: 'all', mode: 'fixed', effort: 'x' }] },
    { rules: [{ scope: 'provider', provider: 'x\n', mode: 'inherit' }] }, { extra: 1 },
    { rules: Array.from({ length: 101 }, (_, i) => ({ scope: 'provider', provider: String(i), mode: 'inherit' })) },
    { rules: [{ scope: 'all', mode: 'fixed', effort: 'a'.repeat(201) }] },
  ]) assert.throws(() => resolveConfig({ compactionReasoning: policy }), TypeError);
  assert.throws(() => validateCompactionReasoning({ rules: [] }), TypeError);
  assert.throws(() => resolveCompactionReasoning(Object.assign(Object.create({ inherited: true }), { enabled: false })), TypeError);
  assert.throws(() => resolveCompactionReasoning({ [Symbol('hidden')]: true }), TypeError);
  assert.throws(() => resolveCompactionReasoning(Object.defineProperty({}, 'enabled', { value: true })), TypeError);
  let reads = 0;
  assert.throws(() => resolveConfig({ compactionReasoning: { get rules() { reads++; return []; } } }), TypeError);
  assert.equal(reads, 0);
});

test('native schema and detached target migration admit new reasoning settings without historical defaults', () => {
  assert.doesNotThrow(() => validateModuleConfig('compact-context', { compactionReasoning: { enabled: true, rules: [] } }));
  assert.throws(() => validateModuleConfig('compact-context', { compactionReasoning: { rules: [{ scope: 'all', mode: 'inherit', effort: 'x' }] } }));
  assert.throws(() => Config({ compactionReasoning: { rules: [{ scope: 'invalid', mode: 'inherit' }] } }));
  assert.throws(() => Config({ compactionReasoning: { rules: [{ scope: 'all', mode: 'fixed', effort: 123 }] } }));
});
