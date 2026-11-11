# rc.2 Goal adaptation boundary and evidence

Date: 2026-11-11 (Asia/Shanghai). Applies the pre-implementation [rc.2 contract](<DSH_RC2_060.md#L13-L24>) and [primary research](<RESEARCH_DSH_RC2_GOAL_2026-11-11.md>). This lane began as docs-only research; subsequent explicit parent authorization opened the scoped implementation after the frozen contract commits. No production installation, live GUI, push or release is authorized in this lane.

## Scoped implementation decisions

- Exact official tag `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`, unchanged source, is built by the integration lane with frozen-lockfile dependency provisioning and canonical `pnpm run build:artifacts`. This is **source-built evidence, not an observed published npm rc.2 artifact**. The locally built Goal driver entry SHA-256 is `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. Admission remains exact-byte/version fail-closed; unknown published bytes cannot be admitted by version alone.
- The compiled lifecycle observer coordinates remain immediate `:94:` with caller `:357:` or `:363:` in this exact build. The port preserves this narrow observer, same-value external revocation and source-map refusal, rather than granting authority from a broad transition window.
- Every admitted profile now has the exact native `waitForTreeWork` join. Ordinary members return false; real roots coordinate progressing whole-tree work and leave healthy parked inboxes resident. Replacement background policy therefore remains **Jobs-only**, including configured `kind=subagent` Jobs. Remove the unreachable historical pre-native-join descendant/epoch fallback and its removed AgentRegistry ownership APIs instead of inventing a new creator-subtree barrier. This is the existing native-join behavior made explicit for the rc.2-only baseline, not removal of the separately preserved conventional activation all-live-descendant policy. Parent explicitly confirmed this scope.
- Preserve activation/replacement/native/off, defaults, goal phase/revision/authority fences, native cancellation/unload/queue accounting, policy-only live updates and single native Loader owner. Session batch append still publishes each `session/event`; the driver observer remains single-event. Import Session `UserMessage` from its actual owner.

## Validation record

Before adaptation, isolated plugin tests passed 27 cases; the native strategy file initially could not resolve `dsh-llm-retry`. Follow-up inspection confirmed that package still exists unchanged: the incomplete disposable workspace links caused the failure, not a removed API or Goal regression. After the integration lane linked the complete exact-tag package set, imports succeeded. The shared native child fixture then needed the real rc.2 flat activation spec and root-filtered drain; direct external activation fixtures were updated likewise. Full TypeScript source compilation and whitespace checks pass against the exact rc.2 source-built package set.

The final scoped source/native run passed **106 tests, 0 failed/skipped/cancelled** (about 6.7 seconds): public module Config/apply/runtimeStatus, actual native Goal/Jobs/Loader ownership, migration owner proof, altered-version/altered-byte refusal, source-map/stack/descriptor revocation, all four strategies and cleanup. Added actual-native cases prove native and replacement root-tree waiting while an ordinary member completes its own goal despite a progressing grandchild; both waitForSubagents flag values permit healthy parked input; subagent-kind Job filtering still holds through stopping with generic Jobs disabled and releases quietly exactly once. No private production method assertions were added.

Command, with explicit disposable HOME/DSH_HOME/XDG/cache/TMPDIR and isolated profile plus exact-tag DSH_RUNTIME_ROOT/DSH_TEST_INSTALL_ANCHOR:

```sh
node --expose-internals --test --test-concurrency=1 \
  test/modules/goal-wait/*.test.ts test/integration/goal-strategies.test.ts \
  test/integration/native-driver-lease.test.ts test/migration/goal-ownership.test.ts
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Shared fixture commits 0d86dbc57a73afae01d444b6f28bdda42b773b47 and dc4f7001c96072fe80b7f1259f48dda1d8a80a82 are integrated dependencies, not authored Goal changes. Packed/browser/clean-consumer validation remains with the integration lane and is not implied by these source imports. Exact published npm rc.2 artifact verification remains unavailable at the last registry observation; no production install or live GUI access occurred.
