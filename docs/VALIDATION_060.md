# Extras 0.6.0 rc.2 validation record — in progress

## Evidence boundary

This is a work-in-progress record, **not release acceptance**. Apply [the frozen rc.2 contract](DSH_RC2_060.md), [Goal research](RESEARCH_DSH_RC2_GOAL_2026-11-11.md), [integration research](RESEARCH_DSH_RC2_INTEGRATION_2026-11-11.md), and every retained applicable acceptance gate. No production installation is authorized.

The entire official rc.2 tag checkout (21,009 tracked files) was cloned once into disposable local storage, pinned to `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`, and its tracked worktree remains clean. All implementation lanes were instructed to inspect this local checkout directly, not fetch individual GitHub code pages or duplicate clone/build work. Exact rc.1 tag comparisons in the research notes are historical source evidence, not rc.2 npm execution.

At 2026-11-11 12:33 UTC the public exact `@deepseek-ai/dsh@0.2.2-rc.2` metadata still returned `E404`; earlier exact DSH/Agent/LLM/Subagent/Goal-driver metadata and direct DSH tarball requests were also404. The official GitHub release had no binary/package assets at inspection. The root rc.2 npm lock refresh and published-byte certification therefore remain open; do not fabricate npm integrity or call an rc.1 install an rc.2 run.

## Exact-tag source build (executed by parent)

Disposable HOME/DSH_HOME/profile/XDG cache/config/data/TMPDIR/Corepack/pnpm store were explicit. Commands, run from the unchanged tag checkout:

```sh
pnpm install --frozen-lockfile --ignore-scripts --store-dir <disposable-store>
pnpm run build:artifacts
node apps/cli/lib/bin.js --version
node apps/cli/lib/bin.js --profile isolated --from-default-profile web --dump-config
```

All commands exited0. Canonical artifact graph: **8 passed, 0 failed, 0 skipped, 266.70s** — native addon, Host Typert, host compiler, Host bundle, Desktop bundle, client compiler, Client bundle, Web build. It recorded369 client artifacts with2 public values. CLI reported `0.2.2-rc.2`; stock web composition succeeded in a disposable profile.

The observed source-built Goal-driver `lib/index.js` SHA256 is `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. This is the local canonical build of the exact official tag, **not an observed npm hash**. Any unobserved or changed native driver remains fail-closed.

The isolated Extras tooling environment links all391 discovered native workspace/vendor manifests to this same build. Missing CLI direct peers were completed only as ignored links in that disposable host anchor, simulating a hoisted installed runtime; no tracked upstream source or manifest changed. An initial incomplete-link run accidentally resolved some types through an ancestor rc.1 checkout; its duplicate-brand diagnostics are not rc.2 evidence. After fixing the provisioner, parent typecheck showed exactly two genuine removed `AgentRegistry.isOwnedBy` uses in Goal fallback code, assigned to the Goal lane.

## Documentation-first sequence

- `7bd3a1a`: pre-implementation exact-host/Goal necessity/no-install contract.
- `45667b0`: confirmed native Continue generating versus checkpoint-recovery boundary and stock noise suppression.
- `40bb2f0`: preserve existing public immutable durable workspace provenance; only actual consumers of removed Registry helpers need migration.
- `a4e874e`, `421eb5e`: independent cited primary-source research, integrated before product implementation.
- `b890ccc`, `e370081`: real shared rc.2 activation/drain fixtures and native batch-publication/named-hierarchy regressions.

## Remaining release gates

Integrate scoped implementation and independent review; parent-run final full source/type suites; build/pack six final archives; packed plain-Node/CLI/native/browser/migration tests; registry/lock and exact-runtime evidence resolution; clean committed pushed main, annotated matching tag, six remote archives plus SHA256SUMS verification. No gate is waived by this progress document. No local production installation or live GUI use.
