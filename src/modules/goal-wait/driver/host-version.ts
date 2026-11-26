/** Exact alpha.2 official npm artifact, independently compared with the official tag; see provenance. */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { Context } from '@deepseek-ai/cordis'
import type { DriverBehavior } from './native-driver.ts'

export interface HostProfile {
  distribution: string
  cordis: string
  driverSha256: string
  driver: DriverBehavior
  /** Exact runtime artifact; used only by the temporary lifecycle authority observer. */
  artifactPath: string
}
const version = '0.2.3-alpha.2'
const cordis = '4.2.0-alpha.1'
const digest = '8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c'
const packages = ['dsh', 'dsh-agent', 'dsh-agent-loop', 'dsh-goal', 'dsh-goal-round-driver', 'dsh-session', 'dsh-session-projection', 'dsh-llm', 'dsh-system-prompt', 'dsh-tools', 'dsh-tool-goal', 'dsh-jobs', 'dsh-jobs-local', 'dsh-tool-jobs', 'dsh-scope']

/** Resolve the host, not a stale first-party peer beside an installed plugin. */
export function hostRequire(ctx: Context): NodeJS.Require {
  const profile = ctx.get('profileContext') as { installAnchor?: string } | undefined
  if (profile?.installAnchor) return createRequire(profile.installAnchor)
  const local = createRequire(import.meta.url)
  return createRequire(local.resolve('@deepseek-ai/dsh/package.json'))
}

export async function assertHostVersion(ctx: Context): Promise<HostProfile> {
  const [major, minor, patch] = process.versions.node.split('.').map(Number)
  const atLeast = (min: number, fix: number) => minor > min || (minor === min && patch >= fix)
  if (!(major === 24 && atLeast(22, 3) || major === 26 && atLeast(13, 1) || major > 26)) {
    throw new Error('Goal replacement requires Node ^24.22.3 || >=26.13.1')
  }
  const requireHost = hostRequire(ctx)
  const participating = [...packages]
  if (ctx.get('subagents')) participating.push('dsh-subagent', 'dsh-subagent-spawn-in-process', 'dsh-subagent-fork-in-process', 'dsh-tool-subagent')
  for (const short of ['cordis', ...participating]) {
    const name = '@deepseek-ai/' + short
    const metadata = JSON.parse(await readFile(requireHost.resolve(name + '/package.json'), 'utf8'))
    const expected = short === 'cordis' ? cordis : version
    if (metadata.name !== name || metadata.version !== expected) throw new Error('Goal replacement artifact mismatch: ' + name + ' requires ' + expected)
  }
  const artifactPath = requireHost.resolve('@deepseek-ai/dsh-goal-round-driver')
  const actual = createHash('sha256').update(await readFile(artifactPath)).digest('hex')
  if (actual !== digest) throw new Error('Goal replacement native driver source fingerprint mismatch')
  return { distribution: version, cordis, driverSha256: digest, artifactPath,
    driver: { removeCancelledQueuedMessage: true, joinsProgressingDescendants: true, disarmsOnDisposedAbort: true } }
}
