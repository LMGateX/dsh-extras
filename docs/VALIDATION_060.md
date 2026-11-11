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

## Final merged execution (parent, exact source-built rc.2)

- `npm run typecheck`: exit0 after the model-test policy factory received its real declared return type (`4867edd`); no product typing guard was weakened.
- `npm test`: **725 passed, 0 failed/cancelled/skipped**,75 test files,183.68s, exit0. An earlier722/724 run exposed two stale migration fixture pins; `6aa7614` aligned the supported counterfeit version so the test genuinely exercises pre-import fingerprint refusal, and added explicit historical rc.1 refusal. The full suite was rerun, not counted as green from a focused retry.
- `npm run build` and `npm run pack`: exit0; six combined/split candidate0.6.0 distributions from one source selection.
- `npm run test:artifacts`: **49 passed, 0 failed/cancelled/skipped**,7 files,429.32s, exit0. Includes six actual clean consumers, absent-peer standalone CLI/API, native pnpm profile CLI, actual packed Goal ownership/quiet Job wake, migration refusal/rollback, strict declaration consumers, stock native web install/settings/live strategy changes and reload, independent split coexistence, settings persistence and Chime handover. All native profiles/hosts used disposable HOME/DSH_HOME and browser ports distinct from3080; source-built runtime and packed Extras were consumed, not the live GUI.
- Full source suite additionally executes actual emitted native TurnTail factories and EN/ZH/light/dark/narrow settings with stock native continue versus optional protocol action guards, native Session batch publication and deep named ownership, immutable workspace/model/compaction provenance, automatic/manual/tool/overflow/model-switch compaction, native retry budgets/cancellation and generic migration races. These source-browser fixtures are not mislabeled as whole-GUI tests.
- [Independent Standards and Spec reviews](REVIEW_060.md):0 hard Standards breaches,1 nonblocking retained-duplication smell;0 new confirmed Spec defects. Both retain the known provenance/lock/publication gates, not final acceptance.

Candidate archive SHA256 values from the tested `SHA256SUMS` (not remotely published):

```text
e85efb1852fea737dc6f67c8760996fbd5f4d44750d220ca3b46a9d78a7feb66  dsh-extras-0.6.0.tgz
09f51e813f464c3245b61d94b2d4231ebd2a4904bc519b5a277ca92b26422e91  dsh-extras-compact-context-0.6.0.tgz
cd4ee0479404db4949c0657cf1f8bb23d98639b2cc2eea172f49d2f464d6a146  dsh-extras-retry-0.6.0.tgz
c636afc1fbdb45da328fbe073f109a0a84818a014ed0d9b73cc8e932eb5c56c5  dsh-extras-chime-0.6.0.tgz
6f377c90278114869410cb5e4fd404691ece65644ec910e44e87046d98105767  dsh-extras-goal-wait-0.6.0.tgz
c5111784945ed9bd205a4200ea097405386f0aa53a6d86e3487f9d07a09d370c  dsh-extras-model-policy-0.6.0.tgz
```

## Remaining release gates

At2026-11-11 12:59:50 UTC, after all local native/packed gates, exact public rc.2 DSH metadata still returns E404. The root candidate manifest is intentionally not committed with a stale rc.1 lock, and no integrity was invented. Resolve reproducible source dependency/lock provenance and the supported artifact boundary before committing a compatibility release; then require clean pushed main, annotated matching tag, six remotely downloaded archives plus SHA256SUMS verification. No gate is waived. No local production installation or live GUI use.
