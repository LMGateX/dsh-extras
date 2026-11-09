/** Owner-only config-form-compatible port. Native Connection owns authentication and origin admission. */
import type { Context } from '@deepseek-ai/cordis';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { openSharedCompactionStore, type SharedCompactionWrite } from './store.ts';
const KEY = Symbol.for('dsh-extras.shared-compaction.routes.v1');
const REQUIRED = Symbol.for('dsh-extras.shared-compaction.canonical-required.v1');
interface RouteRecord {
    users: number;
    off: () => unknown;
}
/** Native roots never silently execute legacy config when canonical persistence is unavailable. */
export function canonicalCompactionRequired(ctx: Context): boolean { return !!(ctx.root as unknown as Record<symbol, unknown>)[REQUIRED]; }
export function mountSharedCompactionRoutes(ctx: Context, path: string): void {
    Object.defineProperty(ctx.root, REQUIRED, { value: true, configurable: true });
    ctx.inject(['webServer', 'connection'], routeCtx => {
        const root = routeCtx.root as Context & {
            [KEY]?: Map<string, RouteRecord>;
        };
        if (!root[KEY])
            Object.defineProperty(root, KEY, { value: new Map(), configurable: true });
        const routes = root[KEY]!;
        // Refcounted routes outlive their first requester; use host-root service tracing.
        const services = root as unknown as {
            webServer: {
                register(route: unknown): () => unknown;
            };
            connection: {
                admit(req: IncomingMessage): any;
            };
        };
        routeCtx.effect(() => {
            let record = routes.get(path);
            if (!record) {
                const handler = async (req: IncomingMessage, res: ServerResponse) => {
                    const json = (code: number, value: unknown) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(value)); };
                    const admission = services.connection.admit(req);
                    if ('rejection' in admission) {
                        res.writeHead(admission.rejection);
                        res.end();
                        return;
                    }
                    if (admission.peer.principal.kind !== 'owner') {
                        res.writeHead(403);
                        res.end();
                        return;
                    }
                    if (!['GET', 'PUT'].includes(req.method ?? '')) {
                        res.writeHead(405, { Allow: 'GET, PUT' });
                        res.end();
                        return;
                    }
                    if (req.method === 'PUT' && (root.get('settings') as {
                        writable?: boolean;
                    } | undefined)?.writable === false) {
                        json(403, { error: 'settings-read-only' });
                        return;
                    }
                    let store;
                    try {
                        store = await openSharedCompactionStore(root);
                    }
                    catch {
                        json(503, { error: 'shared-compaction-unavailable' });
                        return;
                    }
                    if (req.method === 'GET') {
                        try {
                            json(200, store.read());
                        }
                        catch {
                            json(503, { error: 'shared-compaction-unavailable' });
                        }
                        return;
                    }
                    let candidate: SharedCompactionWrite;
                    try {
                        let body = '';
                        let bytes = 0;
                        for await (const chunk of req) {
                            bytes += Buffer.byteLength(chunk);
                            if (bytes > 262144)
                                throw new TypeError('body limit');
                            body += chunk;
                        }
                        candidate = JSON.parse(body);
                    }
                    catch {
                        json(400, { error: 'invalid-shared-compaction-policy' });
                        return;
                    }
                    if ((root.get('settings') as {writable?: boolean} | undefined)?.writable === false) { json(403, {error: 'settings-read-only'}); return; }
                    try {
                        json(200, await store.write(candidate));
                    }
                    catch (error) {
                        const code = (error as {
                            code?: string;
                        })?.code;
                        if (code === 'revision-conflict')
                            json(409, { error: code, current: store.read() });
                        else if (error instanceof TypeError)
                            json(400, { error: 'invalid-shared-compaction-policy' });
                        else
                            json(503, { error: 'shared-compaction-unavailable' });
                    }
                };
                record = { users: 0, off: services.webServer.register({ kind: 'exact', path, handler }) };
                routes.set(path, record);
            }
            record.users++;
            const owned = record;
            return () => { if (--owned.users === 0) {
                owned.off();
                if (routes.get(path) === owned)
                    routes.delete(path);
            } };
        });
    });
}
