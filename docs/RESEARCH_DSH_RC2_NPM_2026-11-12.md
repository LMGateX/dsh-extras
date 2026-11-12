# Published DSH 0.2.2-rc.2 recheck — 2026-11-12

## Decision and evidence boundary

**The exact public npm rc.2 packages now exist. The published Goal driver is byte-identical to the recorded canonical source-build driver; its lifecycle coordinates do not need widening.** The inspected npm contracts preserve the already-adapted Goal, native continuation, retry, immutable provenance and compaction semantics. No additional product-policy change is justified by this scoped audit. Published-host execution, six final Extras archives and isolated browser validation are separate release gates, not implied by static parity.

Research baseline: Extras commit `6ee5d387f04733cdaca0773a8376232bd12c8333`, dedicated `research-rc2-npm` worktree. Required [contributor contract](<../AGENTS.md>), [specification](<SPEC.md>), [architecture](<ARCHITECTURE.md>) and [rc.2 contract](<DSH_RC2_060.md>) were read before writing. This lane owns only this new report; it performed no implementation, install, rebuild, host launch, live GUI access, production profile change, push, publication or GitHub Actions operation.

The parent supplied one completed disposable public npm installation. Its [wrapper manifest](</tmp/extras-npm-rc2.u5jBk0/host/package.json>) pins only `@deepseek-ai/dsh@0.2.2-rc.2`; the [install log](</tmp/extras-npm-rc2.u5jBk0/host-install.log>) records 669 packages. The parent reported successful `--ignore-scripts` installation and isolated CLI/config probes; **those are parent-reported execution, not tests executed by this research lane**. This lane independently read installed manifests, emitted JavaScript, published TypeScript/declarations and npm's cached binary archives; it executed only read-only hashing/archive commands plus scoped Git/report operations.

The previously supplied full checkout at `/tmp/extras-rc2-host.SCmVMY/source` was absent at the initial read. No replacement clone, build or piecemeal GitHub source download was made. Parent explicitly approved using npm's own shipped source plus the committed [historical integration report](<RESEARCH_DSH_RC2_INTEGRATION_2026-11-11.md>), [historical Goal report](<RESEARCH_DSH_RC2_GOAL_2026-11-11.md>) and [driver provenance](<../src/modules/goal-wait/driver/provenance.json#L69-L86>). Accordingly, references to the old official commit are **recorded historical identity plus newly observed scoped hash matches**, not a claim to have re-read a currently available full checkout.

## 1. First-party registry observations

Exact manifest URLs below were independently fetched from the official public registry with HTTP 200 on 2026-11-12, during this research session. The [full DSH registry document](<https://registry.npmjs.org/@deepseek-ai%2Fdsh>) reports rc.2 publication at **2026-11-12T02:16:12.076Z**, with `next=0.2.2-rc.2`, `latest=0.2.2-rc.1`, `alpha=0.2.2-alpha.3`. These mutable tags are observations, not the compatibility selector. The parent’s earlier [exact npm-view receipt](</tmp/extras-npm-rc2.u5jBk0/dsh-metadata.json>) agrees on DSH version, tarball, SHA-1 and SRI.

All DSH feature packages in this table resolve to **0.2.2-rc.2**; framework rows use the indicated exact versions. Every checked exact manifest omits `gitHead`. Repository metadata identifies the upstream project, but **does not cryptographically tie the publication to a Git commit**. No npm signature/provenance-attestation verification is claimed.

| Exact official metadata | Version | Registry SHA-1 (tarball) |
| --- | --- | --- |
| [DSH CLI](<https://registry.npmjs.org/@deepseek-ai%2Fdsh/0.2.2-rc.2>) | 0.2.2-rc.2 | `ff003ca75f37975c40b800fb925df70b38841fd4` |
| [Goal round driver](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-goal-round-driver/0.2.2-rc.2>) | 0.2.2-rc.2 | `56ba55aee98b277c8cba7836c0150b4782267ec3` |
| [Agent](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-agent/0.2.2-rc.2>) | 0.2.2-rc.2 | `196f4b75efd9878726d9e9ffc0c06cd025eabdff` |
| [Subagent](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-subagent/0.2.2-rc.2>) | 0.2.2-rc.2 | `1783d6d0bea34ea5733c68a4fe1f037084c3515b` |
| [LLM](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-llm/0.2.2-rc.2>) | 0.2.2-rc.2 | `9da2b2eef8e123f1072a654bb76d1f8cfbd2ce1a` |
| [Native retry executor](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-llm-retry/0.2.2-rc.2>) | 0.2.2-rc.2 | `e1987549dbd792d8ae03654a9920d8297772fdab` |
| [Goal service](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-goal/0.2.2-rc.2>) | 0.2.2-rc.2 | `bc5c0ce38ae6fe66e5f818d5c97256020022b6ce` |
| [Compaction service](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-compaction/0.2.2-rc.2>) | 0.2.2-rc.2 | `926be34af2b541622d33ca9de316c58a9f8bb8eb` |
| [Basic compaction](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-compaction-basic/0.2.2-rc.2>) | 0.2.2-rc.2 | `eaeef76880aef930b6a1c6fe5c79be5824bc30ea` |
| [Session query](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-session-query/0.2.2-rc.2>) | 0.2.2-rc.2 | `ce593cd7600c538c4442eaecf336ef835796f03b` |
| [Web app bundle](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-web-app/0.2.2-rc.2>) | 0.2.2-rc.2 | `3e99d60e215591a75fd8d46695a07dcf409c7fd6` |
| [PTC workflow](<https://registry.npmjs.org/@deepseek-ai%2Fdsh-workflow-ptc/0.2.2-rc.2>) | 0.2.2-rc.2 | `6f14d393d83cc9ac51868f8a7ff17643b36ad3d6` |
| [Cordis](<https://registry.npmjs.org/@deepseek-ai%2Fcordis/4.1.0>) | 4.1.0 | `c4c62a252d8042cea30360c6a90368f3241e23c7` |
| [Loader](<https://registry.npmjs.org/@deepseek-ai%2Fcordis-plugin-loader/1.1.0>) | 1.1.0 | `15e25f16548fb0f23d80a4e324e7b753fae82d0a` |
| [Schemastery](<https://registry.npmjs.org/@deepseek-ai%2Fschemastery/3.19.0>) | 3.19.0 | `4ad373641ffc80c5b0b800422d8029981ef19a0b` |

### Independently verified archive bytes, not just metadata

The parent’s npm content-addressed cache already retained the actual downloaded gzip archives. This lane read those existing files, recomputed SHA-512 SRI and SHA-1, and compared both to the independently fetched exact registry manifests. **Both archives match.** No second download or installation was needed. The [isolated lock’s Goal entry](</tmp/extras-npm-rc2.u5jBk0/host/package-lock.json#L3230-L3247>) independently records the same URL/SRI.

| Package | Official tarball | Actual bytes | Computed archive SHA-256 |
| --- | --- | ---: | --- |
| DSH | [dsh-0.2.2-rc.2.tgz](<https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.2.tgz>) | 2,197,456 | `ce895e273bd76b63ce7285fcb018ce44000d3304d251ec3dfa83ee473a8f24ea` |
| Goal driver | [dsh-goal-round-driver-0.2.2-rc.2.tgz](<https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-rc.2.tgz>) | 24,205 | `59513f8cc3ee4e1dbee4c500987baa2b194d4eb05e5b4679efe38dc32bdbfdbb` |

Verified DSH SRI: `sha512-J727r2C471x2cYXGjqZ0D9T1ZyaYQDFH/Ynx8iq+85oslM4nky5YTBnbAuTtxMhW7nhY8wuAEfjjFCQ+K6Swgw==`.

Verified Goal SRI: `sha512-EJEm/Ub72TBXnrFod5PCp0fLkloantPaJzp+Zn8GvayZoM1kFTrg+EZiUxbU1dfMi/vg/rj91/MvV3jzuvJg5w==`.

Actual cached [DSH archive](</tmp/extras-npm-rc2.u5jBk0/cache/npm/_cacache/content-v2/sha512/27/bd/bbaf60b8ef5c767185c68ea6740fd4f5672698403147fd89f1f22abef39a2c94ce27932e584c19db02e4edc4c856ee7858f30b8011f8e314243e2ba4b083>) and [Goal archive](</tmp/extras-npm-rc2.u5jBk0/cache/npm/_cacache/content-v2/sha512/10/91/26fd46fbd930579eb1687793c2a747cb925a1a9ed3da273a7e667f06bdac99a0cd64153ae0f846625316d4d5d7cc8bfbe0feb8fdd7f32f5778f3baf260e7>) are disposable evidence, not release assets. Other rows above are directly observed registry metadata plus selected installed-byte inspection, **not independently rehashed whole tarballs**.

## 2. Goal artifact and source correspondence

The installed [Goal manifest](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/package.json#L1-L40>) declares exact rc.2, MIT, repository directory `packages/goal/goal-round-driver`, root JavaScript export, declarations and published source subpath. Installed physical paths resolve inside the supplied disposable npm tree, not the production installation or old source checkout.

| Newly hashed published file | SHA-256 | Comparison with committed historical evidence |
| --- | --- | --- |
| [Goal emitted entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js>) | `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c` | Exact match to the canonical official-tag source build recorded in [adaptation evidence](<GOAL_RC2_ADAPTATION.md#L7-L10>) and [provenance](<../src/modules/goal-wait/driver/provenance.json#L69-L86>) |
| [Goal shipped source](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/src/index.ts>) | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` | Exact recorded official commit source hash |
| [Goal shipped prompt](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/src/prompt.ts>) | `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` | Exact recorded official commit prompt hash |
| [Subagent shipped manager](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-subagent/src/manager.ts>) | `8488f36b734c946fdc577c6542205ab7c68f82df413e607427108060393532a5` | Exact [historical Goal report](<RESEARCH_DSH_RC2_GOAL_2026-11-11.md#L29-L37>) hash |
| [Native retry shipped source](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm-retry/src/index.ts>) | `3e16b7603771fcf4476d7e07ae1fd2715bb5bfd8fa7afe6bcb431f02aa149c8e` | Exact [historical integration report](<RESEARCH_DSH_RC2_INTEGRATION_2026-11-11.md#L39-L50>) hash |
| [Compaction shipped service](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-compaction/src/index.ts>) | `1d50528c7daf5950e79d7edb2fabca48da6682fc536e911c9f64e4d0bdea4ba1` | Exact historical integration hash |
| [Basic shipped summarizer](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-compaction-basic/src/summarizer.ts>) | `4f16b70148ffc9042e51bba2b0a8f3b35da55fcaba28d0c8cbf36102c9eecc99` | Exact historical rc.2 integration hash |
| [Goal shipped service](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal/src/index.ts>) | `b3ea2930458f67afb97e7929b957e5859c42ee16fde95e3247734e3789e9c134` | Exact historical integration hash |

Hashing the driver entry streamed directly from the SRI-verified Goal archive also produces `8c56696e…48b0c`, matching the installed entry. Thus archive acquisition, installed driver and recorded canonical driver have the same scoped identity. This establishes strong **file-level correspondence** to recorded commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`; it is not a claim of whole-repository, whole-package or reproducible-build equivalence, and does not invent a missing registry `gitHead`.

### Exact lifecycle coordinates

The published [compiled disarm helper](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L91-L97>) calls native `goals.disarm` at **line 94**. Its [mount caller](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L357>) is **line 357**; its [unload caller](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L358-L375>) is **line 363**. These are the immediate native helper/caller coordinates already required by the [Extras observer](<../src/modules/goal-wait/authority.ts#L21-L28>). The entire admitted emitted file is identical, not merely three conveniently matching lines.

**No digest change, alternate coordinate branch, version-only admission or looser stack/timing heuristic is justified.** Keep exact artifact URL/digest, source-map refusal, foreign descriptor/owner refusal and same-value external-disarm revocation. Static coordinate inspection does not execute a V8 stack or Loader lifecycle; normal native handover/unload tests must still run on the published host.

## 3. Published semantic/API seam audit

### Goal/native tree work

The published [driver’s emitted join](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L128-L134>) uses `waitForTreeWork(agent)` and races unload. Published [Subagent declarations](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-subagent/lib/types/index.d.ts#L179-L185>) explicitly preserve root-only progression joining and nonblocking healthy parked inboxes. Actual [emitted manager](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-subagent/lib/index.js#L1420-L1454>) immediately returns false for ordinary members, joins root-scoped materializations/local work/external and closing results, and rechecks new arrivals. The unchanged native driver has no generic Jobs-service gate.

Consequence: retain the four existing strategies and defaults. Native-only progressing-tree coordination remains sufficient for users who need only that. Generic owned Jobs and activation’s stronger registered-descendant hold remain distinct Extras policy; do not remove Goal-wait or reintroduce a second all-resident subtree wait into replacement. This corroborates the [existing scoped adaptation](<GOAL_RC2_ADAPTATION.md#L7-L10>), not a new policy amendment.

### Native Continue generating versus exact checkpoint recovery

The actual [emitted prompt admission](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js#L889-L904>) enters maintenance, requires queue mode, eligible ending and no conflicting pending human input, then calls `followup(createUserMessage({content: [], source}))`. Its published [Remote source builder](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-api-session-controller/src/index.ts#L483-L491>) labels empty content `retry` and carries the request id. The published [durable eligibility projection](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-api-session-controller/src/continuation.ts#L8-L48>) accepts RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT/EMPTY_RESPONSE/STREAM_CLOSED after admitted human/retry work and a failed final-step attempt, **independently of automatic retry configuration**.

This remains normal follow-up/new preparation with a durable retry user message, not the immutable failed-request checkpoint protocol. No `dsh.request-recovery` or `recovery` text was found in published Agent JavaScript in this scoped search; absence of a string is supporting static evidence, not proof of all possible compositions. Keep strict optional capability detection in the [Extras recovery adapter](<../src/modules/retry/recovery.ts#L53-L65>), stock absent-protocol per-turn silence, native UI authority and no fallback to prompt/followup/replay. Do not ship/rebrand the rc.1 companion.

### Retry and failures

Published [provider policy source](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm/src/retry-policy.ts#L15-L54>) still specifies five retries after the initial request, bounded normal transient codes/backoff and provider-owned always mode. Published [native executor](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm-retry/src/index.ts#L1-L36>) explicitly owns execution, rejects a misplaced executor-level retryPolicy and matches the recorded source hash. The npm LLM emitted bundle retains the rc.2 permanent failure codes and receiver-scoped stream waterfall. No second Extras retry loop or reclassification of permanent native machine codes is justified; preserve the already-recorded [rc.2 retry adaptation](<RC2_RETRY_RECOVERY_EVIDENCE.md#L5-L11>) and exact Config/revision/leaf-write fences.

### Immutable provenance and Session publication

Published [child metadata](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-subagent/src/child-agent.ts#L121-L153>) still copies immutable parent header cwd, records direct `parentSession=parentHeader.id`, `origin=subagent`, seed status and delegation depth. This is not mutable runtime cwd or a live ownership token. Published [session query declarations](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-session-query/lib/types/index.d.ts#L41-L47>) retain exact live-or-prepared observation leases. The [Extras resolver](<../src/shared-compaction/workspace.ts#L11-L50>) already consumes these public durable facts and releases its observation; no private AgentRegistry ancestry substitute is warranted.

Published [Session batch append](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-session/src/index.ts#L858-L906>) validates/commits the whole batch before iterating individual `session/event` callbacks. Existing per-event Goal/client observers must not be rewritten to expect one aggregate event. Cold/manual model choices, ordinary human forks, root/member/deep distinctions and fail-closed unknown provenance still require executable tests, not just this source reading.

### Compaction and Chime

Published [summarizer](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-compaction-basic/src/summarizer.ts#L152-L164>) still calls native `llm.stream` with `purpose='compaction'`; [error conversion](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-compaction-basic/src/summarizer.ts#L196-L206>) uses `LlmError.fromFailure`. Actual [LLM emitted code](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm/lib/index.js#L2503-L2507>) retains receiver-scoped `llm/stream`. Matched service/summarizer source hashes support preserving native retention, summary routing, transaction and retry authority, one shared executor and clone-first optional reasoning policy; no new backend behavior change is identified.

Published [layout overlay contract](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-client-ui-layout/src/client/index.ts#L98-L107>) retains root `shell.overlay`, click-through layer and additive entry semantics; published sidebar still declares the root [footer action slot](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-client-ui-sidebar/src/client/contract/slots.ts#L75>). The current [Chime banner](<../client/chime.ts#L1603-L1615>) is fixed-position, not anchored-menu positioning. No menu-API rewrite is justified by these inspected seams. **This is not browser/audio/layout coverage**; packed client slot/service identity, ownership, locale/theme/narrow behavior and sound assets remain mandatory runtime gates.

## 4. Additional installed runtime entry receipts

These newly computed SHA-256 values identify exactly the installed bytes inspected; no historical emitted-byte match is claimed for these entries unless explicitly stated above.

| Published runtime entry | SHA-256 |
| --- | --- |
| [Subagent entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-subagent/lib/index.js>) | `47837c0cd3cd8259fbdd14b7a477f3df3f928946c5b9e261f35a883411ba3697` |
| [Session Controller entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-api-session-controller/lib/index.js>) | `c6ce8f8014d943c8f2dceaf7a9b184a56b2de757de6097938646549d2d2a9087` |
| [LLM entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm/lib/index.js>) | `6384b5f1e21404e997a41a31a22a079c9533f2ddc1ffd9148e684884ff62eb74` |
| [Native retry entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-llm-retry/lib/index.js>) | `7420d436d6f4d3c8cf61e8d783ea1962c371c5c8d8116d1655a1be0d095e0b66` |
| [Basic compaction entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-compaction-basic/lib/index.js>) | `e1a3019949d01b22baa91d6eb672d9559d76b97fb5bb45e0428715a316bf11d4` |
| [Session entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-session/lib/index.js>) | `d9911b5e1585bcb142d03ce46eb2990b3fc7c254de5a76d3ffb124bd2469216c` |
| [Session query entry](</tmp/extras-npm-rc2.u5jBk0/host/node_modules/@deepseek-ai/dsh-session-query/lib/index.js>) | `cd479b998f66e04639ec3e626fca706ce4f8aad40b75e983e549043ae9d0185b` |

## 5. Reproduction and remaining release work

Read-only commands executed successfully (exit 0): `sha256sum` over the exact installed files listed above; `readlink -f` on selected installed roots; a plain Node crypto program reading the existing two binary cache archives and comparing SHA-512/SHA-1 to the literal registry values; and `tar -xOf <verified Goal cache archive> package/lib/index.js | sha256sum` under `set -o pipefail`. The cache path derives from SHA-512 digest bytes: `content-v2/sha512/<first 2 hex>/<next 2 hex>/<remaining hex>`. UTF-8 sources/manifests were inspected via read/grep tools, not executed as host code. No behavioral test pass is claimed here.

1. Freeze new **0.6.0** provenance/provisioning wording against actual public npm artifacts before implementation, preserving exact runtime admission. Update source-build-only wording where it describes the new release; do not rewrite the historical **0.6.0-rc.1** preview as npm-certified or retag/replace its assets.
2. Use actual public registry dependencies/lock metadata and one physical Cordis graph; do not keep a required machine-local source-host checkout path, pretend SRI or production-host discovery fallback. Preserve fail-closed unknown driver/owner handling.
3. Execute the complete relevant typecheck, public native/Loader/migration/Goal/retry/provenance/compaction tests and six final packed native/browser/clean-consumer gates against this npm host. Source-file parity and old preview passes cannot waive these.
4. Finish independent Standards/Spec review, clean scoped commits, parent-controlled push/tag/release and remote asset checksum verification. No npm Extras publication, GitHub Actions, production DSH installation/restart or live GUI use is authorized by this report.

**Residual uncertainty:** the full original checkout is unavailable; registry `gitHead` is absent; no npm signing/attestation verification or whole-build reproducibility proof was performed; only the two selected cached tarballs received independent archive-integrity verification; no host/browser behavior ran in this lane. None prevents the scoped exact-driver correspondence conclusion, but none is silently converted into a release pass.
