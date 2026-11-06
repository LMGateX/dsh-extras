// Adapted from dsh-goal-wait-gate; original MIT license retained in NOTICE.txt.
import Schema from '@deepseek-ai/schemastery'

export const strategies = ['activation', 'replacement', 'native', 'off'] as const
export type Strategy = typeof strategies[number]
export type Live<T> = T | { get(): T }

/** Native volatile fields; orchestration owns the separate enabled switch. */
export const Config = Schema.object({
  strategy: Schema.union(strategies.map(strategy => Schema.const(strategy))).default('activation').description('Goal continuation owner: official driver plus gate (activation), pinned port (replacement), official unchanged (native), or no automatic continuation (off). Activation inherits same-value external-disarm overlap ambiguity; replacement waits without disarming.').volatile(),
  waitForJobs: Schema.boolean().default(true).description('Hold while this session owns running or stopping jobs.').volatile(),
  waitForSubagents: Schema.boolean().default(true).description('Hold while this session owns live subagent descendants.').volatile(),
  maxHoldMs: Schema.natural().default(0).description('Maximum hold in milliseconds; 0 holds indefinitely. Applies to the next hold.').volatile(),
})

/** Gate policy. Every field is optional; defaults hold on every available signal. */
export interface Config {
  readonly strategy?: Live<Strategy>
  /** Hold continuation while the session owns running or stopping jobs. */
  readonly waitForJobs?: Live<boolean>
  /** Hold continuation while the session owns live subagent descendants. */
  readonly waitForSubagents?: Live<boolean>
  /** Release a hold after this many milliseconds; `0` holds indefinitely. */
  readonly maxHoldMs?: Live<number>
}

/** Validated gate policy with every default applied. */
export interface ResolvedConfig {
  readonly strategy: Strategy
  readonly waitForJobs: boolean
  readonly waitForSubagents: boolean
  readonly maxHoldMs: number
}

/**
 * Validate raw plugin configuration and apply defaults.
 *
 * @param config - the raw config the loader passed to the plugin.
 * @returns the resolved policy.
 * @throws Error naming the offending field, so a bad composition fails at load.
 */
export function resolveConfig(config: Config = {}): ResolvedConfig {
  const strategy = liveValue(config.strategy) ?? 'activation'
  if (!(strategies as readonly unknown[]).includes(strategy)) throw new Error(`goal-wait-gate: strategy must be one of ${strategies.join(', ')}`)
  return {
    strategy,
    waitForJobs: optionalBoolean('waitForJobs', liveValue(config.waitForJobs)) ?? true,
    waitForSubagents: optionalBoolean('waitForSubagents', liveValue(config.waitForSubagents)) ?? true,
    maxHoldMs: optionalDuration('maxHoldMs', liveValue(config.maxHoldMs)) ?? 0,
  }
}

function liveValue<T>(value: Live<T> | undefined): T | undefined {
  if (value !== null && typeof value === 'object') {
    const get = Reflect.get(value, 'get')
    if (typeof get === 'function') return get.call(value) as T
  }
  return value as T | undefined
}

function optionalBoolean(field: string, value: unknown): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`goal-wait-gate: ${field} must be a boolean`)
  return value
}

function optionalDuration(field: string, value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`goal-wait-gate: ${field} must be a non-negative whole number of milliseconds`)
  }
  return value
}
