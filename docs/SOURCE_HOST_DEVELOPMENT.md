# Source-host development for the 0.6.0-rc.1 preview

This is an explicit **development** dependency-provisioning flow, not a DSH installer or product runtime fallback. The GitHub prerelease is limited to the observed canonical source build of official DSH 0.2.2-rc.2 commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`. Exact rc.2 npm host packages were unavailable when this boundary was approved. No claim is made about unobserved official npm bytes.

## Inputs and isolation

Use Node >=24.9, npm, Git and an **already acquired, unchanged, canonical-built** official checkout. Its frozen pnpm install and canonical build must already be complete, including emitted JavaScript and full declarations. This command does not acquire or build that checkout. Do not use an active DSH installation, a live profile, or a shared package-manager installation as the consumer. All host/browser tests use disposable profile directories and temporary ports, never the live GUI.

From a fresh dedicated Extras worktree, establish explicit disposable state before running any package command:

```sh
sandbox=$(mktemp -d)
export HOME="$sandbox/home" DSH_HOME="$sandbox/dsh" DSH_PROFILE=isolated
export XDG_CONFIG_HOME="$sandbox/config" XDG_CACHE_HOME="$sandbox/cache"
export XDG_DATA_HOME="$sandbox/data" TMPDIR="$sandbox/tmp"
export npm_config_cache="$sandbox/npm"
mkdir -p "$HOME" "$DSH_HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$TMPDIR" "$npm_config_cache"

npm ci --no-audit --no-fund
npm run host:link -- /absolute/path/to/already-built-official-checkout
npm run host:check
npm run typecheck
npm test
npm run build
npm run pack
npm run test:artifacts
```

The lock installs public toolchain packages and runtime schema/YAML libraries only; no DSH host development package, rc.1 fallback, local-file dependency, fabricated integrity, or postinstall provisioning is present. Repeating npm ci resets consumer provisioning; explicitly link again afterward. The linking command itself runs no install, download, clone, build, host launch, or lifecycle hook and edits no profile configuration.

## Validation and mutation boundaries

Before changing anything, the linker validates:

- The supplied path is an absolute Git checkout root at the exact commit above, with clean tracked source (including staged changes).
- Native CLI and Goal driver version 0.2.2-rc.2, Cordis 4.1.0 and schema 3.19.0.
- Emitted runtime/declaration entrypoints for enumerated local packages and vendor manifests, plus the CLI bootstrap.
- Compiled Goal driver SHA-256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`.
- Local declared runtime/peer edges resolve to the same physical source packages, not a foreign Cordis or native graph.

It enumerates tracked manifests under apps/*, packages/*/* and vendor/*, plans the entire consumer/CLI-anchor batch, and refuses conflicting native packages or link identities before mutation. The only possible writes are links/receipt beneath the consumer node_modules, and missing package links beneath the supplied checkout's ignored apps/cli/node_modules to complete the audited host anchor. Tracked source and existing link targets are never modified. A supplied anchor with foreign identities is rejected, not repaired destructively.

The public registry schema package and its transitive cosmokit utility can otherwise introduce a second physical vendor/type ancestry. Only ordinary consumer directories with the **same audited names and versions** (schema 3.19.0, cosmokit 1.9.0) may be moved to bounded ignored backups inside that same consumer node_modules, then replaced by source-vendor links. Foreign symlinks, versions, existing backup collisions, linked mutation boundaries and Cordis/native copies are refused. The command recursively deletes nothing. Keep a disposable consumer; after a filesystem failure, discard that consumer or inspect the specific partial links rather than deleting arbitrary targets. Planning is fail-closed validation, not a multi-file atomic filesystem transaction.

Successful linking verifies every direct consumer and CLI-anchor package identity and writes the ignored node_modules/.dsh-extras-source-host.json receipt containing source commit, build hash and graph identity. An identical rerun does not rewrite the receipt. Machine paths belong only to this ignored local receipt/links and must never enter Git, emitted product code or release assets.

Build, test and typecheck validate the receipt and graph before native dependency discovery. A missing/invalid receipt fails with explicit provisioning instructions, even when a host is visible through ancestor resolution. A temporary build fixture can borrow the **whole already provisioned node_modules** via a symlink: the receipt binds to the supplied native graph, not the consumer working directory. The check is read-only; linking refuses a symlinked consumer node_modules so it cannot mutate shared tooling accidentally. Provision an owned real directory first and borrow it afterward.

## Executed focused evidence and limits

In an isolated fresh worktree, public-registry npm ci installed 17 packages; unprovisioned build/test/check refused; explicit linking to the provided canonical checkout then passed the complete root typecheck and six-distribution build. The CLI regression suite exercises unprovisioned refusal, actual native graph identity (including Cordis Context identity), idempotent rerun, invalid source/foreign Cordis refusal without consumer mutation, and borrowed-graph preflight. Tests use the current receipt source; initial provisioning-test runs may explicitly supply DSH_EXTRAS_SOURCE_HOST.

The provided canonical source was not cloned, downloaded or rebuilt for these checks. Dirty/unbuilt source refusal is implemented but was not fault-injected into that shared, already-built checkout: doing so would violate source preservation. Full source/native/browser/final packed gates, independent review and remote asset checks remain release-owner gates; this focused evidence is not a substitute. Historical rc.1 native-recovery staging remains separate and is not a preview asset or an rc.2 compatibility claim.
