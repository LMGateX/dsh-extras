# DSH 0.2.2-rc.4 integration research

Date: 2026-11-18 (Asia/Singapore). **Static source and published-artifact observation only; not a typecheck, native-host, browser, packed-consumer or release pass.** The companion [validation](<VALIDATION_RC4_071.md>) records actual execution.

## Decision summary

1. **The rc.4 source delta is a narrow bug-fix release.** One complete official clone resolves rc.3 to `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` and rc.4 to `3f321d32bfe382212a8ed8785c1d47a5a300aa23` (eight commits). Outside manifests, the implementation delta is the DeepSeek streamed-refusal translation to `CONTENT_REFUSED`, the matching `dsh-llm` failure-code entry, and an experimental LiveShare Electron worker-environment fix. Agent, LLM-retry, Session, compaction, Goal-round-driver, SessionController, workspace-controller, host-timezone target bundles and client-connection implementations have no changed non-manifest file in that tag diff.
2. **`CONTENT_REFUSED` is a new permanent machine outcome.** rc.4 reports a DeepSeek `stop_reason: "refusal"` as `CONTENT_REFUSED` instead of `MALFORMED_RESPONSE`. The new code has no `retryChoice` marker; native `llm-retry` only retries a code present in the resolved provider policy (`packages/llm/llm-retry/src/index.ts:212`), and the native Continue allowlist is unchanged (`packages/api/session-controller/src/continuation.ts:10`). Extras must therefore keep the refusal permanent when classifying stream failures and compaction retries; it must not remap it to `TRANSPORT` or repeat a refused summary request.
3. **The audited Goal and host-timezone bytes did not change.** Actual rc.4 npm archives differ from rc.3 only in `package.json` for `@deepseek-ai/dsh-goal-round-driver`, `@deepseek-ai/dsh-api-session-controller`, `@deepseek-ai/dsh-client-ui-schedule` and `@deepseek-ai/dsh-client-connection`. The compiled Goal driver digest `8c56696e…`, its shipped source/prompt hashes, and the three browser fingerprints stay valid. Exact version guards still move to rc.4; unknown versions and changed bytes continue to refuse.
4. **The remaining work is an exact-version refresh, not a feature port.** Development/runtime/owner/migration/retry/shared-compaction/host-timezone guards are deliberately exact and must all move together. Published 0.7.0 remains the rc.3 option; the rc.4 candidate is unreleased 0.7.1. No publication or production operation is authorized by the check contract.

## Contract and acquisition boundary

Read the [release specification](<SPEC.md>), [architecture](<ARCHITECTURE.md>), [migration contract](<MIGRATION.md>) and [acceptance matrix](<ACCEPTANCE.md>) first, then the [rc.4 check contract](<DSH_RC4_071.md>). The explicit task is a source acquisition and compatibility check; it does not authorize push, release, production installation, restart or live-GUI tests.

One complete Git clone was made to disposable `/tmp/extras-rc4.v42Q00/upstream`:

~~~sh
git clone --no-checkout https://github.com/deepseek-ai/deepseek-harness.git /tmp/extras-rc4.v42Q00/upstream
git -C /tmp/extras-rc4.v42Q00/upstream fetch --tags
git -C /tmp/extras-rc4.v42Q00/upstream checkout --detach dsh-v0.2.2-rc.4
~~~

The checkout is detached at `3f321d32bfe382212a8ed8785c1d47a5a300aa23` with empty tracked status. All source comparisons below use that local clone; no source build, linker or runtime mutation was performed. Actual npm archives were fetched separately with `npm pack`.

## Exact source delta

~~~sh
git -C /tmp/extras-rc4.v42Q00/upstream rev-list --count dsh-v0.2.2-rc.3..dsh-v0.2.2-rc.4
git -C /tmp/extras-rc4.v42Q00/upstream diff --name-only dsh-v0.2.2-rc.3..dsh-v0.2.2-rc.4
~~~

Eight commits. Every package manifest changes its version string. The non-manifest files are:

| Area | Changed files | Consumed by Extras? |
| --- | --- | --- |
| DeepSeek LLM adapter | `packages/llm/llm-deepseek/src/translate.ts`, READMEs, loader/stream tests | Yes, indirectly through stream failure code |
| LLM failure table | `packages/llm/llm/src/error.ts` | Yes, as the advertised failure-code namespace |
| Experimental LiveShare | `packages/experimental/liveshare/src/host/tunnel-worker.ts` and tests | No; Extras does not depend on it |
| Upgrade guide/snapshots | `docs/upgrade-guide/v0.2.2-rc.3/deepseek-refusal-code/*`, `snapshots/session/deepseek-content-refusal/*` | No runtime import; useful as behavior documentation |

The consumed source tree comparison returns no non-manifest diff:

~~~sh
git -C /tmp/extras-rc4.v42Q00/upstream diff --name-only \
  dsh-v0.2.2-rc.3..dsh-v0.2.2-rc.4 -- \
  packages/core packages/goal packages/compaction packages/api/session-controller \
  packages/api/workspace-controller packages/client/ui-schedule packages/client/connection \
  packages/llm/llm-retry vendor ':(exclude)**/package.json'
~~~

Empty output. This is tracked-source parity, not emitted-npm or complete-runtime authentication.

## Refusal semantics

`packages/llm/llm/src/error.ts:24` adds `CONTENT_REFUSED: {}`; `MALFORMED_RESPONSE` remains a retry choice at line 48. `packages/llm/llm-deepseek/src/translate.ts:90-94` builds a `LlmError` with the provider explanation, and lines 150-161 capture a `refusal` stop, report final usage, then throw instead of yielding a finish. The matching tests and the upgrade guide instruct consumers to handle the refusal path and tell the user the provider refused.

Extras' current classifier would otherwise allow an explicitly configured `CONTENT_REFUSED` entry to be remapped to `TRANSPORT`; the compaction tool would treat the refusal message as transient because it has no HTTP status and no deterministic code entry. Both are concrete consumed-seam regressions. The implementation adds the code to the retry `PROTECTED` set and to compaction's deterministic failure classification, with unit/integration regressions. No retry loop, synthetic message or provider dispatch is added.

## Published npm Goal and client artifacts

Actual rc.4 tarballs were downloaded into `/tmp/extras-rc4.v42Q00/npm/extract`; rc.3 tarballs into `rc3x`. File-by-file SHA-256 comparison of each package's extracted contents reports only `./package.json` differing.

| Artifact | rc.4 SHA-256 | Result |
| --- | --- | --- |
| Goal `lib/index.js` | `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c` | unchanged, admitted |
| Goal `src/index.ts` | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` | unchanged |
| Goal `src/prompt.ts` | `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` | unchanged |
| Session-controller `lib/client.js` | `e9af25a01168a8405730c107471cbd6befccfab3294e793b10e1467c57255852` | unchanged |
| Schedule `lib/client.js` | `b8dda300c8f835d825c8cbc23e56d66ffb4167d9c072f30468897611a9f34379` | unchanged |
| Connection `lib/client.browser.js` | `5f6107953fa764c80b6c06aa161be318ffa0b71e565ac81536fc4267d5d62412` | unchanged |

The rc.4 Goal archive SHA-256 is `97586255e0b6a8bda7813f2a1c360baad56f90cdfc5c2eadd5476cbcd455b8b7`, SRI `sha512-WyHncynJBVAdLwymd31rRoI9bMrEGzw6cob44v48A0TtueMmWC1m7TyfMVpyjf/Pv2WiHnyAF53Mbp15twej6g==`. Registry metadata again omits `gitHead`; byte equality is not presented as registry authentication of a Git revision.

## Exact guard inventory refreshed by this check

| Location | Role |
| --- | --- |
| `package.json`, `scripts/native-host.mjs` | candidate version, dev graph admission, Goal digest |
| `src/migration/native-owner.ts` | anchored native Goal owner version |
| `src/shared-compaction/runtime.ts` | shared compaction LLM/Cordis admission |
| `src/modules/goal-wait/driver/host-version.ts`, `host-owner.ts`, `provenance.json` | replacement driver exact artifact and provenance |
| `src/modules/retry/settings.ts` | native retry-settings contract |
| `src/modules/host-timezone/artifacts.ts`, `index.ts`, `NOTICE.txt` | served-artifact version and audited anchors |
| `client/host-timezone.ts`, `client/status.ts`, `client/retry-settings.ts` | client manifest admission, adapter status and user-facing runtime label |
| tests listed in the validation report | acceptance and previous/unknown refusal, unchanged digests/fingerprints, no mutation |

## Boundaries

The clone is tracked-source evidence; npm tarballs are separately observed published bytes. Neither proves arbitrary future native versions, third-party wrappers, emitted-JS equivalence for every unchanged source tree, or complete runtime behavior. The check does not certify the experimental LiveShare fix, does not adopt it, and does not change Extras feature policy, migration authority, native retry execution, native compaction/retention/routing or Goal continuation semantics. Historical rc.3 and earlier evidence remains historical.
