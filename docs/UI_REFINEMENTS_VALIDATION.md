# UI refinements — final isolated validation

**Status: complete isolated implementation and acceptance; not publication or live installation.** Date: 2026-11-09, Asia/Shanghai. Frozen implementation: adcdb7b78431fbbb57becd28be23d9051bb4aef3. Baseline: a25396014e6f8ded5b6ac2589d21d03029f79c70. Dedicated retained branch: refine-recovery-workspace-ui. Subsequent closeout is documentation-only.

The [contract](<UI_REFINEMENTS_050.md>) was fixed before implementation. The user-named [reference repository](</home/dev/dev/dsh-mattpocock-skills/>) was read-only. No public tag/assets were replaced, no push/release/install/restart or live GUI modification was performed. All archives below retain local version 0.5.0 for acceptance only and must **not** replace published v0.5.0 assets.

## Delivered behavior

- Recovery is silent for normal, running, cancelled, historical, non-model and unknown-origin turns. The true complete native turn outline proves latest ownership; exact contiguous public failed-assistant-attempt evidence proves model failure. Rendering and clicks recheck head/origin/session state. A working button still requires the separate current native revision-bound eligible checkpoint; no new messages, whole-turn/tool replay, extra retry loop or broadened permission.
- The recovery surface has its own heading, textual state, explanation, border/spacing and separated primary/secondary actions, native light/dark colors, keyboard focus and narrow wrapping. Provider error text is not rendered.
- Model defaults and both shared compaction surfaces switch global and multiple native workspaces. Exact opaque IDs remain persistence identity; saved/orphan IDs remain reachable, and unavailable discovery retains an explicit validated-ID fallback rather than silently choosing global.
- Missing workspace configuration inherits global. Model roles inherit independently; explicit null retains native selection. Shared compaction remains a whole-policy override: false and empty rules are explicit values. Reading/selecting does not create overrides; dirty/in-flight state locks scope switching. Model reset is staged until Save; Shared reset retains its explicitly labelled immediate CAS operation. Neither reset changes another workspace/global.
- Canonical schema, profile namespace, one store/CAS chain and executor election are unchanged. Native workspace stream ownership remains native. The workspace controller dependency and picker source ship only in the three distributions containing workspace settings.

## Exact final gate receipts

The single parent runner recorded the [source commit](</tmp/extras-ui-final-gates.MZ14Rj/source-head.txt>) before execution and settled with exit 0 / ALL_UI_FINAL_GATES_PASS. No implementation bytes changed during the run.

| Gate | Actual result | Execution log |
| --- | --- | --- |
| TypeScript | PASS | [typecheck](</tmp/extras-ui-final-gates.MZ14Rj/typecheck.log>) |
| Full source, 72 files | **698/698**, 0 fail/cancel/skip; 182209.84 ms | [source](</tmp/extras-ui-final-gates.MZ14Rj/source.log>) |
| Six-package build | PASS | [build](</tmp/extras-ui-final-gates.MZ14Rj/build.log>) |
| Six-package pack | PASS | [pack](</tmp/extras-ui-final-gates.MZ14Rj/pack.log>) |
| Packed clean consumers, native CLI/profile/browser | **49/49**, 0 fail/cancel/skip; 348900.33 ms | [artifacts](</tmp/extras-ui-final-gates.MZ14Rj/artifacts.log>) |
| Actual unofficial native candidate + current packed combined/retry | **6/6**, 0 fail/cancel/skip; 6105.62 ms | [native recovery](</tmp/extras-ui-final-gates.MZ14Rj/native-recovery.log>) |

The [runner](</tmp/extras-ui-final-gates.MZ14Rj/run.sh>) used a whitelist environment with disposable HOME/DSH_HOME/profile/TMPDIR/XDG/npm cache, an audited read-only Chromium executable, and explicit original/current Goal module entries. It ran, in order:

	npm run typecheck
	npm test
	npm run build
	npm run pack
	npm run test:artifacts
	node --test --test-concurrency=1 test/native-recovery/packed-native.acceptance.ts

Native recovery uses the separate unchanged isolated unofficial native anchor/manifest, never the global host. The actual rebuilt six-case gate verifies exact failed request dispatch, one accepted execution for duplicate/lost-response retries, native admission/disabled/stale refusal, finite budgets 3→6→7, completed-tool count staying one, and zero dispatch in fresh-process exact-snapshot-unavailable reconstruction.

## Red–green evidence and corrected findings

- Contract-first fbfb73f; common native catalogue/selector a7884c3 followed an emitted-browser missing-workspace RED then GREEN. Parent Model integration 36f2034 shows effective inherited values, A/B isolation, explicit null, global propagation, orphan reset and empty-role pruning. The [final Model/UI matrix](</tmp/extras-workspace-style-green.ypSiaz/result.log>) passed 9/9; [setup-only refactor](</tmp/extras-workspace-refactor-green.Mqc0Az/result.log>) retained 9/9 and every assertion.
- Shared integration e379aab passes the [two-entry route/browser/form matrix](</tmp/extras-shared-workspace-matrix.v70av5/log>) 7/7: false/[], B/global preservation and propagation, independent B custom policy, held clean reset locking both selectors, reload/orphan access, invalid-ID read-only behavior, old CAS/draft/duplicate-write checks. A client prototype-name ID RED was fixed with own lookup, not a forbidden-ID workaround.
- The native counterpart was independently traced through real decoding/clone semantics, then [public native RED](</tmp/extras-runtime-opaque-red.qEtDva/red.log>) demonstrated toString inheriting undefined instead of canonical-default while another override existed. Minimal fix 6e6ac50 preserves own custom values and passes [37/37 shared native cases](</tmp/extras-runtime-opaque-green.Dljo7o/green.log>) and typecheck. Storage/schema/authority do not change.
- Initial recovery styling/latest-head work 2f60be6 passed focused safety, but independent Spec correctly found that generic turn/end error also covers tool activation/preparation/hook failures. This was not waived. The [non-model RED](</tmp/extras-recovery-ui-run.u5QSjk/red-nonmodel.log>) was followed by adcdb7b positive failed-attempt suffix proof, negative missing/gapped/wrong-step/intervening/retry/success-before-preparation cases, and [all 10 original safety cases GREEN](</tmp/extras-recovery-ui-run.u5QSjk/origin-safety-final.log>). The final packed six-case run above confirms actual native records still satisfy the stronger check.

## Independent frozen-code review

Both reviewers used fresh independent contexts, read-only Git/source inspection and the complete baseline…adcdb7b range. They did not execute tests, build/install, or access the live host; their review is not execution proof.

### Standards

**0 documented violations/blockers; 1 optional low-priority heuristic.** One shared discovery/navigation implementation, editor-owned draft/save behavior, named/reused origin checking, separate latest-head and host authority, own-property capture and selected payload boundaries conform to the documented standards. Model test setup duplication was removed; the Shared browser test still has optional repeated setup plumbing. It is not a hard violation and has no claimed behavior effect.

### Spec

**0 open source-level findings.** Both real findings are closed: non-model terminal errors require positive model failure proof (adcdb7b), and absent exact opaque-ID override inherits global in the native executor too (6e6ac50). Global/multiple scopes, saved orphans, manual fallback, readiness, null/false/[] distinctions, explicit reset semantics, and dirty/in-flight locks were rechecked. No source requirement gap or scope creep remained. Final delivery execution is established by the separate current-byte receipts above.

## UI evidence and limitations

Actual isolated emitted/native-chat style previews: [Chinese dark recovery, 360 px](</tmp/extras-recovery-ui-run.u5QSjk/screenshots/recovery-zh-dark-360.png>), [English light recovery, 900 px](</tmp/extras-recovery-ui-run.u5QSjk/screenshots/recovery-en-light-900.png>), [Chinese dark inheritance, 360 px](</tmp/extras-workspace-style-green.ypSiaz/screenshots/workspace-zh-dark-360.png>) and [English light inheritance, 900 px](</tmp/extras-workspace-style-green.ypSiaz/screenshots/workspace-en-light-900.png>). Current full source reran all keyboard/theme/no-overflow assertions. These are test-environment previews, not evidence the current live GUI was updated.

- Stock recovery remains unsupported unless the separately tested unofficial native extension is activated. No activation is performed here; an unavailable host never receives a fake working action.
- The actual adapted-host recovery browser uses real native chat owner/renderer components with bounded session/configuration transport faces; it does not claim a complete adapted SessionController wire/application bootstrap. Fresh-process event-seed reconstruction is not full CLI cold-open of a persisted native JSONL profile. Existing [native packed acceptance boundaries](<NATIVE_RECOVERY_PACKED_ACCEPTANCE_050.md#explicit-remaining-boundaries>) remain in force.
- All local follow-up archives are unissued acceptance builds, not a new release. The dedicated worktree and scoped commits are retained for review/handoff. No old source repositories, current profile, live server or official global native core were modified by this follow-up.

## Local tested archive identities

[Generated checksum receipt](<../artifacts/SHA256SUMS>) binds all six current archives:

| Local acceptance archive | SHA-256 |
| --- | --- |
| [dsh-extras-0.5.0.tgz](<../artifacts/dsh-extras-0.5.0.tgz>) | `cb6d4278854591516c33be16608243adc8fd95f6feecf71a2deed73ce3c57751` |
| [dsh-extras-compact-context-0.5.0.tgz](<../artifacts/dsh-extras-compact-context-0.5.0.tgz>) | `c7030bc1ae59e7345258d94aef943d33ac2462256c84d507fd6b02dccbf41926` |
| [dsh-extras-retry-0.5.0.tgz](<../artifacts/dsh-extras-retry-0.5.0.tgz>) | `9202ffdc1749324f84a7755107be14d49cd8999d8dfd803e463ed0d9d2af5c76` |
| [dsh-extras-chime-0.5.0.tgz](<../artifacts/dsh-extras-chime-0.5.0.tgz>) | `582c60589027dd85a46ba1bce74e3fa8ea436752e6f2ef8a19e7e259f1c2816b` |
| [dsh-extras-goal-wait-0.5.0.tgz](<../artifacts/dsh-extras-goal-wait-0.5.0.tgz>) | `601b68555bd65a84de8e6f191e69f6fa08b422b055880c647ccb1df523ce1fa2` |
| [dsh-extras-model-policy-0.5.0.tgz](<../artifacts/dsh-extras-model-policy-0.5.0.tgz>) | `b5e709e28a2ce6d877749cbbc9c8425f6689424a12b8e673d2335c18d7cfb62a` |
