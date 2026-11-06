/** Reusable actual native Loader/Agent fixture; no file persistence, socket or provider traffic. */
import type { TestContext } from 'node:test'
import Loader, { type EntryChange } from '@deepseek-ai/cordis-plugin-loader'
import { pathToFileURL } from 'node:url'
import * as source from '../../../src/modules/goal-wait/index.ts'
import { createRuntime, load } from '../retry/runtime.ts'
import { requireHost } from '../../integration/loader-harness.ts'
import type { FeaturePlugin } from '../../../src/types.ts'

export async function createGoalRuntime(t: TestContext, options: {
  plugin?: FeaturePlugin
  config?: Record<string, unknown>
  subagents?: boolean
  jobs?: boolean
} = {}) {
  const runtime = await createRuntime({ product: false, retry: false, subagents: options.subagents ?? false })
  const { ctx } = runtime
  t.after(() => runtime.dispose())
  await ctx.plugin((await load<any>('dsh-goal')).default).await()
  if (options.jobs !== false) {
    await ctx.plugin((await load<any>('dsh-jobs-local')).default, {}).await()
    const detach = ctx.jobs.attachController('goal-strategies-test'); t.after(detach)
  }
  const plugin = options.plugin ?? source
  const commits: EntryChange[] = []
  class MemoryLoader extends Loader {
    override import(name: string, stack?: () => string[]) { return name === 'isolated-goal-module' ? plugin : super.import(name, stack) }
    override commit(change: EntryChange) { commits.push(change) }
  }
  const loader = new MemoryLoader(ctx, { baseUrl: pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href })
  await new Promise<void>(done => setImmediate(done))
  await loader.create({ id: 'goal-round-driver', name: '@deepseek-ai/dsh-goal-round-driver' } as any)
  const stock = loader.resolve('goal-round-driver')
  await stock.fiber!.await()
  await loader.create({ id: 'goal-module', name: 'isolated-goal-module', config: options.config ?? { strategy: 'activation' } } as any)
  const entry = loader.resolve('goal-module')
  await entry.fiber!.await()
  const fiber = entry.fiber!
  commits.length = 0
  return { runtime, ctx, loader, entry, fiber, commits, stockEntry: () => stock,
    status: () => (plugin as typeof source).runtimeStatus(fiber.ctx),
    update: async (config: Record<string, unknown>) => { await entry.update({ config }); await loader.await() },
    createAgent: runtime.createAgent,
  }
}
