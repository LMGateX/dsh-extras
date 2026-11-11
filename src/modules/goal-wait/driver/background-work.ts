/** Conservative published-work observation; never consumes results or changes goal authority. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-jobs'
import type { DriverPolicy } from './native-driver.ts'

export interface BackgroundConfig { waitForJobs?: boolean; waitForSubagents?: boolean }

/** rc.2 owns root-tree progressing work; this additive policy observes Jobs only. */
/** Job lifecycle events this policy counts; hoisted so no event allocates it. */
const JOB_LIFECYCLE: ReadonlySet<string> = new Set(['registered', 'settled', 'stopping', 'removed'])
/** Settings read at the moment of a decision, so a saved policy never remounts the driver. */
export type BackgroundConfigSource = BackgroundConfig | (() => BackgroundConfig)
export function createBackgroundPolicy(ctx: Context, source: BackgroundConfigSource = {}): DriverPolicy {
  const settings = (): BackgroundConfig => {
    const value = typeof source === 'function' ? source() : source
    return value ?? {}
  }
  const handoffs = new Map<Agent, number>()
  /**
   * Live jobs per owner, kept from the lifecycle events below.
   *
   * `list(owner)` answers with every retained record, and the decision scanned
   * it on every call — O(all jobs) per decision. Two counts are kept because a
   * policy that ignores generic jobs still counts subagent jobs, and one total
   * cannot answer both. An owner is seeded from the registry the first time it
   * is asked about, and only a seeded owner absorbs events: an event for an
   * owner this policy has never looked at could only invent a number.
   *
   * Host mapping (dsh-jobs-local/lib/index.js): `registered` is emitted after
   * `store.set` with `status: "running"` (start); `stopping` after the status
   * becomes `"stopping"` (killJob, and teardown cancel); `settled` after the
   * terminal status is recorded; `removed` only for a record that settled
   * first (remove() requires a terminal status, and owner/service teardown
   * await `job.settled` before dropping). Running and stopping are live, so
   * `registered` adds one and `settled` removes one while `stopping` and
   * `removed` never change liveness. Unowned jobs are never counted, exactly
   * as the owner filter did.
   */
  const liveJobs = new Map<string, { all: number; subagent: number }>()
  /** Set once the job subscription exists; without it the registry stays the only exact source. */
  let watchingJobs = false
  let closed = false
  const countsJob = (job: {kind: string}): boolean => settings().waitForJobs !== false || (settings().waitForSubagents !== false && job.kind === 'subagent')
  /** Whether one projected status still counts as live; mirrors the host's running/stopping pair. */
  const isLiveJob = (status: string): boolean => status === 'running' || status === 'stopping'
  /** Apply one job lifecycle event to the per-owner counts; only a seeded owner moves. */
  const recordJobEvent = (event: { readonly type: string; readonly job: { readonly owner?: string; readonly kind: string } }): void => {
    const owner = event.job.owner
    const counts = owner === undefined ? undefined : liveJobs.get(owner)
    if (counts === undefined) return
    const delta = event.type === 'registered' ? 1 : event.type === 'settled' ? -1 : 0
    if (delta === 0) return
    // Floored at zero: a count that went negative would answer "no live job"
    // for the next registration, the one direction a hold must never go.
    counts.all = Math.max(0, counts.all + delta)
    if (event.job.kind === 'subagent') counts.subagent = Math.max(0, counts.subagent + delta)
    // Nothing left to count: drop the owner instead of retaining a zero entry
    // for every session that ever ran one job. A later registration re-seeds
    // from the registry the next time this owner is asked about.
    if (counts.all === 0 && counts.subagent === 0 && owner !== undefined) liveJobs.delete(owner)
  }
  /**
   * How many live jobs this policy counts for one owner.
   *
   * The registry is consulted while no subscription exists: a realm that had
   * both job and subagent waits switched off when the driver mounted installs
   * no listener, and an index could then never learn about a later
   * registration. With a listener installed, the first answer per owner seeds
   * the counts and every following event keeps them exact.
   */
  const liveJobCount = (agent: Agent): number => {
    const anyKind = settings().waitForJobs !== false
    const subagentKind = !anyKind && settings().waitForSubagents !== false
    if (!anyKind && !subagentKind) return 0
    if (!watchingJobs) return ctx.jobs.list(agent.id).filter(job => job.owner === agent.id && isLiveJob(job.status) && (anyKind || job.kind === 'subagent')).length
    let counts = liveJobs.get(agent.id)
    if (counts === undefined) {
      counts = { all: 0, subagent: 0 }
      for (const job of ctx.jobs.list(agent.id)) {
        if (job.owner !== agent.id || !isLiveJob(job.status)) continue
        counts.all += 1
        if (job.kind === 'subagent') counts.subagent += 1
      }
      liveJobs.set(agent.id, counts)
    }
    return anyKind ? counts.all : counts.subagent
  }
  return {
    allows(agent) {
      if (closed || handoffs.has(agent)) return false
      if (liveJobCount(agent) > 0) return false
      return true
    },
    subscribe(wake) {
      const stops: (() => void)[] = []
      const notify = (agents: readonly Agent[]) => queueMicrotask(() => {
        if (closed) return
        for (const agent of new Set(agents)) if (ctx.agents.get(agent.id) === agent) wake(agent)
      })
      stops.push((ctx.on as any)('loader/volatile-update', () => notify(ctx.agents.list()), { global: true }))
      {
        stops.push(ctx.jobs.events.subscribe({owners: 'all'}, event => {
          if (closed || !('job' in event) || event.job.owner === undefined || !JOB_LIFECYCLE.has(event.type)) return
          recordJobEvent(event)
          if (!countsJob(event.job)) return
          const agent = ctx.agents.get(event.job.owner)
          if (agent === undefined) return
          if (event.type === 'settled') handoffs.set(agent, (handoffs.get(agent) ?? 0) + 1)
          queueMicrotask(() => {
            if (closed) return
            if (event.type === 'settled') {
              const count = (handoffs.get(agent) ?? 1) - 1
              if (count === 0) handoffs.delete(agent); else handoffs.set(agent, count)
            }
            if (ctx.agents.get(agent.id) === agent) wake(agent)
          })
        }))
        // From here every later event is delivered. Drop seeds read before this
        // listener existed, so the next decision re-seeds from the registry and
        // no registration can slip between a seed and the subscription.
        watchingJobs = true
        liveJobs.clear()
      }
      return () => { closed = true; for (const stop of stops.toReversed()) stop(); handoffs.clear(); liveJobs.clear() }
    },
  }
}
