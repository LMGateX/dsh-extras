# Extras 0.4.0 — independent two-axis review

Fixed comparison: `git diff v0.3.1...2978670`. Annotated tag object `7794e6b73e91e221864ec0f30dfb31246c9aec52` resolves to baseline commit `7a1cd519e3f4dba5a368062d54d36fbb7ce16140`. Two fresh read-only subagents reviewed the same frozen implementation independently, without installs/tests/hosts/browser execution or publication. Parent execution receipts are separate.

## Standards

No hard documented-standard violation found. The reviewer read contributor, architecture, migration, spec, acceptance, rc, amendment, reasoning, parity, standalone CLI, public-package, provenance and glossary contracts; tracked inventory found no CONTRIBUTING/CODING_STANDARDS or nested contributor instructions.

One nonblocking heuristic: possible inherited Shotgun Surgery in separately maintained immutable exact-version metadata across [reasoning runtime](../src/modules/compact-context/reasoning-runtime.ts), [Goal host version](../src/modules/goal-wait/driver/host-version.ts), [Goal ownership](../src/modules/goal-wait/host-owner.ts) and [migration ownership](../src/migration/native-owner.ts). Suggested future sharing of immutable metadata while preserving distinct fail-closed checks. This is a maintainability judgement, not incorrect compatibility or a documented breach. Deferred: a release-baseline repair does not require coupling independent optional feature/runtime/standalone migration dependency graphs merely to centralize literals.

Standards summary: **0 hard findings, 1 low-priority heuristic, no Standards blocker.**

## Spec

One confirmed P2 inherited safety gap carried into the new baseline: migration [native-owner](../src/migration/native-owner.ts) originally pinned anchored Core only and correlated the selected driver callback with actual Loader/root/Fiber ownership, but did not independently check anchored driver version/source digest or Loader version. Callback correlation proves who runs the selected callback, not that it is the audited rc.1 artifact. Discovery can feed this proof into migration/native restoration, before stricter runtime ownership guards. This conflicts with [rc.1 contract](DSH_RC1_040.md#L13): unknown/mismatched runtime and foreign owners must fail closed.

Repair assigned before publication: public inspectMigration regression with genuine native Context/Loader plus isolated arbitrary/missing/version/digest/foreign anchors; validate exact anchored driver identity/digest before importing its callback and validate anchored Loader identity. Keep offline early refusal, standalone absent-peer startup, actual empty-root verified absence (not stock authority), shadow resistance, retired-stock and owner tuples unchanged. Repair commit, focused result and independent recheck: pending.

No other concrete missing/wrong behavior or scope creep found: native exact-step executable admission, protected deterministic effort codes, single external Cordis graph and synchronized version generation align.

Spec summary at initial review: **1 blocking P2 finding; closure pending.** Release acceptance/publication remained pending and was not treated as an implementation defect or falsely claimed complete.
