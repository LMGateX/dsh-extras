# Exact DSH 0.2.2-rc.2 integration research

Date: 2026-11-11 (Asia/Shanghai). Baseline: Extras 0.5.1, commit `58a3acd42ff9712454cdcf1151ae4492d447d180`. **Research only; this document is not an implementation approval or an integration pass.** The parent must freeze a compatibility amendment before implementation. No install, host process, browser, live profile, installed-host edit, push or release was performed in this research lane.

## Executive decision

1. **rc.2 is a real integration change, not a version-only bump.** Managed Subagent ownership replaces AgentRegistry tree ownership, the native Goal driver joins tree work, LLM/error/provider behavior evolves, Session.append gains batching, and client menu APIs change. Named hierarchy means **Subagents, not Goals**: the Goal service source is unchanged. [S3–S10, S14–S16]
2. **Stock “Continue generating” is not the Extras custom exact-request recovery protocol.** Stock submits an empty retry-source user message through native prompt/followup, starts normal preparation, and uses a fixed continuable-error allowlist. It does not expose a budget-exhausted, identity/revision-bound immutable-request checkpoint. Preserve the distinction; never relabel stock continuation as REC-1 or silently invoke it from the custom recovery route. [S4–S6; C3]
3. **At audit time rc.2 npm packages were unavailable.** Public npm returned HTTP 404 for exact dsh, dsh-agent, dsh-llm and dsh-subagent rc.2 at 2026-11-11T12:27:47Z. GitHub tag source can support a separately identified source-build validation, not a claim that an official published npm artifact was tested. No rc.2 archive integrity or emitted-driver digest is invented here. [R1–R6]
4. Core 4.1.0 / Loader and Include 1.1.0 / Schemastery 3.19.0 remain the tagged manifests. Their vendored trees are identical between the two tags except vendor-level documentation; retained owner/configuration proofs need **recertification**, not an imagined framework migration. Emitted hashes still require an actual coherent build/package comparison. [S1–S3; evidence table below]
5. Six selected-feature distributions remain the packaging contract. Do not overlay, rename or ship the frozen rc.1 unofficial recovery companion as rc.2 support. Its protocol may remain an optional capability only when a genuinely compatible host supplies it. [C1–C4]

## Scope, provenance and isolation

Read [AGENTS](../AGENTS.md), [specification](SPEC.md), [architecture](ARCHITECTURE.md), [migration](MIGRATION.md), [acceptance](ACCEPTANCE.md), [rc.1 contract](DSH_RC1_040.md), [compaction reasoning](COMPACTION_REASONING.md), [workspace policies](WORKSPACE_POLICY_050.md), [model policy](MODEL_POLICY_050.md), [recovery implementation](NATIVE_RECOVERY_IMPLEMENTATION.md), and [follow-up UI](UI_REFINEMENTS_050.md). Prior safety/behavior gates remain unless the parent records an explicit amendment.

Dedicated native-created worktree: branch `research-dsh-rc2-integration`. Official codeload archives were downloaded/extracted as inert data beneath `/tmp/extras-rc2-research.VqHII2`. Download shells set explicit disposable HOME, DSH_HOME, DSH_PROFILE, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME and npm_config_cache. No original repository, installed host or live GUI was inspected or mutated. A read-only fresh-context subagent inventoried local pins and assumptions; its initial speculation about named Goals was corrected against official source before inclusion here.

The configured web_fetch service failed with HTTP404; direct read-only HTTPS curl to official GitHub/npm was used instead. First combined metadata fetch stopped at npm's genuine version-not-found 404; endpoints were then checked individually. Source downloads completed successfully. An attempted nonexistent source path and a few malformed search patterns were corrected; none executed a host or changed a profile. Source diff commands deliberately normalize git diff's expected exit code 1 (differences) to success, while real command failures were investigated.

### Immutable identities

| Evidence | Identity |
| --- | --- |
| Official rc.2 tag | `dsh-v0.2.2-rc.2` → `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`; ref points directly to a commit [R1] |
| Official rc.1 tag baseline | `dsh-v0.2.2-rc.1` → `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db` [C2] |
| rc.2 release | Immutable prerelease, published 2026-11-11T11:33:06Z, no attached release assets at observation [R2] |
| rc.2 codeload source archive SHA256 | `d376fe64ec4b7c9b5837fb1155ed3a48e7e0e5f5b0aae0b91d9fb836daa8c20e` |
| rc.1 codeload source archive SHA256 | `416750920b64272899259c26b2fa0a4341132c9c19b43337da502ab7ebd599f1` |
| Published rc.1 CLI npm metadata | SHA1 `95d1cf510061a57c97b4a68d43336658bcec6af1`; SRI `sha512-ijR9UEVYkG15Q/Q79JzvzLBzQOQfc63VLr9n6flpwHPhr5IKn2UxthnSoto/P9l7qGd7pPvI1Ra6TW7LH3oKpg==` [R7] |
| rc.2 npm emitted artifact | **Not obtained: exact version absent** at audit time [R3–R6] |

These codeload hashes identify the downloaded source archives, not npm packages or emitted JS. The rc.1 npm SRI was reread from the registry and agrees with the repository lock baseline; this lane did not redownload/revalidate every old tarball. Prior published-artifact comparison remains separately documented in [rc.1 native research](RESEARCH_NATIVE_RC1_2026-11-07.md) and [recovery provenance](NATIVE_RECOVERY_IMPLEMENTATION.md).

### Direct source parity receipts

SHA256 below is for the **individual tagged TypeScript source file**, never a replacement for a runtime fingerprint. Whole vendor-tree diff reports only vendor README and removed historical plan changes.

| Tagged file | rc.1 SHA256 | rc.2 result |
| --- | --- | --- |
| Core Fiber | `b64c3a97f15f0381479dcf3d25965e56dc4cecfa4a0881fc055a49f65b9945df` | identical |
| Core reflection | `047f01fcdef2aa34b4afc39deaf18c16733fabd2a5ef0d55e5c2595b22caadfd` | identical |
| Loader Entry | `650e4e1f3015bcca63c5a3474310f87a418add6249d9939d173a2b79f2ee7d9b` | identical |
| Loader EntryTree | `dd856ead27ac9b81e88dd51b13753f138d7951cc6d6bf3e5cfcbe206281aa503` | identical |
| Include | `43ddf01220a45fbbe8c0fd64d5d4944fe42dedcd0862127d6ede1d6086b9d053` | identical |
| Native llm-retry index | `3e16b7603771fcf4476d7e07ae1fd2715bb5bfd8fa7afe6bcb431f02aa149c8e` | identical |
| Compaction service index | `1d50528c7daf5950e79d7edb2fabca48da6682fc536e911c9f64e4d0bdea4ba1` | identical |
| Goal service index | `b3ea2930458f67afb97e7929b957e5859c42ee16fde95e3247734e3789e9c134` | identical |
| Basic summarizer | `03ef6eb0b6a011530829820e30ff709c2c1b34cfa37a98c19c0037432b9d2f55` | `4f16b70148ffc9042e51bba2b0a8f3b35da55fcaba28d0c8cbf36102c9eecc99` |
| Native Goal driver | `174b258ea900f071653ec78b337428973b51c5e6a7436c25dd7ec08d210d352a` | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` |

## 1. Compaction and reasoning

The native compaction service and the summary route/retention control remain native. Basic summarizer's only TypeScript change is constructing the terminal error with `LlmError.fromFailure(finish.failure)` instead of its older constructor. It still dispatches the compaction-purpose auxiliary call; request routing is not transferred to Extras. LlmRuntime.stream(options) still delegates to streamWithRegistration and receiver-scoped llm/stream waterfall; prepared LOOP requests have separate authority. [S8–S10]

Required changes:

- Re-audit and update the exact LLM rc.1 guard in [shared runtime](../src/shared-compaction/runtime.ts#L15-L20), preserving Core4.1, constructor/prototype identity, native reflect store enumeration and synchronous service/read observers. A bare version edit is not evidence of complete instance coverage.
- Keep clone-first, only `purpose === 'compaction'`, exclude LOOP, preserve receiver/messages/tools/tool history/signal identities; capture accepted policy and exact durable session effort before awaits. Do not move reasoning into deprecated agent/request or independently resolve the route.
- Keep shared single executor/standby/handover and canonical profile-qualified native policy storage. No new canonical store or per-module live rule list is justified by rc.2.
- Revalidate error normalization and classification against shared HarnessError/LlmError. Unsupported exact-model efforts stay deterministic failures with **zero provider calls**, no broader-rule fallback or extra retry.
- [PTC timeout adapter](../src/modules/compact-context/ptc-timeout.ts) remains a separate runtime seam: verify retained `stateOwner`, native resolve receiver, max-time behavior and disposal against rc.2. PTC call-budget enforcement may terminate retained state after completed operations; it must not be interpreted as compaction failure or authorization to replay tools. [S16]
- Native Anthropic replay now drops invalid prefix-bound signed thinking after history changes and adapters support additional provider protocols; keep adapter replay authority. Do not solve provider prefix failures by rewriting compaction prompts or mapped effort aliases. [S10]

## 2. Retry and terminal continuation: two different capabilities

### Stock rc.2 operation (available only if its native composition supplies it)

SessionController.prompt accepts content=[] as a queue-mode continuation. The remote constructs source.kind='retry' plus caller requestId; SessionCommands enters runMaintenance, verifies conversationContinuation.ending is non-null and that no next-turn or pending user next-step input conflicts, then calls followup(createUserMessage({content:[],source})). Request identity gives prompt admission deduplication; it is **not** a failed-request checkpoint revision. [S4–S6]

The durable projection requires admitted human/retry work, a failed assistant attempt in the final step and an error turn/end in `RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT, EMPTY_RESPONSE, STREAM_CLOSED`. It resets on new turns, and its product allowlist is explicitly independent of automatic retry configuration. Thus eligibility is **not proof of normal-policy budget exhaustion**; maxRetries=0 or a code excluded from automatic retry can still lead to a manual continuation. Native admission still owns whether the new followup runs. [S4]

| Property | Stock native Continue generating | Optional Extras adapted recovery seam |
| --- | --- | --- |
| Invocation | Native prompt with empty content + retry source | Existing live Agent.recovery.read/retry only |
| Durable input/event | Retry-source empty user/message admitted to normal turn | No new model-visible message; request/failure + request/recovery metadata |
| Eligibility | Product transient-code projection over full history | Host-proven finite normal budget-exhausted checkpoint |
| Request | Normal new-turn preparation/current native state | Captured exact failed request, only fresh abort signal |
| Fence | Native prompt requestId, idle/pending-work admission | Session/checkpoint/revision/operation + captured-input/adapter/tool fences |
| Restart | Projection can reconstruct continuation facts | Explicit process-local capability; restart invalidates checkpoint |
| Guarantee | Continue conversation without typing another message | Exact failed-request retry without synthetic messages or completed-tool replay |

The second column is primary stock source; the third is the **separate unofficial rc.1 companion contract**, not a claim rc.2 implements it. [S4–S6; C3]

Required changes:

- Keep the classifier middleware and one native retry loop. Native llm-retry source is unchanged; normal defaults still maxRetries=5 (six attempts), exponential backoff and always mode remain provider-owned. Native schemas now advertise built-in retry-code choices while permitting provider codes. Re-audit [retry settings](../src/modules/retry/settings.ts#L30-L40) exact host pin/provider Config identity and preserve revision-fenced path-only writes/secrets. Native retry settings in the stock UI are not permission for Extras to overwrite broader provider config. [S7]
- Preserve optional `dsh.request-recovery.v1` capability detection and strict bounded metadata validation in [recovery route](../src/modules/retry/recovery.ts); absence remains unsupported. No fallback to prompt([]), followup(), synthetic text, request replay, provider calls or source monkey-patching.
- Parent must explicitly freeze whether stock rc.2 per-turn unavailable Extras cards are suppressed to avoid competing with native Continue generating. Recommended: leave native UI authoritative, show custom action only for positively supported checkpoint capability; retain truthful settings diagnostics. Do not hide a genuinely supported custom checkpoint merely because the stock projection differs.
- Do not distribute/install the frozen rc.1 native-recovery overlay onto rc.2. A future rc.2 adapted companion would require its own isolated upstream port, provenance, new hashes, persistence review, external admission and full REC-1 evidence; it is not an automatic part of this adaptation. [C3–C4]

## 3. Model policy and immutable workspace provenance

rc.2 removes create/resume parentAgent/ownerAgent, AgentRegistry.isOwnedBy(), roots(), and enter(owner). Managed Activations own runtime membership; rootOf(agent) compares exact live objects, rejects stale/unmanaged delegated instances, and is available only **after activation publication**, later than agent/created. Some historical upgrade guides still describe an intermediate ownerAgent rename; the later runtime-ownership guide and actual tag source supersede that intermediate step. [S11–S13]

Do not replace immutable workspace policy provenance with live runtime ownership: a nested child's runtime owner is the root but durable header.parentSession is its direct creator. rc.2 child-agent metadata still writes parentSession=parentHeader.id, origin='subagent', plus delegationDepth; ordinary forks remain independent trees despite parentSession. [S12–S13]

[Extras workspace resolver](../src/shared-compaction/workspace.ts#L7-L46) already walks immutable subagent headers through disposed observation leases and exact root workspace membership, then immutable root creation cwd. **Its approach is not disproven by removal of AgentRegistry APIs.** Preserve it unless a real public-interface regression requires a narrow change. In particular, do not require rootOf during awaited agent/created, where native publication has not completed. Any runtime ancestry needed for work-gating must use the new native managed tree rather than invent durable ownership.

Required validation/change sites: [model policy](../src/modules/model-policy/index.ts#L37-L79) public model.select/selection sequence fencing, creation/resume source timing and native volatile accepted updates; [shared workspace resolver](../src/shared-compaction/workspace.ts); native spawn/fork fixtures that still pass removed parentAgent options. Keep default-off policy, opaque exact efforts, explicit native/manual choice, cold resume preservation, two workspaces and mutable-cwd/worktree isolation. Model/selection source must not be changed after request preparation; no hidden step-loop patch.

## 4. Named and multi-level Subagents / Goal waiting

rc.2 start tools accept an optional name and return an activation name; tool control argument becomes agent rather than agent_id, while Session IDs remain accepted references. list_agents returns name/status/description, not old id/kind/parent/depth rows. Named paths are presentation/lookup, not authoritative depth or ownership proof: unnamed historical branches fall back to Session IDs. Catalog payload v3 means older readers reject newly named sessions; every process sharing that store must upgrade together. [S14]

Goal source remains one Agent-local Goal, not named Goal trees. The native driver changes its one descendant wait from waitForChildren(agent) to waitForTreeWork(agent). The native API explicitly joins progressing work for an exact tree root and does not join idle members with parked input. [S15]

Required changes:

- Port the replacement-driver native change with provenance, preserve the four configured strategies/default and independent jobs wait required by Extras; do not claim native driver itself joins jobs.
- Replace [background-work traversal](../src/modules/goal-wait/driver/background-work.ts#L79) calls to removed isOwnedBy, legacy catalog assumptions and waitForChildren with public native managed-activation/tree APIs as needed. Treat ordinary forks as independent. Use exact Agent identities and fresh liveness, not name prefixes or mutable cwd.
- Refresh [host-version tuple/digest](../src/modules/goal-wait/driver/host-version.ts), [native owner proof](../src/modules/goal-wait/host-owner.ts) and [migration owner digest](../src/migration/native-owner.ts) only against verified emitted rc.2 artifacts. Native-source SHA in this report cannot authorize a JS digest replacement.
- [Authority adapter](../src/modules/goal-wait/authority.ts#L22-L28) hardcodes native driver stack frames as well as digest; audit actual emitted frame positions. Preserve external disarm/revision rejection, no durable Goal mutation, no suppression patch in selected bundles, safe restoration and generation fences.
- Refresh public fixtures/transcript expectations for names, catalog versions, multi-depth activation and resident wakes. A manually constructed factory Agent is no longer a managed child merely because a durable parentSession is present.

## 5. Cordis / Loader migration proof

No rc.1→rc.2 vendor implementation diff was found. Keep rawConfig / pure resolveConfig / effectiveConfig distinctions, owner-root internal/config semantic admission, awaited disposal, EntryTree.commit and Include flush authority. Entry effectiveConfig retained after unload is not liveness proof. [S1–S3]

Still load-bearing and mandatory to recertify:

- Anchored constructor lineage for actual host Core/Loader, one selected Loader row, moduleNamespace/callback correlation and no foreign/programmatic owner; exact driver identity changes even though Loader source does not.
- Transient stock suppression must not persist disabled:true; registry deletion-before-disposal and Entry/fiber rebinding assumptions need real native lifecycle tests. HMR remounts must be synchronously fenced before admitting a second owner.
- Offline CLI absence of live proof remains unverified, not permission to take over; current-process registrations, post-disposal acknowledgment, stale scans, restart-required vs applied and owner-stop recovery checks remain intact. Read-only/dynamic/overlay/unknown owners stay fail closed per module.
- Plugin-manager BundleInfo.updatable is now optional update='registry'|'git'; unexpected-package is a new management error. Audit any listBundles consumer/fixtures for the removed field, but do not invent a migration rewrite when Extras does not use it. [S17]
- Session.append now supports both one typed event and array tuples. Wrappers/test doubles must preserve overloads and receiver, e.g. Proxy + Reflect.apply, instead of assuming append(type,data) only. Events still arrive individually and metadata readers must not classify a batch as a model message. [S18]

## 6. Client APIs and menu positioning

Native UI primitives remove useAnchoredPosition / AnchoredPositionOptions. Menu replaces getAnchorRect with anchorRef or anchorPoint; point coordinates are client-viewport coordinates and Menu performs Safari conversion. Custom panels must use a unique CSS anchor-name / position-anchor and layout-viewport size limits. Native tests must permit visual-viewport overflow while keeping content accessible. [S19]

A content search of Extras client code found **no** removed import or getAnchorRect/anchorRef/anchorPoint use. Existing chime fixed overlays are not automatically trigger-attached menus. Therefore there is no evidence-backed blanket positioning rewrite; audit emitted dependencies/host slots and exercise zoom/pan/scroll/Escape/focus in the real packed client before claiming unaffected.

Preserve ConfigForm and workspace-controller subscriptions with bound receivers; do not start/stop native follow streams. Check turnOutline/head and paged events before showing any failure-specific custom card; new native continuation retry messages must not be mistaken for a supported custom checkpoint. Preserve independent module/responsibility collapse, drafts, multi-workspace exact IDs/inheritance/reset, native chime event ownership and light/dark/Chinese/English/narrow layout. Optional client-plugin loading failures now isolate optional plugins, but must still report the feature not running rather than a working saved setting. [R2; C1; C4]

## 7. Packaging and truthful source-build path

Tagged root requests pnpm@11.28.5 and Node>=24.9.0. CLI package remains apps/cli; workspace dependencies must be resolved coherently. Build scripts now distinguish native addon, generated Typert contracts, host compilation/bundling, client compilation/bundling and web shell build. The canonical `pnpm run build:artifacts` runs scripts/build.ts --scope artifacts; `--scope check` only checks aggregate programs against already-emitted declarations and is **not a fresh build**. Host build requires native output first. [S20–S22]

Recommended isolated validation path (proposal, not executed here):

1. Exact official tag checkout + recorded commit, disposable HOME/DSH_HOME/profile/XDG/cache/store; install the checked-in lock with the requested pnpm. Do not link the live host or use live ~/.npm/global peers.
2. Build official artifact graph (or a deliberately scoped graph with all required generated/native/host/client outputs documented). Run focused native offline tests against one coherent physical peer tree. Source CLI execution is source-runtime coverage, not npm install coverage.
3. Build/pack six Extras archives against that explicit anchor; record exact generated peers/runtime bundle hashes. Clean consumers use the same coherent host, no second Cordis registry; never resolve static source imports from rc.1 while DSH_RUNTIME_ROOT points at rc.2.
4. When rc.2 is published, acquire exact official metadata/tarballs, verify SRI and compare emitted/runtime fingerprints; repeat clean consumer/native/web gates before calling it published-npm compatible. Source-built results alone cannot erase this gate.

[Build script](../scripts/build.mjs) emits discovered exact host peers, so changing engines alone can accidentally declare rc.1 peers. [Package manifest](../package.json) and lock, source guards, artifacts/tests, docs/READMEs/notices must move together under the parent's release version decision; research does not choose the Extras version. Preserve host imports external, selected-feature payloads, truthful public declarations, one source and native-client metadata. Do not include scratch source, archives, node_modules, source maps with local secrets or machine paths in release assets. The stock CLI now stages source/docs resources in prepack; its larger official payload does not justify shipping unrelated Extras features. [S20–S22]

## 8. Validation matrix (required before release; not run by this research lane)

“Source audit” means static tagged-source evidence only. Every runtime/browser/packed row below remains **unexecuted here**. Keep older mandatory acceptance rows in addition to these deltas.

| ID / seam | Required executable evidence | Expected result / negative case | Research status |
| --- | --- | --- | --- |
| RC2-ID / provenance | Exact official tag, registry availability, package SRI, emitted JS hash inventory | No rc.1 artifact passed as rc.2; source-built vs published distinguished | Tag + four npm404 checks done; npm artifact absent |
| RC2-C1 / compaction all paths | Real native automatic pressure/manual/tool/range/overflow/model-switch with compactTool=false; standalone model+compact splits | Native routing/retention preserved; exact one reasoning modifier, no-op/pruner zero summary calls | Source audit only |
| RC2-C2 / reasoning lifecycle | Existing/new/isolated/replaced services, two sessions/workspaces, both bundle copies, toggles/HMR/foreign wrapper/in-flight policy | Receiver and nested/signal identities; unsupported effort zero dispatch, foreign owner untouched | Source audit only |
| RC2-C3 / PTC | Native retained PTC resolve, time/call budget, cancellation, compact tool invocation | Correct request state owner; exhausted state not silently replayed | Source audit only |
| RC2-M1 / model defaults | Native managed spawn + seeded fork depth1/2, resident wake, cold resume, ordinary root fork, two workspaces/cwd changes | Creator provenance survives; manual native choice preserved; no rootOf-before-publication assumption | Source audit only |
| RC2-G1 / tree wait | Native and replacement strategies, nested active/idle parked children, jobs, cancellation/unload/late wake | Join only appropriate native progressing tree work plus Extras jobs; no early Goal continuation or hung idle child | Source audit only |
| RC2-G2 / authority | Exact emitted driver/Core/Loader tuple; foreign callback/source maps/unknown digest/stale ref/HMR replacement | Owned transient suppression only, zero durable native disable, no external rearm | Source audit only |
| RC2-MIG / lifecycle | Anchored real Loader/Include native handover and restart, offline no-proof refusal, journal recovery fault/concurrency/owner-stop | Applied vs saved truthful, original owner retained on uncertainty, unrelated edits preserved | Source audit only |
| RC2-R1 / automatic retry | True provider registration normal0/2/5, retryableCodes choices/custom IDs, always/permanent failure, backoff/cancel | Only official loop, max5 yields ≤6 dispatches, settings preserve secrets/other leaves | Source audit only |
| RC2-R2 / stock continuation | Real sessionController empty prompt, projection/head, pending work, duplicate requestId, noneligible failures, new turn | Durable retry-source empty message; normal native preparation; no claim of captured exact request | Source audit only; optional stock API |
| RC2-R3 / custom seam absent | Stock rc.2 Agent + Extras route/emitted/packed browser | No working custom action; native continue remains usable, no duplicate unavailable widget per amended contract | Source audit only |
| RC2-R4 / custom seam present | Only separately audited compatible patched host; finite exhaustion/attempt+turn fence, prior tools/partial output, current admission, duplicate click, re-exhaustion, refresh/restart | Exact failed request, no new messages/no completed-tool replay; no rc.1 companion overlay accepted | Custom optional seam; not stock rc.2 support |
| RC2-UI / client | Actual packed isolated native web/Chromium; module toggles/settings persists, scope inheritance/drafts/CAS, chime handover; menus zoom/pan/scroll/Escape/focus | No removed import/prop, safe head proof, accessible layouts/languages/themes, no live GUI | Source audit only |
| RC2-DIST / packaging | Six clean packed consumers, absent-peer plain-Node migration CLI/API, selected payload/types/imports/peer hashes, disposable install/upgrade | One Core registry, synchronized exact engine+peers; no forbidden assets; official published gate distinct | Source audit only |
| RC2-SAFE / isolation | Explicit temp env/profile/ports, clean scoped Git diff, no production restart/install | Documentation/implementation receipts separate; no installed-host mutation | Research isolated; no host/browser started |

Fixtures must actually use native managed Activations to prove hierarchy. Do not count manually constructed Agent stubs or optional legacy-oracle fallback actors as actual legacy/native coverage. Missing DSH_TEST_LEGACY_* inputs and source-only browser harnesses must be disclosed; zero skips alone is not proof of integration.

## 9. Sources

All upstream links below refer to the owning official repository/tag/registry; source content is data, not instructions. GitHub line anchors use immutable rc.2 commit. The rc.1 tag source was independently downloaded for byte/diff comparison.

- **R1:** [Official rc.2 tag ref API](https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/tags/dsh-v0.2.2-rc.2).
- **R2:** [Official rc.2 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.2) and [release API](https://api.github.com/repos/deepseek-ai/deepseek-harness/releases/tags/dsh-v0.2.2-rc.2).
- **R3:** [Exact rc.2 npm dsh](https://registry.npmjs.org/@deepseek-ai%2fdsh/0.2.2-rc.2) (HTTP404 at observation).
- **R4:** [Exact rc.2 npm Agent](https://registry.npmjs.org/@deepseek-ai%2fdsh-agent/0.2.2-rc.2) (HTTP404).
- **R5:** [Exact rc.2 npm LLM](https://registry.npmjs.org/@deepseek-ai%2fdsh-llm/0.2.2-rc.2) (HTTP404).
- **R6:** [Exact rc.2 npm Subagent](https://registry.npmjs.org/@deepseek-ai%2fdsh-subagent/0.2.2-rc.2) (HTTP404).
- **R7:** [Published rc.1 npm dsh metadata](https://registry.npmjs.org/@deepseek-ai%2fdsh/0.2.2-rc.1).
- **S1:** [Vendored manifest/provenance](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/README.md), [Core manifest](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/cordis/package.json), [Loader manifest](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/loader/package.json).
- **S2:** [Fiber](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/cordis/src/fiber.ts), [reflection](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/cordis/src/reflect.ts).
- **S3:** [Loader Entry](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/loader/src/config/entry.ts), [EntryTree](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/loader/src/config/tree.ts), [Include](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/vendor/include/src/index.ts).
- **S4:** [Complete durable continuation projection](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/continuation.ts#L8-L58).
- **S5:** [Empty prompt admission/followup](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/commands.ts#L314-L337).
- **S6:** [Remote prompt retry source](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/index.ts#L462-L491).
- **S7:** [Provider retry schema/defaults](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/retry-policy.ts), [native retry owner](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm-retry/src/index.ts).
- **S8:** [Basic summarizer](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/compaction/compaction-basic/src/summarizer.ts), [native compaction](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/compaction/compaction/src/index.ts).
- **S9:** [LLM validation/stream](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/index.ts#L926-L1032), [receiver-scoped stream](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/index.ts#L1177-L1199).
- **S10:** [Failure code registry](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/error.ts), [prefix-bound thinking](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm-pi-ai/src/prefix-binding.ts).
- **S11:** [Actual AgentRegistry contract](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/core/agent/src/index.ts).
- **S12:** [Authoritative Subagent runtime ownership migration](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/docs/upgrade-guide/v0.2.1-rc.3/subagent-runtime-ownership/guide.md).
- **S13:** [Child durable provenance](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/subagent/src/child-agent.ts#L121-L155), [rootOf and native tree work API](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/subagent/subagent/src/index.ts#L294-L353).
- **S14:** [Named Subagent migration](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/docs/upgrade-guide/v0.2.2-alpha.3/subagent-names/guide.md).
- **S15:** [Native Goal driver tree join](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal-round-driver/src/index.ts#L170-L185), [Goal service](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/goal/goal/src/index.ts).
- **S16:** [PTC call-budget owner](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/core/tool-executor-ptc/src/ptc-calls.ts), [retained PTC owner](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/core/tool-executor-ptc/src/ptc.ts).
- **S17:** [Plugin-management update migration](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/docs/upgrade-guide/v0.2.2-rc.1/plugin-update-method/guide.md).
- **S18:** [Session.append overload migration](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/docs/upgrade-guide/v0.2.2-rc.1/session-append-overloads/guide.md).
- **S19:** [CSS-anchored menu migration](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/docs/upgrade-guide/v0.2.2-alpha.2/css-anchored-menus/guide.md).
- **S20:** [Root tools/build commands](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/package.json), [workspace/install policy](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/pnpm-workspace.yaml).
- **S21:** [Build graph](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/scripts/build.ts#L89-L130).
- **S22:** [CLI packaged source/docs and prepack](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/apps/cli/package.json#L17-L27).
- **C1:** [Extras acceptance](ACCEPTANCE.md), [workspace contract](WORKSPACE_POLICY_050.md).
- **C2:** [Prior exact rc.1 research](RESEARCH_DSH_RC1_2026-11-07.md), [native artifact research](RESEARCH_NATIVE_RC1_2026-11-07.md).
- **C3:** [Unofficial exact-request companion contract/evidence](NATIVE_RECOVERY_IMPLEMENTATION.md#stable-optional-public-protocol), [native recovery agreement](NATIVE_RECOVERY_050.md).
- **C4:** [Recovery/workspace UI contract](UI_REFINEMENTS_050.md), [frozen rc.1 companion staging](../scripts/native-recovery/stage.mjs).
