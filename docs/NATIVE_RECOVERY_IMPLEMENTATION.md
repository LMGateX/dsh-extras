# Native recovery implementation — independent rc.1 companion

Status: native source implementation, offline interface tests and genuine source-CLI recorded-session SDK evidence; **not an official release, deployed host, or verified browser integration**. Design was recorded before implementation on 2026-11-09 Asia/Shanghai. Original installation and GUI remain untouched.

## Isolation and immutable baseline

- Official tag: https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.1, peeled commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`.
- Exclusive clone [/tmp/dsh-native-recovery-050](</tmp/dsh-native-recovery-050>), branch `native-terminal-recovery`. Dependencies and native flock addon were provisioned only inside this clone, using a temporary pnpm store. No real profile, installed package, existing process, GUI reload or upstream push was changed. No paid provider calls.
- Independent [parity report](</tmp/dsh-native-recovery-parity.md>): **211/211** registry tarball members match installed bytes: agent 30, agent-loop 20, llm 44, llm-retry 20, session-controller 97; all five SHA512/SHA1 verifications pass. Registry gitHead is absent, not treated as provenance proof. Immutable Git-object checks show **63/63** tagged module JS emits match installed type-face JS after only source-map/const-enum normalization; all **19** loop callable members match after syntax normalization and two temporary-variable inlinings. Individual integrity and artifact hashes are retained in the report.
- A concurrent-working-tree observation briefly misidentified the newly added terminal action as stock. The researcher withdrew it and repeated baseline checks against immutable Git objects. Stock action is retry or undefined only.

## Native package ownership

| Package | Actual change |
| --- | --- |
| `@deepseek-ai/dsh-agent` | Type-only public recovery contract, recovery intent on pre-step, structured exhausted disposition and audit event declarations. |
| `@deepseek-ai/dsh-agent-loop` | Runtime capture, idle publication, atomic reservation, native exact dispatch, fresh tool authority and ordinary native continuation/cancel convergence. |
| `@deepseek-ai/dsh-llm-retry` | Runtime exhausted disposition after retryability/downstream recovery checks. |
| `@deepseek-ai/dsh-goal` | Runtime domain admission, rejecting non-active Goal phases without changing activation or round counts. |
| `@deepseek-ai/dsh-session` | Generated known-event table for two new audit types; no durable restart recovery capability. |

LLM runtime, API archive gate and **automatic Goal round driver remain unmodified**. A changed native owner must never be passed off under a stock fingerprint. Candidate packaging must identify an unofficial suffix/provenance and exact artifact hashes; source tag versions are baseline identity, not authorization to publish modified official rc.1 artifacts. Release/install policy belongs to the parent lane.

## Stable optional public protocol

Missing `Agent.recovery` means unsupported, never a fallback message sender. Synchronous metadata-only `read()` returns:

`{ protocol: "dsh.request-recovery.v1", lifetime: "process-local", status: "available" | "unavailable", reason?, checkpoint? }`

An available checkpoint exposes only:

`{ sessionId, checkpointId, revision, attemptId, attemptSeq, terminalSeq, turn, step, selection: { provider, model, reasoningEffort? }, disposition: "budget-exhausted" }`

It exposes no raw prompt, hidden context, tool arguments, credentials, prepared capability or full failure body. Publication requires actual exhausted attempt, real error turn/end and true idle, not public-idle maintenance. Browser refresh rereads host memory. Agent replacement/host restart cannot reconstruct the snapshot from audit records.

`retry({ sessionId, checkpointId, expectedRevision, operationId })` returns a promise of `{ status: "accepted", checkpointId, operationId, executionId }` or `{ status: "rejected", reason }`. Accepted identifies one native execution, not its completion. Reservation is synchronous before any await. Duplicate checkpoint/revision clicks share one promise/receipt; a bounded 16-receipt cache prevents unbounded retention. Browser commands cannot supply provider/model/request content or budget.

Current reasons: `agent-detached`, `agent-busy`, `exact-snapshot-unavailable`, `checkpoint-stale`, `foreign-session`, `invalid-operation-id`, `recovery-policy-rejected`, `recovery-admission-failed`. An available checkpoint is a live snapshot candidate; asynchronous policy/tool/native preparation still revalidates and may explicitly reject. UI placement must bind sessionId + failed turn + terminalSeq, not the last assistant seq.

## Exact recovery and native authority

1. Only native retryable **normal-policy** budget exhaustion after downstream specialized recovery declines creates a checkpoint. Cancellation/nonretryable/always-mode failures, error strings or UI heuristics do not.
2. Retain actual immutable failed GenerateOptions and data-only selection/metadata/tool identities, with real attempt/terminal seq identities. Never retain or execute an old prepared call or disposed toolSet. Failed partial assistant output stays non-surface assistant/attempt.
3. A click opens a new audited native running activity after old turn/end. Scope-aware pre-step receives **messages: [] plus explicit recovery checkpoint**. It does not replay old input for policy inspection, fabricate an inbox claim or append synthetic content. Any input injection/rewrite/request-series start rejects.
4. Fresh tools and current schemas/static prompt are validated. Native prepareCall uses captured config afresh. Adapter-update generation, resolved config/metadata, captured options, model/header/history/tool history and an incrementally maintained foreign-event generation fence changes. No new synchronous arbitrary event-history read was introduced. Fences are checked across awaits, audit publication and synchronous stream-start callbacks before final loop-owned native stream handoff.
5. Every attempt in the fresh finite chain uses the captured request with **only a fresh abort signal**: no dynamic clock/instructions refresh, new user/developer/system message, fork, whole-turn replay, prior-tool execution or direct adapter call. Native llm/stream middleware and replay remain authoritative after handoff.
6. **Agreed budget refinement:** renew the captured finite normal provider policy (default five; respect configured zero/two/etc.), not forced five and not browser-selected. Native backoff/cancellation remain effective; conditional tool admission is resolved afresh after backoff. Specialized downstream recovery cannot make this explicit chain unbounded. Re-exhaustion creates a new checkpoint/revision.
7. Only new successful-response tool calls execute under fresh native authority. Subsequent tool/model steps and ordinary followup turns return to normal preparation and dynamic-context refresh—recovery does not permanently pin context.
8. Waking human input arriving during successful recovery **or rejected awaited admission** is handed back to the native driver. Unwoken injections do not become synthetic wakes. Cancellation/disposal use the real native running phase/signals.

## Goal, archive and external-gate boundaries

The unchanged archive gate receives the ordinary scoped pre-step dispatch and is exercised as its real plugin through a native Agent/LLM test. Goal-domain checks run before/after downstream admission. Paused/blocked/completed Goals reject; durable Goal changes invalidate the snapshot. **Active but error-disarmed** Goals can be explicitly recovered without resume/rearm, new Goal rounds or consumed reservation reuse. The unchanged round driver does not automatically continue the disarmed Goal afterward.

External `@lmgatex/mattpocock` allNativeWakeAdmission is outside this patch and not claimed tested. Its existing scoped pre-step listener still receives recovery intent, but deployments must verify its admission behavior; the adapter cannot bypass a rejection. Real HTTP ownership/origin checks, packed browser behavior, compaction/Goal fingerprint compatibility and disposable install/rollback remain parent-owned follow-on gates.

## Durable audit and rollback compatibility

`request/failure` and `request/recovery` are metadata-only audit events with no surface operation or model message. They do not persist a resumable capability. Official persistence tooling generated catalogs, bilingual acknowledgement, machine schema and Session known-event vocabulary.

**Same Session format version does NOT imply stock read compatibility.** Candidate readers read stock logs; stock readers lack the new required event names and safely refuse affected candidate logs rather than reconstruct incorrect state. The stock append API cannot mark these non-surface writes ignorable. Candidate profiles/logs remain separate; rollback uses the profile backup and original host. Never mix readers on one profile or silently strip audit records. No real user log was migrated here.

## Tests, review and evidence

New tests use public Agent/LLM/operation/plugin composition, not private methods. Recorded red→green slices: structured exhaustion; missing recovery seam; reentrant status mutation; replaced adapter/lost followup; paused Goal; stream-start mutation/stale awaited admission wake; permission revocation during native backoff. Independent [safety audit](</tmp/dsh-native-recovery-audit.md>) found those concrete risks, each reproduced by public tests before fixing. This is not an independent final-code approval claim.

- [Focused recovery log](</tmp/dsh-native-recovery-focused.log>): **20 tests passed** (19 recovery + 1 disposition): budgets 0/2, exact whole-budget/re-exhaustion, no prior-tool replay/new tool execution, duplicate/foreign/revision fences, native archive and Goal admission, no Goal rearm/recount, ordinary-turn context refresh, partial output, cancellation before/during dispatch and Agent replacement without snapshot.
- [Final native regression log](</tmp/dsh-native-recovery-regression.log>): **64 files / 1344 tests passed**, including Agent, Session, loop, retry, Goal, unchanged Goal driver and archive gate. Earlier pre-final loop/retry/Goal run was 37 files / 652 tests; the final persisted log supersedes it.
- [Typecheck log](</tmp/dsh-native-recovery-typecheck.log>), [candidate build log](</tmp/dsh-native-recovery-build.log>), [lint log](</tmp/dsh-native-recovery-lint.log>), [persistence acknowledgement](</tmp/dsh-native-recovery-persistence.log>), [final documentation checks](</tmp/dsh-native-recovery-doc-sync-final.log>). Final outcome/artifact hashes and native commit are appended after collection.

Source/native interface evidence is **not** deployed-host, real browser or production acceptance. Exact command/artifact receipt and remaining gates follow below.

## Initial native handoff receipt

- Implementation commit: `2121312aacce481d2970ae582fdfc9a3056039ca`. Reference/catalog supplement: `320b72c02a1bc8c98cdd66aa70ad26059c1a0bad`. Native clone working tree was clean after both scoped commits.
- [Reviewable two-commit source patch](</tmp/dsh-native-recovery-candidate/native-recovery.patch>), [candidate manifest](</tmp/dsh-native-recovery-candidate/manifest.json>) and [archive SHA256 sums](</tmp/dsh-native-recovery-candidate/SHA256SUMS>). Five top-level private/unofficial tgz packages are version `0.2.2-rc.1-native-recovery.0`; their inter-owner dependency/peer ranges use the same suffix. The manifest binds original tag/commit, implementation commit, bundle hashes, archive SHA256/SHA512, commands and evidence. Intermediate raw packs are not the install deliverables.
- Final upstream documentation sync: **43 passed, 0 failed**, after source-equivalent type references, real catalog links, graphs and historical-format facts were regenerated. Native style: 0 errors/warnings; referenced TypeScript projects and five emitted bundles built successfully; all five candidate archive checksums verified.
- The source documentation supplement also changes the generated `tool-cordis` API-reference table (recovery type/event signature metadata only). It does not add a recovery execution dependency or require a sixth companion runtime owner; the five package manifest is the operational patch set.
- Reproduce from the isolated native clone: `pnpm exec tsc -b packages/typert/generator packages/core/agent-loop packages/llm/llm-retry packages/goal/goal --pretty false`, then `pnpm exec tsdown --config-loader native --config scripts/native-recovery-candidate.tsdown.config.ts`. The preserved packaging transformer is [package-native-recovery.py](</tmp/dsh-native-recovery-050/.artifacts/package-native-recovery.py>); it rewrites only candidate manifest/version metadata, sets private/unofficial provenance, and leaves the verified bundled JS bytes unchanged.
- Remaining parent gates: independently import/install emitted candidates in a disposable copied host; real Extras HTTP owner/origin and browser slot acceptance; external allNativeWakeAdmission intent compatibility; candidate-profile backup/rollback and existing compaction/Goal-owner fingerprint authorization. No native emitted-host/browser/deployment coverage is claimed by the source tests.

## Standing-order architecture and recorded SDK supplement

Recorded-SDK supplement commit: `795c3609021b179f7f72e4b97036fdb41914e5c4`; final fixture-home isolation tip: `2ab0126bd337b6649fff9e3a9da8aa0ff7d20d19`. The TypeScript scenario explicitly binds HOME, USERPROFILE and XDG config/cache beneath its disposable DSH_HOME; an additional [isolated-home replay](</tmp/native-recovery-sdk-home-isolation.log>) passed with unchanged goldens. It changes only bilingual architecture ownership/pairing, the real recorded-session scenario and SDK fixture/harness/expected-output consumers. Runtime `2121312aacce481d2970ae582fdfc9a3056039ca`, the runtime patch, all five tgz bytes and all five emitted JS fingerprints remain unchanged.

- [Architecture recovery flow](</tmp/dsh-native-recovery-050/docs/architecture.md#recovery-flow>) and [Chinese flow](</tmp/dsh-native-recovery-050/docs/architecture.zh.md#recovery-flow>) link the genuine native owner. Pairing, unchanged documentation budgets and documentation owner tests passed (21 tests). Full [documentation synchronization](</tmp/native-recovery-supplement-doc-sync.log>) passed all 43 gates again.
- The canonical [native recording](</tmp/dsh-native-recovery-050/snapshots/sdk/terminal-request-recovery/session.v4.jsonl>) is genuine current-writer output from the shipped CLI/sdk profile: one todo completes, two SERVER attempts exhaust finite maxRetries=1, request/failure precedes a real error turn/end, then a separate explicit bearer-protected ephemeral-loopback fixture operation calls public Agent.recovery. Native recovery links attempt seq 23 and terminal seq 26 and completes with TERMINAL_RECOVERY_OK. There is one completed tool and one real human input across both activities. All four captured model requests prove full raw equality for failed request, finite retry and explicit recovery at indexes 1/2/3.
- Both SDKs consume the real stdio event stream. The [TypeScript notification golden](</tmp/dsh-native-recovery-050/snapshots/sdk/terminal-request-recovery/notifications.expected.jsonl>) and [Python consumer golden](</tmp/dsh-native-recovery-050/scripts/snapshots/python-sdk-single-exe/terminal-request-recovery/result.json>) retain that boundary. There is no invented SDK retry method, second synthetic Session.run, idle-triggered automatic retry, command event bypass or whole-turn replay. An ordinary slash command cannot serve as the operation carrier: its legitimate command/run event invalidates the exact-request fence.
- [Official SDK refresh](</tmp/native-recovery-sdk-refresh.log>) and [clean replay](</tmp/native-recovery-sdk-replay.log>) passed. [Adjacent SDK cases](</tmp/native-recovery-sdk-regression.log>) passed 3/3; [official corpus policy](</tmp/native-recovery-sdk-corpus.log>) passed 3/3. [Python refresh](</tmp/native-recovery-python-refresh.log>) and [clean replay](</tmp/native-recovery-python-replay.log>) passed; [Python owner/regression tests](</tmp/native-recovery-python-owner-tests.log>) passed 133/133. [Supplemental lint](</tmp/native-recovery-supplement-lint.log>) exited 0 with 0 errors and one unused-disable warning in an unrelated, unmodified source file.
- Python uses the official source CLI via a generic launcher of its standard tsx loader, bin.ts, sdk-source patch and TSX_TSCONFIG_PATH. This is not an installed-wheel/standalone-runtime test. Installed-wheel loading of the test-support replay package and the full Python all-scenarios branch remain explicitly unverified; registering this case in all is not a pass receipt for that branch.
- An initial hand-authored bootstrap omitted step/end, causing replay startup to fail validation; one diagnostic invocation reached an adapter with a harness sentinel credential and failed authentication. That failure is not keyless success evidence, and no real credential or paid model output was used. Final fixtures use a dedicated replay-only route, explicit disables for both live adapters/inventory, and a public catalog guard, preventing live fallback even when setup fails. Raw authentication output and diagnostic dumps remain excluded from the public companion.

## Updated public companion source distribution

The [licensed unofficial companion bundle](</tmp/dsh-native-recovery-candidate/dsh-native-recovery-companion-0.2.2-rc.1-native-recovery.0.tar.gz>) now contains exactly 35 allowlisted regular files: five unchanged private tgz packages, immutable [runtime source patch](</tmp/dsh-native-recovery-candidate/source.patch>), updated [reference/docs/SDK supplement patch](</tmp/dsh-native-recovery-candidate/reference-docs.patch>), original [MIT license](</tmp/dsh-native-recovery-candidate/LICENSE>), [nonofficial reconstruction instructions](</tmp/dsh-native-recovery-candidate/README.md>), metadata-only packaging helper, [manifest](</tmp/dsh-native-recovery-candidate/manifest.json>), [checksums](</tmp/dsh-native-recovery-candidate/SHA256SUMS>) and 23 evidence files. The reference patch carries the reference/catalog, recorded-SDK and fixture-home supplements after the frozen runtime commit and passed a temporary-index apply check against that exact implementation tree. The older two-commit aggregate patch is retained only as a historical initial receipt; current reconstruction uses the runtime plus updated reference patch.

- Public bundle SHA256: `c49d972192de304eae35deb9f5d520446af7b0b6ddcc42ba15c0faad3482a6ec`.
- Runtime source patch SHA256 remains `669096a94cd29c27c8dcc3de1002292bdb10d6f8a1664c2f61a59608d90948cb`.
- Updated reference patch SHA256: `30b039153d1fc556179f09afceadfda3887824ca18c7bdc1138082fcdcba8b12`.
- [Final archive verification](</tmp/native-recovery-supplement-artifact-verification.log>) passed: 34 listed asset checksums, 35 exact allowlisted regular members, all five frozen tgz SHA256/SHA512 values and all five emitted-index hashes. No intermediate pack, node_modules/dependency tree, real profile, original user log, raw authentication response or private diagnostic dump is distributed. This remains an independent source/candidate delivery, not official publication, production installation, browser acceptance or external-policy authorization.
