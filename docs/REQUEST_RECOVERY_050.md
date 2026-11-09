# Optional terminal request recovery adapter — 0.5.0

## Delivery boundary

This is an **optional protocol adapter**, not a new retry loop and not an implementation of native request recovery. Stock DSH 0.2.2-rc.1 has no compatible public terminal recovery capability: it remains unavailable and has no action button. The separately authorized upstream extension must supply and validate the protocol below. This lane changes no host installation, native core source, profile, provider request, prompt, tool result, or transcript message.

The earlier [stock-host audit](RETRY_POLICY_050.md) remains correct. Protocol-fixture tests below do not supersede its stock compatibility finding or prove the separately developed native extension. Final native-extension/packed-host/browser proof belongs to integration after the extension is ready.

## Minimal integration exports

- [Host adapter](../src/modules/retry/recovery.ts): `mountRequestRecovery(ctx, distribution, isEnabled = () => false)`. Root composition mounts it once. The callback must read **accepted, currently admitted retry-module participation**, not browser draft intent. Default is fail-closed. Disabling/unloading fences an in-flight read and prevents later native calls.
- [Client adapter](../client/request-recovery.ts): `createRequestRecoveryAdapter(React).mount(ctx, {rowId, enabled, subscribe}) => dispose`. Parent passes this as the independently selected seventh factory; only combined/retry bundles import it. Parent owns its disposer. The enabled callback combines accepted config and actual runtime ready/active ownership; settings read-only alone is not a native execution-permission decision.
- Client dependencies are `slots` and `sessions`, injected dynamically. The native sessions service is supplied by `@deepseek-ai/dsh-api-session-controller`; retry-only packages must declare that client dependency rather than accidentally obtaining it from chime. Locale is optional and uses the existing native locale service.

## Audited native chat/session interfaces

These are actual stock 0.2.2-rc.1 public declarations and emitted client source, not invented slot names:

1. `dsh-client-ui-chat/lib/types/client/contract/slots.d.ts:432–440` declares `conversation.chat.turnTail` as a list, session scope, with owner `{turn: TurnLocation, seq, openFile}`. List contributions use an `id`, not the keyed-node `key`.
2. Native emitted `dsh-client-ui-chat/lib/client.js:9327–9342` declares that child slot. Lines 9027–9039 call it for a completed turn even without a finalized assistant response. The turn-tail definition at 13282–13326 consumes `turn/end` without requiring a successful turn; an error turn has the same extension seam.
3. `dsh-client-ui-conversation/lib/types/client/contract/conversation.d.ts:87–94` defines TurnLocation's numeric `turn`, `end` event, and closed status. **Use `turn.end.seq`**, not slot `seq`: the slot's sequence can be a final assistant row rather than the terminal event.
4. `dsh-api-session-controller/lib/types/client/sessions/service.d.ts:83–90,248` exposes `sessions.binding(sessionId)?.session`. Its SessionFace is an ObservableSnapshot; no retain, cold-open, global selection guess, mutable cwd, parent/fork history, or transcript scan is required.

Registration uses `slots.inject('conversation.chat.turnTail', () => slots.register({name, id:rowId+'#request-recovery', inject:(sessionId)=>({sessionId,session:sessions.binding(sessionId)?.session})}, View))`. The view subscribes to that exact bound Session, refreshes capability on its accepted snapshot changes, and hides while running or disabled. It shows an action only when a validated native checkpoint is available, has disposition budget-exhausted, and exactly matches the injected session, owner turn, and terminal event sequence. A historical tail cannot display another turn's action. This is placement validation, not exhaustion inference.

## Optional native protocol

The existing Agent is read through public `ctx.agents.get(sessionId)` only. The adapter never loads/creates/resumes an Agent to obtain a checkpoint. It capability-detects `agent.recovery.read` and `agent.recovery.retry` and requires:

```ts
read(): {
  protocol: 'dsh.request-recovery.v1';
  lifetime: 'process-local';
  status: 'available' | 'unavailable';
  reason?: string;
  checkpoint?: {
    sessionId: string; checkpointId: string; revision: number;
    attemptId: string; attemptSeq: number; terminalSeq: number;
    turn: number; step: number;
    selection: {provider: string; model: string; reasoningEffort?: string};
    disposition: 'budget-exhausted';
  };
}
retry({sessionId, checkpointId, expectedRevision, operationId}): Promise<
  {status:'accepted'; checkpointId:string; operationId:string; executionId:string}
  | {status:'rejected'; reason:string}
>;
```

The native engine, **not Extras**, proves budget exhaustion; owns the exact failed-request checkpoint; expires it after subsequent session/selection/activity/reset/cancellation/disposal changes; fences revision and idempotent operation identity; and executes all native request-preparation/permission/workspace/Goal admission. No browser provider, model, delay, budget, history, messages or replacement request is accepted. Accepted execution ID means **execution started**, not successful completion.

Stable native reasons allowlisted by this adapter: agent-detached, agent-busy, exact-snapshot-unavailable, checkpoint-stale, foreign-session, invalid-operation-id, recovery-policy-rejected, recovery-admission-failed. Unknown reasons or incompatible snapshots close the capability and expose bounded generic diagnostics; raw native/provider exceptions are never returned. New native reasons require an explicit compatibility amendment, not an automatic pass-through.

## HTTP contract and idempotency

Exact `/extras/<encodeURIComponent(distribution)>/request-recovery`:

- GET takes exactly one `sessionId` query parameter and returns the detached validated native view, or a truthful unavailable view.
- POST accepts exactly four fields: `{sessionId, checkpointId, expectedRevision, operationId}`. JSON MIME is required; declared and streamed bodies are bounded to 8192 bytes; identifiers and revisions are bounded and validated. Unknown fields (including browser provider/budget) are rejected.
- Every request uses actual native Connection admission first and requires the owner principal. Native auth, Host and Origin fences remain authoritative. GET/POST only; no cache; no raw errors or credential data.
- Accepted is HTTP 200; structured native rejection is 409; invalid input 400; oversized body 413; wrong MIME 415; incompatible transport/runtime 503. Unauthenticated/foreign authority retain native 401/403 behavior.
- Native deduplicates by checkpoint/revision, not browser operation ID: concurrent distinct browser operation IDs may receive the same **first canonical native operationId** and executionId. Host/client validate bounded safe receipt IDs and the exact submitted checkpoint, preserve that canonical receipt unchanged, and never invent per-browser receipt aliases.
- Native receipt replay must remain possible after read becomes unavailable (for example, after the first acceptance has already started native execution). Therefore POST does not require read.available at receipt-replay time; it verifies protocol/compatibility and delegates the **same exact command** to the native idempotency/admission authority. It never stores a host replay cache or reenacts a request.
- Client keeps one operation identity for the exact session/checkpoint/revision. The button is synchronously fenced while pending. A lost accepted response can be retried using the same operation key, never a fresh command. Session changes, unmount, module disable and obsolete read completion cannot publish stale availability. Post-settlement refresh reads native state rather than guessing from retry counters or error text.

## Executed evidence and remaining gate

[Host tests](../test/request-recovery/host.test.ts) use a deterministic native-like optional recovery port inside the **actual disposable Cordis Loader + native Connection admission** fixture. They verify exact forwarding/idempotent operation keys, asynchronous disable race, missing/incompatible stock capability, stale reason, module disable, authentication/Host/Origin, strict query/command fields, MIME and body limit. This fixture does **not** implement or prove upstream request checkpoint safety.

[Emitted browser test](../test/request-recovery/browser.test.ts), with its [public-slot fixture](../test/request-recovery/browser.fixture.js), runs actual React/Chromium and the real admitted HTTP bridge on an OS-assigned port asserted not 3080. The slot fixture emulates the audited public native slot/session contract; **it is not the native chat runtime**. It verifies one matching action/no historical action, another session unavailable, English/Chinese label, running-state hide, pending duplicate fencing, accepted-started wording, stale diagnostic, lost-response retry with the same native operation ID, disable unregistration and disposer cleanup. These facts prove the adapter behavior only.

Observed TDD reds: missing host module; disable race incorrectly returned available; unknown native reason leaked instead of generic diagnostic; missing emitted client module. Each was rerun green after its respective implementation/fix. Additional protocol fixtures verify expected public behavior without claiming a newly implemented native core.

Executed with explicit disposable HOME/DSH_HOME/DSH_PROFILE/cache and read-only Chromium binary; no production URL/profile writes:

```sh
TEST_HOME=$(mktemp -d /tmp/extras-recovery-all-XXXXXX)
HOME="$TEST_HOME" DSH_HOME="$TEST_HOME/dsh" XDG_CACHE_HOME="$TEST_HOME/cache" \
DSH_PROFILE=isolated DSH_EXTRAS_CHROMIUM=/path/to/read-only/chrome \
node --test --test-concurrency=1 test/request-recovery/*.test.ts
```

Result: 5/5 passing after the metadata audit follow-up; the additional public HTTP case rejects every present malformed optional reasoningEffort instead of silently stripping it. Combined recovery and retry-policy focused suites pass 12/12; repository typecheck passed. Shared build/dist was not written by this lane. **Still required before claiming real recovery:** integrate the separately built native extension in an explicitly disposable host, prove structured terminal exhaustion and exact failed-request resumption/no duplicate tools/messages through this HTTP and real native chat slot path, execute the required admission/race/expiry/cancellation gates, and verify final frozen packed artifacts. Missing native extension remains unavailable rather than a fake working action.
