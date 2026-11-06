// Adapted from dsh-goal-wait-gate; original MIT license retained in NOTICE.txt.
/**
 * dsh-goal-wait-gate: withhold automatic goal continuation while the owning
 * agent still has live background work.
 *
 * Activation keeps the official driver and toggles only process-local goal
 * activation. Replacement/off use a runtime-only audited native ownership
 * coordinator; no package/profile mutation or unconditional bundle patch.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-goal'
import type {} from '@deepseek-ai/dsh-jobs'
import { Config, resolveConfig, type Strategy } from './config.ts'
import { createGoalMode } from './mode.ts'

/** Registered plugin name. */
export const name = 'extras-goal-wait'

/** Services this plugin cannot work without. */
export const inject = ['agents', 'goals']

export { Config, resolveConfig } from './config.ts'

export interface GoalWaitRuntimeStatus {
  capabilities: { continuation: { phase: 'active' | 'disabled' | 'unavailable'; reason?: string } }
  details: { goalWait: { requested: Strategy; mounted: 'replacement-port' | 'host-driver+gate' | 'host-driver' | 'none'; fallback?: string; host?: { distribution: string; cordis: string; driverSha256: string } } }
}
const runtimeStates = new WeakMap<Context['fiber'], () => GoalWaitRuntimeStatus>()
/** Side-effect-free status for the exact feature fiber; never user config or a global HOME file. */
export function runtimeStatus(ctx: Context): GoalWaitRuntimeStatus {
  const read = runtimeStates.get(ctx.fiber)
  return structuredClone(read?.() ?? { capabilities: { continuation: { phase: 'disabled' } }, details: { goalWait: { requested: 'activation', mounted: 'none' } } })
}

/**
 * Mount the gate.
 *
 * @param ctx - the plugin context carrying the agent registry and goal service.
 * @param config - gate policy; defaults hold on every available signal.
 */
export function apply(ctx: Context, config: Config = {}): void {
  let resolved = resolveConfig(config)
  const readPolicy = () => {
    try { resolved = resolveConfig(config) } catch (error) {
      ctx.logger.warn(`goal-wait-gate: invalid live policy ignored: ${error instanceof Error ? error.message : String(error)}`)
    }
    return resolved
  }
  const mode = createGoalMode(ctx, readPolicy)
  const evaluate = mode.evaluate
  runtimeStates.set(ctx.fiber, mode.status)
  ctx.effect(() => () => { runtimeStates.delete(ctx.fiber) })
  ;(ctx.on as any)('loader/volatile-update', () => { void mode.refresh() })
  ctx.logger.info(
    `goal-wait-gate: mounted (waitForJobs=${resolved.waitForJobs}, waitForSubagents=${resolved.waitForSubagents}, maxHoldMs=${resolved.maxHoldMs})`,
  )

  // Primary checkpoint: the turn loop awaits this before the agent turns idle,
  // so the goal is already gated when the official driver's idle check runs.
  ctx.on('agent/turn-stopping', ({ agent }) => {
    evaluate(agent)
  })

  // Safety net for turn shapes that end without turn-stopping.
  ctx.on('agent/status', ({ agent, status }) => {
    if (status !== 'idle') return
    evaluate(agent)
  }, { prepend: true })

  // A goal created, edited, or resumed while live work is already pending must
  // not start an empty round: the official driver turns `goal/changed` into a
  // drive request, so this listener runs before its own.
  ctx.on('goal/changed', ({ agent }) => {
    evaluate(agent)
  }, { prepend: true })

  // A disposed agent's session may be resumed later as a fresh agent; the old
  // bookkeeping must not leak into it.
  ctx.on('agent/disposed', ({ agent }) => {
    mode.forget(agent)
    const ancestors: (typeof agent)[] = []
    const visited = new Set<string>()
    let child = agent
    while (child.session.header.origin === 'subagent') {
      const id = child.session.header.parentSession
      if (id === undefined || visited.has(id)) break
      visited.add(id)
      const parent = ctx.agents.get(id)
      if (parent === undefined) break
      ancestors.push(parent); child = parent
    }
    queueMicrotask(() => {
      for (const parent of ancestors) if (ctx.agents.get(parent.id) === parent) evaluate(parent)
    })
  })

  // Unloading the gate restores official behavior: re-arm the goals it holds.
  ctx.effect(() => () => mode.dispose(), 'goal-wait mode teardown')
  const jobs = ctx.get('jobs')
  if (jobs?.events !== undefined) {
    let closed = false
    const stop = jobs.events.subscribe({ owners: 'all' }, event => {
      if (!('job' in event) || event.job.owner === undefined || !['registered', 'settled', 'stopping', 'removed'].includes(event.type)) return
      const owner = event.job.owner
      // Let the host finish notice delivery before rechecking continuation.
      queueMicrotask(() => {
        if (closed) return
        const agent = ctx.agents.get(owner)
        if (agent !== undefined) evaluate(agent)
      })
    })
    ctx.effect(() => () => { closed = true; stop() })
  }
  for (const agent of ctx.agents.list()) evaluate(agent)
}

/** Mountable plugin value, also usable from tests and manual compositions. */
export const goalWaitGate = { name, inject, apply, Config, runtimeStatus }
