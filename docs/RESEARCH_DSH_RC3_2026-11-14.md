# DSH 0.2.2-rc.3 integration research

Date: 2026-11-14 (Asia/Shanghai). **Static research and local artifact observation only; not a typecheck, native-host, browser, packed-consumer or release pass.** Goal necessity, ownership and Subagent lifecycle are audited by a separate lane; this report covers their durable provenance only where consumed by model/compaction policy.

## Decision summary

1. **Consumed Agent/LLM/Session/compaction/retry implementations did not change between official tags.** Whole source-tree Git objects match, not just selected names. Manifests advance to rc.3. This supports narrow exact-baseline recertification, not guard removal or speculative version ranges. The vendor tree is also identical. See parity receipt and N1–N12.
2. **Existing rc.2 Extras is not automatically rc.3-ready.** Development graph preflight, shared-compaction LLM gate, retry-settings CLI gate, engine/development pins and Goal/migration gates deliberately pin rc.2. Refresh coherently, retain foreign/unknown refusal and validate actual published bytes. E1–E5 identify non-Goal consumers; the other lane owns Goal/migration proof.
3. **Native Continue remains a normal admitted follow-up, not immutable failed-request replay.** Empty retry-source user input reaches native followup; fixed product-code eligibility is independent of automatic retry budget. No new public checkpoint capability appears in unchanged Agent/LLM/SessionController source. Keep native UI untouched and optional Extras protocol distinct. N8–N10, E8.
4. **Browser changes are additive, not a reason to rewrite Extras.** rc.3 adds a workspace-picker factory, third directory-flow slot and New-session-row HOC slot. Extras uses workspaces.list, settings slots, sidebar footer, shell overlay and turn-tail recovery, not those new surfaces. Retest composition/layout, without adopting new features or changing policy scope. N13–N16, E6–E10.
5. **Official CLI packaging broadens.** Experimental chat import is a new dependency/optional bundle; upstream dependency policy reinforces shared runtime peers. Six selected-feature Extras artifacts, external host imports, truthful declarations and one physical graph remain required. Source parity is not npm artifact/SRI proof. N17–N19, E1, E10.

## Contract and acquisition boundary

Read the [release specification](<SPEC.md>), [architecture](<ARCHITECTURE.md>), [migration contract](<MIGRATION.md>) and [acceptance matrix](<ACCEPTANCE.md>) first, then [rc.2 compatibility](<DSH_RC2_060.md>), [npm revalidation](<DSH_RC2_NPM_060.md>), [compaction reasoning](<COMPACTION_REASONING.md>) and [workspace policy](<WORKSPACE_POLICY_050.md>). Parent subsequently fixed the [rc.3 check-only contract](<DSH_RC3_061.md#L11-L24>): exact rc.3, unreleased candidate 0.6.1, no publication or production operation. Earlier installation exceptions do not apply.

Extras was clean at initial observation, commit 1b4b9a2c15be6293b5d92f1820ce811904938d93. Immutable Extras citations bind that pre-adaptation snapshot; adjacent local paths identify read locations and may advance during parent implementation. This lane owns only this report, not contracts/code.

Parent performed the sole complete clone. I waited for ready notification before reading it. Local Git independently resolved:

| Ref | Observed commit |
| --- | --- |
| dsh-v0.2.2-rc.2 | ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c |
| dsh-v0.2.2-rc.3 | 38a6a5c965aa99ab525161efb7cc5cf1fe62fced |

The [shared upstream checkout](</tmp/extras-rc3.OS6Qcw/upstream>) was detached at rc.3 with empty git status. No clone/fetch, GitHub source-page browse, install, host execution, test, live-GUI access, production operation, push or release was performed by this lane. Read-only git diff/ls-tree/rev-parse and SHA256 commands all returned exit 0. Two initially guessed source paths were absent; glob located the real core/session and core/agent paths before further reads. No dependency/runtime evaluation substituted for inspection.

## Exact local parity receipt

Commands against the complete clone:

~~~sh
git rev-parse dsh-v0.2.2-rc.2^{commit} dsh-v0.2.2-rc.3^{commit}
git diff --name-only dsh-v0.2.2-rc.2..dsh-v0.2.2-rc.3
git diff --numstat dsh-v0.2.2-rc.2..dsh-v0.2.2-rc.3 -- packages/core packages/llm packages/compaction packages/ptc-runtime packages/api/session-controller packages/api/workspace-controller packages/boot vendor
git ls-tree dsh-v0.2.2-rc.2 <paths below>
git ls-tree dsh-v0.2.2-rc.3 <paths below>
~~~

Each following source-directory tree ID was **identical at both commits**. These authenticate tracked contents/public TypeScript signatures, not emitted npm JS, generated declarations or installed dependency identity.

| Directory | Identical Git tree ID | Representative primary source |
| --- | --- | --- |
| Agent src | e12358b3c4b6806d7d5cc0739c3507b2f681745a | N1, N2 |
| AgentLoop src | 5a26a8a6d6694488c6b7e936570919430f468d85 | N3 |
| Session src | d1aaa264d691ebce86b394bc35721e502ca14f79 | N4, N5 |
| LLM src | a88501275cab61ad18eec5d70d5244c30d12e346 | N6 |
| llm-retry src | f7c49e0eff087e87741da6767f9fd823f61a97fd | N7 |
| compaction src | 50bb74f55173f579bb9da761a40cc1106dd44bcf | Engine tree; boundary N11 |
| compaction-basic src | 92300f3788d3190d7091f65a79d0e66b562c9094 | N11 |
| PTC runtime src | c25f318d511dcde1b689686a777690df4858f1fd | N12 |
| SessionController src | 28180f405a41c14d58027ac727961ef3093b82f6 | N8–N10 |
| WorkspaceController src | 303284f2d7ee2b65c53f932ec8eb23340526f8a8 | Backend API; Extras E6 |
| Entire vendor tree | 721abc98e443b0d2cff281cd0e900bac05b3bcd4 | Cordis/Loader/Include/Schemastery source retained |

Full name-only diff also shows only manifest changes for provider implementations, PTC Node runtime, workspace registry, session-query engine, boot/HMR/config-editor/plugin-manager and other core tools. Changed session-log-export is separate from unchanged session-query observation/Session format. This distinction matters for provenance/recovery claims.

## Consumed seams and concrete impacts

### Agent, LLM and model policy

- Public model face still exposes current() and select(complete selection). Choice affects future preparation, not a prepared step; callers validate capabilities. Awaited serial agent/created listeners complete before queued work is released. Registry announce uses exact carrier/agent and source/signal. **Keep Extras selection at creation/accepted policy updates, not deprecated agent/request.** N1–N3; E4.
- AgentLoop rejects changing provider/model/effort after preparation through agent/request. LLM resolveCallConfig validates exact-model effort before provider I/O; stream retains receiver-scoped llm/stream and native adapter-failure normalization. No rc.3 error/finish-union migration or additional retry loop is justified. N3, N6; E4, E7.
- Shared provenance remains immutable Session header origin + parentSession, registry membership or exact canonical lookup of **creation header** cwd, plus caller-owned cold observeSession lease. parentSession alone cannot classify historical ordinary forks; origin is classification, not continuation/permission proof. Do not substitute mutable cwd, path-prefix guesses, live ownership or private maps. N4, N20–N22; E3, E4.
- Extras already fences manual-selection revisions/live Agent identity across async validation, preserves durable cold-resume choices and gives fresh forks role defaults. Retain those invariants; parity does not waive concurrent-update/resume tests. E4.

### Compaction and PTC

- Native summary target remains configured summary route, otherwise latest durable request header, otherwise Agent options. ctx.llm.stream receives purpose=compaction with toolHistory/tools/session/signal. Retention, route, transaction and summary error handling stay native. E2's rc.2 LLM gate needs rc.3 recertification; replacing the adapter with tool-only interception violates full-path coverage. N11; E2.
- requestHeader() remains frozen fold of latest complete durable snapshots. Never merge absent latest effort with old headers or use pending next selection. Preserve clone-first envelope, nested/cancellation identities, ordinary/LOOP exclusion, captured in-flight policy and one executor/standby handover. N5, N11; E2 and [shared authority](<ARCHITECTURE.md#L21-L25>).
- PTC stateOwner remains object-identity owner with release obligations; omitted/null/numeric timeoutMs retain their meanings. Extras' instance-owned public resolve wrapper only fills omitted configured deadlines, respects explicit null/native max, preserves receiver and restores owned descriptors. No rc.3 PTC semantic rewrite indicated. N12; E5.
- Session batch append still gives observers complete committed log/final surface. Do not regress to single-event-prefix assumptions in Chime/recovery merely because source is unchanged. N5.

### Retry, native Continue and optional exact-request recovery

- Provider defaults remain maxRetries=5 (up to six attempts), delay 500ms, cap 10s, jitter 0.1 and established retryable codes. Native llm-retry owns budget, durable events, cancellable waiting and always behavior. Extras only classifies empty/stream errors and exposes revision-fenced provider leaf writes. Retry settings' exact rc.2 CLI gate needs update after graph validation; secrets/other fields must not be rewritten. N7, N23; E7.
- Native Continue's product allowlist remains RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT/EMPTY_RESPONSE/STREAM_CLOSED over complete durable history, requiring admitted human/retry work and a failed last attempt. Independent of automatic retry configuration: eligibility is **not proof of budget exhaustion**. N8.
- Controller labels empty prompt source retry, uses requestId deduplication, runMaintenance/pending-inbox checks, then followup(createUserMessage({content:[],source})). Browser requires current failure, idle/open/nonremoved ordinary session, no conflicting draft/attachments/input and native composer admission. This is a normal next turn, not a frozen failed request with only a fresh abort signal. N9, N10.
- Preserve optional dsh.request-recovery.v1 detection and process-local budget-exhausted/checkpoint/revision proof. No prompt([]) fallback, direct provider calls, synthetic text, completed-tool replay, native UI interception or rc.1 companion shipment. Missing/incompatible protocol stays unavailable; stock per-turn noise suppression is not optional-capability success. E8; [existing distinction](<DSH_RC2_060.md#L15-L19>).

## Changed browser services and signatures

| Actual rc.3 change | Current Extras consumer? | Impact / checks |
| --- | --- | --- |
| workspace.picker factory with WorkspacePickerInput=EmptyWorkspaceOwnerProps; caller owns open/anchorRef/selectedId/onPick/onClose. Independent workspace.picker.directoryFlow child; old hero props retained. N13 | No. Extras reads workspaces.list and renders policy scope controls, not uiWorkspace/picker factory. E6 | No factory migration. Recheck opaque IDs, stale/reconnect, inheritance, draft locks and subscription lifetimes against unchanged workspace API. |
| Browse/native picker backends register three flow holes transactionally instead of two. N14 | No direct consumer. | Test stock rc.3 composition so picker activation failure is not mistaken for Extras failure. No new Extras dependency/directory operation. |
| sidebar.session.action root HOC wraps New-session children; owner supplies wide. Sidebar row/CSS geometry changes. Existing footer declaration retained. N15 | No. Chime uses sidebar.footer.action/shell.overlay. E9 | Retest wide/collapsed/narrow footer/overlay/focus/unrelated controls; do not move Chime into new row or rewrite fixed banners. |
| Factory is registered for plugin lifetime and caller type publicly exported; generated slot catalog grows accordingly. N13, N16 | No direct public import. | Additive API is not removal of existing settings/recovery seats. Check emitted declarations and selected split dependencies rather than treating generated-catalog changes as runtime breaks. |
| Experimental import appears in CLI and optional inventory. N17, N18 | Not Extras functionality or legacy migration source. | Do not enable/adopt it or change profile composition. Check ordinary settings/plugin-manager coexistence with installed but unselected optional package. |

Existing consumed seats/services are evidenced by E6, E8–E10: plugins.row.config, plugins.bundle.config, configForms.whileServed, sidebar.footer.action, shell.overlay, conversation.chat.turnTail; sessions bindings/events, jobs, uiSession, locale, remote and workspaces.list. Provider implementation sources outside the additive sidebar/workspace changes above do not change in the tag diff. Browser load/render remains **unexecuted in this lane**.

## Packaging and public entrypoints

1. CLI adds @deepseek-ai/dsh-deepseek-chat-import and official More/Experimental inventory includes it. Importer declares LLM/Session/title/web peers, not private native copies. Native npm graph can therefore grow. Update versions/lock from real registry metadata through parent isolated install, not fabricated records/source linker. N17, N18; E1.
2. Upstream dependency policy explicitly classifies LLM IDs, Session class/brands, title normalization and web-result helpers as peer-sensitive. This is repository verification policy, not changed function signatures or permission to bundle another runtime. Keep Extras external imports, graph-derived native peers and one physical Cordis/schema graph. N19; E1, E10.
3. Six selections, root Cordis entry, side-effect browser entry, migration API/CLI and truthful declarations remain required. Build derives peers from admitted host. Refresh engine/dev pins coherently and inspect **all final archives** for selected payload, declarations, exports, patches, notices and absence of unrelated feature code. E10; [distribution contract](<ARCHITECTURE.md#L33-L43>).
4. Separate upstream export change tolerates missing/deleted/invalid attachment refs: missing objects are listed in a text ZIP entry; file streams are prefetched/closed; unrelated errors still fail. No Extras archive API consumer is present in audited module/client imports, so no export/migration change is required. N24. This does not alter Session durability/format, compaction or recovery.

## Local published-byte corroboration

Parent acquired official rc.3 Goal package once. I read its [manifest](</tmp/extras-rc3.OS6Qcw/goal/package/package.json#L1-L40>) and independently hashed already-extracted files; no download/evaluation in this lane.

| File | Independently observed SHA256 |
| --- | --- |
| [Compiled driver](</tmp/extras-rc3.OS6Qcw/goal/package/lib/index.js>) | 8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c |
| [Shipped index source](</tmp/extras-rc3.OS6Qcw/goal/package/src/index.ts>) | fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7 |
| [Shipped prompt](</tmp/extras-rc3.OS6Qcw/goal/package/src/prompt.ts>) | 48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97 |

Manifest declares rc.3 native peers and Cordis ~4.1.0. Compiled digest matches pre-existing rc.2 preflight constant (E1). This supports parent's narrow artifact plan, but is **not** independently verified full archive SRI, npm gitHead, graph identity, frame audit, runtime acceptance or proof all packages emit identical bytes. Parent/Goal lane owns those checks. [rc.3 contract](<DSH_RC3_061.md#L5-L16>) separately records parent's broader artifact observations.

## Required execution coverage — recommendations, not results

| Gate | Necessary evidence |
| --- | --- |
| Exact graph/refusal | Real rc.3 lock/SRI and entrypoints/peers; missing/ancestor/live/foreign selectors refused; one Cordis/schema identity. Explicit rc.2 and unknown/future versions still rejected by candidate admission; unknown bytes refused. Read-only preflight must not evaluate/mutate foreign graphs. |
| Model/provenance | Real root/spawn/fork/deep/resident/cold behavior, two workspaces, human-fork classification, immutable origin despite worktree/cd, exact lookup before attach, cyclic/missing/ambiguous provenance refusal, durable manual choice and accepted async update fences. |
| Compaction/PTC | Native pressure/manual command/tool/public range/overflow/model switch; tools disabled but summary policy active; ordinary/LOOP untouched; unsupported effort zero dispatch; complete/missing latest effort, cancellation identity, captured policy, isolated/replaced services, HMR/foreign ownership/disposal and standalone handover. PTC omitted/null/explicit/max and owner lifecycle. |
| Retry | normal5=6 attempts; always includes permanent failures; cancel/unload; stream/empty classification/provider filtering; fixed/exponential settings and revision-fenced leaf-only writes preserve secrets/other fields. No second loop. |
| Continue/recovery | Native transient eligibility vs permanent/tool/cancel/history exclusions, retry user-message and pending-work admission. Separately absent/incompatible/valid/stale/busy/duplicate optional protocol and latest true model-failure proof. Never call stock Continue exact checkpoint recovery. |
| Browser/public API | Six packed native GUI consumers on disposable ports, never production URL; actual client load/services, settings persistence/collapse/drafts/revisions/global-workspace opaque IDs, Chime footer/banner/audio ownership/unload, native Continue untouched, unsupported-card suppression. Stock new sidebar/picker composes without enabling import. Type-consume emitted root/client/migration declarations. |
| Migration/safety | Existing conflicts/selective recovery/concurrent/interrupted owner/readonly/auth/origin/absent-peer CLI gates retained. Separate Goal/Subagent scenarios not waived. Six final archive payloads/hashes and production baseline nonmutation. No push/release/production installation for check-only request. |

## Uncertainties and boundaries

- Source parity is strong evidence against a new consumed API migration, not execution proof. Exact installed peers/transitives, generated types, client bundles and composed HMR/Loader behavior must be tested on parent's actual graph.
- No arbitrary third-party compaction backend/LLM bypass, provider quality/cache behavior, Windows desktop restart or nonstandard picker deployment is certified. Vendor parity does not prove all compositions/foreign owners.
- Stock optional recovery absence is a source observation, not a statement about every adapted host. Keep positive protocol proof rather than version-only enablement.
- New importer behavior is neither adopted nor security-certified; only its inventory/entrypoint/peer integration impact was inspected.
- Goal/Subagent report owns necessity and exact owner/frame/lifecycle proof; matching hashes here do not replace it.

## Primary source index

Upstream URLs pin observed rc.3 commit 38a6a5c965aa99ab525161efb7cc5cf1fe62fced; adjacent local links expose read line ranges. Unchanged-tree sources represent the observed rc.2 implementation too; N13–N19/N24 are explicit deltas. Extras URLs pin initial snapshot 1b4b9a2c15be6293b5d92f1820ce811904938d93, not subsequent parent edits.

| ID | Primary source / local coordinates |
| --- | --- |
| N1 | [Agent model face](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent/src/runtime-types.ts#L53-L71>) · [local 53–71](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/agent/src/runtime-types.ts#L53-L71>); [awaited creation event](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent/src/runtime-types.ts#L278-L300>) · [local 278–300](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/agent/src/runtime-types.ts#L278-L300>) |
| N2 | [Registry serial announce](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent/src/index.ts#L541-L581>) · [local 541–581](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/agent/src/index.ts#L541-L581>) |
| N3 | [Prepared route/effort rejection](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent-loop/src/agent.ts#L620-L658>) · [local 620–658](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/agent-loop/src/agent.ts#L620-L658>) |
| N4 | [Immutable Session provenance](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/types.ts#L90-L128>) · [local 90–128](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/session/src/types.ts#L90-L128>) |
| N5 | [Batch append](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/index.ts#L795-L870>) · [local 795–870](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/session/src/index.ts#L795-L870>); [durable request header](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/index.ts#L994-L1016>) · [local 994–1016](</tmp/extras-rc3.OS6Qcw/upstream/packages/core/session/src/index.ts#L994-L1016>) |
| N6 | [Exact call validation](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/llm/llm/src/index.ts#L903-L923>) · [local 903–923](</tmp/extras-rc3.OS6Qcw/upstream/packages/llm/llm/src/index.ts#L903-L923>); [Stream receiver/normalization](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/llm/llm/src/index.ts#L1175-L1209>) · [local 1175–1209](</tmp/extras-rc3.OS6Qcw/upstream/packages/llm/llm/src/index.ts#L1175-L1209>) |
| N7 | [Retry ownership](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/llm/llm-retry/src/index.ts#L21-L36>) · [local 21–36](</tmp/extras-rc3.OS6Qcw/upstream/packages/llm/llm-retry/src/index.ts#L21-L36>); [Retry execution/budget](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/llm/llm-retry/src/index.ts#L184-L220>) · [local 184–220](</tmp/extras-rc3.OS6Qcw/upstream/packages/llm/llm-retry/src/index.ts#L184-L220>) |
| N8 | [Continuation projection](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/continuation.ts#L8-L58>) · [local 8–58](</tmp/extras-rc3.OS6Qcw/upstream/packages/api/session-controller/src/continuation.ts#L8-L58>) |
| N9 | [Empty prompt source](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/index.ts#L470-L491>) · [local 470–491](</tmp/extras-rc3.OS6Qcw/upstream/packages/api/session-controller/src/index.ts#L470-L491>); [Maintenance/followup](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/commands.ts#L314-L338>) · [local 314–338](</tmp/extras-rc3.OS6Qcw/upstream/packages/api/session-controller/src/commands.ts#L314-L338>) |
| N10 | [Native composer retry](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-conversation/src/client/input/hub.ts#L210-L230>) · [local 210–230](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-conversation/src/client/input/hub.ts#L210-L230>) |
| N11 | [Native summary envelope/target](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/compaction/compaction-basic/src/summarizer.ts#L120-L165>) · [local 120–165](</tmp/extras-rc3.OS6Qcw/upstream/packages/compaction/compaction-basic/src/summarizer.ts#L120-L165>) |
| N12 | [PTC owner/deadline/cancel](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/ptc-runtime/ptc-runtime/src/types.ts#L87-L109>) · [local 87–109](</tmp/extras-rc3.OS6Qcw/upstream/packages/ptc-runtime/ptc-runtime/src/types.ts#L87-L109>) |
| N13 | [Factory/flow signature](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-workspace/src/client/contract/slots.ts#L227-L249>) · [local 227–249](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-workspace/src/client/contract/slots.ts#L227-L249>); [Preserved picker/new input](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-workspace/src/client/contract/slots.ts#L555-L576>) · [local 555–576](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-workspace/src/client/contract/slots.ts#L555-L576>); [Factory registration](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-workspace/src/client/index.ts#L410-L426>) · [local 410–426](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-workspace/src/client/index.ts#L410-L426>) |
| N14 | [Browse three holes](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-directory-picker-browse/src/client/index.ts#L170-L189>) · [local 170–189](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-directory-picker-browse/src/client/index.ts#L170-L189>); [Native three holes](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-directory-picker-native/src/client/index.ts#L26-L46>) · [local 26–46](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-directory-picker-native/src/client/index.ts#L26-L46>) |
| N15 | [Footer/new session HOC](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-sidebar/src/client/contract/slots.ts#L65-L86>) · [local 65–86](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-sidebar/src/client/contract/slots.ts#L65-L86>) |
| N16 | [Workspace public exports](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-workspace/src/client/index.ts#L63-L70>) · [local 63–70](</tmp/extras-rc3.OS6Qcw/upstream/packages/client/ui-workspace/src/client/index.ts#L63-L70>) |
| N17 | [CLI importer dependency](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/cli/package.json#L105-L122>) · [local 105–122](</tmp/extras-rc3.OS6Qcw/upstream/apps/cli/package.json#L105-L122>); [Optional/experimental inventory](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/util/official-bundles/src/plugin-manager.ts#L45-L80>) · [local 45–80](</tmp/extras-rc3.OS6Qcw/upstream/packages/util/official-bundles/src/plugin-manager.ts#L45-L80>) |
| N18 | [Importer entries/peers](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/experimental/deepseek-chat-import/package.json#L14-L76>) · [local 14–76](</tmp/extras-rc3.OS6Qcw/upstream/packages/experimental/deepseek-chat-import/package.json#L14-L76>) |
| N19 | [Peer-sensitive export policy](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/scripts/package-dependency-policy.ts#L78-L107>) · [local 78–107](</tmp/extras-rc3.OS6Qcw/upstream/scripts/package-dependency-policy.ts#L78-L107>) |
| N20 | [Durable child metadata](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/child-agent.ts#L135-L153>) · [local 135–153](</tmp/extras-rc3.OS6Qcw/upstream/packages/subagent/subagent/src/child-agent.ts#L135-L153>) |
| N21 | [Cold/live observation lease](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/session-query/session-query/src/index.ts#L134-L145>) · [local 134–145](</tmp/extras-rc3.OS6Qcw/upstream/packages/session-query/session-query/src/index.ts#L134-L145>) |
| N22 | [Exact canonical lookup](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/workspace/workspace/src/index.ts#L517-L529>) · [local 517–529](</tmp/extras-rc3.OS6Qcw/upstream/packages/workspace/workspace/src/index.ts#L517-L529>) |
| N23 | [Provider retry defaults](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/llm/llm/src/retry-policy.ts#L15-L25>) · [local 15–25](</tmp/extras-rc3.OS6Qcw/upstream/packages/llm/llm/src/retry-policy.ts#L15-L25>) |
| N24 | [Missing references/stream cleanup](<https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/session-query/session-log-export/src/archive.ts#L391-L490>) · [local 391–490](</tmp/extras-rc3.OS6Qcw/upstream/packages/session-query/session-log-export/src/archive.ts#L391-L490>) |
| E1 | [Exact version/digest](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/scripts/native-host.mjs#L8-L10>) · [local 8–10](<../scripts/native-host.mjs#L8-L10>); [One physical graph/bytes](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/scripts/native-host.mjs#L77-L131>) · [local 77–131](<../scripts/native-host.mjs#L77-L131>) |
| E2 | [Compaction baseline](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/shared-compaction/runtime.ts#L15-L45>) · [local 15–45](<../src/shared-compaction/runtime.ts#L15-L45>); [Instance identity](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/shared-compaction/runtime.ts#L95-L110>) · [local 95–110](<../src/shared-compaction/runtime.ts#L95-L110>) |
| E3 | [Immutable identity resolver](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/shared-compaction/workspace.ts#L11-L50>) · [local 11–50](<../src/shared-compaction/workspace.ts#L11-L50>) |
| E4 | [Model fencing/manual/cold](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/model-policy/index.ts#L30-L79>) · [local 30–79](<../src/modules/model-policy/index.ts#L30-L79>) |
| E5 | [PTC instance wrapper](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/compact-context/ptc-timeout.ts#L39-L96>) · [local 39–96](<../src/modules/compact-context/ptc-timeout.ts#L39-L96>) |
| E6 | [Read-only workspace stream](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/client/workspace-settings.ts#L13-L62>) · [local 13–62](<../client/workspace-settings.ts#L13-L62>) |
| E7 | [Classifier only](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/retry/index.ts#L75-L130>) · [local 75–130](<../src/modules/retry/index.ts#L75-L130>); [Retry settings identity](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/retry/settings.ts#L30-L74>) · [local 30–74](<../src/modules/retry/settings.ts#L30-L74>) |
| E8 | [Optional protocol validation](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/retry/recovery.ts#L4-L24>) · [local 4–24](<../src/modules/retry/recovery.ts#L4-L24>); [Positive capability only](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/retry/recovery.ts#L54-L68>) · [local 54–68](<../src/modules/retry/recovery.ts#L54-L68>); [Turn-tail seat](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/client/request-recovery.ts#L133-L138>) · [local 133–138](<../client/request-recovery.ts#L133-L138>) |
| E9 | [Chime footer](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/client/chime.ts#L1944-L1949>) · [local 1944–1949](<../client/chime.ts#L1944-L1949>); [Chime overlay](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/client/chime.ts#L2030-L2034>) · [local 2030–2034](<../client/chime.ts#L2030-L2034>) |
| E10 | [Six selections/client services](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/scripts/distributions.mjs#L1-L17>) · [local 1–17](<../scripts/distributions.mjs#L1-L17>); [Settings seats](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/client/composition.ts#L19-L60>) · [local 19–60](<../client/composition.ts#L19-L60>); [Peers/public exports](<https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/scripts/build.mjs#L46-L68>) · [local 46–68](<../scripts/build.mjs#L46-L68>) |
