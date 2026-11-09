# Shared compaction 0.5.0 — implementation and validation

## Scope and public interface

This lane owns [the shared implementation](../src/shared-compaction/index.ts), the compact-context bridge and focused tests. The parent additionally authorized adapting the existing [Loader lifecycle fixture](../test/modules/compact-context/reasoning-lifecycle.test.ts) and two Loader-root cases in [native entry acceptance](../test/integration/native-compaction-reasoning.test.ts). No client, build, root orchestration, migration orchestration or host installation source was changed by this lane.

The public module hides election, wrapper ownership, canonical storage, capture and provenance:

- participateCompaction(ctx, {module, policy, workspaceForSession?}, status) returns {ready, update(policy), dispose()}. Only compact-context and model-policy participate. Module policy.enabled is **local participation**, not the canonical master. Disposal is idempotent and attached to the requesting native scope. The ready promise includes canonical initialization and seed import; root shell readiness alone is not active coverage.
- mountSharedCompactionRoutes(ctx, path) mounts a refcounted settings port, including when participation is disabled. Compact exports mountSettings(ctx, distribution) at /extras/<encoded distribution>/shared-compaction. Combined editors share one route; independent distributions have distinct routes into the same authority.
- openSharedCompactionStore(ctx) returns one native authority per host service root: detached read, revision-fenced write, subscribe, recoverable importLegacy and explicitly revision-fenced recoverLegacy. Production code guesses no profile paths and performs no direct profile-file IO.
- [Native immutable identity resolution](../src/shared-compaction/workspace.ts) exports resolveSessionIdentity(ctx, sessionId, signal?) and resolveSessionWorkspace(ctx, sessionId, signal?). The model lane supplied the native algorithm and re-exports this common source. Roots use native registry membership; descendants follow immutable native parent-session provenance, including disposed cold observations. Mutable cwd is not used. Unknown identity cannot select a workspace override.

## HTTP and JSON

GET returns:

    {revision, defaults: {enabled, rules}, workspaceOverrides: {[workspaceId]: {enabled, rules}}}

PUT accepts only:

    {expectedRevision, defaults, workspaceOverrides}

PUT replaces the full document and returns the accepted snapshot. Arrays replace; false and empty rules remain explicit. Removing an override key resets it to inherit. Revision is a non-negative safe integer and increments after durability. Stale writes are never silently rebased.

Native connection.admit executes before method/body handling, including Host/Origin fences. Only owner principals are admitted. Responses are no-store JSON with nosniff. Authentication keeps native 401/403. Unsupported methods return 405. Invalid/oversized JSON or semantic-invalid policy returns 400. Conflict returns 409 with {error: "revision-conflict", current: snapshot}. Missing/failed authority returns 503 with a bounded non-secret error.

Native settings.writable === false rejects PUT with 403 before opening storage/body transfer and is rechecked before writing. Absent Settings in a standalone native-domain composition does not invent read-only policy. Stock rc.1 currently always reports writable; refusal is exercised through a real native SettingsForms subclass at its public getter, not a prototype patch.

Refcounted routes trace services through the **host root**, not the disposed first requester's scope. The regression first failed with native "cannot get required service connection in inactive context"; the surviving-owner test now passes and last-owner disposal removes the route.

## Persistence, compatibility and legacy inputs

The [store](../src/shared-compaction/store.ts) opens native storageDomain dsh_extras_compaction version 1 through its configured backend. The global record is the accepted snapshot. A native legacy table retains first-seen inert policies before import. Native domain code owns medium IO, durable-read validation and atomic backend publication. Root symbols share one open promise and serialized compare/check/durable-write chain across independently bundled copies. Reads and queued candidates are detached. This is a **same-host-service-root** contract, not a new cross-process database/CAS guarantee.

Accepted canonical values win. Old module rules are a recoverable **seed**, not a second synchronized editor. Direct feature-plugin users without a settings root retain original configuration semantics and volatile rule updates. Mounted distribution roots require canonical persistence and fail closed rather than presenting that direct-plugin fallback as profile authority. Explicit false/empty seeds can be imported. Newly installed resolved default-off placeholders do not preempt meaningful existing seeds. Simultaneously observed inconsistent first seeds are backed up, remain unavailable and require explicit canonical save. Later divergent input is diagnosed and never overwrites accepted policy. Explicit recovery restores only the selected backup under current revision fencing and preserves workspace overrides.

With parent authorization, the old Loader lifecycle test writes rules through canonical CAS and uses module enabled only for participation. Its in-flight capture, disabled native continuation, isolated LLM, repeated re-enable, descriptor cleanup and no-stacking assertions remain. Two native Loader-root entry fixtures now provision real JSON/storageDomain under disposable roots and await public capability active. No native-entry assertion was removed or weakened.

## Execution and fail-closed boundaries

The old rc.1 adapter moved into [one shared source](../src/shared-compaction/runtime.ts); the old compact runtime entry is a compatibility re-export. No second summary engine, recursive LLM hook, prototype patch, native route/default rewrite, metadata preflight or retry loop was added.

Election uses ctx.root and Symbol.for, with compact-context before model-policy regardless of arrival. The other enabled module is standby. Same-module duplicates withdraw effects. Disable/unload restores owned descriptors before transfer. Foreign wrappers are not overwritten or stacked; cached owned closures become inert. Started requests retain accepted snapshot, exact-session durable effort, nested identities, cancellation and incoming receiver through switch/unload. Cold workspace lookup may await, but canonical snapshot and durable inheritance are captured synchronously first. Canonical master-off with no enabled override restores descriptors rather than leaving a no-op policy wrapper.

Native exact-model validation remains authoritative. Ordinary/LOOP calls pass unchanged. Unknown host/envelope/runtime/ownership coverage withdraws only the modifier and retains native compaction. Unknown workspace identity cannot apply an override or borrow a session. The existing documented direct-set/direct-get/cached-method third-party bypass boundary is unchanged; it is not advertised as supported native-entry coverage.

## Red / green evidence

All test/host commands set explicit disposable HOME, DSH_HOME, DSH_PROFILE and TMPDIR. Native HTTP admission uses synthetic in-memory requests, not a listening production port. No test targets 3080 or a real profile. The parent provisioned worktree-local rc.1 dependencies after ancestor resolution initially found alpha packages; the version fence correctly rejected the unsupported baseline.

Each execution used this prefix with its own temporary directory:

    tmp=$(mktemp -d /tmp/extras-shared-XXXXXX)
    HOME="$tmp" DSH_HOME="$tmp/dsh" DSH_PROFILE=isolated TMPDIR="$tmp" node --test ...

Observed failures followed by passing vertical slices:

| Slice | Red | Green |
| --- | --- | --- |
| Election | Missing shared public entry; then exact baseline rejection on ancestor alpha dependencies | Native compact-first/standby/single-dispatch transfer |
| Canonical CAS | Unavailable native backend fixture; native domain identifier rejects hyphens | One same-revision write succeeds; loser conflicts; invalid input preserves revision |
| HTTP entries | Missing route entry | Actual native owner-cookie Host/Origin admission, two entries, conflicts, disposal |
| Async capture | Local ignored-too/ignored-local instead of expected before/after | Accepted snapshot survives workspace wait, policy update and owner transfer |
| Legacy recovery | importLegacy is not a function | False/empty, no overwrite, native restart and revision-fenced recovery |
| Master-off | Own stream descriptor remained installed | Original own/inherited state restored |
| Read-only | PUT 200 instead of 403 | Native SettingsForms adapter refusal, unchanged revision |
| Route handover | Native inactive-context connection error | Surviving owner still reads; final owner unregisters |
| Native Loader roots | Missing authority / shell ready before canonical admission | Real native storage plus public active readiness; all 15 native engine cases pass |

Final focused command (with the disposable prefix above):

    node --expose-internals --test --test-concurrency=1 test/shared-compaction/*.test.ts test/modules/compact-context/*.test.ts test/integration/native-compaction-reasoning.test.ts

Result: **94/94 pass**, including **15/15 native engine entry cases**. Independent esbuild consumers share native CAS/election and reload accepted policy from a disposable native JSON medium. Strict tsc --noEmit and git diff --check passed against the current parallel worktree. The surviving-route regression was independently red then green and is included in this final full focused run.

## Parent release gates and remaining risks

- This lane did not run the final six release archives or actual emitted browser settings. Independent temporary bundles are not claimed as packed archive/browser evidence. Parent owns frozen rebuild, six packed consumers, native installation/browser acceptance, declarations/export selection and release integration.
- Both editors must visibly separate accepted canonical master from local participation. Root/module shell active is not reasoning capability active during canonical opening/seed admission.
- Exact supported baseline remains DSH LLM 0.2.2-rc.1 / Cordis 4.1.0. Other versions, custom stream-purpose bypasses and cross-process concurrent profile ownership are not newly supported.
- Storage backend/profile configuration remains host-owned. Missing/quarantined authority must never be hidden by direct profile files or production-profile fallback.
