/** Baseline-specific, instance-owned compatibility adapter; native stream remains authoritative. */
import { createRequire } from 'node:module';
import { Context, symbols } from '@deepseek-ai/cordis';
import LlmRuntime, { isAgentLoopRequest, type GenerateOptions } from '@deepseek-ai/dsh-llm';
import type { CompactionReasoningPolicy, CompactionReasoningRule } from './reasoning-policy.ts';

export interface ReasoningCapability { phase: 'disabled' | 'active' | 'unavailable'; reason?: string }
const requireHost = createRequire(import.meta.url);

function baseline(ctx: Context): void {
  if (requireHost('@deepseek-ai/dsh-llm/package.json').version !== '0.2.2-alpha.3'
    || requireHost('@deepseek-ai/cordis/package.json').version !== '4.0.6-alpha.2') throw new Error('unverified host version');
  if (!(ctx instanceof Context) || !ctx.root?.reflect?.store || typeof ctx.on !== 'function') throw new Error('unverified Cordis reflection shape');
}

function winningRule(policy: CompactionReasoningPolicy, options: GenerateOptions): CompactionReasoningRule | undefined {
  return policy.rules.find(rule => rule.scope === 'provider-model' && rule.provider === options.provider && rule.model === options.model)
    ?? policy.rules.find(rule => rule.scope === 'provider' && rule.provider === options.provider)
    ?? policy.rules.find(rule => rule.scope === 'all');
}

/** Mount on current native runtimes. Returned cleanup never overwrites a later owner. */
export function installCompactionReasoning(ctx: Context, policy: CompactionReasoningPolicy, status: (value: ReasoningCapability) => void): () => void {
  let active = true;
  const restores: (() => void)[] = [];
  const installed = new Set<object>();
  const restore = (): void => { active = false; for (const dispose of restores.splice(0).reverse()) dispose(); };
  try {
    baseline(ctx);
    const install = (service: unknown): void => {
      if (!service) return;
      const raw = (service as Record<symbol, unknown>)[symbols.original] ?? service;
      if (installed.has(raw as object)) return;
      if (!(raw instanceof LlmRuntime)) throw new Error('unverified native LlmRuntime lineage');
      const own = Object.getOwnPropertyDescriptor(raw, 'stream');
      let owner: object | null = raw;
      let descriptor = own;
      while (!descriptor && (owner = Object.getPrototypeOf(owner))) descriptor = Object.getOwnPropertyDescriptor(owner, 'stream');
      if (!descriptor || descriptor.value !== LlmRuntime.prototype.stream
        || (own ? !own.configurable && !own.writable : !Object.isExtensible(raw))) throw new Error('unverified or non-replaceable stream descriptor');
      const original = descriptor.value as LlmRuntime['stream'];
      const wrapped: LlmRuntime['stream'] = function (this: LlmRuntime, options: GenerateOptions, ...rest: unknown[]) {
        let outgoing = options;
        if (active && options.purpose === 'compaction' && !isAgentLoopRequest(options)) {
          const rule = winningRule(policy, options);
          if (rule?.mode === 'fixed') outgoing = { ...options, reasoningEffort: rule.effort as GenerateOptions['reasoningEffort'] };
        }
        return Reflect.apply(original, this, [outgoing, ...rest]);
      };
      const replacement = own ? { ...own, value: wrapped } : { value: wrapped, writable: true, configurable: true, enumerable: false };
      Object.defineProperty(raw, 'stream', replacement);
      installed.add(raw);
      restores.push(() => {
        const current = Object.getOwnPropertyDescriptor(raw, 'stream');
        if (current?.value !== wrapped || current.get !== undefined || current.set !== undefined) return;
        if (own) Object.defineProperty(raw, 'stream', own);
        else Reflect.deleteProperty(raw, 'stream');
      });
    };
    for (const key of Reflect.ownKeys(ctx.root.reflect.store)) {
      const impl = ctx.root.reflect.store[key as symbol];
      if (impl?.name === 'llm') install(impl.value);
    }
    status(installed.size ? { phase: 'active' } : { phase: 'unavailable', reason: 'no native LLM runtime is available' });
  } catch (error) {
    restore();
    status({ phase: 'unavailable', reason: error instanceof Error ? error.message : 'unverified runtime shape' });
  }
  return restore;
}
