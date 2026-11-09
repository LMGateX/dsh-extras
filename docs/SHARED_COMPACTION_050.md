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

## Accepted disabled-module seed followup

Parent authorized consumption of the fourth optional FeaturePlugin.mountSettings argument: a pure getConfig getter for the exact accepted module value. The third isActive callback is unchanged. [The shared seed module](../src/shared-compaction/legacy-seed.ts) consumes this getter from both compact and model settings roots, including when the whole feature is disabled; it never mounts an executor. The root type/runtime forwarding belongs to the integration lane, and the model hook is a targeted change coordinated with the model runtime lane.

The resolved getter cannot prove raw explicitness. Only nondefault nested policy data becomes a candidate. Diagnostics label provenance accepted-module-config with explicitness unverified; default-off schema placeholders do not materialize policy or preempt existing values. Duplicate equal candidates are idempotent. All candidates are backed up before any initial import. An accepted canonical revision wins forever unless the user explicitly saves/recoveries under revision fencing. Conflicting initial candidates remain revision 0 and require an explicit canonical save, with bounded metadata diagnostics and no raw rules/user text in those diagnostics.

**Corrected enablement invariant:** preserve the original nested policy.enabled exactly, including true on a whole-module-disabled source. Whole-module enablement is an execution participation gate only, never multiplied into canonical policy or backup. A disabled source with policy.enabled=true therefore has canonical true and zero executor effects. Equal nested policies with different whole-module enablement are not conflicts. An early followup implementation followed the parent's original master-off wording; independent review corrected that wording before commit. Revised tests first failed with false instead of true and with a false same-policy conflict; removing the multiplier made exact canonical and recovery backup preservation pass.

GET gains optional legacyImport metadata containing phase, source module/distribution, provenance/explicitness and module/participation booleans. It never includes raw rules or provider configuration. The durable snapshot remains exactly three fields and PUT remains the existing exact three-field candidate; GET metadata is not accepted as PUT input. Canonical preparation precedes feature automatic seed handling so a whole-disabled peer cannot lose the initial batch merely because another feature mounts first.

Root scope/generation admission is rechecked after asynchronous opening and each backup wait, before canonical CAS. Native public JSON KV adapter coverage pauses backup durability, disposes the actual Loader settings root, resumes the in-flight backup, and verifies revision 0/default policy with no late canonical write. Already-started backup IO may complete; no disposed source can subsequently admit policy or effects.

Followup [native tests](../test/shared-compaction/disabled-seed.test.ts): exact old custom policy survives disabled execution and explicit recovery; enabling the feature cannot overwrite later canonical user edits; conflicting sources are metadata-only unavailable; equal policies/different module enablement import once; fresh placeholders stay revision 0; root disposal fences late admission. Four tests pass.

Repeated focused source/native command from the earlier section now passes **98/98**, retaining **15/15 native engine entry cases**. This followup does not execute build/pack. A whole-worktree typecheck initially reported an unrelated concurrent client-test narrowing diagnostic; the final followup tsc --noEmit and git diff --check both passed after that lane corrected it. The native model runtime remains a concurrently coordinated integration file and is not silently included as fully tested implementation by this lane.

## Bootstrap authority correction after packed native evidence

The [bootstrap provenance clarification](SHARED_COMPACTION_BOOTSTRAP_050.md) records the necessary contract correction before implementation. Re-reading the live fourth-argument getter was a real independence defect: a native ConfigEditor participation-only edit after default bootstrap changed canonical revision 0/master false into revision 1/master true. The new public Loader regression reproduced that exact snapshot mismatch before the fix; saving canonical policy first would conceal it and is not an acceptable fixture repair.

The settings hook now captures its accepted initial policy synchronously once. Native domain bootstrap metadata retains the immutable per-distribution/module snapshot and a separately completed consumed flag, including for default-only input. This metadata does not materialize the canonical authority: default-only bootstrap remains revision 0 with unchanged defaults/overrides across local participation edits, native root unload/reload and full service-root restart. Whole-module enablement remains diagnostic/execution input only. True-with-inherit original policies are still imported and backed up exactly, including when the whole module is disabled. Conflicting consumed nondefault input cannot later pick a canonical winner merely because a source unloads.

Later genuine migration adoption is not inferred from bytes or ordinary accepted configuration events. The selected feature exposes the typed optional onLegacyAdopted(ctx, acceptedModuleConfig, receipt) hook. Compact delegates to adoptLegacyCompactionSeed; the model bridge and root receipt producer are separately coordinated integration changes. The helper requires the exact live settings-owner fiber and matching source module, captures inert policy/operation identity before awaiting, and persists operation-specific backups/consumption through native adoptions metadata. A repeated operation is idempotent; reuse with another policy fails closed. Existing canonical revisions always win, with revision-fenced explicit adoption recovery retaining workspace overrides. Pending backup work that loses admission cannot seed or become consumed, and the exact operation remains retryable by the legitimate remounted owner.

A source joining while pre-admission bootstrap metadata IO is pending invalidates the old batch. A second focused regression reproduced silent cancellation at revision 0 before the fix. Preparation now drains actual registry-generation changes before releasing its shared promise, without polling/retrying unchanged failures. Canonical bootstrap admission is checked inside the shared native write queue, not only before queuing. Already-started backup IO may finish; failed/disposed work is not marked consumed.

Evidence in this lane, all under explicit disposable HOME/DSH_HOME/profile/TMPDIR:

- Shared-compaction/compact-context/all native engine entry command above: **107/107 pass**, including **15/15 native engine entries**.
- The integration lane's actual journal-backed [root adoption cases](../test/integration/legacy-adoption.test.ts), executed against the current shared helper: **3/3 pass**. They verify no fresh/status/ordinary-edit receipts, real delayed native adoption after default bootstrap, canonical-edit precedence and journal-operation replay/recovery. These are actual migration/Loader/HMR cases, not a fabricated receipt claim.
- [Native metadata tests](../test/shared-compaction/bootstrap-store.test.ts) cover service-root restart, immutable receipts, operation-specific recovery, conflicting input, concurrent source arrival and paused-backup cancellation. [Loader seed tests](../test/shared-compaction/disabled-seed.test.ts) retain every earlier assertion and add participation-only/root-reload snapshot invariance and owner-scoped delayed feature hooks.
- The separate lifecycle test-only correction waits for public ready/active feature admission plus local participation and exact canonical revision. Its original line-58 undefined capability failure was reproduced before the correction; **20/20 fresh-process exact-case repetitions** passed with four CPU workers and two concurrent native test processes, with no post-failure retry or skip. All original in-flight, descriptor restoration and invocation-count assertions remain.
- Final tsc --noEmit and git diff --check pass after fixing a native optional-KV type assertion in the new test adapter. No build, pack, dist or live-profile operation was executed by this lane. Final rebuilt archives and packed browser evidence remain parent-owned gates.

## Irreversible global-write admission and owner disposal drain

The later [native-write admission amendment](SHARED_COMPACTION_BOOTSTRAP_050.md#irreversible-native-write-admission--evidence-based-amendment) supersedes any reading of earlier backup-pause coverage as cancellation until fsync. Public native DomainGlobal.set and KvUnit.setGlobal accept only values, not commit predicates, transactions or AbortSignals. The domain updates readable memory and emits changes only after backend durability. Native JSON uses atomic replacement and native close drains admitted writes. A separate executed public Cordis effect probe confirms async disposers delay disposal completion.

The final store fence now registers an optional synchronous LegacyCommitObserver completion before invoking irreversible global IO. Settings-source owners track only their reserved global commit tickets, close new admissions on native unloading, then await those tickets in their async effect disposer. They do not wait on uncommitted backups. Bootstrap global commits drain before owner disposal completes; adoption tickets also include durable consumed-receipt acknowledgement. Direct store callers have no implicit settings owner and must attach the explicit observer when they need an owner-scoped drain.

After admission, successful global durability is truthfully imported even if closure started meanwhile. The adoption helper never rewrites that outcome as owner-disposed/cancelled and never publishes a new projection for a closed owner. Rejected global durability retains the original pending receipt at revision 0. Failed acknowledgement after a committed global write rejects honestly while canonical revision 1 remains accepted; the immutable acknowledgement can be retried without another canonical edit. No private backend operation, file compensation, two-phase authority or additional native host patch is used.

Sources present by the final admission fence must form a consistent batch or no seed is admitted. An original enrolling after that fence is subsequent input: its exact value is backed up, existing canonical authority wins, and preservation diagnostics explicitly explain prior global-write admission. This is not cancellation of a write already accepted by native storage. The original preparation waiter still joins the complete generation drain; no follow-up GET is required to finish enrollment or backups.

[Final-global-write regressions](../test/shared-compaction/commit-boundary.test.ts) first ran **4 pass / 4 fail**, reproducing premature bootstrap/adoption disposal completion, absent direct-caller reservation and insufficient preservation diagnostics. After the fix all **8/8 pass**. The helper-adoption case separately pauses global IO and then receipt acknowledgement: readable canonical is already revision 1 at the latter pause, but owner disposal still waits. Existing pre-admission backup-pause tests still dispose before backup release and do not seed.

Final command, always with disposable HOME/DSH_HOME/profile/TMPDIR:

    node --expose-internals --test --test-concurrency=1 test/shared-compaction/*.test.ts test/modules/compact-context/*.test.ts test/integration/native-compaction-reasoning.test.ts test/integration/legacy-adoption.test.ts

Result: **118/118 pass**, including all **15 native compaction engine entries** and all **3 real native journal-adoption cases**. Twenty fresh-process repetitions of the eight commit-boundary cases under two concurrent test processes and four CPU workers also passed **160/160**, without skips or retry-on-failure. All CPU workers were terminated. Final tsc --noEmit and git diff --check passed. Rebuilt six-archive/packed browser/release verification remains parent-owned and is not claimed by this lane.
