# Native npm development graph (unreleased Extras 0.6.1 candidate)

The current branch targets published exact DSH **0.2.2-rc.3** under the [rc.3 check contract](<DSH_RC3_061.md>). Published Extras 0.6.0 remains the exact rc.2 option. Use Node >=24.9 and the committed public npm lock. There is no source-host linker, receipt, automatic download/build, postinstall or profile repair. Historical source-preview instructions remain at the 0.6.0-rc.1 tag; do not apply them to this development setup.

## Disposable installation and checks

From this checkout, create explicit disposable state before any install or test. Do not use a production DSH profile, live GUI, global install or ancestor checkout as the host. For example:

```sh
state=$(mktemp -d /tmp/extras-npm-dev.XXXXXX)
mkdir -p "$state"/{home,dsh,config,cache,data,tmp,npm}
export HOME="$state/home" DSH_HOME="$state/dsh" DSH_PROFILE=isolated
export XDG_CONFIG_HOME="$state/config" XDG_CACHE_HOME="$state/cache"
export XDG_DATA_HOME="$state/data" TMPDIR="$state/tmp"
export npm_config_cache="$state/npm" npm_config_registry=https://registry.npmjs.org
unset DSH_RUNTIME_ROOT DSH_TEST_INSTALL_ANCHOR
npm ci --ignore-scripts --no-audit --no-fund
npm run host:check
node --test test/development/npm-host.test.mjs
npm run typecheck
npm run build
```

The observed published graph supports these development checks with scripts disabled. Do not enable arbitrary lifecycle scripts to bypass a failed safety check. If a different native operation genuinely needs an official lifecycle step, first establish that necessity and keep it within disposable state; never rebuild or patch published JS to obtain an accepted hash.

## Read-only admission boundary

[The development preflight](<../scripts/native-host.mjs>) runs before build, test and typecheck. It requires the consumer's own [node_modules](<../node_modules>) path to exist; it never silently selects an ancestor/live host. It reads native manifests and emitted files, uses public manifest resolution without evaluating native modules, and verifies:

- exact CLI/Goal/Agent/LLM and installed DSH package versions 0.2.2-rc.3, Cordis 4.1.0, schema 3.19.0 and cosmokit 1.9.0;
- required emitted CLI/core entrypoints, declared native runtime/optional/peer edges and consumer imports all selecting one physical graph; absent optional platform peers are permitted, present edges may not select foreign identities;
- the physical graph owner's public lock, installed native versions/declarations matching that lock, registry.npmjs.org provenance, SHA-512 SRI shape, and no local/link or duplicate nested native lock records;
- the actual compiled Goal driver SHA-256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`.

npm install/ci performs the actual tarball SRI verification. The offline preflight checks lock provenance and SRI structure, not a signature over every installed file; its Goal-byte guard and physical edge checks are additional admission controls, not a replacement for a fresh trusted npm ci. It never repairs links, writes a receipt, modifies package stores or touches profiles. Product runtime ownership and unknown-byte guards are unchanged.

### Whole-graph borrowing and explicit selectors

A build fixture may explicitly symlink its entire [node_modules](<../node_modules>) to one complete installed npm graph. The audited lock is [package-lock.json](<../package-lock.json>) under `dirname(realpath(consumer/node_modules))`, **not** an unrelated consumer-local lock or a Git/cwd name. Individual native-package links and foreign nested runtime/peer identities refuse.

Selectors are optional; unset is simplest for an independently installed consumer. If provided, they must resolve **exactly the same physical CLI manifest**, not just an equal version:

- `DSH_RUNTIME_ROOT`: an existing directory used as a public Node require base. Supported bases are the CLI package root, install parent, its node_modules, or its @deepseek-ai scope (including same-graph symlink aliases). Relative roots resolve from the consumer cwd. Resolution is anchored at the base's package.json; it does not fall back after a missing or foreign explicit value.
- `DSH_TEST_INSTALL_ANCHOR`: an absolute existing file used as the require anchor, normally the installed CLI package.json or the same graph owner's package.json.

A separately installed rc.3 graph remains foreign; an rc.2 graph also fails the exact version gate. Do not carry another consumer's selectors into a fresh install. Missing paths, empty values, relative install anchors and resolvable foreign graphs all refuse before tests/builds execute.

## Current rc.3 evidence

The current exact rc.3 graph is recorded in [candidate validation](<VALIDATION_RC3_061.md>): fresh ci installed681 packages,338 native packages; public lock SHA256 `d816c0f785381a133134d50b14543e2f5342c2c83c3ef4af952cca03a31156fd`. This link separates completed and pending execution gates; no historical counts below certify rc.3. Candidate0.6.1 is not published.

## Historical rc.2 evidence and limits

The following is preserved rc.2 / Extras 0.6.0 evidence, not an rc.3 execution claim. Current candidate validation is recorded separately.

The dedicated development lane used a fresh public-registry npm install with disposable HOME/DSH_HOME/profile/XDG/TMP/cache, then an offline npm ci from that authenticated cache: 679 installed packages, 337 native packages admitted, unchanged lock SHA-256 `9137c8f5bf5ef3face8c55553081f180679fafd8e02c0b917f6c68962ee4471a`. The final public CLI run passed 23/23 tests; full typecheck and all six 0.6.0 distribution builds passed with lifecycle scripts disabled. Fixtures cover ancestor-only refusal, real complete graph acceptance/read-only reruns, whole-graph borrowing, exact selector identity/aliases, wrong versions, missing entries, unknown Goal bytes, foreign package/edge identities, public-lock failures and no native evaluation. Broken cases mutate only disposable copied published metadata/emitted files, never the actual host.

The development preflight alone is not native browser integration, packed acceptance, publication or production-installation evidence. The rc.3 task uses one complete source clone for audit but does not build or link that source as its runtime. Native execution uses actual official npm packages. No live GUI or production installation is part of this workflow.
