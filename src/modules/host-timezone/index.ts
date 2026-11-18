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
const VERSION = '0.2.2-rc.4';
const PREFIX = '/extras/host-timezone';
const TARGETS = new Set<string>(HOST_TIMEZONE_TARGET_IDS);

type Capability = { phase: 'disabled' | 'standby' | 'unavailable'; reason?: string };
type FailureStage = 'source-generation-expired' | 'host-and-artifact-verification' | 'native-source-advertisement' | 'native-resource-fetch' | 'native-resource-response' | 'native-resource-body' | 'native-response-fingerprint' | 'target-patch-anchors';
interface Details { requested: boolean; status: 'disabled' | 'needs-full-reload' | 'unavailable'; adapterVersion: string; timeZone?: string; reason?: string; failureStage?: FailureStage }
interface State { capabilities: { hostTimezone: Capability }; details: { hostTimezone: Details } }
interface Entry { id: string; url: string; rev: string; [key: string]: unknown }
interface Batch { url: string; rev: string; entries: string[]; [key: string]: unknown }
interface Graph { rev: string; release?: { version: string }; entries: Entry[]; batches: Batch[]; [key: string]: unknown }
interface ClientModules { graph(): Graph; clientPath(id: string): string | undefined; fetchBundle(request: Request): Promise<Response>; onGraphChanged(listener: () => void): () => void; onRebuilt(listener: (id: string, rev: string) => void): () => void }
interface Artifact { readonly id: string; readonly source: string; readonly prepared: PreparedArtifact; readonly fingerprint: string }
interface Mapping { readonly source: string; readonly targetIds: readonly string[] }
interface SourceGeneration {
  readonly epoch: string;
  readonly zone: string;
  readonly artifacts: readonly Artifact[];
  readonly stamp: string;
  readonly mappings: ReadonlyMap<string, Mapping>;
  readonly references: ReadonlyMap<string, string>;
}
interface Mount { active: boolean; artifacts: readonly Artifact[]; source?: SourceGeneration }
const PAGE_DESCRIPTOR = '__DSH_EXTRAS_HOST_TIMEZONE_PAGE__';
const PROTOCOL = 'dsh-extras.host-timezone.v1';
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
  for (const id of ['@deepseek-ai/dsh', '@deepseek-ai/dsh-client-modules', '@deepseek-ai/dsh-host-webserver', '@deepseek-ai/dsh-client-connection']) {
    const manifestPath = require.resolve(id + '/package.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as { name?: string; version?: string };
    if (manifest.name !== id || manifest.version !== VERSION) throw new Error('unsupported-native-host-version');
    if (id === '@deepseek-ai/dsh-client-connection') {
      // Verify the unmodified browser implementation and its closed-over support, not a transformed target.
      const source = await readFile(join(dirname(manifestPath), 'lib/client.browser.js'));
      if (createHash('sha256').update(source).digest('hex') !== '5f6107953fa764c80b6c06aa161be318ffa0b71e565ac81536fc4267d5d62412') throw new Error('unsupported-native-connection-artifact');
    }
  }
}
async function artifactsOf(native: ClientModules, graph: Graph, zone: string, epoch: string): Promise<Artifact[]> {
  return Promise.all(graph.entries.filter(entry => TARGETS.has(entry.id)).map(async ({ id }) => {
    const path = native.clientPath(id);
    if (!path || basename(path) !== 'client.js' || basename(dirname(path)) !== 'lib') throw new Error('unsupported-native-client-path');
    const [source, manifestText] = await Promise.all([readFile(path, 'utf8'), readFile(join(dirname(path), '..', 'package.json'), 'utf8')]);
    const manifest = JSON.parse(manifestText) as { name?: string; version?: string };
    if (manifest.name !== id || manifest.version !== VERSION) throw new Error('unsupported-native-package');
    return { id, source, prepared: prepareArtifact(id, source, manifest.version, zone, epoch), fingerprint: hash(source) };
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

function targetStamp(native: ClientModules, graph: Graph): string {
  return JSON.stringify(graph.entries.filter(entry => TARGETS.has(entry.id)).map(entry => [entry.id, entry.url, entry.rev, native.clientPath(entry.id)]));
}
/** Finalize all mappings before publishing a generation; no native graph or prior generation is mutated. */
function sourceGeneration(native: ClientModules, graph: Graph, baseline: readonly Artifact[], zone: string, epoch = randomUUID()): SourceGeneration {
  const artifacts = Object.freeze(graph.entries.filter(entry => TARGETS.has(entry.id)).map(({ id }) => {
    const artifact = baseline.find(item => item.id === id);
    if (!artifact) throw new Error('unverified-new-target-artifact');
    return Object.freeze({ ...artifact, prepared: prepareArtifact(id, artifact.source, VERSION, zone, epoch) });
  }));
  const mappings = new Map<string, Mapping>();
  const references = new Map<string, string>();
  const sources = [...graph.entries.filter(entry => TARGETS.has(entry.id)), ...graph.batches.filter(batch => batch.entries.some(id => TARGETS.has(id)))];
  for (const row of sources) {
    if (references.has(row.url)) continue;
    const parsed = combo(row.url, graph);
    const targetIds = parsed.ids.filter(id => TARGETS.has(id));
    if (!targetIds.length || targetIds.some(id => !artifacts.some(artifact => artifact.id === id))) throw new Error('unsupported-native-target-combo');
    const key = PREFIX + '/' + epoch + '/' + hash(JSON.stringify([parsed.source, zone, artifacts.map(artifact => artifact.fingerprint)])) + '.js';
    mappings.set(key, Object.freeze({ source: parsed.source, targetIds: Object.freeze(targetIds) }));
    references.set(row.url, key.slice(1));
  }
  return Object.freeze({ epoch, zone, artifacts, stamp: targetStamp(native, graph), mappings, references });
}

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
    if (mounted) { mounted.active = false; mounted.source = undefined; }
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
    if (!native?.graph || !native.clientPath || !native.fetchBundle || !native.onGraphChanged || !native.onRebuilt || !server?.register) { unavailable(state, 'native-resource-seam-unavailable'); return; }
    const mount: Mount = { active: false, artifacts: [] };
    try {
      await verifyHost(c.get('profileContext')?.installAnchor);
      const graph = graphOf(native.graph());
      const zone = hostZone();
      const epoch = randomUUID();
      mount.artifacts = Object.freeze(await artifactsOf(native, graph, zone, epoch));
      mount.source = sourceGeneration(native, graph, mount.artifacts, zone, epoch);
      if (!live || ticket !== revision || !requested(config)) return;
      const current = (generation: SourceGeneration): boolean => live && mount.active && mounted === mount && mount.source === generation && requested(config);
      const assertCurrent = (generation: SourceGeneration): void => {
        if (!current(generation) || hostZone() !== generation.zone || targetStamp(native, graphOf(native.graph())) !== generation.stamp) throw new Error('source-generation-expired');
      };
      const ready = (generation: SourceGeneration) => {
        state.capabilities.hostTimezone = { phase: 'standby', reason: 'needs-full-reload' };
        state.details.hostTimezone = { requested: true, status: 'needs-full-reload', adapterVersion: VERSION, timeZone: generation.zone };
      };
      const ensureGeneration = (graph: Graph, force = false): SourceGeneration => {
        const zone = hostZone();
        let generation = mount.source;
        const stamp = targetStamp(native, graph);
        const sources = [...graph.entries.filter(entry => TARGETS.has(entry.id)), ...graph.batches.filter(batch => batch.entries.some(id => TARGETS.has(id)))];
        if (force || !generation || generation.zone !== zone || generation.stamp !== stamp || sources.some(row => !generation!.references.has(row.url))) {
          generation = sourceGeneration(native, graph, mount.artifacts, zone);
          mount.source = generation;
          ready(generation);
        }
        return generation;
      };
      const validate = async (generation: SourceGeneration): Promise<Artifact[]> => {
        assertCurrent(generation);
        await verifyHost(c.get('profileContext')?.installAnchor);
        assertCurrent(generation);
        const artifacts = await artifactsOf(native, graphOf(native.graph()), generation.zone, generation.epoch);
        assertCurrent(generation);
        if (artifacts.length !== generation.artifacts.length || artifacts.some(item => item.fingerprint !== generation.artifacts.find(old => old.id === item.id)?.fingerprint)) throw new Error('native-artifact-changed');
        return artifacts;
      };
      const resource = async (request: Request): Promise<Response> => {
        const generation = mount.source;
        if (!generation || !current(generation)) return reply(503);
        const url = new URL(request.url);
        if (url.search || url.hash || !['GET', 'HEAD'].includes(request.method)) return reply(request.method === 'GET' || request.method === 'HEAD' ? 404 : 405);
        const proof = url.pathname === PREFIX + '/' + generation.epoch + '/proof';
        if (proof && request.method !== 'GET') return reply(405);
        const mapping = generation.mappings.get(url.pathname);
        if (!proof && !mapping) return reply(404);
        let failureStage: FailureStage = 'host-and-artifact-verification';
        try {
          const artifacts = await validate(generation);
          if (proof) { assertCurrent(generation); return reply(204); }
          failureStage = 'native-source-advertisement';
          const nativeSource = mapping!.source;
          const advertised = [...native.graph().entries, ...native.graph().batches].some(row => (row.url.startsWith('/') ? row.url : '/' + row.url) === nativeSource);
          if (!advertised) throw new Error('native-graph-changed');
          failureStage = 'native-resource-fetch';
          const response = await native.fetchBundle(new Request(new URL(nativeSource, url.origin), { method: 'GET', signal: request.signal }));
          assertCurrent(generation);
          failureStage = 'native-resource-response';
          if (response.status !== 200 || !/^(?:text|application)[/]javascript(?:;|$)/u.test(response.headers.get('content-type') ?? '')) throw new Error('native-resource-unavailable');
          failureStage = 'native-resource-body';
          const body = await response.text();
          assertCurrent(generation);
          const selected = artifacts.filter(item => mapping!.targetIds.includes(item.id));
          failureStage = 'native-response-fingerprint';
          for (const artifact of selected) if (body.split(nativeBody(artifact.source)).length !== 2) throw new Error('native-response-fingerprint-mismatch');
          failureStage = 'target-patch-anchors';
          const patched = stripTrailer(applyArtifactPatches(body, selected.map(item => item.prepared)));
          assertCurrent(generation);
          const headers = { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', etag: '"host-timezone-' + hash(patched) + '"' };
          return new Response(request.method === 'HEAD' ? null : patched, { status: 200, headers });
        } catch (error) {
          if (current(generation)) {
            unavailable(state, 'native-artifact-or-host-zone-changed-needs-full-reload');
            // Only fixed native-stage identifiers escape; never publish raw errors or filesystem paths.
            state.details.hostTimezone.failureStage = error instanceof Error && error.message === 'source-generation-expired' ? 'source-generation-expired' : failureStage;
          }
          return reply(503);
        }
      };
      const listener = (table: any[]) => {
        if (!mount.active || mounted !== mount || !requested(config)) return;
        try {
          const rows = table.filter(row => row?.kind === 'global' && row.name === '__DSH_BOOT__');
          if (rows.length !== 1 || table.some(row => row?.kind === 'global' && row.name === PAGE_DESCRIPTOR)) throw new Error('unsupported-native-boot-table');
          const sourceGraph = graphOf(rows[0].value);
          if (sourceGraph !== native.graph()) throw new Error('foreign-native-boot-graph');
          const generation = ensureGeneration(sourceGraph);
          const graphCopy = structuredClone(sourceGraph);
          for (const entry of graphCopy.entries) if (TARGETS.has(entry.id)) entry.url = generation.references.get(entry.url)!;
          for (const batch of graphCopy.batches) if (batch.entries.some(id => TARGETS.has(id))) batch.url = generation.references.get(batch.url)!;
          const next = table.map(row => {
            if (row === rows[0]) return { ...row, value: graphCopy };
            if ((row?.kind === 'script-preload' || row?.kind === 'script-src') && generation.references.has(row.src)) return { ...row, src: generation.references.get(row.src) };
            return row;
          });
          next.push({ kind: 'global', name: PAGE_DESCRIPTOR, value: Object.freeze({ protocol: PROTOCOL, epoch: generation.epoch, proofUrl: (PREFIX + '/' + generation.epoch + '/proof').slice(1), targets: Object.freeze(generation.artifacts.map(artifact => artifact.id)) }) });
          // JSON rendering loses server Object.freeze; finalize only our own metadata in the page realm.
          next.push({ kind: 'script', placement: 'head', text: '(()=>{const key=' + JSON.stringify(PAGE_DESCRIPTOR) + ';const page=globalThis[key];Object.freeze(page.targets);Object.freeze(page);Object.defineProperty(globalThis,key,{value:page,writable:false,configurable:false});})()' });
          table.splice(0, table.length, ...next);
        } catch { mount.source = undefined; unavailable(state, 'unsupported-native-boot-or-host-zone-needs-full-reload'); throw new Error('host-timezone: protected boot unavailable; full reload required'); }
      };
      // Disposers are idempotently wrapped: repeat cleanup cannot remove a later foreign owner.
      const releases: (() => void)[] = [];
      let released = false;
      const release = () => { if (!released) { released = true; for (const dispose of releases.reverse()) dispose(); } };
      try {
        releases.push(server.register({ kind: 'prefix', path: PREFIX, resource }));
        releases.push(server.register({ kind: 'exact', path: '/plugins/', resource: (request: Request) => {
          if (!mount.active || mounted !== mount || !requested(config)) return Promise.resolve(reply(503));
          const url = new URL(request.url);
          if (HOST_TIMEZONE_TARGET_IDS.some(id => url.search.includes(id + '/'))) return Promise.resolve(reply(503));
          return native.fetchBundle(request);
        } }));
        releases.push(c.on('webserver/index-inject', listener));
        const changed = (force: boolean) => {
          if (!mount.active || mounted !== mount || !requested(config)) return;
          try {
            const graph = graphOf(native.graph());
            if (force || mount.source?.stamp !== targetStamp(native, graph)) ensureGeneration(graph, true);
          } catch {
            mount.source = undefined;
            unavailable(state, 'native-target-lifecycle-changed-needs-full-reload');
          }
        };
        releases.push(native.onGraphChanged(() => changed(false)));
        releases.push(native.onRebuilt(id => { if (TARGETS.has(id)) changed(true); }));
      } catch (error) { release(); throw error; }
      close = () => { mount.active = false; mount.source = undefined; release(); };
      ctx.effect(() => () => { if (mounted === mount) close?.(); else release(); });
      mount.active = true; mounted = mount;
      ready(mount.source);
    } catch { if (live && ticket === revision) unavailable(state, 'unsupported-native-artifact-host-zone-or-route-owner'); }
  };
  c.on('loader/volatile-update', refresh);
  await refresh();
}
