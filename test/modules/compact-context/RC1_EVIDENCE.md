# rc.1 compact-context and retry compatibility evidence

## Audited boundary amendment (before implementation)

The 0.4.0 contract selects exact published DSH 0.2.2-rc.1 and Cordis 4.1.0. Published `dsh-tools/lib/types/index.d.ts:72-95` separates registered lookup (`get`) from executable admission (`executable`) and provides `resolve({ agent, modelSelection, signal })` per step (not claimed newly introduced in rc.1). Published `dsh-tools/lib/types/contracts.d.ts:100-129` says disposed selections and another scope are never admitted. Prompt assembly carries `scope`, optional agent and the step `toolSet` (`dsh-system-prompt/lib/types/index.d.ts:36-45`, `dsh-agent/lib/types/runtime-types.d.ts:14-21`, `dsh-tools/lib/types/index.d.ts:9-14`). The existing per-agent visibility cache does not implement this admission contract: admission can change without a registry change. Guidance/pressure must consult the current assembly admission; an unknown lookup must not advertise tools. This preserves native authority, not a new policy.

The published basic summarizer still creates a plain, unmarked `purpose: "compaction"` envelope, routes configured summary target > latest durable request > agent options, and calls `ctx.llm.stream(options)` (`dsh-compaction-basic/lib/index.js:292-323`). `dsh-llm` retains the public `isAgentLoopRequest` marker and immutable loop call config; Cordis 4.1.0 retains `symbols.original`, reflection store and synchronous internal/service and internal/get observers. The reasoning compatibility guard must accept only the newly audited exact pair, while unknown versions/shapes remain unavailable. No request hook route rewriting is permitted.

The published PTC executor forwards the same Agent as stateOwner and toolSet into nested calls; runtime resolve still owns timeout validation/capping. Existing latest-full-header then agent-options timeout selection remains unchanged. Retry still only transforms terminal classification through `llm/stream`; native `dsh-llm-retry` owns attempts, backoff, cancellation and durable retry records.

A focused retry tracer also reproduced an existing deterministic-effort gap: explicitly listing `UNSUPPORTED_REASONING_EFFORT` in errorCodes reclassified it as TRANSPORT and dispatched twice under the official executor. Add this native deterministic code to the existing protected set (including carrier formats), consistent with the fixed reasoning contract. No new retry loop or broader failure mapping is authorized.

## Validation

Executed on 2026-11-07 against installed DSH/LLM/tools/compaction/PTC 0.2.2-rc.1 and Cordis 4.1.0, using a dedicated worktree from 2f50c92 and a symlink to the parent-installed exact dependencies. No installation, live GUI or production profile access.

Each shell created `ROOT=$(mktemp -d /tmp/ex-rc1-XXXXXX)` and explicitly exported HOME=`$ROOT/home`, DSH_HOME=`$ROOT/dsh`, XDG_CONFIG_HOME=`$ROOT/config`, XDG_CACHE_HOME=`$ROOT/cache`, XDG_DATA_HOME=`$ROOT/data`, XDG_STATE_HOME=`$ROOT/state`, TMPDIR/TMP/TEMP=`$ROOT/tmp`, npm_config_cache=`$ROOT/npm-cache`, creating those directories before execution. Native fixtures used only synthetic sessions and offline adapters with network fetch forbidden.

- Red tracer: `node --test test/modules/compact-context/step-admission.test.ts` failed because guidance remained visible in a denied next step without tools/change. Green after consulting executable(scope, toolSet).
- Red tracers: `node --test --test-name-pattern="unsupported reasoning effort" test/modules/retry/plugin.test.ts test/modules/retry/integration.test.ts` failed 2/2: explicit deterministic mapping became TRANSPORT; official retry dispatched twice. Green after protected classification.
- `./node_modules/.bin/tsc --noEmit`: exit 0.
- `node --test test/modules/compact-context/*.test.ts test/integration/native-compaction-reasoning.test.ts test/integration/native-ptc-timeout.test.ts test/integration/scoped-compact-context.test.ts`: 97 passed, zero failed/canceled/skipped. This includes all required native summary entry paths, independent sessions/preset revisions, header-only inheritance, clone/receiver/cancellation identity, native invalid-effort zero-dispatch, unknown runtime/version/envelope failclosed, volatile/unload/replacement ownership and real nested run_code execution.
- Final combined focused command: `node --test --test-skip-pattern="^package manifest declares" test/modules/compact-context/*.test.ts test/modules/retry/*.test.ts test/integration/native-compaction-reasoning.test.ts test/integration/native-ptc-timeout.test.ts test/integration/scoped-compact-context.test.ts`: exit 0 (154 passing behavior cases). Retry coverage includes native budgets/backoff cancellation, empty-response handling, unchanged immutable requests and real spawn/fork/cold-resume children.
- The manifest test fails in this lane because its required base commit still has the parent-owned alpha.3 manifest; parent reports its rc manifest commit bdcae00 and must run the unfiltered final suite after integration. No shared runtime.ts/loader-harness.ts changes were required.
- `git diff --check`: exit 0.

Packed artifact/browser and full integrated suite verification remain the parent release gate; this lane makes no packed, browser or release claim.
