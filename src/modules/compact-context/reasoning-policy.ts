/** Browser-safe request policy contract shared by host and settings. */
export type CompactionReasoningRule = (
  | { scope: 'all' }
  | { scope: 'provider'; provider: string }
  | { scope: 'provider-model'; provider: string; model: string }
) & ({ mode: 'inherit' } | { mode: 'fixed'; effort: string });

export interface CompactionReasoningPolicy {
  enabled: boolean;
  rules: CompactionReasoningRule[];
}
export const MAX_REASONING_RULES = 100;
export const MAX_REASONING_ID_LENGTH = 200;
export const DEFAULT_COMPACTION_REASONING: CompactionReasoningPolicy = Object.freeze({
  enabled: false, rules: Object.freeze([Object.freeze({ scope: 'all', mode: 'inherit' })]),
}) as unknown as CompactionReasoningPolicy;

function reject(requirement: string): never {
  throw new TypeError('compactionReasoning: ' + requirement);
}

/** Inspect descriptors before reading any caller-owned values. */
function record(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) reject('plain data object required');
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) reject('plain data object required');
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.includes(key)) reject('unknown or inapplicable field');
    const desc = Object.getOwnPropertyDescriptor(value, key)!;
    if (!Object.hasOwn(desc, 'value') || !desc.enumerable) reject('enumerable inert fields required');
    result[key] = desc.value;
  }
  return result;
}
function identifier(value: unknown): void {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_REASONING_ID_LENGTH
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) reject('identifier must be nonempty, control-free and at most 200 characters');
}

/** Validate a fully resolved policy without coercion, aliases or model preflight. */
export function validateCompactionReasoning(value: unknown): void {
  const policy = record(value, ['enabled', 'rules']);
  if (typeof policy.enabled !== 'boolean') reject('enabled must be boolean');
  const rules = policy.rules;
  if (!Array.isArray(rules) || Object.getPrototypeOf(rules) !== Array.prototype || rules.length > MAX_REASONING_RULES) reject('rules must be an ordinary array of at most 100 rules');
  if (Reflect.ownKeys(rules).length !== rules.length + 1) reject('rules must be dense inert array data');
  const matches = new Set<string>();
  for (let index = 0; index < rules.length; index++) {
    const desc = Object.getOwnPropertyDescriptor(rules, String(index));
    if (!desc || !Object.hasOwn(desc, 'value') || !desc.enumerable) reject('rules must be dense inert array data');
    const rule = record(desc.value, ['scope', 'provider', 'model', 'mode', 'effort']);
    if (!['all', 'provider', 'provider-model'].includes(rule.scope as string)) reject('unknown rule scope');
    if (!['inherit', 'fixed'].includes(rule.mode as string)) reject('unknown rule mode');
    const fields = ['scope', 'mode'];
    if (rule.scope !== 'all') { fields.push('provider'); identifier(rule.provider); }
    if (rule.scope === 'provider-model') { fields.push('model'); identifier(rule.model); }
    if (rule.mode === 'fixed') { fields.push('effort'); identifier(rule.effort); }
    if (Object.keys(rule).length !== fields.length || Object.keys(rule).some(key => !fields.includes(key))) reject('unknown or inapplicable rule field');
    const key = JSON.stringify([rule.scope, rule.provider, rule.model]);
    if (matches.has(key)) reject('duplicate match target');
    matches.add(key);
  }
}

/** Apply only missing nested defaults; explicit arrays replace rather than concatenate. */
export function resolveCompactionReasoning(value: unknown = {}): CompactionReasoningPolicy {
  const input = record(value, ['enabled', 'rules']);
  const resolved = {
    enabled: Object.hasOwn(input, 'enabled') ? input.enabled : false,
    rules: Object.hasOwn(input, 'rules') ? input.rules : [{ scope: 'all', mode: 'inherit' }],
  };
  validateCompactionReasoning(resolved);
  const policy = resolved as CompactionReasoningPolicy;
  return { enabled: policy.enabled, rules: policy.rules.map(rule => ({ ...rule })) };
}
