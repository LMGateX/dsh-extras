/** Baseline-specific, instance-owned compatibility adapter; native stream remains authoritative. */
import { createRequire } from 'node:module';
import { Context, symbols, type Events } from '@deepseek-ai/cordis';
import LlmRuntime, { isAgentLoopRequest, type GenerateOptions } from '@deepseek-ai/dsh-llm';
import type { CompactionReasoningPolicy, CompactionReasoningRule } from './reasoning-policy.ts';
import type { SessionId } from '@deepseek-ai/dsh-session';

export interface ReasoningCapability { phase: 'disabled' | 'active' | 'unavailable'; reason?: string }
const requireHost = createRequire(import.meta.url);
class CompatibilityError extends Error {}
function unsupported(reason: string): never { throw new CompatibilityError(reason); }

function baseline(ctx: Context): void {
  if (requireHost('@deepseek-ai/dsh-llm/package.json').version !== '0.2.2-alpha.3'
    || requireHost('@deepseek-ai/cordis/package.json').version !== '4.0.6-alpha.2') unsupported('unverified host version');
  if (!(ctx instanceof Context) || !ctx.root?.reflect?.store || typeof ctx.on !== 'function') unsupported('unverified Cordis reflection shape');
}

function winningRule(policy: CompactionReasoningPolicy, options: GenerateOptions): CompactionReasoningRule | undefined {
  return policy.rules.find(rule => rule.scope === 'provider-model' && rule.provider === options.provider && rule.model === options.model)
    ?? policy.rules.find(rule => rule.scope === 'provider' && rule.provider === options.provider)
    ?? policy.rules.find(rule => rule.scope === 'all');
}

/** Exact live-map lookup only; a missing durable value does not select a broader rule. */
function inheritedEffort(ctx: Context, options: GenerateOptions): GenerateOptions['reasoningEffort'] {
  if (typeof options.sessionId !== 'string' || options.sessionId.length === 0) return undefined;
  try {
    const session = ctx.get('sessions')?.get(options.sessionId as SessionId);
    if (!session || session.id !== options.sessionId) return undefined;
    return session.requestHeader()?.config.reasoningEffort;
  } catch { return undefined; }
}

function sameDescriptor(left: PropertyDescriptor | undefined, right: PropertyDescriptor): boolean {
  return !!left && left.value === right.value && left.writable === right.writable
    && left.configurable === right.configurable && left.enumerable === right.enumerable
    && !Object.hasOwn(left, 'get') && !Object.hasOwn(left, 'set');
}
function rawService(service: unknown): unknown {
  if (!service || (typeof service !== 'object' && typeof service !== 'function')) return service;
  return (service as Record<symbol, unknown>)[symbols.original] ?? service;
}
interface Installation { active: boolean; descriptor: PropertyDescriptor; restore(): void }

/**
 * Observe audited native provision/HMR and proxy reads before enumerating existing
 * isolated services. Direct set+direct get and cached-method dispatch are not an
 * extensibility guarantee. Unknown coverage withdraws the entire modifier only.
 */
export function installCompactionReasoning(ctx: Context, policy: CompactionReasoningPolicy, status: (value: ReasoningCapability) => void): () => void {
  let disposed = false;
  const observers: (() => unknown)[] = [];
  const installed = new Map<LlmRuntime, Installation>();
  const restoreAll = (): void => {
    for (const record of installed.values()) { record.active = false; record.restore(); }
    installed.clear();
  };
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    for (const off of observers.splice(0).reverse()) off();
    restoreAll();
  };
  const fail = (error: unknown): void => {
    restoreAll();
    status({ phase: 'unavailable', reason: error instanceof CompatibilityError ? error.message : 'runtime compatibility probe failed' });
  };
  const install = (raw: unknown): void => {
    if (!(raw instanceof LlmRuntime)) unsupported('unverified native LlmRuntime lineage');
    const previous = installed.get(raw);
    if (previous) {
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(raw, 'stream'), previous.descriptor)) unsupported('stream descriptor ownership changed');
      return;
    }
    const own = Object.getOwnPropertyDescriptor(raw, 'stream');
    let owner: object | null = raw;
    let descriptor = own;
    while (!descriptor && (owner = Object.getPrototypeOf(owner))) descriptor = Object.getOwnPropertyDescriptor(owner, 'stream');
    if (!descriptor || descriptor.value !== LlmRuntime.prototype.stream
      || (own ? !own.configurable && !own.writable : !Object.isExtensible(raw))) unsupported('unverified or non-replaceable stream descriptor');
    const original = descriptor.value as LlmRuntime['stream'];
    const record: Installation = { active: true, descriptor: {}, restore() {
      record.active = false;
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(raw, 'stream'), record.descriptor)) return;
      if (own) Reflect.defineProperty(raw, 'stream', own);
      else Reflect.deleteProperty(raw, 'stream');
    } };
    // Intentionally synchronous: policy and durable session effort are captured at
    // invocation, not at the first asynchronous-generator iteration.
    const wrapped: LlmRuntime['stream'] = function (this: LlmRuntime, options: GenerateOptions, ...rest: unknown[]) {
      let outgoing = options;
      if (record.active && !disposed && options.purpose === 'compaction' && !isAgentLoopRequest(options)) {
        const rule = winningRule(policy, options);
        const effort = rule?.mode === 'fixed' ? rule.effort as GenerateOptions['reasoningEffort']
          : rule?.mode === 'inherit' ? inheritedEffort(this.ctx, options) : undefined;
        if (effort !== undefined) outgoing = { ...options, reasoningEffort: effort };
      }
      return Reflect.apply(original, this, [outgoing, ...rest]);
    };
    record.descriptor = own ? { ...own, value: wrapped } : { value: wrapped, writable: true, configurable: true, enumerable: false };
    Object.defineProperty(raw, 'stream', record.descriptor);
    installed.set(raw, record);
  };
  const reconcile = (extra?: unknown): void => {
    if (disposed) return;
    try {
      const required = new Set<unknown>();
      for (const key of Reflect.ownKeys(ctx.root.reflect.store)) {
        const impl = ctx.root.reflect.store[key as symbol];
        if (impl?.name === 'llm' && impl.value != null) required.add(rawService(impl.value));
      }
      if (extra != null) required.add(rawService(extra));
      for (const [raw, record] of installed) if (!required.has(raw)) { record.restore(); installed.delete(raw); }
      for (const raw of required) install(raw);
      status(installed.size ? { phase: 'active' } : { phase: 'unavailable', reason: 'no native LLM runtime is available' });
    } catch (error) { fail(error); }
  };
  try {
    baseline(ctx);
    const onService: Events['internal/service'] = function (name) { if (name === 'llm') reconcile(); };
    const onGet: Events['internal/get'] = (_lookupCtx, name, _error, next) => {
      const result = next();
      if (name === 'llm') reconcile(result);
      return result;
    };
    observers.push(ctx.on('internal/service', onService, { global: true, prepend: true }));
    observers.push(ctx.on('internal/get', onGet, { global: true, prepend: true }));
    reconcile();
  } catch (error) { dispose(); fail(error); }
  return dispose;
}
