# Extras 0.5.0 — release validation ledger

Status: **in progress; not publication or installation acceptance**. Date: 2026-11-09 (Asia/Shanghai). Final frozen source/artifact, adapted-host recovery, remote receipts and authorized local installation are separate outstanding gates. No current success claim should be inferred from package version fields or focused lane results.

## Fixed scope and isolation

Baseline `c78f7fd50dded258e6a4991b6cc14dc9405e3352`. Approved [workspace specification](WORKSPACE_POLICY_050.md), [native recovery authorization](NATIVE_RECOVERY_050.md), [acceptance matrix](ACCEPTANCE.md), [migration contract](MIGRATION.md) and [architecture](ARCHITECTURE.md) remain authoritative. Stock compatibility baseline is exact DSH 0.2.2-rc.1 and Cordis 4.1.0. An adapted native recovery host is explicitly unofficial and requires its own exact source/build manifest and tests.

Development uses the dedicated `workspace-model-policy` Git worktree; native extension development uses a separate official-source clone at peeled tag commit `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`. Disposable HOME/DSH_HOME/profile/cache and ephemeral non-production ports are mandatory. The active host, real profile and GUI are not test fixtures. Shared final build/pack outputs have one writer; focused browser fixtures build only their own temporary source consumers. Final tests must rebuild frozen source rather than reuse the earlier debugging archives.

## Evidence collected before freeze

| Gate | Observed state before final convergence |
| --- | --- |
| Full exploratory source/native/browser run | 634 tests: 629 pass, 5 fail, 0 skipped/cancelled. Failures confined to old selected-payload and settings-presentation browser fixtures: outdated four-module/peer assumptions and missing canonical HTTP policy fixture. Preserved full log; fixture repairs and rerun pending. This is **not** acceptance. |
| Shared compaction lane | 94/94 focused source tests, including 15/15 actual native compaction entry paths; root-canonical JSON/storageDomain/CAS and active-readiness changes retain original assertions. Disabled whole-module seed handling was subsequently identified as an additional integration requirement and is still being repaired/reviewed. |
| Model policy lane | 16/16 focused source tests including 11 actual native Agent/LLM scenarios, two emitted Chromium language cases, two editor cases and config validation. Independent review subsequently found two untested edge cases, listed below; their red-green regressions supersede this preliminary green. |
| Retry policy lane | 65/65 native/provider/configuration/Chromium tests plus explicit editor dirty-marker regression; normal5 is six dispatches/five retry events, native always-mode AUTH cancellation checked. No second request loop. |
| Collapse lane | Emitted and actual temporary packed browser cases pass, with retained editor DOM/draft/subscriptions and zero collapse writes; forms/presentation source cases 29/29. Older full-suite presentation fixtures require five-module/shared-authority updates. |
| Packaging/root/migration lane | Six strict clean npm consumers/public declarations and selected peers, three packed native compaction distributions, native plugin CLI manifests/splits coexistence and full native browser settings persistence pass on debugging archives. Additive old-journal provenance/partial-policy adoption and settings admission/getConfig callback regressions pass. Final recovery adapter selected-source assertion was deliberately red on old archives; final frozen rebuild is required. |
| Recovery adapter integration | 27/27 focused Cordis/client-lifetime/owner HTTP tests plus full typecheck passed after optional-factory/root wiring. Separate native-like protocol browser fixture is **not** proof of adapted native core or real native chat runtime. |

See focused evidence in [model policy](MODEL_POLICY_050.md), [shared compaction](SHARED_COMPACTION_050.md), [retry management](RETRY_POLICY_050.md), [collapse](SETTINGS_COLLAPSE_050.md), [packaging](PACKAGING_050.md) and [optional request recovery](REQUEST_RECOVERY_050.md).

## Independent review — two axes, not one aggregate score

### Standards

Reviewer inspected the baseline diff and arriving changes through `aa898744a76d2b4251742c0d1cbc885ad0199bd0`, including pending disabled-seed integration. One concrete hard breach: multiplying whole-module enablement into the policy before storing recoverable legacy input loses an original nested enabled:true and creates artificial conflicts. No additional consequential smell recommendation was established. Actual independent focused source tests passed 9/9 plus 12/12 in disposable environments. Final corrected-seed/frozen-HEAD recheck remains required.

### Spec

Reviewer established: (1) blank/invalid current-workspace scope could fall through to global model-policy draft mutation; (2) unrelated accepted policy updates could invalidate an awaited creation/live-selection token without scheduling an equivalent replacement; (3) the disabled-seed participation/master conflation described above. Fixes require public regression tests and final independent recheck; none is waived merely because earlier focused tests passed. Pending native recovery and disabled-seed work are not treated as completed implementation.

## Final gates still required

1. Complete and commit review fixes; finish shared legacy import diagnostics and exact-value recovery tests. Freeze source and record HEAD.
2. Run full typecheck/source suite in a clean environment whitelist; retain complete logs and inspect exit codes. Serially rebuild/pack all six distributions from that HEAD, then run every artifact/native CLI/strict declaration/browser gate on those exact archives.
3. Recheck the frozen diff on both review axes; retain findings and red-green fix evidence without conflating protocol-fixture coverage with real native execution.
4. Independently identify/build the native recovery companion; prove true failed-request checkpoints, finite provider budgets, current permission/archive/Goal admission, no synthetic messages or completed-tool replay, exact request during retries, cancellation, duplicate/stale/disposal/restart behavior, real HTTP/packed browser/native-slot integration and compatibility with other Extras features.
5. Push and create the authorized release only after engineering acceptance. Download all remote assets independently and compare hashes to the tested archives; record exact URLs and checksums. Do not use Actions or npm publishing.
6. Only then perform the explicitly authorized local Extras installation with restricted backup, discovered native plugin-management interface and rollback. Distinguish installed bytes, active process state, client reload and restart requirements. Never kill the active host implicitly.

## Native companion and rollback boundary

The extension currently touches native agent types, agent-loop execution, retry terminal disposition, Goal-domain admission and the generated Session known-event table. Stock goal-round-driver code/fingerprint remains unchanged. New failure/recovery audit events are metadata-only but required: unchanged session-format number is **not** a promise that stock readers can open newly adapted logs. Old readers safely reject unknown required events. Adapted-host candidate tests must use isolated profiles; production rollback must restore the matching protected profile backup rather than mix adapted logs into stock runtime. Final companion source commit/build hashes and actual installation disposition are not yet established in this ledger.
