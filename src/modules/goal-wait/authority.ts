/** Temporary, exact-artifact transition observer; not a native activation owner token. */
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { pathToFileURL } from 'node:url'
import type { HostProfile } from './driver/host-version.ts'

export function observeTransitionAuthority(ctx: Context, host: HostProfile, holds: (agent: Agent, id: string) => boolean) {
  const goals = ctx.goals
  const captures = new Map<Agent, { id: string; revision: number; owned: boolean; revoked: boolean }>()
  for (const agent of ctx.agents.list()) {
    const goal = goals.get(agent)
    if (goal?.phase !== 'active' || (goal.activation !== 'armed' && !holds(agent, goal.id))) continue
    captures.set(agent, { id: goal.id, revision: goal.revision, owned: holds(agent, goal.id), revoked: false })
  }
  const originalDescriptor = Object.getOwnPropertyDescriptor(goals, 'disarm')
  const original = goals.disarm
  let marked: Agent | undefined
  let unknown = false
  let closed = false
  let finishing = false
  const artifact = pathToFileURL(host.artifactPath).href
  const nativeLifecycle = (stack: string): boolean => {
    if (process.sourceMapsEnabled) return false
    const frames = stack.split('\n')
    // Exact digest pins these two immediate native frames. All other native
    // disarms (errors/cancellation) and every external/same-value call revoke.
    return frames[3]?.includes(artifact + ':94:') === true
      && (frames[4]?.includes(artifact + ':357:') === true || frames[4]?.includes(artifact + ':363:') === true)
  }
  function wrapped(this: unknown, ...args: Parameters<typeof original>): ReturnType<typeof original> {
    if (closed) return Reflect.apply(original, this, args)
    const stack = new Error().stack ?? ''
    const ownedCall = marked === args[0] || nativeLifecycle(stack)
    marked = undefined // Consume before the native call can synchronously emit external callbacks.
    let capture = captures.get(args[0])
    if (!capture && ownedCall) {
      // A legitimate goal can be created while a dependency-pending mount is
      // waiting. Capture only its directly observed owned lifecycle mutation,
      // never an arbitrary armed value somewhere inside the transition window.
      const goal = goals.get(args[0])
      if (goal?.phase === 'active' && goal.activation === 'armed') {
        capture = { id: goal.id, revision: goal.revision, owned: true, revoked: false }
        captures.set(args[0], capture)
      }
    }
    if (capture) {
      if (ownedCall) capture.owned = true
      else {
        capture.revoked = true
        const frames = stack.split('\n')
        if (process.sourceMapsEnabled || frames.length < 5 || frames[3]?.includes(artifact)) unknown = true
      }
    }
    return Reflect.apply(original, this, args)
  }
  const installedDescriptor: PropertyDescriptor = { configurable: true, enumerable: originalDescriptor?.enumerable ?? false, writable: true, value: wrapped }
  Object.defineProperty(goals, 'disarm', installedDescriptor)
  const intact = () => {
    const current = Object.getOwnPropertyDescriptor(goals, 'disarm')
    return current !== undefined && (['value', 'get', 'set', 'configurable', 'enumerable', 'writable'] as const)
      .every(key => Object.is(current[key], installedDescriptor[key]))
  }
  const changed = 'goal disarm descriptor changed during continuation handover; authority not restored'
  return {
    owned(agent: Agent, action: () => void) {
      if (closed) return action()
      marked = agent; try { action() } finally { marked = undefined }
    },
    finish(restore: boolean): string | undefined {
      if (closed || finishing) return undefined
      finishing = true
      let reason: string | undefined
      try {
        if (!intact()) reason = changed
        else if (restore) for (const [agent, capture] of captures) {
          // A prior resume can synchronously run external listeners. Keep the
          // observer alive and recheck descriptor ownership for every next goal.
          if (!intact()) { reason = changed; break }
          if (!capture.owned || capture.revoked || ctx.agents.get(agent.id) !== agent) continue
          const goal = goals.get(agent)
          if (goal?.id !== capture.id || goal.revision !== capture.revision || goal.phase !== 'active' || goal.activation !== 'disarmed') continue
          goals.resume(agent, { id: goal.id, revision: goal.revision })
        }
        if (restore && unknown) reason ??= 'unrecognized native disarm frame; continuation authority was not restored'
      } finally {
        try {
          if (intact()) {
            if (originalDescriptor) Object.defineProperty(goals, 'disarm', originalDescriptor)
            else Reflect.deleteProperty(goals, 'disarm')
          } else reason = changed
        } finally {
          closed = true; finishing = false; marked = undefined; captures.clear()
        }
      }
      return reason
    },
  }
}
