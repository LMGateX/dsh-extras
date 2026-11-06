# PTC / empty-stop lane evidence

Date: 2026-11-06 (Asia/Shanghai). Lane: parity-ptc-retry-evidence, based on d79aa348d0e08517d72f5ada8ac9db27ca88a352. Native baseline actually loaded: DSH 0.2.2-alpha.3. Tests cross the approved module Config/apply, native configuration, Agent preset, public PTC resolve/run and public retry stream interfaces; no private-method tests.

## Executed red → green slices

1. Wrote only the late-runtime tracer in [the native acceptance test](<../../integration/native-ptc-timeout.test.ts>) before implementation. Ran    `node --test --test-concurrency=1 test/integration/native-ptc-timeout.test.ts` in disposable HOME/DSH_HOME/TMPDIR. Exit 1: **0 pass / 1 fail**, native resolved deadline **120000 !== 300000**. Then changed only [the PTC adapter](<../../../src/modules/compact-context/ptc-timeout.ts>) to observe native provision/lookup and own each runtime wrapper. Re-ran the tracer plus the existing compact module suite: **48 pass / 0 fail**, exit 0. No index adaptation was necessary.
2. Added scoped native preset execution, explicit-value, full durable header, replacement and unload characterization one at a time, running each slice before proceeding. These were green after the dynamic-runtime fix; no invented pre-fix failure is claimed. Native fixture development first exposed a setup callback return-shape error and an incorrect assumption that PTC result has an ok field; both were test-harness corrections, not product defects.
3. Foreign descriptor ownership: the corrected test preserves the exact function value from the public native runtime descriptor, changes its flags, then unloads the module. Exit 1: **5 pass / 1 fail**; actual descriptor became undefined instead of preserving the foreign descriptor. Minimal fix checks the entire installed data descriptor before restoration. Re-run: **6 pass / 0 fail**, exit 0. A preliminary test using a Cordis-bound method read was insensitive and passed; it was corrected before this red result.
4. Added the captured empty-stop unload regression in [retry stream tests](<../retry/plugin.test.ts>). It passed on arrival: **19 pass / 0 fail**, exit 0. No retry implementation change. The first chunk is thinking-only, followed by unloading before finish.stop; the original frozen finish/replay object is yielded by identity, provider source invoked once, no compatibility log. Existing empty-response tests still demonstrate classification while loaded.

Ignored per-step raw logs are retained in this lane under .sandbox-lane-ptc (not release/source assets). The key runs are 01-late-red, 02-late-green, 10-owner-red, 11-owner-green, 16-empty-stop-green and 20-final-regressions.

## Native objects and actual calls

- Actual Cordis Context, native Agent/session, Loader/ConfigEditor and AgentPresetRegistry are used; runtime identity is asserted with instanceof the loaded NodePtcRuntime. Two native presets mount nested isolated ptcRuntime services. They are distinct objects; the root has no ptcRuntime. Slow/model gets its exact capped 500000 ms and another Agent gets global 300000 ms.
- Actual NodePtcRuntime.run executes a synthetic TypeScript program and returns value 42 with no error.
- Actual exported PtcExecutor.execute runs the reserved run_code transport. A public resolve observer records **one** request, its stateOwner is the exact native Agent, request timeout is omitted, resolved spec timeout is **300000**. The real Node PTC subprocess invokes a registered offline nested tool **exactly once** and returns native-nested-call.
- Native full request/header routing is observed after real offline Agent turns. An uncommitted model.select retains the previous full header timeout; the next real turn commits the next header and selects its timeout. No header falls back to Agent options.
- Explicit 1234 ms remains 1234; explicit 900000 is natively capped to 600000; explicit null stays null; explicit 0 and -1 retain native positive-finite validation errors. They are not silently replaced by Extras defaults. Configuration ptcTimeoutMs=0 is a different field: with an empty map it removes the modifier and restores native 120000.
- Native ConfigEditor changes replace the global default live, remove it with 0/empty map, and enable a map-only exact Agent route. Runtime destruction/replacement, module unload, captured-wrapper inertness, later provision after unload, pre-existing-runtime discovery and original descriptor restoration are executed.

## Reproducible final commands and results

The native test also allocates its own short /tmp/ex-ptc-* HOME/DSH_HOME/TMPDIR/XDG roots before starting any host/process and verifies realpath parent and basename before removal. The broader existing suites were additionally launched with an explicit disposable outer environment:

```sh
root="$(mktemp -d /tmp/ex-ptc-XXXXXX)"
export HOME="$root/home" DSH_HOME="$root/dsh" TMPDIR="$root"
mkdir -p "$HOME" "$DSH_HOME"
node --test --test-concurrency=1 \
  test/modules/compact-context/*.test.ts \
  test/modules/retry/*.test.ts \
  test/integration/native-ptc-timeout.test.ts \
  test/integration/scoped-compact-context.test.ts \
  test/integration/native-compaction-reasoning.test.ts
result=$?
case "$root" in /tmp/ex-ptc-??????) rm -rf -- "$root";; *) exit 90;; esac
exit "$result"
```

Final result: **152 tests passed, 0 failed, 0 skipped, 0 cancelled**, exit 0, about 8.48 s. This includes retained compaction, reasoning and official retry regression coverage. TypeScript `/home/dev/dev/dsh-extras/node_modules/.bin/tsc --noEmit` and `git diff --check` both exit 0. Dependencies were resolved from the existing ancestor node_modules; nothing was installed.

## Limits / handoff

This is source-module/native offline acceptance, not packed-artifact/browser/stock web-profile acceptance or all future host compatibility. The configured timeout is evidenced at actual native dispatch and successful execution, not by waiting 300000 ms to prove timer duration. Native authority still owns validation, capping, deadline enforcement and cancellation. Optional/nonwritable runtime shapes remain unsupported rather than fabricated integration success. The existing compact tool dependency composition is unchanged; this lane does not add a separate PTC capability status or promise PTC modification without those module dependencies. No real provider network, live GUI/3080, real profile/home modification, original plugin repository write, global DSH change, install, push, release, GitHub Actions or npm publication was performed. No background tool jobs or terminal sessions were started. Worktree is retained for parent cherry-pick/review.
