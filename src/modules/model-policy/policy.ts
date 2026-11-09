import {resolveCompactionReasoning, validateCompactionReasoning, type CompactionReasoningPolicy} from '../compact-context/reasoning-policy.ts';

export interface ModelSelection { provider: string; model: string; reasoningEffort?: string | null; }
export interface WorkspaceOverride { workspaceId: string; root?: ModelSelection | null; descendants?: ModelSelection | null; }
export interface ResolvedConfig { enabled: boolean; root: ModelSelection | null; descendants: ModelSelection | null; workspaceOverrides: WorkspaceOverride[]; compactionReasoning: CompactionReasoningPolicy; }
const id = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f-\u009f]/u.test(value);
function record(value: unknown, keys: string[], path: string): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) throw new TypeError(path + ': plain data object required');
  for (const key of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value,key)!;
    if (typeof key !== 'string' || !keys.includes(key) || !d.enumerable || !('value' in d)) throw new TypeError(path + ': unknown or non-data field');
  }
}
function selection(value: unknown, path: string): void {
  if (value === null) return;
  record(value,['provider','model','reasoningEffort'],path);
  if (!id(value.provider) || !id(value.model) || (value.reasoningEffort !== undefined && value.reasoningEffort !== null && !id(value.reasoningEffort))) throw new TypeError(path + ': exact nonempty native IDs required');
}
/** Validate detached inert semantic data; never silently repair an invalid accepted policy. */
export function validateConfig(value: unknown): asserts value is ResolvedConfig {
  record(value,['enabled','root','descendants','workspaceOverrides','compactionReasoning'],'model-policy');
  if (typeof value.enabled !== 'boolean') throw new TypeError('model-policy: enabled must be boolean');
  selection(value.root,'root'); selection(value.descendants,'descendants');
  if (!Array.isArray(value.workspaceOverrides) || value.workspaceOverrides.length > 100) throw new TypeError('workspaceOverrides: at most 100 entries required');
  const seen = new Set();
  for (const item of value.workspaceOverrides) {
    record(item,['workspaceId','root','descendants'],'workspaceOverrides');
    if (!id(item.workspaceId) || seen.has(item.workspaceId)) throw new TypeError('workspaceOverrides: unique exact workspace IDs required');
    seen.add(item.workspaceId);
    for (const role of ['root','descendants']) if (Object.hasOwn(item,role)) selection(item[role],role);
  }
  validateCompactionReasoning(value.compactionReasoning);
}
/** Loader may provide volatile accessors or its stable getter view. */
export function resolveConfig(raw: Record<string, any> = {}): ResolvedConfig {
  const read = (key: string, fallback: any) => {
    const v = raw[key]; const value = v && typeof v.get === 'function' ? v.get() : v;
    return value === undefined ? fallback : structuredClone(value);
  };
  return {enabled:read('enabled',false),root:read('root',null),descendants:read('descendants',null),workspaceOverrides:read('workspaceOverrides',[]),compactionReasoning:resolveCompactionReasoning(read('compactionReasoning',undefined))};
}
/** Omission inherits global; explicit null means leave native selection alone. */
export function selectionFor(config: ResolvedConfig, workspaceId: string, descendant: boolean): ModelSelection | null {
  const role = descendant ? 'descendants' : 'root';
  const override = config.workspaceOverrides.find(item => item.workspaceId === workspaceId);
  const value = override && Object.hasOwn(override,role) ? override[role] : config[role];
  return value ? {provider:value.provider,model:value.model,...(value.reasoningEffort == null ? {} : {reasoningEffort:value.reasoningEffort})} : null;
}
