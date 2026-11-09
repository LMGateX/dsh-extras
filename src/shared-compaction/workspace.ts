/** Native immutable provenance, not mutable working-directory state or path prefixes. */
export interface SessionIdentity {
    workspaceId: string;
    rootSessionId: string;
    descendant: boolean;
}
export async function resolveSessionIdentity(ctx: any, sessionId: string, signal?: AbortSignal): Promise<SessionIdentity | undefined> {
    const registry = ctx.get('workspaceRegistry');
    if (!registry)
        return;
    const seen = new Set<string>();
    let id = sessionId;
    let descendant = false;
    while (!seen.has(id)) {
        if (signal?.aborted)
            return;
        seen.add(id);
        let header = ctx.get('sessions')?.get(id)?.header;
        if (!header) {
            const query = ctx.get('sessionQuery');
            if (!query?.observeSession)
                return;
            const observation = await query.observeSession(id, { signal, projectionMode: 'none' });
            try {
                header = observation.header;
            }
            finally {
                observation[Symbol.dispose]();
            }
        }
        if (!header || header.id !== id)
            return;
        if (header.origin === 'subagent') {
            if (typeof header.parentSession !== 'string' || !header.parentSession)
                return;
            descendant = true;
            id = header.parentSession;
            continue;
        }
        const matches = registry.list().filter((w: any) => w.sessionIds.includes(id));
        if (matches.length > 1)
            return;
        // Native controllers attach after agent/created. Exact native lookup of the immutable
        // root creation header is authoritative even before that account write completes.
        const workspace = matches[0] ?? (header.cwd ? await registry.resolveByPath(header.cwd) : undefined);
        return workspace ? { workspaceId: workspace.id, rootSessionId: id, descendant } : undefined;
    }
}
export async function resolveSessionWorkspace(ctx: any, sessionId: string, signal?: AbortSignal): Promise<string | undefined> {
    try {
        return (await resolveSessionIdentity(ctx, sessionId, signal))?.workspaceId;
    }
    catch {
        return undefined;
    }
}
