# DSH rc.1 native adapter audit and scoped Goal evidence

Date: 2026-11-07 (Asia/Shanghai). Baseline audited: Extras `7a1cd51`, then the integration owner authorized implementation under the fixed [rc.1 contract](<DSH_RC1_040.md>). Initial work was read-only inspection; the subsequent narrowly scoped Goal/native-owner changes are not a claim that full release acceptance has passed. No host/profile/live GUI installation, server launch, push or release was performed by this lane.

## Primary sources and exact identity

The inspected dependencies are the integration owner’s disposable rc.1 installation, reached through the worktree dependency link, not the live host. The resolved entry files were read directly; SHA-256 below hashes each published JavaScript entry, not an npm tarball. Registry artifact links identify the owning upstream source.

| Package | Exact version | Entry SHA-256 |
| --- | --- | --- |
| [Cordis](<https://registry.npmjs.org/@deepseek-ai/cordis/-/cordis-4.1.0.tgz>) | 4.1.0 | `627409afa06a265f7253200d3bc4648e88805c39fd3768568eb9b9518a31fe8f` |
| [Loader](<https://registry.npmjs.org/@deepseek-ai/cordis-plugin-loader/-/cordis-plugin-loader-1.1.0.tgz>) | 1.1.0 | `4f0a93a1ef5bb09bd6e1c64b30df11be25efd46c316b9505c5ddf308974367a6` |
| [Goal round driver](<https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-rc.1.tgz>) | 0.2.2-rc.1 | `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de` |
| [Goal](<https://registry.npmjs.org/@deepseek-ai/dsh-goal/-/dsh-goal-0.2.2-rc.1.tgz>) | 0.2.2-rc.1 | `e17dc2886e1bc3c265fa9406ed4a101dd000ed66f8d8cc43f3075346434729cc` |
| [Agent](<https://registry.npmjs.org/@deepseek-ai/dsh-agent/-/dsh-agent-0.2.2-rc.1.tgz>) | 0.2.2-rc.1 | `8673b5cfadfbb6e6ce0bcb341d0ea2877adc2986eab1c2b6c8baf32726534c92` |
| [HMR](<https://registry.npmjs.org/@deepseek-ai/dsh-hmr/-/dsh-hmr-0.2.2-rc.1.tgz>) | 0.2.2-rc.1 | `d4990a34a9874f94fa1e045563e016526e4fefe5a72a4945532043188a65dfde` |
| [App boot](<https://registry.npmjs.org/@deepseek-ai/dsh-app-boot/-/dsh-app-boot-0.2.2-rc.1.tgz>) | 0.2.2-rc.1 | `346f832224737cd9ab1b5e37d111ae232fdd78b5ab892fa3179c112baf6f0a22` |

The rc.1 Goal driver entry is byte-identical to the previously audited alpha.3 fingerprint in [port provenance](<../src/modules/goal-wait/driver/provenance.json>). Its prompt bytes, queued-message settlement, progressing-descendant join and disposal-abort behavior therefore need no policy rewrite. The immediate native mount/unload disarm frames remain entry lines 94, 357 and 363; [transition authority](<../src/modules/goal-wait/authority.ts#L22-L28>) must still fail closed on source-map/unknown-frame or descriptor ownership loss. Matching bytes do **not** authorize an unknown package-version or Cordis/Loader composition.

The Loader 1.1.0 entry retains these concrete contracts:

- Entry effective-disabled getter delegates raw options, expression evaluation and owning ancestors (entry lines 462–477). Runtime suppression may only add an owned transient view; [host ownership](<../src/modules/goal-wait/host-owner.ts#L108-L146>) never persists disabled intent.
- The internal/plugin hook associates `fiber.entry`, and disposal can persist `disabled:true` while callback identity remains registered (entry lines 765–787). Delete the exact native callback registry identity before disposal, retain the synchronous remount guard, and drain before restoring.
- Entry moduleNamespace, parent tree import, Loader unwrapExports and raw Fiber/Context/entry identity remain available. HMR still rebinds the exact Fiber/entry pair (HMR entry lines 1103–1104).
- `fiber.effectiveConfig` remains used by Loader itself (entry lines 528–539); the rc announcement of unified configuration is not evidence that this public effective view disappeared. No speculative common migration rewrite was needed by this lane.
- App-boot inactiveEntries still consults effective `entry.disabled` before disposed-Fiber diagnostics (app-boot entry lines 5085–5110). Existing ConfigEditor Save/recompose acceptance executes this path.

## Deliberate fail-closed guards

At initial baseline, all guards below deliberately refused rc.1, rather than representing broad semver support:

1. [Goal host-version](<../src/modules/goal-wait/driver/host-version.ts#L16-L45>) checks Node >=24.9, exact names/versions for all participating first-party packages and Cordis, plus native-driver SHA-256; optional subagent packages join that proof only when the service exists.
2. [Goal owner](<../src/modules/goal-wait/host-owner.ts#L223-L245>) independently checks exact native-driver/Cordis/Loader identity and source fingerprint, then verifies the one selected Loader callback before taking its runtime slot.
3. [Migration runtime proof](<../src/migration/native-owner.ts#L19-L91>) resolves Cordis from the explicit installation anchor, verifies its exact version and Context/root identity, rejects startup leases/callbacks and foreign owners, and correlates native namespace/root/Loader inventory/raw Fiber/row/callback identity. A retired exact stock pointer proves inactivity only, never a fresh active-stock restoration grant.
4. [Compaction reasoning](<../src/modules/compact-context/reasoning-runtime.ts#L13-L16>) separately pins LLM/Cordis and inspects reflection/service/stream/envelope identity. This is owned by the compact integration lane, not changed here.

This Goal lane updates only the audited identities to rc.1/Cordis 4.1.0/Loader 1.1.0 and adds rc provenance. It does not remove the exact checks, permit unknown legacy versions, change native policy or manufacture authority after observed revocation. The historical ordinary Goal source remains a separate, explicitly selected acceptance input, not permission to admit arbitrary experimental startup ownership.

## Complete acceptance recipe and hidden omissions

All baseline, REASON, PAR and CLI gates remain cumulative; see [acceptance](<ACCEPTANCE.md#L3-L7>) and the prior [explicit command inventory](<VALIDATION_031.md#L58-L123>). The initial suite inventory is 45 source files and seven artifact files; added regressions can change test totals. Historical totals are not rc receipts.

Run in a fresh whitelisted environment with explicit disposable HOME, DSH_HOME, TMPDIR, XDG_CACHE_HOME, XDG_CONFIG_HOME, XDG_DATA_HOME and npm_config_cache. Do not inherit provider credentials, NODE_OPTIONS, NODE_PATH or bootstrap hooks. **TMPDIR must be outside repository/node_modules ancestry**: a missing-anchor fixture beneath the checkout otherwise resolves a parent dependency and invalidates absent-peer tests. Ignored workspace sandboxes are suitable for retained logs, not for those negative resolver fixtures.

```sh
npm run typecheck
node --expose-internals --test --test-concurrency=1 \
  test/client/*.test.ts test/integration/*.test.ts \
  test/migration/*.test.ts test/modules/*/*.test.ts
npm run build
npm run pack
node --expose-internals --test --test-concurrency=1 test/artifacts/*.test.*
git diff --check
```

At the inspected 0.3.1 baseline, the [convenience runner](<../scripts/test.mjs>) only passed `--test`, without exposed internals or serialization. The 0.4.0 integration now adds both native flags to that runner; complete original-source claims still require the three explicit legacy/current environment selections below. [Pack](<../scripts/pack.mjs>) packs existing build outputs; it does not replace build. The native-profile/build/package tests resolve local dev dependencies directly; DSH_RUNTIME_ROOT alone cannot retarget all acceptance to rc.1.

Three legacy/current source environment selections must be explicit for corresponding claims:

- `DSH_TEST_LEGACY_ROOT` names a read-only parent containing the four predecessor repositories. [Configuration parity](<../test/migration/validation.test.ts#L89-L108>) imports the compact/chime/Goal compiled config modules and extracts the retry TypeScript schema only. With this unset, the entire original-oracle test is not registered: zero skipped tests does not prove original validation coverage. Existing source outputs must be used read-only, never built or installed in place.
- `DSH_TEST_LEGACY_GOAL_ENTRY` names the actual audited ordinary 0.4.23 source entry at commit `cbd86273660893336afaee31794b5fd76487db78`; [prior evidence](<../test/migration/PARITY_EVIDENCE.md#L41-L49>) identifies that dedicated historical worktree, not the older predecessor root. Without it, [Goal ownership](<../test/migration/goal-ownership.test.ts#L144-L152>) exercises an explicit official-callback adapter, not original source.
- `DSH_TEST_EXTRAS_GOAL_ENTRY` names the integrated current Goal module entry. Without it, [the same test](<../test/migration/goal-ownership.test.ts#L81-L113>) uses a native suppression actor, not actual Extras replacement/off execution.

`DSH_EXTRAS_CHROMIUM` must select an existing verified executable. Actual packed [native profile acceptance](<../test/artifacts/native-profile.test.ts>) starts its own temporary loopback port, rejects live port 3080, follows the authenticated native boot entry and checks installed/emitted client bytes, Save/persistence/reload and console/page errors. Browser harness coverage alone does not replace this. Optional native seed caches must come only from this checkout’s disposable native sandboxes; no developer cache or real profile is permitted. Full artifact/browser, packed CLI, five consumer and independent review gates belong to integration, not this lane’s source results.

## Scoped ownership and evidence

The integration owner assigned this lane [Goal module code](<../src/modules/goal-wait/index.ts>), [migration native-owner](<../src/migration/native-owner.ts>) and associated Goal/native-owner tests/provenance. Shared manifests, build/packaging, source/browser harnesses, common migration orchestration, compact/retry and client code remain with other owners. No shared dependency files are modified.

Focused execution uses real native Loader/Agent/Goal/Jobs with deterministic offline adapters and disposable homes, never the live GUI. The first new public rc Cordis inspection regression failed exactly because the old version guard refused Cordis 4.1.0 (one failure/one pass); after repair it passed two/two, including historical/unknown-version refusal and unavailable-anchor refusal. Additional public owner tests verify both unknown native version and changed rc driver bytes preserve the live stock Fiber, serialized options and zero commits. The final scoped command passed **104/104**, zero failures/skips/cancellations/todos, exit 0, in 8.190 seconds. It explicitly supplied both `DSH_TEST_LEGACY_GOAL_ENTRY` (the audited original 0.4.23 source identified above) and `DSH_TEST_EXTRAS_GOAL_ENTRY` (this worktree’s current module). The diagnostics confirm **actual Extras Config/apply/runtimeStatus replacement/off rescans** and **native Loader recovery + handover with explicitly supplied legacy source**, not their fallback actors. The selected original recovery scenario uses its ordinary `native` strategy; this does not claim that the predecessor’s alpha-pinned replacement/startup paths support rc.1.

Executed scoped argv:

```sh
node --expose-internals --test --test-timeout=25000 --test-concurrency=1 \
  test/integration/native-driver-lease.test.ts \
  test/integration/goal-strategies.test.ts \
  test/modules/goal-wait/*.test.ts \
  test/migration/native-owner-runtime.test.ts \
  test/migration/goal-ownership.test.ts
node node_modules/typescript/bin/tsc --noEmit
git diff --check
```

Typecheck and whitespace checks also exited 0 against shared rc dependencies. This command does not include the configuration-oracle suite, so this lane makes no executed DSH_TEST_LEGACY_ROOT claim. Disposable test roots were short `/tmp/ex-rc1-goal-*` directories outside package ancestry, with all explicit HOME/DSH_HOME/XDG/cache paths; ignored local logs retain the receipt. Test-created profiles are removed by their bounded fixtures; top-level empty homes/cache roots and ignored worktree logs are retained for integration audit. An initial unbounded pre-repair diagnostic run stopped after seven expected guard failures and was explicitly terminated; it is not counted as passing evidence. No background test jobs remain.
