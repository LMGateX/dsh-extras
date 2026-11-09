# Native recovery implementation — independent rc.1 companion

Status: native source implementation and offline interface tests; **not an official release, deployed host, or verified browser integration**. Design was recorded before implementation on 2026-11-09 Asia/Shanghai. Original installation and GUI remain untouched.

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

## Final native handoff receipt

- Implementation commit: `2121312aacce481d2970ae582fdfc9a3056039ca`. Reference/catalog supplement: `320b72c02a1bc8c98cdd66aa70ad26059c1a0bad`. Native clone working tree was clean after both scoped commits.
- [Reviewable two-commit source patch](</tmp/dsh-native-recovery-candidate/native-recovery.patch>), [candidate manifest](</tmp/dsh-native-recovery-candidate/manifest.json>) and [archive SHA256 sums](</tmp/dsh-native-recovery-candidate/SHA256SUMS>). Five top-level private/unofficial tgz packages are version `0.2.2-rc.1-native-recovery.0`; their inter-owner dependency/peer ranges use the same suffix. The manifest binds original tag/commit, implementation commit, bundle hashes, archive SHA256/SHA512, commands and evidence. Intermediate raw packs are not the install deliverables.
- Final upstream documentation sync: **43 passed, 0 failed**, after source-equivalent type references, real catalog links, graphs and historical-format facts were regenerated. Native style: 0 errors/warnings; referenced TypeScript projects and five emitted bundles built successfully; all five candidate archive checksums verified.
- The source documentation supplement also changes the generated `tool-cordis` API-reference table (recovery type/event signature metadata only). It does not add a recovery execution dependency or require a sixth companion runtime owner; the five package manifest is the operational patch set.
- Reproduce from the isolated native clone: `pnpm exec tsc -b packages/typert/generator packages/core/agent-loop packages/llm/llm-retry packages/goal/goal --pretty false`, then `pnpm exec tsdown --config-loader native --config scripts/native-recovery-candidate.tsdown.config.ts`. The preserved packaging transformer is [package-native-recovery.py](</tmp/dsh-native-recovery-050/.artifacts/package-native-recovery.py>); it rewrites only candidate manifest/version metadata, sets private/unofficial provenance, and leaves the verified bundled JS bytes unchanged.
- Remaining parent gates: independently import/install emitted candidates in a disposable copied host; real Extras HTTP owner/origin and browser slot acceptance; external allNativeWakeAdmission intent compatibility; candidate-profile backup/rollback and existing compaction/Goal-owner fingerprint authorization. No native emitted-host/browser/deployment coverage is claimed by the source tests.

## Public companion source distribution

[Licensed unofficial companion bundle](</tmp/dsh-native-recovery-candidate/dsh-native-recovery-companion-0.2.2-rc.1-native-recovery.0.tar.gz>) contains exactly 21 allowlisted members: five private native tgz packages, complete [runtime source.patch](</tmp/dsh-native-recovery-candidate/source.patch>), [reference supplement](</tmp/dsh-native-recovery-candidate/reference-docs.patch>), original [MIT LICENSE](</tmp/dsh-native-recovery-candidate/LICENSE>), explicit [nonofficial README/rebuild instructions](</tmp/dsh-native-recovery-candidate/README.md>), metadata-only packaging helper, manifest/checksums and nine offline evidence files. No raw intermediate packs, dependency tree, node_modules, profile or original user log is included. The patch was checked with a temporary Git index loaded from the exact official baseline, so reproduction does not depend on access to a local-only commit object.

- Public bundle SHA256: `436d5350af365dda32f664446f0933d77fd39837b421765ac2ba61e79c063e67`.
- Runtime source.patch SHA256: `669096a94cd29c27c8dcc3de1002292bdb10d6f8a1664c2f61a59608d90948cb`.
- All 20 listed asset checksums plus the separate bundle checksum were verified successfully. This distributes the source and offline candidate, not an official release or authorization to install it into a live profile.
