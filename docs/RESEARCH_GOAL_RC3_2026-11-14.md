# DSH rc.3 Goal, Agent tree and ownership audit

Date: 2026-11-14 (Asia/Shanghai). Research-only lane. Source acquisition was the parent's **one complete clone**, not a second clone/fetch or GitHub source-page crawl. This lane read local source, existing Extras contracts and the parent's already-acquired npm Goal archive; it ran no tests, installs, builds, host, browser, production operation, push or release. Its only owned repository change is this note.

## Executive result

**Keep Goal-wait and its four strategies/defaults; no Goal algorithm or tree-ownership rewrite is justified by rc.3.** The exact rc.2→rc.3 diff has no non-manifest changes in Goal, Agent, Agent-loop, Session, Subagent, Jobs, HMR or app-boot; the entire audited Cordis/Loader scopes are unchanged. Native continuation still joins **progressing work for a shared tree root**, not every live creator descendant and not generic owned Jobs. Thus native is sufficient for native-only tree coordination; configured Job waiting and the conventional activation resident-descendant policy remain distinct Extras value. [Native scheduling][driver-schedule] [root-only join][tree-join] [public contract][tree-api] [Extras fixed behavior](<DSH_RC3_061.md#L11-L16>)

The initial local mapping found rc.2 version guards in all three Goal proof paths, not just the replacement port. The parent's subsequently supplied **actual rc.3 npm Goal archive** was independently hashed and inspected here: compiled driver bytes, shipped source/prompt and the exact lifecycle frame lines match the recorded rc.2 artifacts. This supports a **narrow exact rc.3 admission refresh retaining the same digest/frame pattern**, not a version-only relaxation or a general claim about every npm package. Native runtime, negative-owner, transition/cancellation and packed acceptance remain separate unexecuted gates for this lane. [Current compatibility contract](<DSH_RC3_061.md#L13-L23>)

## 1. Fixed identities and evidence boundaries

- rc.2 source commit: [ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c](https://github.com/deepseek-ai/deepseek-harness/commit/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c), tag `dsh-v0.2.2-rc.2`.
- rc.3 source commit: [38a6a5c965aa99ab525161efb7cc5cf1fe62fced](https://github.com/deepseek-ai/deepseek-harness/commit/38a6a5c965aa99ab525161efb7cc5cf1fe62fced), tag `dsh-v0.2.2-rc.3`.
- Local source: parent-owned disposable checkout at `/tmp/extras-rc3.OS6Qcw/upstream`. Both tags resolved locally; detached HEAD was rc.3 and tracked status was clean at audit. No source from master HEAD was substituted.
- Extras contract revision at mapping: `61507120550023260a039705c97f545272bd619e`; its parent baseline was `1b4b9a2c15be6293b5d92f1820ce811904938d93`. The guard inventory below describes the **pre-adaptation rc.2 baseline read in this lane**, not a claim that another lane has not subsequently updated it.
- No rc.3 emitted artifacts were built here. **Observed npm Goal bytes are identified below**; emitted Agent/Subagent/Loader/Cordis/HMR/app-boot equivalence and runtime integration are not inferred from unchanged TypeScript.

### Local tag comparison result

The read-only comparison covered entire scopes, including their tests/docs, not only the selected source files in the hash table:

| Scope | Changed files rc.2→rc.3 | Non-manifest changes |
| --- | ---: | --- |
| Goal | 4 package manifests | None |
| Agent / Agent-loop / Session | 1 manifest each | None |
| Subagent and provider/control packages | 9 manifests | None |
| Jobs | 3 manifests | None |
| HMR / app-boot | 1 manifest each | None |
| Cordis / Loader | 0 | None |

The [Goal manifest][driver-manifest] changes the source package version from rc.2 to rc.3. [Cordis][cordis-manifest] stays 4.1.0 and [Loader][loader-manifest] stays 1.1.0. Matching package versions are necessary guard inputs, **not proof of a live Context, Loader entry or callback owner**.

### Exact source SHA-256 (same at both immutable commits)

These are SHA-256 of raw Git blob content, independently calculated from both local tag refs; **not emitted JS, tarball integrity or a build receipt**. Each label links the rc.3 immutable source; rc.2 counterparts use the rc.2 commit above and the identical repository path.

| Immutable source | SHA-256, rc.2 = rc.3 |
| --- | --- |
| [Goal driver][driver] | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` |
| [Goal prompt][prompt] | `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` |
| [Goal service][goal] | `b3ea2930458f67afb97e7929b957e5859c42ee16fde95e3247734e3789e9c134` |
| [Goal admitted-round fold][goal-fold] | `8dc7086395f436c6af4a816e668ddfd89ba527f801a877bf74d131f08870ab6e` |
| [Agent registry][agent] | `c3af768658850fddda9ec91afb12f55a52b6101c43356b428919679a525e2bba` |
| [Agent loop][loop] | `2a00160a00d818b420dd0c0b7af2d50ba9fd4bdcf66c50d2126eaaf8cfe7d301` |
| [Session][session] | `8941b4c7a45debf2443b0f937830f806130167e3ef53426833f7225dd5a8bb8f` |
| [Session header types][headers] | `1274e57822035991afd549ed9659a5dd4d66645d77171921d9b2601371911d2c` |
| [Subagent public service][tree-api] | `b9b098db20176ea066895bda65aa20aadfb8d32f25a5a2eb033122885a74bf36` |
| [Subagent manager][manager] | `8488f36b734c946fdc577c6542205ab7c68f82df413e607427108060393532a5` |
| [Child creation metadata][child] | `f632ef9e600a0508a4112e47f7862a3382ae5080d03353d04ed2449eda6f4fac` |
| [PTC/inbox wait][inbox-wait] | `cd945b9c8d9f90ae93925b6c088994855cd1791f3a3a2f9d9352aecc4d3d1874` |
| [Loader Entry][entry] | `650e4e1f3015bcca63c5a3474310f87a418add6249d9939d173a2b79f2ee7d9b` |
| [Loader lifecycle][loader] | `e2d04b34ef703e08d2e40f0ba41daa31ff564343cfeb018f102133fc62317050` |
| [Cordis Fiber][fiber] | `b64c3a97f15f0381479dcf3d25965e56dc4cecfa4a0881fc055a49f65b9945df` |
| [HMR][hmr] | `c33b89cb193eb904c6213c3d8bc6ee81c9f2990cbb093f578ef5f474b467644c` |
| [App-boot][appboot] | `5c421f2880870f3ce0cfa637814941715b6eb5cb7d3fab081e9daaffb4b47c9f` |

### Actual parent-acquired npm Goal archive: independently inspected here

Official archive locator: [@deepseek-ai/dsh-goal-round-driver@0.2.2-rc.3 tarball](https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-rc.3.tgz). The parent fetched it; this lane made **no registry request**. It read the saved metadata and extracted manifest, recomputed the existing archive's SHA-1/SHA-256/SHA-512 and compared against the parent's saved registry metadata. Both SHA-1 and SRI matched. Registry signatures were present in metadata but **not cryptographically verified here**; byte agreement is not authentication of an npm Git revision.

| Evidence | Observed value |
| --- | --- |
| Archive SHA-256 | `21f0fe81496f168a231ff9708f0a5d67d61975972653a463ef36cbd0b0fe909a` |
| Registry/archive SHA-1 | `edabb59be4f5aeeb0054f7c80ea4e130d97835fc` |
| Registry/archive SRI | `sha512-CtaclaIowRYdZlF5JttC66z8PRM5bVr/xsQeO6K3iMjiCmkfyB66C3099KCvAg/wg1GQid+VRmWRz18b5woMXA==` |
| Extracted compiled entry (14,454 bytes) SHA-256 | `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c` |
| Shipped driver source (18,738 bytes) SHA-256 | `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` |
| Shipped prompt source (1,304 bytes) SHA-256 | `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` |
| Extracted manifest | Exact package name and 0.2.2-rc.3; rc.3 DSH peers, Cordis ~4.1.0; optional Subagent peer |

The shipped source/prompt are byte-equal to the local rc.3 tag blobs. The compiled entry digest equals the **prior observed rc.2 npm digest recorded in [port provenance](<../src/modules/goal-wait/driver/provenance.json#L69-L90>)**. This lane did not reacquire rc.2 npm; the cross-release compiled comparison is to that retained committed evidence.

The extracted compiled entry was also read directly: line **94** calls `ctx.goals.disarm`; line **357** is the initial live-Agent disarm loop; line **363** is teardown's disarm. These independently observed rc.3 emitted coordinates match the current authority observer's `:94: ← :357: / :363:` pattern. **They are not TypeScript line numbers and not a runtime stack-capture test.** Source owners are [driver disarm, source 124–132][driver-disarm], [mount/teardown, source 454–480][driver-close]; the compiled artifact hash binds the separate emitted-line observation.

## 2. Goal continuation, queue and cancellation contracts remain native

Read directly from the unchanged [driver][driver]:

1. [99–121][driver-ready]: exact live Agent, active plugin, idle whole Agent and no competing queued input; active **armed** Goal is mandatory. No durable phase rewrite is a wait mechanism.
2. [145–220][driver-schedule]: flush owed durable state, recheck after awaits, retire prior attempt bookkeeping, race `subagents.waitForTreeWork(agent)` against unload, recheck, enforce the round cap, then reserve exact goal/id/revision/round/message identity and queue at most one follow-up. There is no Jobs injection/read/subscription in this driver.
3. [274–337][driver-queue]: queued/claimed state and competing input remain fenced. A queued reservation is removed at idle so human input is not stranded; cancellation pauses only the exact still-active/armed matching ref. Host pause cancels a running turn except when the model itself initiated the pause.
4. [338–365][driver-session]: single session-event observation distinguishes admission, max-token disarm, ordinary aborted attempt cancellation and Agent-disposal disarm. Disposal preserves active durable phase rather than pretending a durable pause decision.
5. [371–451][driver-fence]: full reservation is checked before **and after** downstream pre-step hooks; stale proposals reject and restore unrelated claimed messages. Only a matching durable user-message advances admitted rounds; [Goal fold 321–330][goal-fold] rejects wrong identity/revision/round/cap.
6. [454–480][driver-close]: mounting over existing Agents does not inherit automatic authority. Teardown resolves the unload race, marks all states stopping, disarms, cancels owned running attempts, waits for idle/scheduling promises and only then drops listeners/state. Do not remove these fences merely because the source diff is empty.

The existing [Extras port](<../src/modules/goal-wait/driver/native-driver.ts#L145-L180>) already calls native `waitForTreeWork`. Its [policy fence](<../src/modules/goal-wait/driver/native-driver.ts#L390-L454>) adds eligibility at pre-step checks. Its [stop transaction](<../src/modules/goal-wait/driver/native-driver.ts#L250-L300>) publishes one idempotent stop promise before callbacks, synchronously revokes all states, unsubscribes policy before drain, cancels owned turns and settles waits. Preserve these intentional additions and the [non-atomic admission boundary](<../src/modules/goal-wait/driver/provenance.json#L98-L110>); do not advertise Job sampling as atomic request-commit admission.

The [continuation prompt, 12–26][prompt] is unchanged byte-for-byte: same session, inspect current authoritative workspace/tool/durable state, make progress, gather whole-objective evidence, read and complete the current Goal, otherwise leave it active, and honor configured blocker policy. No rc.3 prompt port is required.

## 3. Agent/Subagent trees are not creator-chain liveness

- [Public Subagent service 294–301 and 345–352][tree-api] explicitly separates live shared-root resolution from ordinary forks and says ordinary members return false for tree-work waiting.
- [Manager 251–282][tree-join] first requires `rootOf(root) === root`. For that root it joins pending materializations, all-depth progressing local members, external activations and closing/result cleanup; it re-observes members arriving while an earlier idle wait settles. Healthy idle members with parked next-step/next-turn input are deliberately left resident without blocking root completion. This is **not** “ignore every idle member”: other idle/failed states can still await result/poke/cleanup.
- [Manager 509–528][tree-root] resolves current runtime ownership by the exact live Agent and Activation root; durable creator residency is not required. A delegated session without a valid runtime owner fails unauthorized rather than becoming a root from its header alone. Ordinary Session forks can lead independent trees.
- [Child metadata 135–153][child] stamps direct creator `parentSession` and `origin=subagent` before creation. [Manager 382–395][materialize] passes this metadata into materialization. [Agent announce 551–568][agent-created] awaits serial creation listeners; [Session types 105–128][headers] and [validation 98–139][header-validation] retain read-only/frozen creation headers. These are durable provenance/navigation facts, **not authority to infer continuation mode or runtime team membership from origin alone**.
- Therefore retain Extras' [durable origin+parentSession resolution](<../src/shared-compaction/workspace.ts#L1-L50>) for creation/cold workspace policy. Do not replace it with `Subagent.rootOf()` in a creation listener, when managed membership may not yet publish; do not infer ancestry from mutable cwd or path prefixes. Conversely do not use durable creator headers to replace native shared-root continuation authority.
- The old AgentRegistry parent/owner/root helpers do not return in rc.3: the whole Agent scope has no source diff. Existing consumers should remain on their already-adapted public Subagent or immutable-header seams, not reintroduce historical APIs.

The [PTC/inbox wait][inbox-wait] also has no diff: exact Agent + rootCallId + reported message ids prevent one tool-call loop from waking repeatedly on the same pending input; it does not consume input, and settlement removes timer/listeners. This is a distinct tool-input contract, **not generic Job gating, a new Goal driver, or permission to remove Goal-wait**.

## 4. Exact Extras proof mechanisms and native dependencies

The initial rc.2 mapping read [SPEC](<SPEC.md#L25-L35>), [architecture](<ARCHITECTURE.md#L7-L9>), [migration](<MIGRATION.md#L13-L15>), [parity/transition authority](<LEGACY_PARITY_030.md#L19-L30>), [rc.2 npm boundary](<DSH_RC2_NPM_060.md#L13-L17>) and the new [rc.3 contract](<DSH_RC3_061.md#L11-L23>). No research finding authorizes relaxing their fail-closed rules. Immutable pre-adaptation Extras code anchors are the [host-version gate](https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/goal-wait/driver/host-version.ts#L16-L45), [runtime owner proof](https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/goal-wait/host-owner.ts#L223-L245), [migration proof](https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/migration/native-owner.ts#L22-L100), [authority observer](https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/goal-wait/authority.ts#L7-L95) and [serialized restore/close](https://github.com/LMGateX/dsh-extras/blob/1b4b9a2c15be6293b5d92f1820ce811904938d93/src/modules/goal-wait/host-owner.ts#L290-L400); working-tree links below are navigation, not frozen post-adaptation observations.

| Existing mechanism (read before adaptation) | Exact dependency / required preservation |
| --- | --- |
| [Host profile proof](<../src/modules/goal-wait/driver/host-version.ts#L16-L45>) | Node >=24.9; Cordis 4.1.0; exact rc.2 participating packages including conditional Subagent providers; compiled Goal SHA-256. [Mode refresh](<../src/modules/goal-wait/mode.ts#L74-L90>) reaches it for **all four strategies**, not only replacement. Refresh exact version coherently, never widen ranges. |
| [Runtime owner discovery](<../src/modules/goal-wait/host-owner.ts#L223-L245>) | Independent exact Goal version/digest, Cordis/Loader versions; actual Loader inventory and unique Entry; Loader-selected callback must equal the directly resolved verified callback. A matching name or callback alone is insufficient. |
| [Migration owner proof](<../src/migration/native-owner.ts#L22-L100>) | Explicit install anchor; actual Cordis Context/root/isolate and Loader instance; startup root/callback markers; unique enabled nondynamic stock row; Entry namespace apply/callback, exact raw fiber, root and public fiber.entry association. Disposed stock pointer proves known inactivity only. Offline absence of proof is refusal, not takeover permission. |
| [Transition observer](<../src/modules/goal-wait/authority.ts#L7-L95>) | Temporary descriptor-owned public disarm wrapper; captures exact active identity/revision, consumes explicit port lifecycle marks, recognizes only exact artifact immediate compiled frames 94←357/363. Source maps, unknown/altered native frames, external same-value disarm and descriptor replacement never grant restoration. It CAS-restores only its own descriptor and resumes only the exact live still-active/disarmed unrevoked ref. |
| [Stock suppression](<../src/modules/goal-wait/host-owner.ts#L108-L191>) | Owned instance effective-disabled getter delegates native intent/ancestors; never edit durable options/prototype/namespace. Delete only proven stock callback registry identity before drain so Loader does not persist self-disable. Do not delete a shared foreign callback runtime. |
| [Pending candidate guard](<../src/modules/goal-wait/host-owner.ts#L192-L220>) | Only the exact owned not-yet-applied pending restoration candidate may shadow Entry.key on a derived parent and detach its writable public entry association before disposal. Never detach active/foreign fibers or mutate the real Entry context. |
| [Drain/restore/close](<../src/modules/goal-wait/host-owner.ts#L290-L400>) | Serialized generation-fenced transactions; stop owned and await every drain before stock initialization/new admission; recheck foreign owner/intent after awaits; keep synchronous guard and claims through close; retain failed-cleanup/conflict diagnostics and descriptor CAS. [Mode disposal](<../src/modules/goal-wait/mode.ts#L132-L146>) awaits owner close before dropping observer. |

### Why the Loader contract still matters despite zero source diff

[Entry 75–94][entry] exposes effective disabled (including ancestor/expression state); [app-boot 1062–1103][appboot-inactive] consults it **before** classifying stopped fibers as failure. [Entry 225–237][entry-init] imports, creates its registry plugin and retains namespace/fiber; [HMR 683–689][hmr-rebind] explicitly rebinds public fiber.entry and the Entry fiber wrapper. [Loader 128–173][loader-lifecycle] can reattach entry from its parent Context and can persist `disabled:true` on self-disposal while the callback is still registered. These explain the exact runtime-only getter, registry ordering and pending-parent shadow; they are not arbitrary implementation details that a version bump may bypass. Entire source scopes and manifests for Loader/Cordis are unchanged, but this lane has **not** executed their emitted rc.3 lifecycle in a native process.

## 5. Goal-wait necessity on rc.3

| Strategy / state | What it owns | Still useful / limitation |
| --- | --- | --- |
| Module disabled | No Extras feature hooks; native stock continuation available | Sufficient for native progressing-root-tree semantics; unlike enabled off. |
| native | Official driver, no Extras gate | Recommended when native tree progression is all that is needed; no generic Job wait. |
| activation (default) | Official driver plus owned process-local disarm/resume hold | Configured running/stopping Job wait and conservative registered creator-descendant hold. Includes idle/parked residents, unlike native join; can hold indefinitely by policy. |
| replacement | Exact native-derived port + additive Job eligibility | Normal waiting does not disarm. Native tree join still applies; no second all-resident barrier. Exact-byte/owner/frame maintenance remains a real cost. |
| off | Runtime-only stock suppression, no replacement driver | Intentional no-auto policy, not disabling Extras; disable must safely restore stock. |

Sources: [mode/owner selection](<../src/modules/goal-wait/host-owner.ts#L336-L400>), [defaults](<../src/modules/goal-wait/config.ts#L8-L14>), [activation live descendants](<../src/modules/goal-wait/live-work.ts#L123-L161>), [activation Job status filter](<../src/modules/goal-wait/live-work.ts#L105-L120>) and [replacement eligibility](<../src/modules/goal-wait/driver/background-work.ts#L72-L93>).

Keep defaults activation, waitForJobs=true, waitForSubagents=true, maxHoldMs=0. In replacement, waitForSubagents=false **does not disable native root-tree joining**; when generic Job waiting is off but subagent waiting is on, kind=subagent Jobs still count. maxHoldMs is the activation escape timer, not a native/replacement join timeout. [Job filter](<../src/modules/goal-wait/driver/background-work.ts#L44-L46>) [activation timer](<../src/modules/goal-wait/gate.ts#L182-L189>)

Retain the explicit [activation authority limitation](<LEGACY_PARITY_030.md#L24-L30>): repeated same-value external disarm **during an ordinary gate hold** is observationally ambiguous without a native owner token. The temporary exact-frame handover observer detects revocation only while installed; it does not magically solve ordinary hold overlap. Do not claim an absolute external-disarm guarantee, erase the limitation, silently select replacement/native, or change durable phase to hide a wait. No rc.3 source change supplies a native token or generic Job policy to justify removing these distinctions.

## 6. Bounded implementation/validation implications (not executed here)

1. Refresh exact rc.3 participating versions in host proof, owner discovery, migration proof and coherent graph/development/provenance gates; retain observed compiled digest and immediate frame pattern. Keep rc.2 published support historical rather than accept it through a speculative range. The inspected archive permits this narrow change; source equality **alone** would not.
2. No driver/prompt/Agent-tree algorithm port is needed based on this diff. Preserve native root-only join, ordinary-member behavior, durable creator provenance, queued/claimed cancellation, disposal-abort behavior and exact goal/id/revision/round fences.
3. Run public native tests independently: all modes/defaults; generic running→stopping→settled Jobs; kind=subagent Jobs with generic Job wait disabled; progressing deep root work vs ordinary member Goals; healthy parked inboxes; arriving materializations/external cleanup; no duplicate rounds/busy polling.
4. Re-execute lifecycle negative proofs on actual installed rc.3: unknown/wrong version/bytes, offline missing proof, foreign Context/Loader/Entry/callback, programmatic official callback, startup owner markers, duplicate combined/split, source maps/unknown stack, same-value revocation, descriptor replacement, late foreign mount during restoration. Exercise phase/revision changes, queued/claimed/admitted cancellation, pause/resume races, unload waiting on tree join, dependency pending/failure, stock remount and zero persistent disable writes.
5. Acceptance must observe one physical native graph, policy-only live updates without remount, full awaited drain and safe disabled/off restoration through normal ConfigEditor/Loader seams, plus the required packed/native/browser suites. Source inspection and archive hashing are not substitutes for any of those results.

### Read-only audit method

Local Git operations were rev-parse/status, scoped diff/stat/name-only and raw-blob SHA-256 (git show bytes hashed without evaluation). Text was inspected with the read tool. The parent's existing archive was hashed without extraction/install/repair by this lane. Representative reproducible comparisons:

```sh
 git -C /tmp/extras-rc3.OS6Qcw/upstream rev-parse HEAD dsh-v0.2.2-rc.2
 git -C /tmp/extras-rc3.OS6Qcw/upstream diff --name-only dsh-v0.2.2-rc.2..dsh-v0.2.2-rc.3 -- packages/goal packages/core/agent packages/core/agent-loop packages/core/session packages/subagent packages/jobs vendor/cordis vendor/loader packages/boot/hmr packages/boot/app-boot
 git -C /tmp/extras-rc3.OS6Qcw/upstream show dsh-v0.2.2-rc.3:packages/goal/goal-round-driver/src/index.ts | sha256sum
```

Source comparisons and hash commands returned exit 0. Final documentation checking used a no-index diff against /dev/null: it returned 1 because the file is added, with no whitespace diagnostics. No tests/runtime/browser coverage is claimed by this report. The source checkout/archive remain parent-owned audit resources, not newly created jobs or installations by this lane.

## Immutable primary-source references

[driver]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts
[driver-ready]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L99-L121
[driver-disarm]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L124-L132
[driver-schedule]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L145-L220
[driver-queue]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L274-L337
[driver-session]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L338-L365
[driver-fence]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L371-L451
[driver-close]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/index.ts#L454-L480
[driver-manifest]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/package.json#L1-L15
[prompt]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal-round-driver/src/prompt.ts#L12-L26
[goal]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal/src/index.ts
[goal-fold]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/goal/goal/src/fold.ts#L313-L330
[agent]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent/src/index.ts
[agent-created]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent/src/index.ts#L541-L568
[loop]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent-loop/src/index.ts
[session]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/index.ts
[header-validation]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/index.ts#L98-L139
[headers]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/types.ts#L95-L128
[tree-api]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/index.ts#L294-L352
[manager]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/manager.ts
[tree-join]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/manager.ts#L246-L282
[tree-root]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/manager.ts#L503-L528
[materialize]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/manager.ts#L382-L395
[child]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/subagent/src/child-agent.ts#L121-L153
[inbox-wait]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/subagent/tool-subagent-control/src/wait-agent.ts#L17-L89
[entry]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/src/config/entry.ts#L42-L94
[entry-init]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/src/config/entry.ts#L225-L237
[loader]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/src/index.ts
[loader-lifecycle]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/src/index.ts#L128-L173
[loader-manifest]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/package.json#L1-L15
[cordis-manifest]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/cordis/package.json#L1-L16
[fiber]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/cordis/src/fiber.ts
[hmr]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/hmr/src/index.ts
[hmr-rebind]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/hmr/src/index.ts#L683-L689
[appboot]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/index.ts
[appboot-inactive]: https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/index.ts#L1062-L1103
