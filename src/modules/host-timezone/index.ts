import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { createRequire } from 'node:module';
import { HOST_TIMEZONE_TARGET_IDS, prepareArtifact, applyArtifactPatches, type PreparedArtifact } from './artifacts.ts';

/** The only user policy is opt-in: there is deliberately no fixed zone input. */
export interface Config { enabled: boolean }
export const Config: Schemastery<any, any, any> = z.object({ enabled: z.boolean().default(false).volatile() });
export const name = 'extras-host-timezone';
export const inject = ['clientModules', 'webServer', 'profileContext'];
const VERSION = '0.2.2-rc.3';
const PREFIX = '/extras/host-timezone';
const TARGETS = new Set<string>(HOST_TIMEZONE_TARGET_IDS);

type Capability = { phase: 'disabled' | 'standby' | 'unavailable'; reason?: string };
interface Details { requested: boolean; status: 'disabled' | 'needs-full-reload' | 'unavailable'; adapterVersion: string; timeZone?: string; reason?: string }
interface State { capabilities: { hostTimezone: Capability }; details: { hostTimezone: Details } }
interface Entry { id: string; url: string; rev: string; [key: string]: unknown }
interface Batch { url: string; rev: string; entries: string[]; [key: string]: unknown }
interface Graph { rev: string; release?: { version: string }; entries: Entry[]; batches: Batch[]; [key: string]: unknown }
interface ClientModules { graph(): Graph; clientPath(id: string): string | undefined; fetchBundle(request: Request): Promise<Response> }
interface Artifact { id: string; source: string; prepared: PreparedArtifact; fingerprint: string }
interface Mapping { source: string; targetIds: string[] }
interface Mount { active: boolean; epoch: string; zone: string; artifacts: Artifact[]; mappings: Map<string, Mapping> }
const states = new WeakMap<object, State>();
const disabled = (): State => ({ capabilities: { hostTimezone: { phase: 'disabled' } }, details: { hostTimezone: { requested: false, status: 'disabled', adapterVersion: VERSION } } });
const hash = (value: string) => createHash('sha256').update(value).digest('hex');

/** Status describes the serving adapter, never claims an already-open page was refreshed. */
export function runtimeStatus(ctx: Context): State { return structuredClone(states.get(ctx.fiber) ?? disabled()); }

function requested(config: Partial<Config>): boolean {
  const field: unknown = config.enabled;
  return (field && typeof field === 'object' && 'get' in field && typeof field.get === 'function' ? field.get() : field) === true;
}
function hostZone(): string {
  const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (typeof zone !== 'string' || !zone || zone.length > 128 || !(zone === 'UTC' || zone.includes('/'))) throw new Error('host-time-zone-unavailable');
  return new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
}
function graphOf(value: Graph): Graph {
  if (!value || value.release?.version !== VERSION || typeof value.rev !== 'string' || !Array.isArray(value.entries) || !Array.isArray(value.batches)) throw new Error('unsupported-native-graph');
  const ids = new Set<string>();
  for (const entry of value.entries) {
    if (!entry || typeof entry.id !== 'string' || typeof entry.url !== 'string' || typeof entry.rev !== 'string' || ids.has(entry.id)) throw new Error('unsupported-native-graph');
    ids.add(entry.id);
  }
  if (!ids.has(HOST_TIMEZONE_TARGET_IDS[0])) throw new Error('session-client-artifact-unavailable');
  const covered = new Set<string>();
  for (const batch of value.batches) {
    if (!batch || (batch.phase !== 'bootstrap' && batch.phase !== 'application') || typeof batch.url !== 'string' || typeof batch.rev !== 'string' || !Array.isArray(batch.entries) || !batch.entries.length) throw new Error('unsupported-native-graph');
    for (const id of batch.entries) {
      if (!ids.has(id) || covered.has(id)) throw new Error('unsupported-native-graph');
      covered.add(id);
    }
  }
  if (covered.size !== ids.size) throw new Error('unsupported-native-graph');
  return value;
}
/** Only native, advertised JS combos are delegated; never a user-supplied proxy URL. */
function combo(source: string, graph: Graph): { source: string; ids: string[] } {
  const normalized = source.startsWith('/') ? source : '/' + source;
  const match = /^[/]plugins[/][?][?]([^?#]+)&rev=([A-Za-z0-9._-]+)$/u.exec(normalized);
  if (!match) throw new Error('unsupported-native-resource');
  const ids = match[1]!.split(',').map(file => {
    if (!/^(@[A-Za-z0-9_.-]+[/][A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+)[/]client[.]js$/u.test(file)) throw new Error('unsupported-native-resource');
    return file.slice(0, -'/client.js'.length);
  });
  if (new Set(ids).size !== ids.length || ids.some(id => !graph.entries.some(entry => entry.id === id))) throw new Error('unsupported-native-resource');
  return { source: normalized, ids };
}
async function verifyHost(anchor: unknown): Promise<void> {
  if (typeof anchor !== 'string' || !isAbsolute(anchor)) throw new Error('native-install-anchor-unavailable');
  const require = createRequire(anchor);
  for (const id of ['@deepseek-ai/dsh', '@deepseek-ai/dsh-client-modules', '@deepseek-ai/dsh-host-webserver']) {
    const manifest = JSON.parse(await readFile(require.resolve(id + '/package.json'), 'utf8')) as { name?: string; version?: string };
    if (manifest.name !== id || manifest.version !== VERSION) throw new Error('unsupported-native-host-version');
  }
}
async function artifactsOf(native: ClientModules, graph: Graph, zone: string): Promise<Artifact[]> {
  return Promise.all(graph.entries.filter(entry => TARGETS.has(entry.id)).map(async ({ id }) => {
    const path = native.clientPath(id);
    if (!path || basename(path) !== 'client.js' || basename(dirname(path)) !== 'lib') throw new Error('unsupported-native-client-path');
    const [source, manifestText] = await Promise.all([readFile(path, 'utf8'), readFile(join(dirname(path), '..', 'package.json'), 'utf8')]);
    const manifest = JSON.parse(manifestText) as { name?: string; version?: string };
    if (manifest.name !== id || manifest.version !== VERSION) throw new Error('unsupported-native-package');
    return { id, source, prepared: prepareArtifact(id, source, manifest.version, zone), fingerprint: hash(source) };
  }));
}
function stripTrailer(source: string): string {
  return source.replace(/(?:\r?\n)?[/][/][#] sourceMappingURL=[^\r\n]*(?:\r?\n)?$/u, '');
}
function nativeBody(source: string): string {
  let result = stripTrailer(source.replace(/(?:\r?\n)?[/][/][#] sourceURL=[^\r\n]*(?:\r?\n)?$/u, ''));
  if (!result.endsWith('\n')) result += '\n';
  return result;
}
function unavailable(state: State, reason: string): void {
  state.capabilities.hostTimezone = { phase: 'unavailable', reason };
  state.details.hostTimezone = { requested: true, status: 'unavailable', adapterVersion: VERSION, reason };
}
function reply(status: number): Response { return new Response(null, { status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } }); }

/** A single effect-owned resource adapter; no /api interception, time hooks or native-file writes. */
export async function apply(ctx: Context, config: Partial<Config> = {}): Promise<void> {
  const c = ctx as any;
  const state = disabled();
  states.set(ctx.fiber, state);
  let live = true;
  let revision = 0;
  let mounted: Mount | undefined;
  let close: (() => void) | undefined;
  const withdraw = () => {
    if (mounted) mounted.active = false;
    mounted = undefined;
    close?.(); close = undefined;
  };
  ctx.effect(() => () => { live = false; revision++; withdraw(); states.delete(ctx.fiber); });

  const refresh = async () => {
    const ticket = ++revision;
    withdraw();
    if (!requested(config)) { Object.assign(state, disabled()); return; }
    unavailable(state, 'initializing-needs-full-reload');
    const native = c.get('clientModules') as ClientModules | undefined;
    const server = c.get('webServer') as { register(route: unknown): () => void } | undefined;
    if (!native?.graph || !native.clientPath || !native.fetchBundle || !server?.register) { unavailable(state, 'native-resource-seam-unavailable'); return; }
    const mount: Mount = { active: false, epoch: randomUUID(), zone: '', artifacts: [], mappings: new Map() };
    try {
      await verifyHost(c.get('profileContext')?.installAnchor);
      const graph = graphOf(native.graph());
      mount.zone = hostZone();
      mount.artifacts = await artifactsOf(native, graph, mount.zone);
      if (!live || ticket !== revision || !requested(config)) return;
      const resource = async (request: Request): Promise<Response> => {
        if (!mount.active || mounted !== mount || !requested(config)) return reply(503);
        const url = new URL(request.url);
        if (url.search || url.hash || !['GET', 'HEAD'].includes(request.method)) return reply(request.method === 'GET' || request.method === 'HEAD' ? 404 : 405);
        const mapping = mount.mappings.get(url.pathname);
        if (!mapping) return reply(404);
        try {
          if (hostZone() !== mount.zone) throw new Error('host-zone-changed');
          await verifyHost(c.get('profileContext')?.installAnchor);
          const currentGraph = graphOf(native.graph());
          const advertised = [...currentGraph.entries, ...currentGraph.batches].some(row => (row.url.startsWith('/') ? row.url : '/' + row.url) === mapping.source);
          if (!advertised) throw new Error('native-graph-changed');
          const current = await artifactsOf(native, currentGraph, mount.zone);
          if (current.length !== mount.artifacts.length || current.some(item => item.fingerprint !== mount.artifacts.find(old => old.id === item.id)?.fingerprint)) throw new Error('native-artifact-changed');
          const response = await native.fetchBundle(new Request(new URL(mapping.source, url.origin), { method: 'GET', signal: request.signal }));
          if (response.status !== 200 || !/^(?:text|application)[/]javascript(?:;|$)/u.test(response.headers.get('content-type') ?? '')) throw new Error('native-resource-unavailable');
          const body = await response.text();
          const selected = current.filter(item => mapping.targetIds.includes(item.id));
          for (const artifact of selected) if (body.split(nativeBody(artifact.source)).length !== 2) throw new Error('native-response-fingerprint-mismatch');
          const patched = stripTrailer(applyArtifactPatches(body, selected.map(item => item.prepared)));
          if (!live || !mount.active || mounted !== mount || !requested(config) || hostZone() !== mount.zone) return reply(503);
          const headers = { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', etag: '"host-timezone-' + hash(patched) + '"' };
          return new Response(request.method === 'HEAD' ? null : patched, { status: 200, headers });
        } catch {
          if (live && mount.active && mounted === mount && requested(config)) unavailable(state, 'native-artifact-or-host-zone-changed-needs-full-reload');
          return reply(503);
        }
      };
      // Registration is synchronous. Wrap native's disposer so repeat cleanup cannot remove a later owner.
      const releases: (() => void)[] = [];
      let released = false;
      const release = () => { if (!released) { released = true; for (const dispose of releases.reverse()) dispose(); } };
      try {
        releases.push(server.register({ kind: 'prefix', path: PREFIX, resource }));
        // Native graph/rebuilt pushes bypass the boot clone. Never let those URLs reload raw samplers.
        releases.push(server.register({ kind: 'exact', path: '/plugins/', resource: (request: Request) => {
          if (!mount.active || mounted !== mount || !requested(config)) return Promise.resolve(reply(503));
          const url = new URL(request.url);
          if (HOST_TIMEZONE_TARGET_IDS.some(id => url.search.includes(id + '/'))) return Promise.resolve(reply(503));
          return native.fetchBundle(request);
        } }));
      } catch (error) { release(); throw error; }
      const listener = (table: any[]) => {
        if (!mount.active || mounted !== mount || !requested(config)) return;
        try {
          if (hostZone() !== mount.zone) throw new Error('host-zone-changed');
          const rows = table.filter(row => row?.kind === 'global' && row.name === '__DSH_BOOT__');
          if (rows.length !== 1) throw new Error('unsupported-native-boot-table');
          const sourceGraph = graphOf(rows[0].value);
          if (sourceGraph !== native.graph()) throw new Error('foreign-native-boot-graph');
          const graphCopy = structuredClone(sourceGraph);
          const replacements = new Map<string, string>();
          const retarget = (source: string) => {
            const known = replacements.get(source); if (known) return known;
            const parsed = combo(source, sourceGraph);
            const targetIds = parsed.ids.filter(id => TARGETS.has(id));
            if (!targetIds.length || targetIds.some(id => !mount.artifacts.some(artifact => artifact.id === id))) throw new Error('unsupported-native-target-combo');
            const key = PREFIX + '/' + mount.epoch + '/' + hash(JSON.stringify([parsed.source, mount.zone, mount.artifacts.map(artifact => artifact.fingerprint)])) + '.js';
            mount.mappings.set(key, { source: parsed.source, targetIds });
            const value = key.slice(1); replacements.set(source, value); return value;
          };
          for (const entry of graphCopy.entries) if (TARGETS.has(entry.id)) entry.url = retarget(entry.url);
          for (const batch of graphCopy.batches) if (batch.entries.some(id => TARGETS.has(id))) batch.url = retarget(batch.url);
          const next = table.map(row => {
            if (row === rows[0]) return { ...row, value: graphCopy };
            if ((row?.kind === 'script-preload' || row?.kind === 'script-src') && replacements.has(row.src)) return { ...row, src: replacements.get(row.src) };
            return row;
          });
          table.splice(0, table.length, ...next);
        } catch { unavailable(state, 'unsupported-native-boot-or-host-zone-needs-full-reload'); throw new Error('host-timezone: protected boot unavailable; full reload required'); }
      };
      const releaseListener = c.on('webserver/index-inject', listener) as (() => void);
      close = () => { mount.active = false; releaseListener(); release(); mount.mappings.clear(); };
      ctx.effect(() => () => { mount.active = false; releaseListener(); release(); });
      mount.active = true; mounted = mount;
      state.capabilities.hostTimezone = { phase: 'standby', reason: 'needs-full-reload' };
      state.details.hostTimezone = { requested: true, status: 'needs-full-reload', adapterVersion: VERSION, timeZone: mount.zone };
    } catch { if (live && ticket === revision) unavailable(state, 'unsupported-native-artifact-host-zone-or-route-owner'); }
  };
  c.on('loader/volatile-update', refresh);
  await refresh();
}
