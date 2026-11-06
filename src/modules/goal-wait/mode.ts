/** Strategy lifecycle; native ownership is exclusively delegated to host-owner. */
import type { Context, Fiber } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ResolvedConfig, Strategy } from './config.ts'
import { GoalWaitGate } from './gate.ts'
import { createHostDriverOwner } from './host-owner.ts'
import { observeTransitionAuthority } from './authority.ts'
import { assertHostVersion, type HostProfile } from './driver/host-version.ts'
import { createBackgroundPolicy } from './driver/background-work.ts'
import { installNativeDriver } from './driver/native-driver.ts'
import type { GoalWaitRuntimeStatus } from './index.ts'

export function createGoalMode(ctx: Context, policy: () => ResolvedConfig) {
  let gate: GoalWaitGate | undefined
  let mountedStrategy: Strategy | undefined
  let requested = policy().strategy
  let switching = false
  let closed = false
  let fault: string | undefined
  let host: HostProfile | undefined
  let queue = Promise.resolve()
  let authority: ReturnType<typeof observeTransitionAuthority> | undefined
  const observed = new Set<Agent>()
  const owner = createHostDriverOwner(ctx, {
    autoDispose: false,
    onConflict(reason) { fault = reason; gate?.closeWithoutRearm(); gate = undefined },
  })
  const evaluate = (agent: Agent) => { if (!closed) { observed.add(agent); gate?.evaluate(agent) } }
  const sweep = () => { for (const agent of ctx.agents.list()) evaluate(agent) }
  const mountGate = () => { if (!gate) gate = new GoalWaitGate(ctx, policy); sweep() }
  if (requested === 'activation' && ctx.get('loader') === undefined) mountGate()

  const mountReplacement = async () => {
    host = await assertHostVersion(ctx)
    gate?.closeWithoutRearm(); gate = undefined
    let stop: (() => Promise<void>) | undefined
    const rawFiber = ctx.plugin({
      name: 'goal-wait-owned-replacement-driver', inject: ['agents', 'goals', 'sessions', 'jobs'],
      apply(scope: Context) {
        const installed = installNativeDriver(scope, createBackgroundPolicy(scope, policy,
          { nativeSubagentJoin: host!.driver.joinsProgressingDescendants }), host!.driver,
          { disarm(agent, action) { if (authority) authority.owned(agent, action); else action() } })
        stop = installed.stop
      },
    }).ctx.fiber as Fiber
    await rawFiber.await()
    return { rawFiber, stop: () => stop?.() ?? Promise.resolve() }
  }
  const refresh = () => {
    const next = policy().strategy
    requested = next
    if (mountedStrategy === next && !switching) { sweep(); return queue }
    switching = true
    queue = queue.then(async () => {
      if (closed) return
      const target = policy().strategy
      requested = target
      fault = undefined
      host ??= await assertHostVersion(ctx)
      authority = observeTransitionAuthority(ctx, host, (agent, id) => gate?.holds(agent, id) ?? false)
      let state
      try {
        state = await owner.transition({ strategy: target,
          ...(target === 'replacement' ? { mountOwned: mountReplacement } : {}) })
      } finally {
        if (!closed) {
          const reason = authority.finish(owner.snapshot().phase === 'active')
          authority = undefined
          if (reason) fault = reason
        }
      }
      if (closed) return
      if (state.phase === 'active') {
        if (target === 'activation') mountGate()
        if (target !== 'activation') { gate?.dispose(); gate = undefined }
        mountedStrategy = target
      }
      switching = false
    }).catch(error => { fault = error instanceof Error ? error.message : String(error); switching = false })
    return queue
  }
  // apply itself must not await a Loader operation or hold the composition open.
  void refresh()
  return {
    evaluate,
    forget(agent: Agent) { observed.delete(agent); gate?.forget(agent) },
    refresh,
    status(): GoalWaitRuntimeStatus {
      const state = owner.snapshot()
      const active = !closed && !switching && state.phase === 'active' && !fault
      const mounted = !active ? 'none' : state.effective === 'replacement' ? 'replacement-port'
        : state.effective === 'stock' ? (gate ? 'host-driver+gate' : 'host-driver') : 'none'
      return { capabilities: { continuation: { phase: closed ? 'disabled' : active ? 'active' : 'unavailable',
        ...(!active && !closed ? { reason: fault ?? state.reason ?? 'continuation owner transition is pending' } : {}) } },
        details: { goalWait: { requested, mounted,
          ...(fault ?? state.reason ? { fallback: fault ?? state.reason } : {}),
          ...(host ? { host: { distribution: host.distribution, cordis: host.cordis, driverSha256: host.driverSha256 } } : {}),
        } } }
    },
    async dispose() {
      if (closed) return
      closed = true
      // Install synchronously, before Cordis can concurrently unwind the direct
      // driver child. The owner has no competing auto-disposer.
      if (!authority && host) authority = observeTransitionAuthority(ctx, host, (agent, id) => gate?.holds(agent, id) ?? false)
      if (authority) gate?.closeWithoutRearm(); else gate?.dispose()
      gate = undefined
      try {
        const closing = owner.close()
        await queue
        const state = await closing
        const reason = authority?.finish(ctx.root.fiber.state === 2 && state.phase === 'active' && state.effective === 'stock')
        if (reason) fault = reason
      } finally { authority?.finish(false); authority = undefined }
    },
  }
}
