# Goal parity lane execution evidence

Baseline d79aa348d0e08517d72f5ada8ac9db27ca88a352; source port cbd86273660893336afaee31794b5fd76487db78 (0.4.23). All cases cross public Config/apply/runtimeStatus or actual native goals/jobs/Agent seams; no private-method assertions.

## Incremental red → green slices

1. Four strategy Config/defaults: `node --test test/modules/goal-wait/live.test.ts`: red 1 failed/2 passed (missing strategy schema), green with plugin regressions 30 passed.
2. Initial sweep: same focused command: red 1 failed/3 passed (pre-existing goal remained armed), green plus plugin regressions 31 passed.
3. Quiet native Job settle: `HOME="$PWD/.sandbox-lane-goal/home" DSH_HOME="$PWD/.sandbox-lane-goal/dsh" TMPDIR="$PWD/.sandbox-lane-goal/tmp" node --test test/modules/goal-wait/host.test.ts`: red 1 failed/1 passed (goal stayed disarmed without artificial idle), green 2 passed using actual DSH 0.2.2-alpha.3 goal/job services and official driver. No network/provider/GUI.
4. Incremental descendant buckets via apply: live test red 1 failed/4 passed (5 redundant registry scans), green plus plugin regressions 32 passed (0 redundant scans; disposal releases hold).

Native integration command setup: `mkdir -p .sandbox-lane-goal/home .sandbox-lane-goal/dsh .sandbox-lane-goal/tmp`; no live profile touched. Harness fake service cases are not claimed as native acceptance.

5. Fiber-scoped runtimeStatus: missing export red; green 33 existing/public module cases, including detached reads and post-unload disabled status. No global HOME status file or route.
6. Actual ordinary native replacement: red timed out with no mounted port; green with real Loader stock suppression, exact alpha.3 audit, armed Job wait, quiet completion and exactly one round/provider request. Initial test fixture could not resolve nested host packages from its profile and was corrected to use the real host-anchored Loader; this was fixture resolution, not reported as a feature failure.
7. Owned activation hold → replacement: red native revision 1 instead of expected 2; green restores only exact same held goal using public native resume (one documented revision increment). No private setActivation or phase editing.
8. Replacement → off → native: red lost authorization (and an earlier raw-fiber identity mistake); green consumed-once explicit lifecycle disarm marking, off with no driver, stock restoration, and native dispatch.
9. Concurrent external same-value revocation during actual stock teardown: raising Error.stackTraceLimit to 50 exposed a red safety regression (nested external call looked native after filtering stack frames). Green requires immediate native lifecycle frames, not a native frame anywhere in the stack. Explicit port lifecycle marks are consumed before callbacks can reenter.
10. Unload: red stock returned but the legitimate goal remained disarmed; green single observed/awaited cleanup via owner autoDispose:false, restoring stock/eligibility and removing the temporary descriptor observer. Root shutdown never re-arms goals.
11. Live replacement policy save: red timed out with no dispatch; green globally scoped native volatile-event wake without driver remount. Job event observation exists even when initial waits are disabled, so later policy enables remain observable.
12. Duplicate module admission: red rejected activation peer disarmed the current replacement owner goal; green real Loader hosts admit the gate only after verified owner transition. Manual service-only gate tests remain explicitly unavailable for native-driver diagnostics.
13. Quiet descendant disposal: red held ancestor stayed disarmed; green targeted live ancestor wake after incremental disposal maintenance. Fake registry was corrected to resolve session identity like the native registry.
14. Unknown truncated native lifecycle stack: red incorrectly reported active success after losing authorization; green leaves it disarmed and reports unavailable. Source-mapped native lifecycle frames are conservatively unsupported for restoration; altered native artifact bytes fail the exact hash check.

Additional **actual native regressions** (already green on the preserved port, no invented red claim): progressing local child blocks reservation; the same real resident child parked with a pending inbox does not get double-blocked; external provider with no local Agent waits through owned resource cleanup; busy replacement drain is unavailable/pending with stock still absent, and concurrent external disarm remains disarmed; active externally-disarmed/paused/blocked/complete goals keep their exact identity/revision/phase through repeated switches and unload. Existing maxHold/goal-edit/current-ref/fork/no-owned-hold external-disarm checks retained. Activation's same-value overlap limitation is explicitly tested as inherited behavior, not "fixed" by force-resume.

## Adapter dependencies and final checks

Native owner is another lane's dependency, not reimplemented here. Integrated exact commits 0e79abea2f2581641ed5fceedb00e4a3db05158c, fbceff5096d368596603320509e5f927c3b8bcad, and 6b4703c3b7e6c18011c6d4f5439cda64baf695a7. The temporary authorized adapter snapshot SHA-256 was 4dad258c046a146a759026dba57cbc9c07bc122a7d57cd858fd69b0bf7bc86d6, verified identical to the first formal commit and replaced by cherry-pick before final tests. Later adapter review fixes must be integrated and re-run before release.

Executed final focused command (before the last two diagnostic/overlap additions):

~~~sh
HOME="$PWD/.sandbox-lane-goal/home" DSH_HOME="$PWD/.sandbox-lane-goal/dsh" TMPDIR="$PWD/.sandbox-lane-goal/tmp" \
  node --test --test-concurrency=1 test/modules/goal-wait/*.test.ts \
  test/integration/goal-strategies.test.ts test/integration/native-driver-lease.test.ts
npm run typecheck
git diff --check
~~~

Result at that checkpoint: 60 passed / 0 failed / 0 skipped / 0 cancelled. Final rerun after diagnostic/overlap/quiet-descendant additions: 63 passed / 0 failed / 0 skipped / 0 cancelled; the following typecheck initially caught an unannotated ancestor array, corrected to its native Agent type, then typecheck + whitespace checks both exit 0; typecheck and whitespace check exit 0. Packed-native/browser/clean-consumer evidence belongs to the integration lane and is not claimed from these source imports. No install, push, release, live GUI or real HOME/profile mutation performed by this lane.

15. Full Config/apply/runtimeStatus dependency-pending port slice: initially reports actual pending/unavailable/none; after a legitimate goal was created during pending, late native Jobs mounting exposed red 0 dispatch forever (the port mount sweep disarmed the new goal). Green keeps the transition observer until the actual native fiber activates, captures only the exact directly observed owned lifecycle mutation, restores with public exact-ref resume, and cleans the observer. A pending replacement can also switch back to stock and continue that goal without waiting for the absent dependency. Native owner stale pending reason after activation was reported to its owner for authoritative cleanup.
