/** Real native Loader/Agent/Goal/Jobs and offline adapter; no HTTP listener or live profile. */
import test from 'node:test'
import assert from 'node:assert/strict'
import * as goalWait from '../../src/modules/goal-wait/index.ts'
import { llm, startChild } from '../modules/retry/runtime.ts'
import { createGoalRuntime } from '../modules/goal-wait/native-runtime.ts'
import { until } from './loader-harness.ts'

test('owned activation-to-replacement switch preserves only held goal authority through exact native resume', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t)
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'activation owner')
  const handle = await f.createAgent({ sessionId: 'owned-switch-held' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  f.ctx.jobs.start({ kind: 'workflow', label: 'held across switch', owner: handle.agent.session.id, run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  const before = f.ctx.goals.create(handle.agent, { objective: 'switch safely', maxGoalRounds: 1 })
  assert.equal(f.ctx.goals.get(handle.agent).activation, 'disarmed')
  await f.update({ strategy: 'replacement' })
  await until(f.status, state => state.capabilities.continuation.phase === 'active' && state.details.goalWait.mounted === 'replacement-port', 'owned replacement switch')
  const after = f.ctx.goals.get(handle.agent)
  assert.equal(after.id, before.id)
  assert.equal(after.revision, before.revision + 1, 'one public native resume creates its documented revision')
  assert.equal(after.phase, 'active')
  assert.equal(after.activation, 'armed')
  assert.equal(after.roundsStarted, 0)
  assert.equal(handle.state.requests.length, 0)
})

test('replacement to off and native restore one original stock driver while preserving legitimate activation', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'replacement owner')
  const handle = await f.createAgent({ sessionId: 'replacement-off-native' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  f.ctx.jobs.start({ kind: 'workflow', label: 'off pending work', owner: handle.agent.session.id, run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  const before = f.ctx.goals.create(handle.agent, { objective: 'off and native switch', maxGoalRounds: 1 })
  await new Promise<void>(resolve => setImmediate(resolve))
  await f.update({ strategy: 'off' })
  await until(f.status, state => state.capabilities.continuation.phase === 'active' && state.details.goalWait.requested === 'off', 'off owner')
  assert.equal(f.status().details.goalWait.mounted, 'none')
  const off = f.ctx.goals.get(handle.agent)
  assert.equal(off.id, before.id)
  assert.equal(off.revision, before.revision + 1)
  assert.equal(off.activation, 'armed')
  assert.equal(off.phase, 'active')
  assert.equal(handle.state.requests.length, 0)
  assert.equal(f.stockEntry().fiber?.uid, null)
  await f.update({ strategy: 'native' })
  await until(f.status, state => state.capabilities.continuation.phase === 'active' && state.details.goalWait.mounted === 'host-driver', 'stock restored')
  await until(() => handle.state.requests.length, count => count === 1, 'official native ignores owned Jobs')
  await handle.agent.whenIdle()
  assert.equal(f.ctx.goals.get(handle.agent).roundsStarted, 1)
  assert.equal(f.stockEntry().fiber?.state, 2)
  assert.ok(!f.commits.some(change => change.options?.id === 'goal-round-driver' && change.options.disabled === true))
})

test('concurrent same-value external disarm during actual stock teardown revokes switch restoration', { timeout: 15000 }, async t => {
  const oldStackLimit = Error.stackTraceLimit
  Error.stackTraceLimit = 50
  t.after(() => { Error.stackTraceLimit = oldStackLimit })
  const f = await createGoalRuntime(t, { config: { strategy: 'native' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'native owner')
  const handle = await f.createAgent({ sessionId: 'stock-external-revocation' })
  const release = Promise.withResolvers<void>()
  const entered = Promise.withResolvers<void>()
  const off = f.ctx.on('agent/pre-step', async ({ agent }: any, next: () => Promise<any>) => {
    if (agent === handle.agent) { entered.resolve(); await release.promise }
    return next()
  })
  try {
    handle.agent.followup(llm.createUserMessage({ content: [{ type: 'text', text: 'synthetic human turn' }], source: { kind: 'user' } }))
    await entered.promise
    const goal = f.ctx.goals.create(handle.agent, { objective: 'honor external disarm', maxGoalRounds: 1 })
    const descriptor = Object.getOwnPropertyDescriptor(f.ctx.goals, 'disarm')
    let calls = 0
    const stop = f.ctx.on('goal/activation-changed', ({ sessionId }: any) => {
      if (sessionId === handle.agent.session.id && calls++ === 0) f.ctx.goals.disarm(handle.agent)
    })
    await f.update({ strategy: 'off' })
    await until(f.status, state => state.capabilities.continuation.phase === 'active' && state.details.goalWait.requested === 'off', 'off after external revocation')
    stop()
    const after = f.ctx.goals.get(handle.agent)
    assert.equal(after.activation, 'disarmed')
    assert.equal(after.id, goal.id)
    assert.equal(after.revision, goal.revision, 'external same-value call never manufactures resume revision')
    assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals, 'disarm'), descriptor, 'temporary observer is removed')
  } finally { release.resolve(); off(); await handle.agent.whenIdle() }
})

test('unloading replacement restores stock and eligible goal, with no leaked transition observer', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'replacement owner')
  const handle = await f.createAgent({ sessionId: 'unload-port-owner' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  f.ctx.jobs.start({ kind: 'workflow', label: 'unload held work', owner: handle.agent.session.id, run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  const before = f.ctx.goals.create(handle.agent, { objective: 'unload restores official', maxGoalRounds: 1 })
  await new Promise<void>(resolve => setImmediate(resolve))
  const descriptor = Object.getOwnPropertyDescriptor(f.ctx.goals, 'disarm')
  await f.fiber.dispose()
  assert.equal(f.stockEntry().fiber?.state, 2)
  assert.notEqual(f.stockEntry().fiber?.uid, null)
  assert.equal(f.ctx.goals.get(handle.agent).id, before.id)
  await until(() => handle.state.requests.length, count => count === 1, 'restored official continuation')
  assert.deepEqual(Object.getOwnPropertyDescriptor(f.ctx.goals, 'disarm'), descriptor)
})

test('native join waits for a progressing real child but does not double-block its parked pending inbox', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { subagents: true, config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'replacement with native join')
  const parent = await f.createAgent({ sessionId: 'join-parent', route: 'join-parent-route' })
  const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>()
  let childAgent: any
  const off = f.ctx.on('agent/pre-step', async ({ agent, messages }: any, next: () => Promise<any>) => {
    if (agent.id !== 'join-parked-child') return next()
    childAgent = agent; entered.resolve(); await release.promise
    for (const message of messages.toReversed()) agent.inbox.prepend('next-turn', message)
    return { kind: 'reject' }
  })
  let child: Awaited<ReturnType<typeof startChild>> | undefined
  try {
    f.runtime.registerMock('join-child-route', { failures: 0 })
    child = await startChild(f.ctx, { provider: 'spawn', label: 'native join parked child', childId: 'join-parked-child',
      signal: new AbortController().signal, request: { parent: parent.agent, prompt: [{ type: 'text', text: 'synthetic child' }], agentOptions: { provider: 'join-child-route', model: 'integration-model' } } })
    await entered.promise
    const goal = f.ctx.goals.create(parent.agent, { objective: 'native join parked child', maxGoalRounds: 1 })
    await f.ctx.sessions.flush(parent.agent.session)
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(f.ctx.goals.get(parent.agent).activation, 'armed')
    assert.equal(f.ctx.goals.get(parent.agent).revision, goal.revision)
    assert.equal(f.ctx.goals.get(parent.agent).roundsStarted, 0)
    assert.equal(parent.state.requests.length, 0)
    release.resolve()
    await until(() => parent.state.requests.length, count => count === 1, 'native join permits parked child')
    assert.equal(childAgent.status, 'idle')
    assert.ok(childAgent.inbox.nextTurn.length > 0, 'actual resident child has parked pending work')
    assert.equal(f.ctx.agents.get(childAgent.id), childAgent)
    assert.equal(f.ctx.goals.get(parent.agent).roundsStarted, 1)
  } finally { release.resolve(); off(); await child?.dispose() }
})

test('native join tracks an external provider with no local Agent through owned cleanup before continuation', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { subagents: true, config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'external provider host')
  const parent = await f.createAgent({ sessionId: 'external-provider-parent' })
  const result = Promise.withResolvers<any>(), cleanup = Promise.withResolvers<void>(), disposing = Promise.withResolvers<void>()
  const unregister = f.ctx.subagents.registerProvider({ name: 'offline-external', capabilities: {}, inheritsParentContext: false,
    async start() { return { id: 'offline-external-child', result: result.promise, async dispose() { disposing.resolve(); await cleanup.promise } } } })
  let activation: any
  try {
    activation = await f.ctx.subagents.startActivation({ provider: 'offline-external', signal: new AbortController().signal, delivery: 'caller',
      request: { parent: parent.agent, prompt: [{ type: 'text', text: 'offline external work' }] } })
    assert.equal(f.ctx.agents.get(activation.childId), undefined)
    f.ctx.goals.create(parent.agent, { objective: 'external provider cleanup', maxGoalRounds: 1 })
    await f.ctx.sessions.flush(parent.agent.session)
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(f.ctx.goals.get(parent.agent).activation, 'armed')
    assert.equal(parent.state.requests.length, 0)
    result.resolve({ stopReason: 'completed', output: [] })
    await disposing.promise
    assert.equal(parent.state.requests.length, 0, 'terminal result alone is not resource release')
    cleanup.resolve()
    await activation.result
    await until(() => parent.state.requests.length, count => count === 1, 'external provider cleanup complete')
    assert.equal(f.ctx.goals.get(parent.agent).roundsStarted, 1)
  } finally { result.resolve({ stopReason: 'aborted', output: [] }); cleanup.resolve(); await activation?.dispose(); unregister() }
})

test('live replacement policy wakes existing eligible goals without remounting its driver', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'replacement live policy')
  const handle = await f.createAgent({ sessionId: 'replacement-live-policy' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  f.ctx.jobs.start({ kind: 'workflow', label: 'ignored after save', owner: handle.agent.session.id, run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  f.ctx.goals.create(handle.agent, { objective: 'live wait policy', maxGoalRounds: 1 })
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(handle.state.requests.length, 0)
  const runtime = [...f.ctx.registry.values()].find((entry: any) => entry.name === 'goal-wait-owned-replacement-driver') as any
  const before = [...runtime.fibers][0]
  await f.update({ strategy: 'replacement', waitForJobs: false })
  await until(() => handle.state.requests.length, count => count === 1, 'saved policy wakes port')
  assert.equal([...runtime.fibers][0], before)
  assert.equal(before.uid !== null, true)
  assert.equal(f.ctx.goals.get(handle.agent).roundsStarted, 1)
})

test('a rejected duplicate activation module never disarms the current replacement owner goal', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'original replacement owner')
  const handle = await f.createAgent({ sessionId: 'duplicate-owner-authority' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  f.ctx.jobs.start({ kind: 'workflow', label: 'owned wait', owner: handle.agent.session.id, run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  const before = f.ctx.goals.create(handle.agent, { objective: 'retain first owner', maxGoalRounds: 1 })
  await new Promise<void>(resolve => setImmediate(resolve))
  const peer = f.ctx.plugin({ name: 'duplicate-goal-distribution', inject: goalWait.inject, apply(scope: any) { goalWait.apply(scope, { strategy: 'activation' }) } })
  await peer.await()
  await until(() => goalWait.runtimeStatus(peer.ctx), state => !!state.details.goalWait.fallback, 'duplicate conflict')
  assert.equal(f.ctx.goals.get(handle.agent).activation, 'armed')
  assert.equal(f.ctx.goals.get(handle.agent).revision, before.revision)
  assert.equal(f.status().details.goalWait.mounted, 'replacement-port')
  await peer.dispose()
})

test('busy replacement drain stays pending with no stock admission and honors external revocation', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'replacement active')
  const handle = await f.createAgent({ sessionId: 'busy-native-switch' })
  const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>()
  const off = f.ctx.on('agent/pre-step', async ({ agent }: any, next: () => Promise<any>) => {
    if (agent === handle.agent) { entered.resolve(); await release.promise }
    return next()
  })
  try {
    f.ctx.goals.create(handle.agent, { objective: 'busy switch revocation', maxGoalRounds: 1 })
    await entered.promise
    await f.update({ strategy: 'native' })
    await until(f.status, state => state.details.goalWait.requested === 'native' && state.capabilities.continuation.phase === 'unavailable', 'busy drain pending')
    assert.equal(f.status().details.goalWait.mounted, 'none')
    assert.equal(f.stockEntry().fiber?.uid, null)
    f.ctx.goals.disarm(handle.agent)
    release.resolve()
    await handle.agent.whenIdle()
    await until(f.status, state => state.details.goalWait.mounted === 'host-driver', 'native after drain')
    assert.equal(f.ctx.goals.get(handle.agent).activation, 'disarmed')
    assert.equal(f.ctx.goals.get(handle.agent).phase, 'active')
    assert.equal(handle.state.requests.length, 0)
  } finally { release.resolve(); off() }
})

test('terminal and pre-existing external disarm goals never acquire authority during strategy switches or unload', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'phase fence port')
  const cases: any[] = []
  for (const phase of ['active', 'paused', 'blocked', 'complete']) {
    const handle = await f.createAgent({ sessionId: 'phase-fence-' + phase, route: 'phase-route-' + phase })
    const goal = f.ctx.goals.create(handle.agent, { objective: 'never rearm ' + phase, maxGoalRounds: 1 })
    if (phase === 'active') f.ctx.goals.disarm(handle.agent)
    else if (phase === 'blocked') f.ctx.goals.block(handle.agent, goal, { code: 'synthetic', message: 'Synthetic blocked' })
    else f.ctx.goals[phase === 'complete' ? 'complete' : 'pause'](handle.agent, goal)
    cases.push({ handle, before: f.ctx.goals.get(handle.agent) })
  }
  for (const strategy of ['off', 'activation', 'replacement']) {
    await f.update({ strategy })
    await until(f.status, state => state.capabilities.continuation.phase === 'active' && state.details.goalWait.requested === strategy, 'phase fence ' + strategy)
  }
  await f.fiber.dispose()
  for (const { handle, before } of cases) {
    const after = f.ctx.goals.get(handle.agent)
    assert.equal(after.id, before.id); assert.equal(after.revision, before.revision)
    assert.equal(after.phase, before.phase); assert.equal(after.activation, 'disarmed')
    assert.equal(handle.state.requests.length, 0)
  }
})

test('an unrecognizable truncated native lifecycle stack never grants restoration or reports active success', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'native' } })
  await until(f.status, state => state.capabilities.continuation.phase === 'active', 'native before unknown stack')
  const handle = await f.createAgent({ sessionId: 'unknown-native-authority' })
  const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>()
  const off = f.ctx.on('agent/pre-step', async ({ agent }: any, next: () => Promise<any>) => {
    if (agent === handle.agent) { entered.resolve(); await release.promise }
    return next()
  })
  const old = Error.stackTraceLimit
  try {
    handle.agent.followup(llm.createUserMessage({ content: [{ type: 'text', text: 'synthetic turn' }], source: { kind: 'user' } }))
    await entered.promise
    const goal = f.ctx.goals.create(handle.agent, { objective: 'unknown authority stays disarmed', maxGoalRounds: 1 })
    Error.stackTraceLimit = 1
    await f.update({ strategy: 'off' })
    await until(f.status, state => state.details.goalWait.requested === 'off' && !!state.details.goalWait.fallback, 'unknown authority diagnostic')
    assert.equal(f.status().capabilities.continuation.phase, 'unavailable')
    assert.equal(f.ctx.goals.get(handle.agent).activation, 'disarmed')
    assert.equal(f.ctx.goals.get(handle.agent).revision, goal.revision)
  } finally { Error.stackTraceLimit = old; release.resolve(); off(); await handle.agent.whenIdle() }
})

test('ordinary module replacement uses the pinned port, retains armed authority while Jobs wait, and wakes quietly', { timeout: 15000 }, async t => {
  const f = await createGoalRuntime(t, { config: { strategy: 'replacement' } })
  const { ctx, runtime } = f
  const state = await until(() => goalWait.runtimeStatus(f.fiber.ctx), value => value.capabilities.continuation.phase !== 'unavailable' || !!value.details.goalWait.fallback, 'replacement mount')
  assert.equal(state.details.goalWait.mounted, 'replacement-port', JSON.stringify(state))
  assert.equal(state.details.goalWait.host?.distribution, '0.2.2-alpha.3')
  const handle = await runtime.createAgent({ sessionId: 'parity-goal-port' })
  let finish!: (value: { status: string }) => void
  const done = new Promise<{ status: string }>(resolve => { finish = resolve })
  const id = ctx.jobs.start({ kind: 'workflow', label: 'quiet native work', owner: handle.agent.session.id,
    run: () => ({ done, cancel: () => finish({ status: 'killed' }) }) })
  const created = ctx.goals.create(handle.agent, { objective: 'Exercise pinned continuation', maxGoalRounds: 1 })
  await new Promise<void>(resolve => setImmediate(resolve))
  assert.equal(ctx.goals.get(handle.agent).activation, 'armed')
  assert.equal(ctx.goals.get(handle.agent).revision, created.revision)
  assert.equal(ctx.goals.get(handle.agent).roundsStarted, 0)
  assert.equal(handle.state.requests.length, 0)
  finish({ status: 'completed' })
  await ctx.jobs.wait(id, 1000, handle.agent.session.id)
  await until(() => handle.state.requests.length, count => count === 1, 'quiet Job port wake')
  await handle.agent.whenIdle()
  assert.equal(ctx.goals.get(handle.agent).roundsStarted, 1)
  assert.equal(handle.state.requests.length, 1)
})
