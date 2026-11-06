# Public package declarations — isolated validation evidence

Date: 2026-11-06 (Asia/Shanghai). Dedicated `parity-package-types` worktree created from `d79aa348d0e08517d72f5ada8ac9db27ca88a352`; `pwd` verified the dedicated checkout before any changes. No README, shared contract, version, or existing feature/migration source was edited. Package version remains the baseline 0.2.1 pending the parent release freeze; this report is not 0.3.0 release approval.

## Agreed seam and red → green

Seam: actual packed archives, npm-installed clean JavaScript/strict TypeScript consumers, root Cordis plugin/Config, native ModuleLoader client registration, and the public migration entry. These checks cover export and declaration truthfulness, selected payloads and consumer signatures; they do not alone prove live native driver ownership or browser UI operation.

1. Added one archive-entry test slice before implementation. Executed `node scripts/build.mjs && node scripts/pack.mjs && node --test test/artifacts/public-types.test.mjs` with disposable HOME/DSH_HOME/cache for packing. Baseline build and five archives succeeded; the test exited 1 with **0/5 passed**, each failing `must advertise . declarations` (`undefined` versus `./lib/index.d.ts`).
2. Added compiler-emitted declarations, selected root source configuration types and native volatile output mapping, truthful client `export {};`, and types-first package export conditions. Rebuilt and repacked. The same test exited 0, **5/5 passed**.
3. Full feature-schema declaration inference exposed TS2742 references to nested host Schemastery installations. The supported Extras root is not the private feature schema export: the generator now projects source-authored configuration interfaces/type aliases and their required type-query literals, then emits them with the TypeScript compiler. No copied field inventory, legacy resolver alias, or fictitious client export was introduced. Public migration declarations still come directly from the full actual migration source, and only the emitted reachable declaration graph is retained. Both declaration generation and clean consumers use `skipLibCheck: false`.

## Executed focused checks

- `npm run typecheck`: exit 0 (`tsc --noEmit`). The existing source project options are unchanged.
- `node --test test/integration/config.test.ts test/modules/chime/config.test.ts test/modules/compact-context/reasoning-config.test.ts`: exit 0, **19/19 passed**.
- `node --test test/migration/planner.test.ts test/migration/validation.test.ts test/migration/discovery.test.ts`: exit 0, **62/62 passed**.
- `node --test --test-concurrency=1 test/artifacts/packages.test.mjs`: two intermediate clean-consumer passes, **6/6** each (about 97–99 seconds). Every archive was actually npm-installed outside the checkout with disposable HOME/DSH_HOME/cache; optional native peers were anchored to the installed DSH packages instead of resolving through the repository or installing another host runtime.

Final command (with all output collected and disposable HOME/cache trap completed):

```sh
temp=$(mktemp -d /tmp/ex-types-final-XXXXXX)
trap 'test -n "$temp" && case "$temp" in /tmp/ex-types-final-*) rm -rf -- "$temp";; esac' EXIT
export HOME="$temp" DSH_HOME="$temp/dsh-home" npm_config_cache="$temp/cache"
node scripts/build.mjs && node scripts/pack.mjs && \
node --test --test-concurrency=1 test/artifacts/public-types.test.mjs test/artifacts/packages.test.mjs
```

Result: exit 0, five declarations-enabled archives built/packed, **11/11 passed**, 0 failed/skipped, test duration 102876.706518 ms. This final run includes strict exact runtime/declaration migration export-key equality and actual package-name JavaScript client registration/import checks. `git diff --check` and generator/consumer `node --check` also exited 0.

## Scope and remaining integration gate

- New root type-only interfaces are `ConfigInput` and `ConfigOutput`; runtime values remain exactly name/inject/Config/apply. Every root feature field and migration auto output is a native volatile reference.
- Strict NodeNext consumers check selected fields, invalid values, volatile versus plain output, exact runtime/declaration value exports, migration inputs/controller methods, and missing aliases/private subpaths. Actual package-name JS imports verify root/migration exports and that the client registers once with ModuleLoader but has no module exports.
- Nonselected feature declaration directories and implementation source-map entries are absent. The pre-existing reasoning-policy source used by common migration validation is intentionally common migration support, not a mounted compact-context implementation. Non-chime archives retain no sound payload.
- Goal-selected archives add optional exact installed-host DSH/goal-round-driver peers for dynamic owner metadata lookup; Cordis/Loader peers remain externally anchored. Bundle patch enablement is unchanged.
- This baseline predates the goal port directory. The build conditionally accepts its absence; once the directory exists, both provenance.json and UPSTREAM-LICENSE.txt must copy into selected goal archives or the build fails. Non-goal archives never copy those assets. The parent must rerun the final package checks after merging the actual goal port and freezing 0.3.0, proving positive asset copy and strategy typing with the finalized source.
- No real profile installation, live GUI 3080 access, GitHub Actions, npm publication, push, release or native host startup occurred in this lane. Early disposable caches were removed; consumer fixtures and final packaging HOME/cache are cleaned by tracked teardown. Generated local archives are ignored, not commit/release assets.

## Independent-review follow-up: nested reasoning input defaults

The independent Spec review identified that the original shallow module `Partial` still required both resolved policy fields when a caller supplied `compactionReasoning`. Native root `Config` actually defaults the omitted policy fields. Follow-up resumed in this same dedicated worktree at `d8c7c5b57e87fc5472c229c9e8ed4f8c4f0d9615`; no feature source or shared build changes were needed.

RED command: `node --test --test-concurrency=1 --test-name-pattern="packed installable distribution: dsh-extras-compact-context$" test/artifacts/packages.test.mjs`. After npm-installing the actual previously packed archive, runtime assertions passed for `{enabled:true}` resolving to `{enabled:true,rules:[{scope:"all",mode:"inherit"}]}` and `{rules:[]}` resolving to `{enabled:false,rules:[]}`. The strict NodeNext consumer then failed exactly two TS2741 diagnostics: missing rules and missing enabled. Result: exit 1, **0/1 passed**, 10118.310439 ms.

The correction introduces a source-type-derived, input-only one-level defaulted-object projection at `compact-context.compactionReasoning`. It does not copy the policy field inventory, make rule elements recursively partial, change resolved/native-volatile output, add runtime exports, or change any runtime behavior. Six negative rule cases retain required scope, mode, fixed effort, provider, model and valid mode constraints.

Follow-up source check: `node --test test/integration/config.test.ts test/modules/compact-context/reasoning-config.test.ts` exited 0, **9/9 passed**. Final GREEN command (with a fresh disposable `/tmp/ex-types-input-*` HOME/DSH_HOME/npm cache and cleanup trap): `node scripts/build.mjs && node scripts/pack.mjs && node --test --test-concurrency=1 test/artifacts/public-types.test.mjs test/artifacts/packages.test.mjs && npm run typecheck`. Result: exit 0, five archives rebuilt/packed, **11/11 tests passed**, 0 failed/skipped, packed-suite duration 87351.248695 ms; source `tsc --noEmit` passed. Both combined and compact-context archives executed the two partial-policy runtime positives and compiled those same inputs with fully resolved output types and all six malformed-rule negative assertions under strict NodeNext/`skipLibCheck:false`. These are embedded assertions in the existing archive-consumer tests, not additional top-level test counts. Generator/consumer `node --check` and `git diff --check` also passed. All job output was collected; disposable fixtures/cache were removed by teardown/trap. This follow-up remains on the original 0.2.1 lane baseline and does not replace the parent integrated 0.3.0 rebuild/acceptance gate.
