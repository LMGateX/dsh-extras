import test from 'node:test'
import assert from 'node:assert/strict'
import { Config, resolveConfig } from '../../../src/modules/goal-wait/config.ts'
import { createHarness } from './harness.ts'

test('initial activation mount sweeps pre-existing idle goals and jobs without a later checkpoint', async () => {
  const h = await createHarness({ beforeMount({ agents, goals, jobs }) {
    const agent = agents.add({ id: 'existing', status: 'idle', session: { id: 'existing-session', header: {} } })
    goals.set(agent.session.id, { id: 'existing-goal', revision: 7, objective: 'preserve', phase: 'active', activation: 'armed', roundsStarted: 0, maxGoalRounds: 4 })
    jobs!.add({ id: 'existing-job', label: 'work', status: 'running', owner: agent.session.id })
  } })
  try {
    assert.equal(h.goals.peek(h.agents.get('existing')!)?.activation, 'disarmed')
    assert.equal(h.goals.peek(h.agents.get('existing')!)?.revision, 7)
  } finally { await h.dispose() }
})

test('activation maintains live descendant buckets between public lifecycle events', async () => {
  const h = await createHarness({ config: { waitForJobs: false } })
  try {
    const parent = h.agent('indexed-parent'); h.goal(parent)
    h.agent('indexed-child', { parent: parent.session.id })
    await h.turnStopping(parent)
    let scans = 0
    const original = h.agents.list.bind(h.agents)
    h.agents.list = () => { scans++; return original() }
    for (let n = 0; n < 5; n++) await h.turnStopping(parent)
    assert.equal(scans, 0, 'checkpoints do not rescan unrelated live agents')
    h.agents.drop('indexed-child')
    await h.turnStopping(parent)
    assert.equal(h.goals.peek(parent)?.activation, 'armed')
  } finally { await h.dispose() }
})

test('a quiet descendant disposal releases its ancestor hold without another turn event', async () => {
  const h = await createHarness({ config: { waitForJobs: false } })
  try {
    const parent = h.agent('quiet-parent'); h.goal(parent)
    h.agent('quiet-child', { parent: parent.session.id })
    await h.turnStopping(parent)
    assert.equal(h.goals.peek(parent)?.activation, 'disarmed')
    h.agents.drop('quiet-child')
    await new Promise<void>(resolve => setImmediate(resolve))
    assert.equal(h.goals.peek(parent)?.activation, 'armed')
  } finally { await h.dispose() }
})

test('activation retains its documented same-value external-disarm overlap limitation, without changing goal phase', async () => {
  const h = await createHarness()
  try {
    const agent = h.agent('overlap'); h.goal(agent); const job = h.job(agent)
    await h.turnStopping(agent)
    h.goals.disarm(agent) // Native same-value disarm has no owner/generation token.
    h.settle(job)
    await h.turnStopping(agent)
    assert.equal(h.goals.peek(agent)?.phase, 'active')
    assert.equal(h.goals.peek(agent)?.activation, 'armed', 'legacy overlap is explicit, not a fabricated safety claim')
  } finally { await h.dispose() }
})

test('runtime status is fiber-scoped and never invents a native owner in a manual gate-only composition', async () => {
  const h = await createHarness()
  try {
    const status = h.status()
    assert.equal(status.details.goalWait.requested, 'activation')
    assert.equal(status.details.goalWait.mounted, 'none')
    assert.equal(status.capabilities.continuation.phase, 'unavailable')
    assert.ok(status.capabilities.continuation.reason)
    status.details.goalWait.mounted = 'host-driver'
    assert.equal(h.status().details.goalWait.mounted, 'none', 'status reads return detached data')
    await h.unload()
    assert.equal(h.status().capabilities.continuation.phase, 'disabled')
  } finally { await h.dispose() }
})

test('gate schema exposes each original field as a volatile setting', () => {
  const shape = Config as unknown as { dict: Record<string, { meta?: { volatile?: boolean } }> }
  for (const key of ['strategy', 'waitForJobs', 'waitForSubagents', 'maxHoldMs']) assert.equal(shape.dict[key].meta?.volatile, true)
  assert.deepEqual(resolveConfig(), { strategy: 'activation', waitForJobs: true, waitForSubagents: true, maxHoldMs: 0 })
  for (const strategy of ['activation', 'replacement', 'native', 'off'] as const) {
    assert.equal(resolveConfig({ strategy: { get: () => strategy } }).strategy, strategy)
  }
  assert.throws(() => resolveConfig({ strategy: 'unknown' as never }), /strategy/)
})

test('live gate policy releases its own hold without a driver replacement or remount', async () => {
  let waitForJobs = true
  const h = await createHarness({ rawConfig: { waitForJobs: { get: () => waitForJobs }, waitForSubagents: false } })
  try {
    const agent = h.agent('live-policy'); h.goal(agent); h.job(agent)
    await h.turnStopping(agent)
    assert.equal(h.goals.peek(agent)?.activation, 'disarmed')
    waitForJobs = false
    await h.turnStopping(agent)
    assert.equal(h.goals.peek(agent)?.activation, 'armed')
    assert.equal(h.goals.byKind('resume').length, 1)
    waitForJobs = true
    await h.turnStopping(agent)
    assert.equal(h.goals.peek(agent)?.activation, 'disarmed')
    assert.equal(h.goals.byKind('disarm').length, 2)
  } finally { await h.dispose() }
})

test('invalid live settings preserve the last accepted policy', async () => {
  let value: unknown = true
  const h = await createHarness({ rawConfig: { waitForJobs: { get: () => value as boolean }, waitForSubagents: false } })
  try {
    const agent = h.agent('bad-policy'); h.goal(agent); h.job(agent)
    await h.turnStopping(agent)
    value = 'invalid'
    await h.turnStopping(agent)
    assert.equal(h.goals.peek(agent)?.activation, 'disarmed')
    assert.equal(h.goals.byKind('resume').length, 0)
    assert.ok(h.warnings.some(line => line.includes('invalid live policy ignored')))
  } finally { await h.dispose() }
})
