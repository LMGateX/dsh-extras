# DSH v0.2.2-rc.2: Goal-wait necessity and adaptation research

Date: 2026-11-11 (Asia/Shanghai). Research baseline: Extras commit `58a3acd42ff9712454cdcf1151ae4492d447d180`. Research only: no implementation, dependency install, host execution, live GUI access, real HOME/DSH_HOME/profile mutation, push or release was performed in this lane. Downloads/extraction were confined to a disposable `/tmp/dsh-rc2-research.*` directory. Source inspection is not native integration or browser coverage.

## Executive recommendation

**Do not remove Goal-wait solely because rc.2 fixes repeated PTC subagent waits. Do not call Goal-wait universally necessary either.** Native rc.2 already postpones a tree root's goal rounds while its managed subagent tree is progressing, including external execution/cleanup and materialization. For users needing only that native behavior, Extras' `native` strategy (or a disabled module with stock driver available) is sufficient. Native goal continuation does **not** add a generic owned-Job wait; that is still distinct useful Extras policy. Conventional `activation` additionally waits for registered live descendant Agents, including parked/idle residents, which is stronger than native progression and can intentionally or unexpectedly hold longer. `replacement` adds Job eligibility without changing activation during ordinary waiting, but carries exact-host port and ownership maintenance costs. Preserve the four strategies and current default unless an explicitly approved contract changes them. [Native driver][driver] [native tree join][manager] [Extras strategy contract](<LEGACY_PARITY_030.md#L11-L30>)

**Published-artifact gate remains open:** the official rc.2 tag exists, but at the timestamp below the exact public npm package endpoints and direct DSH tarball returned HTTP 404. No rc.2 npm integrity or compiled-driver hash can honestly be recorded yet. A locally built official tag can support source/build validation, not a claim to have validated an npm-published rc.2 artifact.

## 1. Exact official release identity and artifact evidence

The official [tag reference API][tag-api] reports `refs/tags/dsh-v0.2.2-rc.2` as a direct commit reference to **ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c**; `git ls-remote` independently returned the same hash. It is not an inferred master HEAD. The official [release API][release-api] says immutable, prerelease, published `2026-11-11T11:33:06Z`, with no attached release assets. Its [release notes][release] mention the repeated PTC wait fix, named/multilevel subagents and other migration-sensitive changes; prose alone does not prove Goal-wait parity.

Observed at **2026-11-11T12:25:25Z** (20:25:25 Asia/Shanghai):

| Official endpoint | Observation |
| --- | --- |
| [Exact DSH rc.2 npm metadata][npm-dsh] | HTTP 404 |
| [Exact Goal driver rc.2 npm metadata][npm-driver] | HTTP 404 |
| [Exact Subagent rc.2 npm metadata][npm-subagent] | HTTP 404 |
| [Direct DSH rc.2 tarball][npm-tarball] | HTTP 404 during earlier same-session check |
| [Full DSH registry metadata][npm-all] | Available versions through rc.1; latest and next both rc.1 at observation |

These are time-bounded observations, not a prediction of future publication. A 404 response body is **not** an npm artifact and must not be hashed/relabelled as one. rc.2 `dist.integrity`, `dist.shasum`, tarball SHA-256 and compiled `lib/index.js` fingerprints are **unavailable/unverified** in this research. Retry exact metadata and tarball acquisition before any published compatibility/release claim; verify downloaded bytes against registry integrity, then audit the actual compiled driver and lifecycle frames.

The [immutable GitHub source archive][source-archive] was downloaded and extracted without running it. Archive SHA-256: `b5087b0cb4f88ed508ae0ecffec4eec55ab8ffbe51ad6a2e2e2d81f90517ea49`. This is a source-archive identity, **not npm integrity**. Individual UTF-8 source SHA-256 values are stronger scoped evidence for this audit:

| rc.2 source | SHA-256 |
| --- | --- |
| [Goal driver source][driver] | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` |
| [Goal prompt source][prompt] | `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` |
| [Subagent manager source][manager] | `8488f36b734c946fdc577c6542205ab7c68f82df413e607427108060393532a5` |
| [PTC/inbox wait source][wait] | `cd945b9c8d9f90ae93925b6c088994855cd1791f3a3a2f9d9352aecc4d3d1874` |
| [Loader Entry source][entry] | `650e4e1f3015bcca63c5a3474310f87a418add6249d9939d173a2b79f2ee7d9b` |
| [HMR source][hmr] | `c33b89cb193eb904c6213c3d8bc6ee81c9f2990cbb093f578ef5f474b467644c` |
| [App-boot source][app-boot] | `5c421f2880870f3ce0cfa637814941715b6eb5cb7d3fab081e9daaffb4b47c9f` |

For comparison only, the **published rc.1 Goal driver** [registry metadata][npm-driver-rc1] and [tarball][npm-driver-rc1-tgz] were fetched/extracted in the same disposable directory. Computed SHA-512 matched `sha512-MF21SC+hBYd7xGj/lc8c4zeZzB8i5IBWBzFmhKSWx0qzBFASiiMkKiOtpDXNsiNFhNsLPnOgFDD5AzLA8fnGcg==`; registry SHA-1 is `941cafe3876f93748b0c3f53f4e4352ae257b8b2`. Tarball SHA-256: `bb11c51ca2b1865dd049849d48ce2ff9d1fe36930ab7fc932c42b7c042b02583`. Extracted compiled entry SHA-256: `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de`, confirming Extras' existing rc.1 pin. **None of those rc.1 hashes is an rc.2 proof.**

## 2. Native goal continuation: what changed, what did not

A full text comparison between the [rc.1 tagged driver source][driver-rc1] (commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`) and [rc.2 driver source][driver] found exactly one changed line, line 179:

```diff
- await Promise.race([subagents.waitForChildren(agent), unloading.promise])
+ await Promise.race([subagents.waitForTreeWork(agent), unloading.promise])
```

Both tagged source files contain 484 lines. rc.1 source SHA-256 was `174b258ea900f071653ec78b337428973b51c5e6a7436c25dd7ec08d210d352a`. The prompt source compared byte-identical. The Session `UserMessage` type import already exists in rc.1 tagged source; its appearance relative to Extras' typed port is not by itself a new rc.2 behavioral change. Compiled npm equivalence cannot be inferred from this source delta.

Unchanged native scheduling contracts, read directly from [the driver][driver] and [its package reference][driver-doc]:

- Lines 99–121: require the exact live Agent, whole-agent idle, active plugin, no competing queued input, and active **armed** goal.
- Lines 145–188: flush owed durable checkpoints, recheck after awaits, settle prior attempt housekeeping, join native progressing tree work, recheck again, then apply round cap. There is no jobs service import/read/subscription anywhere in the driver. A running shell/terminal Job is not a child activation merely because it is background work.
- Lines 190–220 and 371–451: reserve one goal/id/revision/round/message identity; check the full reservation both before and after downstream pre-step listeners. The admitted goal message owns durable round accounting; stale attempts cannot consume another round.
- Lines 274–337, 348–365: retain cancellation, queued-message retirement and phase fences. User/parent/hook cancellation differs from Agent disposal: disposal disarms while preserving active durable phase. Errors/max-token endings disarm; cap exhaustion blocks.
- Lines 454–480: mounting over existing Agents disarms instead of inheriting authority; unload closes scheduling, disarms/cancels owned rounds and drains while fences remain installed. Resume/fork does not itself grant automatic authority.

### The renamed join is a real tree-root contract change

This is not just a spelling update. [rc.1 manager lines 248–288][manager-rc1] joined descendants of an arbitrary parent using lineage/ancestry. [rc.2 manager lines 247–282][manager] immediately returns `false` unless `rootOf(root) === root`, then selects materializations/residents by the shared tree root. The public [service lines 345–352][subagent-api] explicitly says ordinary members do not wait for descendants. Do not introduce a replacement parent-chain join to make rc.2 behave like rc.1; that would silently override native team/tree coordination.

For a real tree root, native joining includes pending materializations, all-depth local progressing activity, external activations, closing/result cleanup and arrivals during an awaited check. Idle local members with healthy parked pending inboxes are intentionally left resident without blocking completion. Terminal/failed results are not enough if cleanup is still closing. The [parked-wait tests][parked-tests] cover revived siblings, unpublished grandchildren, cleanup and children arriving during an earlier idle observation; the [driver tests][driver-tests] cover descendant settling, ordinary human work arriving during the join, pause during wait and unload. These are inspected upstream test intents, **not tests executed here**.

## 3. Why the repeated PTC wait fix is independent

The [release notes][release] say repeated PTC waits no longer repeatedly wake on the same child message. The owning implementation is [`wait_agent`][wait], not Goal driver scheduling: a WeakMap keys the exact Agent to the latest `rootCallId` and reported message-id set; repeated waits in one model tool call ignore already reported pending input, do not consume the inbox, and allow genuinely new input to wake. A different model tool call may report that pending input again. Timers, disposal, cancellation and unload remove listeners/resources. [Owning regression tests lines 80–121][wait-tests] separately assert different-call visibility, same-call non-repetition, genuinely new input and timeout.

That fix neither reads goal phase/activation nor waits for generic Jobs, and does not authorize replacing/disarming a continuation owner. A successful PTC wait regression therefore proves neither generic Job gating nor Extras' ownership/activation invariants. Test these as separate seams.

## 4. Extras strategy comparison and necessity

The baseline [SPEC](<SPEC.md#L23-L29>), [architecture](<ARCHITECTURE.md#L7-L9>), [migration](<MIGRATION.md#L13-L15>) and [fixed parity contract](<LEGACY_PARITY_030.md#L11-L41>) remain the authority; this research is not an approval to change defaults or remove a mode.

| Choice | Continuation owner and wait | Necessity / cost on rc.2 |
| --- | --- | --- |
| Module disabled | No Extras gate/port; stock native driver available again | Sufficient for native-only progression semantics. Not equivalent to enabled `off`. |
| `native` | Official driver, no Extras gate | Sufficient when native root-tree join is all the user needs. Does not add generic Job wait. |
| `activation` (current default) | Official driver plus conventional process-local owned disarm/resume hold for configured Jobs/registered descendants | Still adds Job and conservative live-registration policy, but parked/idle residents can hold. Same-value external-disarm overlap remains observationally ambiguous. |
| `replacement` | Exact native-derived driver with additive background eligibility; native join delegated to host, no second all-resident hold | Useful for Job waiting without ordinary activation toggles. Must port exact rc.2 join API/semantics and re-audit artifacts, Loader ownership and frame-sensitive restoration. |
| `off` | Extras temporarily suppresses stock automatic continuation, mounts no replacement | Intentional no-auto policy, not a disabled module. Requires safe stock restoration on disable. |

Defaults remain `activation`, `waitForJobs=true`, `waitForSubagents=true`, `maxHoldMs=0`. The [activation work observer](<../src/modules/goal-wait/live-work.ts#L25-L46>) counts registered `origin=subagent` Agents by parent chain, not just currently running work, excluding ordinary forks. Its [Job observer](<../src/modules/goal-wait/live-work.ts#L76-L120>) counts exact session owner and `running/stopping`, not retained terminal records. This is not the collaboration instrument's running-descendant S count.

The [replacement policy](<../src/modules/goal-wait/driver/background-work.ts#L11-L23>) deliberately delegates descendant progression to the native join on supported profiles. `waitForSubagents=false` does **not** disable native joining; `maxHoldMs` is the activation timer, not a replacement timeout. [Job filtering](<../src/modules/goal-wait/driver/background-work.ts#L85-L123>) still counts `kind=subagent` Jobs when generic Job waiting is off but subagent waiting is on. Policy sampling is before reservation and at pre-step fences, **not atomic request-commit admission**. Preserve truthful UI/status descriptions of these limitations.

Recommendation: retain the feature and four modes for compatibility; explain native-only as a sufficient option for native descendant progression, retain generic Job wait as the clearest nonredundant value, and present activation's stronger resident policy/authority ambiguity honestly. Do not silently change all users to native, replacement or off. Removing activation or changing its default would need an evidence-based approved amendment and migration behavior, not this research alone.

## 5. Gate-sensitive adaptation inventory (before code)

1. [Host version proof](<../src/modules/goal-wait/driver/host-version.ts#L16-L45>) pins Node >=24.9, Cordis 4.1.0, participating DSH packages rc.1 and compiled driver hash. [Mode refresh](<../src/modules/goal-wait/mode.ts#L75-L91>) uses it for **every strategy**, not only replacement. Conditional subagent package identities must be checked against actual rc.2 composition.
2. [Runtime owner proof](<../src/modules/goal-wait/host-owner.ts#L223-L245>) independently pins the Goal artifact, Cordis/Loader, exact callback/Loader entry and fiber association. [Migration owner proof](<../src/migration/native-owner.ts#L29-L60>) is a third independent identity gate. A peer-range edit cannot fix them safely. The rc.2 source still declares [Cordis 4.1.0][cordis-manifest] and [Loader 1.1.0][loader-manifest]; version equality alone does not certify lifecycle behavior.
3. [Transition authority observer](<../src/modules/goal-wait/authority.ts#L21-L51>) recognizes exact compiled-artifact stack positions `:94:` with immediate caller `:357:` or `:363:`, rejects source-mapped/unknown shapes, and CAS-restores only its own descriptor. These are rc.1 compiled coordinates, **not** rc.2 source coordinates or an activation owner token. Recompute from actual admitted artifact and test normal preservation plus external same-value revocation; never broaden to a timing window.
4. Runtime-only stock suppression depends on [Loader effective-disabled getter][entry] (lines 75–94), [app-boot disabled-before-inactive checks][app-boot] (1062–1103), and [HMR fiber/entry rebinding][hmr] (683–689). The exact owned speculative candidate may be detached; foreign/active fibers and durable options must never be rewritten. Source hashes above identify audited files, not a compiled/runtime proof.
5. Port `waitForChildren` to native `waitForTreeWork` with provenance, preserving root-only semantics, prompt bytes, round/revision checks, queued retirement, unload race and native cancellation. Keep generic Job eligibility as a separate policy. No rc.1 hash reuse or unverified rc.2 hardcoded digest.
6. Preserve offline missing-owner-proof refusal, experimental startup-owner refusal, enabled/disabled versus off, no transient hold migration, and stock restoration without persistent disable. See [migration boundary](<MIGRATION.md#L13-L49>) and [parity authority contract](<LEGACY_PARITY_030.md#L19-L30>).

## 6. Required validation plan; no implementation tests claimed

Existing [MOD-4/LIFE/MIG/HOST/SAFE acceptance](<ACCEPTANCE.md#L34-L47>), [PAR-G1/G2/M1/P1](<LEGACY_PARITY_030.md#L64-L73>) and the [exact-host audit rules](<DSH_RC1_040.md#L12-L23>) remain release gates. Add or rerun these against rc.2, distinguishing official-tag builds from published npm packages:

- **Artifact admission:** exact version plus actual compiled hash; altered bytes, wrong dependency/Loader identity, wrong install anchor, source maps/unknown frames and unmanaged/programmatic duplicate owners refuse without starting another owner. Once npm publishes, download/extract and verify registry integrity before clean-consumer tests.
- **Native necessity contrast:** armed idle root plus progressing direct child, grandchild, external child, pending materialization and closing cleanup defers goal round; idle healthy parked input does not. Ordinary tree member goal returns from native join rather than acquiring a fake subtree barrier. Human work/goal edit/pause/disarm during wait wins after the await.
- **Generic Job contrast:** stock/native can continue with a same-owner generic Job; activation/replacement configured to wait do not. Cover running→stopping→settled, retained terminal and foreign/unowned Jobs, quiet completion/no notice, pre-existing Jobs, exact one wake/round, and unchanged replacement activation/revision during normal wait.
- **Four modes/ownership:** all pairwise live switches, initial existing-Agent sweep, policy refresh without remount, module/row/bundle disable, delayed restore/foreign arrival, real native config saves, zero persistent disabled writes, cleanup failure/no double owner and exact same-goal revision preservation.
- **Authority:** completed/blocked/paused/replaced/external-disarmed goals never rearm. Test external same-value disarm both during transition and steady activation hold; retain the documented unobservable steady overlap limitation rather than claiming a new guarantee. Cancellation/disposal/unload/cap and stale inbox retirement retain native behavior.
- **PTC separately:** same root tool call cannot repeatedly wake on the same pending id; new id wakes, different call can observe still-pending input, inbox is not consumed; timeout/cancel/dispose/unload release resources. Passing this row is not Goal-wait acceptance.
- **Packaging/migration:** selected-only combined/split payloads, source/MIT provenance, exact artifact admission in packed consumers, both audited predecessor versions/strategies, disabled/off distinction, interrupted/foreign-owner handover and recovery. All installs/hosts require explicit disposable HOME/DSH_HOME/profile/cache paths and temporary ports, never the live GUI.

Executed research checks: read required contracts and goal source; official release/tag API reads; `git ls-remote`; HTTPS downloads/extraction to `/tmp`; rc.1/rc.2 tagged driver `diff`; prompt `cmp`; source and rc.1 tarball/compiled SHA-256; rc.1 registry SHA-512 byte verification; exact rc.2 metadata/direct-tarball 404 and full registry version inspection. A full rc.1 source-archive download stalled and was cancelled; the minimal immutable raw-source comparison and rc.1 published driver download succeeded afterward. No rc.2 host/unit/native/packed/browser execution is asserted. Published rc.2 npm evidence is the concrete remaining research limitation.

[release]: https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.2
[release-api]: https://api.github.com/repos/deepseek-ai/deepseek-harness/releases/tags/dsh-v0.2.2-rc.2
[tag-api]: https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/tags/dsh-v0.2.2-rc.2
[source-archive]: https://codeload.github.com/deepseek-ai/deepseek-harness/tar.gz/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c
[npm-dsh]: https://registry.npmjs.org/@deepseek-ai%2fdsh/0.2.2-rc.2
[npm-driver]: https://registry.npmjs.org/@deepseek-ai%2fdsh-goal-round-driver/0.2.2-rc.2
[npm-subagent]: https://registry.npmjs.org/@deepseek-ai%2fdsh-subagent/0.2.2-rc.2
[npm-tarball]: https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.2.tgz
[npm-all]: https://registry.npmjs.org/@deepseek-ai%2fdsh
[npm-driver-rc1]: https://registry.npmjs.org/@deepseek-ai%2fdsh-goal-round-driver/0.2.2-rc.1
[npm-driver-rc1-tgz]: https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-rc.1.tgz
[driver]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal-round-driver/src/index.ts
[prompt]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal-round-driver/src/prompt.ts
[driver-doc]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal-round-driver/README.md
[driver-tests]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal-round-driver/tests/goal-round-driver.spec.ts#L940-L1017
[driver-rc1]: https://github.com/deepseek-ai/deepseek-harness/blob/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db/packages/goal/goal-round-driver/src/index.ts
[manager]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/subagent/src/manager.ts#L247-L282
[manager-rc1]: https://github.com/deepseek-ai/deepseek-harness/blob/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db/packages/subagent/subagent/src/manager.ts#L248-L288
[subagent-api]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/subagent/src/index.ts#L345-L352
[parked-tests]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/subagent/tests/parked-wait.spec.ts
[wait]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/tool-subagent-control/src/wait-agent.ts
[wait-tests]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/tool-subagent-control/tests/wait-agent.spec.ts#L80-L121
[entry]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/loader/src/config/entry.ts
[hmr]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/boot/hmr/src/index.ts
[app-boot]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/boot/app-boot/src/index.ts
[cordis-manifest]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/cordis/package.json
[loader-manifest]: https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/loader/package.json
