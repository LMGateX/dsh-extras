# rc.2 model policy / shared compaction acceptance evidence

2026-11-11 (Asia/Shanghai), after the parent froze [the rc.2 contract](../../../docs/DSH_RC2_060.md). This is a scoped implementation record, separate from [pre-implementation research](../../../docs/RESEARCH_DSH_RC2_INTEGRATION_2026-11-11.md).

## Host and scope

- Exact official tag commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`, source-built by the parent with canonical `pnpm run build:artifacts` (parent reports exit0). The source remains unchanged. This is **source-built native evidence, not observed published npm artifact parity**; rc.2 registry versions were unavailable during the research sample.
- Coherent source-built first-party/vendor packages supplied by the parent, one Core4.1.0 physical peer tree, isolated tooling symlink only. No ancestor rc.1 package resolution, installed-host change, real provider, live profile or GUI was used.
- Every execution set explicit disposable HOME, DSH_HOME, DSH_PROFILE=isolated, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME, npm_config_cache, TMPDIR and DSH_RUNTIME_ROOT to that isolated host. Offline native adapters reject network fetches.
- Package/version/lock and global fixture changes remain the parent/common-fixture lanes' responsibility. This lane consumed common fixture commit `0d86dbc57a73afae01d444b6f28bdda42b773b47`, which migrates native starts to flat managed activation requests and teardown to root-filtered drainDescendants.

## Changes and why no model-policy rewrite

- [Exact compaction adapter](../../../src/shared-compaction/runtime.ts) now accepts only audited LLM0.2.2-rc.2 + unchanged Core4.1.0. Existing receiver/constructor/stream descriptor, LOOP exclusion, auxiliary-purpose, shallow-envelope and unknown-service withdrawal checks stay unchanged. The negative suite explicitly rejects rc.1 as well as an unknown version.
- [Workspace provenance](../../../src/shared-compaction/workspace.ts) retains public immutable session header origin + direct parentSession and public sessionQuery observation leases. A comment records native ordering: these facts are available during awaited agent/created, while Subagent.rootOf membership publishes later. Replacing this seam with rootOf would break creation defaults.
- [Native model fixture](../../model-policy/native.test.ts) no longer resumes a delegated child by passing removed parentAgent to the factory. Actual named spawn/fork activations, native sendMessage cold restoration and exact live rootOf membership are exercised instead.
- Named reviewer/checker depth-two tests prove durable provenance already resolves during agent/created while rootOf reports UNAUTHORIZED. Moving the resident child's cwd from workspace A to B does not apply B's deliberately different descendant defaults. A real auxiliary compaction request on the depth-two session receives A's canonical effort, not B's. Ordinary human forks retain independent workspace-B root identity despite parentSession.
- Manual native choices, cold root resume, fresh fork defaults, awaited selection fences, pending-policy invalidations and isolated LLM capabilities retain their original behavior. No step-loop/request rewrite, provider routing override, private map or ownership inference from cwd/name was added.
- [Native compaction](../../integration/native-compaction-reasoning.test.ts) and [native PTC](../../integration/native-ptc-timeout.test.ts) explicitly assert the rc.2 baseline rather than rc.1.

## Executed commands and results

All commands below ran from the dedicated worktree after setting the disposable environment described above. They did not invoke a replacement web server.

1. Red baseline before updating the exact guard:
   `node --experimental-strip-types --test test/modules/compact-context/reasoning-runtime.test.ts test/model-policy/native.test.ts`
   exited1: native reasoning remained unmodified behind the rc.1 guard; delegated model fixtures also exposed removed common start/teardown APIs. These were investigated, not treated as product model failures.
2. After the guard and baseline assertion updates, before common fixture adoption:
   `node --expose-internals --test --test-concurrency=1 test/modules/compact-context/*.test.ts test/shared-compaction/*.test.ts test/integration/native-compaction-reasoning.test.ts test/integration/native-ptc-timeout.test.ts`
   **132 passed / 0 failed / 0 skipped**, exit0.
3. After common fixture adoption and named native lifecycle tests:
   `node --expose-internals --test --test-concurrency=1 test/model-policy/native.test.ts`
   **17 passed / 0 failed / 0 skipped**, exit0.
4. Final combined focused command (also rerun after final assertion/readability changes):

   `node --expose-internals --test --test-concurrency=1 test/model-policy/native.test.ts test/model-policy/config.test.ts test/model-policy/editor.test.ts test/modules/compact-context/*.test.ts test/shared-compaction/*.test.ts test/integration/native-compaction-reasoning.test.ts test/integration/native-ptc-timeout.test.ts`

   **155 passed / 0 failed / 0 skipped**, exit0. This includes native automatic-pressure/manual-command/tool/overflow/model-switch compaction, compactTool=false, unsupported-effort zero dispatch, service isolation/HMR/descriptor withdrawal, real Loader accepted updates, canonical storage/CAS/backup/disposal/handover, independently bundled shared executors, native PTC nested transport/timeouts, and the model/provenance cases above.
5. Root `tsc --noEmit` initially exited2 only at the two existing Goal background-work calls to removed AgentRegistry.isOwnedBy, outside this lane. There were no model/shared-compaction/compact-context type errors. Parent must rerun whole-project typecheck after integrating the separate Goal lane; this is not a claim the root passed.
6. `git diff --check` passed for this scoped change.

## Remaining release gates

The combined focused count is source-native coverage, **not** final six-package packed consumer/browser coverage, full-project validation, production installation, custom recovery-companion validation or published npm parity. Parent retains these gates and the independent Standards/Spec review. Source-built adapter coverage cannot by itself certify an unobserved published-runtime fingerprint.
