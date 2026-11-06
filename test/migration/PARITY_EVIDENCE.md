# Goal migration parity lane evidence — 2026-11-06

## Scope and interfaces

Base: d79aa348d0e08517d72f5ada8ac9db27ca88a352. Dedicated branch/worktree: parity-goal-migration. Only src/migration/** and test/migration/** changed. Parent retains src/runtime.ts; the agreed integration is one field on its migrationHost: continuationContext: ctx. No goal feature implementation is imported into migration or unrelated split bundles.

Tests exercise public inspectMigration / dryRunMigration / runMigration / rollbackMigration and actual native Cordis/Loader/HMR/plugin interfaces. No private methods are asserted. Goal strategy behavior and packed/browser artifacts remain other lanes' gates.

## Executed red → green slices

Each row was added/run before its corresponding implementation. Exit 1 is an observed failing assertion, not a hypothetical mutation. Focused runs used node --test with the listed test file; stateful runs additionally used the disposable environment below.

| Slice | Observed red | Focused green |
| --- | --- | --- |
| latest 0.4.23 import, disabled state and explicit precedence | planner: conflict instead of prepared (7 pass / 1 fail) | 8 pass |
| historical 0.3.0 normalization and source-only field discipline | planner: missing literal strategy=activation (8 pass / 1 fail) | 9 pass; historical strategy smuggling refused |
| latest public discovery | discovery: unsupported legacy version: 0.4.23 (12 pass / 1 fail) | discovery/planner/validation: 65 pass |
| offline unknown programmatic owner | goal ownership: fresh instead of conflict | 1 pass |
| actual root startup lifetime lease | no startup-lifetime diagnostic despite actual root marker | 2 pass |
| registered startup-marked callback | no diagnostic despite actual registry callback marker | 3 pass |
| foreign known continuation callback | no foreign-owner diagnostic | 4 pass |
| exact official callback recognition | official callback falsely diagnosed as foreign | 5 pass |
| bundle-owned native suppression delta | missing nativeDriverDelta | 6 pass |
| latest post-disposal stock proof | ready=true without any actual stock callback | 6 pass, then positive actual native goal/core/driver lifecycle proof added |
| changed native-row recovery provenance | restart-required instead of conflict after a later native-row edit | 6 pass; later edit preserved |
| persisted recovery versus live restoration | rolled-back reported before any restored owner was running | 7 pass; storage-only restoration remains restart-required |
| real Loader proxy observation | actual active legacy Loader row diagnosed inactive/foreign | 7 pass after normalizing public fiber.ctx.fiber and observing public state |
| manual latest source without bundle delta | ready=true with no verified stock slot | 8 pass |
| same-process different root | second root reused first root's stock verification | 8 pass after binding evidence to actual root identity |

Diagnostic corrections were not counted as feature failures: native registry fiber collections are iterable with length, not Set.size; a YAML test edit initially mixed flow/block sequence syntax and was corrected with parseDocument before the behavioral red; a forward-handover test initially kept a retired Extras root loaded and correctly hit the pre-existing conservative peer gate. That test now explicitly disables the retired distribution rather than weakening peer admission.

The final planner regression also enumerates all four literal strategies, unaudited 0.4.22/0.4.24/0.3.1/unknown versions and invalid/dynamic strategies. These are additional green matrix coverage, not falsely claimed new red slices.

## Actual native evidence

The default goal-ownership test uses actual native core/goals/official driver, actual native Loader and HMR, plus an explicitly labeled legacy-row adapter around the official callback. It does not call that adapter the original plugin.

The additional executed configuration supplied the original source entry explicitly:

~~~sh
HOME="$PWD/.sandbox-lane-migration/home" \
DSH_HOME="$PWD/.sandbox-lane-migration/dsh" \
TMPDIR="$PWD/.sandbox-lane-migration/tmp" \
DSH_TEST_LEGACY_GOAL_ENTRY=/home/dev/dev/dsh-goal-wait-gate/.agents/worktrees/feat/dsh-0.2.2-alpha-support/src/index.ts \
node --expose-internals --test --test-concurrency=1 test/migration/*.test.ts
~~~

Verified the external source checkout before and after: HEAD cbd86273660893336afaee31794b5fd76487db78 (0.4.23), git status --short empty. The fixture imports it read-only via a disposable package wrapper; it does not install or modify that checkout.

This run executes the real legacy ordinary row in native strategy after selective recovery, observes actual Loader state=2 and no stock-row fiber, reports observed rolled-back, then starts a separate split migration after retiring the previous target. Native reconciliation disposes the running old row and reinstates the active official stock callback before the new migration reports ready. The Extras target shell in this fixture is deliberately inert: this proves migration/native composition, not the new four-strategy module's model-dispatch behavior.

The actual root lifetime and cooperating callback-marker tests use a real Cordis root/registry, not a caller-authored startupOwner verdict. Exact native callback identity is resolved from the explicit installation anchor. CLI/no-context discovery refuses goal-only ownership because it cannot exclude another live programmatic root; inspect stays read-only and unrelated modules retain independent decisions.

## Final results

- Final command above: exit 0; **149 passed, 0 failed, 0 skipped, 0 cancelled**, 31.468 s; Node v24.17.0, installed DSH baseline 0.2.2-alpha.3.
- npm run typecheck: exit 0.
- git diff --check: exit 0.
- The focused goal-ownership suite without an external legacy entry: 8 passed, 0 failed (explicitly labeled adapter configuration).
- All prior migration fault-stage, immutable-input, lock, PID-owner, interrupted-recovery, peer, native Loader/HMR and concurrent-enable tests were included in the final 149.

Every host/test child uses disposable HOME/DSH_HOME/TMPDIR; fixtures verify exact mkdtemp prefixes before deleting their own trees and close native runtimes. No server or GUI port was started. No real HOME/profile/global DSH edits, npm install, push, publication, GitHub Actions or npm publication occurred. No background jobs or persistent terminal sessions were started by this lane.

## Remaining integration/risk notes

1. Parent must wire continuationContext: ctx on runtime migrationHost; omission intentionally blocks goal admission. Parent also owns runtimeStatus details, declarations, packed/native/browser/full-release gates.
2. Native inspection recognizes the audited startup root-lifetime symbol, cooperating callback marker, exact official callback and known legacy continuation names correlated with verified Loader subtrees. It is not a distributed lease or proof against arbitrary unmarked custom schedulers whose callback identity/name reveals no continuation role. CLI therefore never claims live programmatic-owner exclusion.
3. Stock verification is root-local, not transferable by copying a journal or using another root in the same PID. Loss of in-memory proof is conservative and requires actual stock re-verification; durable process origin alone grants no admission.
4. Latest bundle suppression is removed/restored only by changing its owned bundle selection. No permanent native-driver override is written. Recovery refuses missing provenance or changed native-row composition and preserves unrelated later edits. Persisted recovery alone is not live success.
5. Existing conservative peer/process-owner/concurrency gates remain intact. The lane does not claim feature strategy correctness, actual model continuation, packed/browser behavior or whole-release acceptance; those remain parent/other-lane validation.
