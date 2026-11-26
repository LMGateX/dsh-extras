/** Real Cordis/Loader/Connection fixture, with a disposable active profile and no listening socket. */
import { Context } from '@deepseek-ai/cordis';
import Loader, { Group } from '@deepseek-ai/cordis-plugin-loader';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { join, resolve, dirname, basename, isAbsolute, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { TestContext } from 'node:test';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebEntryUrl } from '@deepseek-ai/dsh-host-webserver';
import type { Distribution, ModuleId, FeaturePlugin } from '../../src/types.ts';
import { createExtrasPlugin } from '../../src/runtime.ts';

export const requireHost = createRequire(process.env.DSH_RUNTIME_ROOT ? join(resolve(process.env.DSH_RUNTIME_ROOT), 'package.json') : createRequire(new URL('../../package.json', import.meta.url)).resolve('@deepseek-ai/dsh/package.json'));
export const loadHost = async (name: string): Promise<any> => import(pathToFileURL(requireHost.resolve('@deepseek-ai/' + name)).href);
export const pause = () => new Promise<void>(done => setTimeout(done, 10));
export async function until<T>(read: () => T, accepts: (value: T) => boolean, label: string): Promise<T> {
  const deadline = Date.now() + 4000;
  let value = read();
  while (!accepts(value)) { if (Date.now() >= deadline) throw new Error('Timed out: ' + label + ' ' + JSON.stringify(value)); await pause(); value = read(); }
  return value;
}
export function response() {
  return { code: 0, headers: {} as Record<string, any>, body: '', writeHead(code: number, headers: Record<string, any> = {}) { this.code = code; this.headers = headers; }, end(value = '') { this.body += value; } };
}
export async function loaderFixture(t: TestContext, distribution: Distribution, config: Record<string, any>, suppliedContext?: Context, extraRows: Record<string, any>[] = [], suppliedPlugin?: FeaturePlugin, suppliedImports: Record<string, unknown> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'extras-root-lifecycle-'));
  const ctx = suppliedContext ?? new Context();
  const selected = ctx.get('profileContext') as Record<string, any> | undefined;
  // A caller may accept canonical policy before mounting its Loader row. Keep
  // that explicitly supplied native profile, rather than silently replacing it.
  if (selected && (![selected.dir, selected.home, selected.patchPath].every(value => typeof value === 'string' && isAbsolute(value) && resolve(value).startsWith(resolve(tmpdir()) + sep))
      || resolve(selected.patchPath) !== join(resolve(selected.dir), 'cordis.patch.yml'))) throw new Error('loader fixture requires a disposable native profile');
  if (selected) {
    const temporaryRoot = await realpath(tmpdir()) + sep;
    const directories = await Promise.all([realpath(selected.dir), realpath(selected.home)]);
    if (directories.some(directory => !directory.startsWith(temporaryRoot))) throw new Error('loader fixture profile resolves outside temporary storage');
  }
  const profile = selected?.dir ?? join(root, 'home', 'profiles', 'isolated');
  const home = selected?.home ?? join(root, 'home'); await mkdir(profile, { recursive: true });
  ctx.baseUrl = pathToFileURL(requireHost.resolve('@deepseek-ai/dsh/package.json')).href;
  const routes = new Map<string, any>(); const importTable = new Map<string, any>(Object.entries(suppliedImports));
  const initial = structuredClone(config);
  const plugin = suppliedPlugin ?? createExtrasPlugin(distribution);
  importTable.set(distribution.name, plugin);
  const NativeInclude = (await loadHost('cordis-plugin-include')).default;
  class FixtureInclude extends NativeInclude {
    import(name: string, stack?: () => string[]) { return importTable.has(name) ? importTable.get(name) : super.import(name, stack); }
  }
  class MemoryLoader extends Loader { override import(name: string, stack?: () => string[]) {
    if (name === 'cordis:include') return FixtureInclude;
    return importTable.has(name) ? importTable.get(name) : super.import(name, stack);
  } }
  const loader = new MemoryLoader(ctx, { baseUrl: ctx.baseUrl });
  loader.builtins.group = Group;
  const patchPath = join(profile, 'cordis.patch.yml');
  await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'isolated-root-profile', private: true, dependencies: {}, dsh: { profile: { bundles: [] } } }));
  const save = async (rows: unknown[]) => writeFile(patchPath, JSON.stringify([{ insert: rows }], null, 2));
  await save([{ id: distribution.name, name: distribution.name, config: initial }, ...extraRows]);
  if (!selected) ctx.reflect.provide('profileContext', { name: 'isolated', dir: profile, patchPath, home, cwd: root, installAnchor: requireHost.resolve('@deepseek-ai/dsh/package.json'), startedBundles: [], overlayPaths: [], telemetryDisabledEnv: undefined });
  ctx.reflect.provide('webServer', { register(route: any) { if (routes.has(route.path)) throw new Error('duplicate route'); routes.set(route.path, route); return () => { if (routes.get(route.path) === route) routes.delete(route.path); }; } });
  const records = new Map();
  ctx.reflect.provide('credentials', { async modifyRecord(key: string, edit: (value: any) => Promise<any>) { const next = await edit(records.get(key)); if (next !== undefined) records.set(key, next); return records.get(key); } });
  // In alpha.2, Connection admits requests but the separate token plugin owns
  // browser launch URLs and cookie exchange. Drive its public WebServer events
  // without opening a listening socket or inventing a fixture authentication rule.
  await ctx.plugin(await loadHost('dsh-client-connection'), {}).await();
  await ctx.plugin(await loadHost('dsh-host-authentication-token'), { cookieMaxAgeDays: 30 }).await();
  const browserLaunchUrl = (base: string): string => {
    const launches: WebEntryUrl[] = [];
    ctx.emit('webserver/entry-url', base, launches);
    if (launches.length !== 1) throw new Error('native token fixture did not publish one launch URL');
    return launches[0]!.url;
  };
  const browserIndex = (req: IncomingMessage, res: ServerResponse, html: string) =>
    ctx.waterfall('webserver/request', req, res, async () => {
      const admission = ctx.get('connection')!.admit(req);
      if ('rejection' in admission) { res.writeHead(admission.rejection); res.end(); return; }
      if (admission.peer.principal.kind !== 'owner') { res.writeHead(403); res.end(); return; }
      res.setHeader('Content-Type','text/html');
      res.end(html);
    });
  const host = '127.0.0.1:43999';
  const launch = new URL(browserLaunchUrl('http://' + host + '/'));
  const login = response();
  const loginRequest = { method: 'GET', url: launch.pathname + launch.search, headers: { host } };
  await ctx.waterfall('webserver/request', loginRequest as IncomingMessage, login as unknown as ServerResponse, async () => {});
  const setCookie = login.headers['set-cookie'];
  const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (login.code !== 303 || typeof cookie !== 'string') throw new Error('native token fixture did not mint a browser cookie');
  const ownerCookie = cookie.split(';', 1)[0]!;
  const request = (method = 'GET', headers: Record<string, string> = { host, cookie: ownerCookie }, name = distribution.name) => {
    const result = response(); const route = routes.get('/extras/' + encodeURIComponent(name) + '/status');
    if (!route) { result.code = 404; return result; }
    route.handler({ method, headers }, result); return result;
  };
  const status = (name = distribution.name) => { const result = request('GET', { host, cookie: ownerCookie }, name); if (result.code !== 200) return { httpCode: result.code }; return JSON.parse(result.body); };
  let closed = false;
  const dispose = async () => { if (closed) return; closed = true; await ctx.fiber.dispose(); if (dirname(root) !== resolve(tmpdir()) || !basename(root).startsWith('extras-root-lifecycle-')) throw new Error('unsafe fixture cleanup'); await rm(root, { recursive: true, force: true }); };
  t.after(dispose);
  // Native ConfigEditor owns persistence and profile reconciliation. A bare
  // Loader row has no profile writer and would leave adoption fences comparing
  // changed in-memory settings against the old persisted profile.
  const boot = await loadHost('dsh-app-boot');
  const baseFile = join(profile, 'cordis.yml'); await writeFile(baseFile, '[]\n');
  await boot.mountRootInclude(ctx, baseFile, boot.readProfilePatches('dsh', ctx.get('profileContext')));
  await loader.await();
  const entry = [...loader.entries()].find(row => row.options.id === distribution.name);
  if (!entry?.fiber) throw new Error('native Include did not mount the Extras row');
  const fiber = entry.fiber;
  const update = async (next: Record<string, any>) => {
    let editor = ctx.get('configEditor') as any;
    if (editor === undefined) { await ctx.plugin((await loadHost('dsh-config-editor')).default).await(); editor = ctx.get('configEditor'); }
    await editor.edit(entry, () => structuredClone(next));
    await loader.await();
  };
  return { root, profile, home, ctx, loader, entry, fiber, routes, request, status, update, save, importTable, host, ownerCookie, browserLaunchUrl, browserIndex, dispose,
    ready: async (ids: readonly ModuleId[] = distribution.moduleIds) => until(() => status(), state => state.report !== undefined && ids.every(id => ['active', 'disabled', 'missing-dependency', 'conflict', 'failed'].includes(state.modules?.[id]?.phase)), 'root module admission') };
}
