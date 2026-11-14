# Exact DSH rc.3 compatibility validation — unreleased Extras 0.6.1

Date: 2026-11-14, Asia/Shanghai. Scope is the [pre-implementation contract](<DSH_RC3_061.md>), committed as `6150712` before runtime changes. This is a local compatibility check, not a release or production-installation receipt.

## Frozen candidate and acquisition

- Base: published Extras 0.6.0 / rc.2 commit `1b4b9a2c15be6293b5d92f1820ce811904938d93`.
- Product/build/full-source candidate: `2012b6e78b92e6e6b2c84b4b16dbefbdcdb6f3d7`. Later research/validation-only commits do not alter tested archives.
- Exactly one full `git clone https://github.com/deepseek-ai/deepseek-harness.git` to disposable `/tmp/extras-rc3.OS6Qcw/upstream`, then detached `dsh-v0.2.2-rc.3` = `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`. All parent/child source audit uses that local clone and its rc.2 tag. No incremental GitHub source-page reads, second clone, upstream source build or modifications. Official release metadata was fetched separately once with `gh release view`.
- Actual exact official npm rc.3 dependencies, not a source-linked or production host. `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` resolves real public metadata; one fresh `npm ci --ignore-scripts --no-audit --no-fund` installed **681 packages in 29s**, admitting **338 native packages**. Lock unchanged across ci: SHA256 `d816c0f785381a133134d50b14543e2f5342c2c83c3ef4af952cca03a31156fd`, 779 records. In addition to synchronized native updates/new chat-import dependency, npm re-resolved transitive `encodeurl` 2.0.2→2.0.3 and `ws` 8.22.2→8.23.0; these actual locked packages are within the acceptance graph. No arbitrary lifecycle scripts enabled.
- Node `v24.17.0`, Linux x64, existing Chromium1248 selected explicitly. Extras itself is not published to npm.

## Isolation and reproducible commands

The dedicated Git worktree is branch `adapt-dsh-022-rc3`. Disposable evidence root `/tmp/extras-rc3.OS6Qcw` is retained for audit. The full install/build/source/packed acceptance uses the following explicit environment. Focused red/green tests and standalone registry queries also set disposable HOME/DSH_HOME/profile/config/cache/data/TMP/npm-cache and unset native selectors; they do not run hosts against production. Reproduction commands:

```sh
root=/tmp/extras-rc3.OS6Qcw
export HOME="$root/home" DSH_HOME="$root/dsh" DSH_PROFILE=isolated
export XDG_CONFIG_HOME="$root/config" XDG_CACHE_HOME="$root/cache"
export XDG_DATA_HOME="$root/data" XDG_STATE_HOME="$root/state"
export XDG_RUNTIME_DIR="$root/runtime" TMPDIR="$root/tmp"
export npm_config_cache="$root/npm" npm_config_registry=https://registry.npmjs.org
export DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
unset DSH_RUNTIME_ROOT DSH_TEST_INSTALL_ANCHOR
npm run host:check
npm run typecheck
npm run build
npm run pack
npm test
npm run test:artifacts
```

Whole native GUI fixtures allocate their own disposable profiles and loopback port0, assert port is not3080, and close owned browsers/process groups. Native model tests use synthetic offline adapters and forbid provider fetch. The live GUI and personal sessions/providers are not test inputs.

## Observed results

- `npm run host:check`: **passed**, exact rc.3/Cordis4.1.0, 338 admitted packages, unchanged Goal digest, local physical graph and lock.
- `npm run typecheck`: **passed**.
- Six `npm run build` outputs and `npm run pack` archives: **passed**.
- Focused public CLI/migration/retry/compaction checks: **51/51 passed**, before one additional rc.2 compaction-refusal case was added; final full source run includes that addition.
- Complete source suite: **751/751 passed**, exit0, 0failed/cancelled/skipped, 233690.374071ms. The original748 tests remain, plus prior-rc.2 refusal at three existing public seams (preflight, migration inspection, compaction runtime).
- Complete packed/native/browser suite: **54/54 passed**, exit0, 0failed/cancelled/skipped, 313159.71178ms. This actually executed packed combined plus five split **six whole native GUIs**, native CLI composition/coexistence, settings persistence/selected module scopes, clean npm consumers and public declarations. Combined used disposable loopback port45391; all fixtures allocate their own non3080 ports and close.
- Standards and Spec independent reviews of fixed `1b4b9a2...2012b6e`: **both 0required / 0optional findings**. Static reviewer opinions, not duplicate execution passes. Both require collecting actual full acceptance and final safety evidence before completion; see [separate axes](<REVIEW_RC3_061.md>).

## Red/green evidence and safety preservation

The existing confirmed public CLI/native plugin/migration/packed/browser seams are retained; no private side-channel test seam added.

1. Public npm graph acceptance on actual rc.3 failed as expected before preflight adaptation: `Wrong native version or unlocked identity: @deepseek-ai/dsh` (1/1 fail, exit1). Only exact admitted version changed; same test then passed exit0.
2. Ordinary module replacement on actual rc.3 failed before product adaptation with `Goal replacement artifact mismatch: @deepseek-ai/dsh requires 0.2.2-rc.2` (1/1 fail, exit1). Exact version/owner/migration gates were refreshed together without changing digest/frame/algorithm; same public replacement/Jobs wake test then passed exit0.
3. Existing retry settings/compaction compatibility tests before remaining version refresh reported 16 tests,9 pass,7 fail, including unverified host version and unavailable native retry settings. After exact version refresh the focused four-file run passed51/51. These expected red runs are preserved as `preflight-red.log`, `goal-red.log`, `policies-red.log`, not hidden or reported as final acceptance.
4. Added a read-only negative CLI fixture with rc.2 manifest **and matching physical-owner lock** while keeping actual unchanged Goal bytes; rc.2 still refuses. Migration inspection and compaction modifier also explicitly retain rc.2 refusal beside older/unknown versions. Existing unknown bytes/foreign Context/Loader/callback/edge/selector/nonmutation, cancellation/unload, migration/recovery, native compaction/retry/model authority assertions are unchanged.
5. No product behavior rewrite, wider runtime range, generic Job/native-tree conflation, private ancestry/cwd authority, duplicate executor or rc.1 recovery companion. English/Chinese native Continue labels now name rc.3 but keep the distinct follow-up vs checkpoint semantics.

## Published npm Goal provenance

The independently downloaded rc.3 Goal archive SHA256 `21f0fe81496f168a231ff9708f0a5d67d61975972653a463ef36cbd0b0fe909a` is24205bytes; both SHA512 SRI and SHA1 match freshly observed official registry metadata. Its compiled index SHA256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`, shipped source index `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7` and prompt `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97` equal the prior recorded rc.2 bytes and current official tag source. Actual emitted disarm observer94 and mount/unload callers357/363 are unchanged. Source, npm integrity and execution evidence are separate; byte equality does not authenticate npm to a Git commit.

## Production safety and remaining boundary

The current task-start fingerprints differ from historical prior-task snapshots and were sampled anew. They matched at intermediate checks, but **the final live patch fingerprint differs** (details below); do not present the comparison as a passed no-change gate:

```text
2b0b2f70726ae6c2a6c82073c1794f0c42343a081e61bf562f076ebfd126ad4f  /home/dev/.dsh/profiles/web/package.json
8dd6dd03f948bc1b3e30f1623c6e6778e738ab690d8eeb11e9ebc2ba241abdbc  /home/dev/.dsh/profiles/web/cordis.patch.yml
```

No production installation/update/restart, live GUI use, Actions, push, release tag or asset upload is performed. Historical published0.6.0/preview assets remain untouched. This check does not certify arbitrary future native versions, third-party wrappers or the experimental chat importer itself. All compatibility execution gates above completed. The separate production fingerprint-equality observation is unresolved, not waived or marked passed. Explicit `npm view ... version gitHead --json` for both rc.3 CLI and Goal returned only the version (no gitHead); registry signatures were not independently cryptographically verified.

### Live-profile observation and user-directed boundary

At final read-only safety collection, production package manifest remained the start hash, but production patch was `bd84ac7ffa623768fcc6ef1e4848922ede733df7fda1f4c390fc5c274f8cbf8e`, mtime2026-11-14 12:22:48.950326327 +0800. No start-content backup exists, and hashes/mtime alone do not identify a writer or exact delta. Do not infer agent mutation, external authorship, rollback permission or a passed equality check. The parent inspected metadata and redacted structural keys read-only, found no production path/live3080 literals in tests, and did not restore/edit/instrument the production file.

Asked about possible concurrent edits; the user replied “我本机的 配置 和你的 git 没什么 关系吧，做好你的事情”. This is a direction to focus on the repository, **not** confirmation of who changed the patch, approval to install/publish, or evidence that equality passed. No further personal-profile investigation is performed. The live profile is not a controlled fixture; RC3-SAFE exact equality remains explicitly **not certified**. Isolated compatibility results751/751 and54/54 remain actual executed results, not proof about a mutable live profile. No safety criterion is silently removed.

### Process and resource disposition

After both suites exit0, process inventory found **no remaining owned test processes** naming the rc.3 worktree/disposable root; native sandbox glob was empty. Session job inventory had no running/stopping jobs and terminal inventory was empty. Both research and both review subagents completed. Upstream tracked status remained clean; the evidence root, dedicated worktree, installed dev graph and six ignored candidate archives are explicitly retained for audit, not production installs or shipped source content. Original repositories/worktrees and published release identities were not changed.

## Candidate archive checksums

All six archives were rebuilt and packed locally, not relabeled published0.6.0 assets. Direct `sha256sum -c SHA256SUMS` passed6/6. Manifest SHA256 is `4b72badac512b01deca88040da39986a500992356070d81ca0304e7c17245c06`. Packed log SHA256 is `6f8bc1af0c9dc8c40c825b17722b0faff94b0f7450e260f87d8be2942e18ef5c`. Full source log SHA256 is `20aa4828e8ace48e8355b01c2783ee32e9d0ff0f407431bf1bec7a4facdaa5b4`.

```text
e5bb6651cc4054b595a17be006e31a75845c76e359600067b16eddc8f925c862  dsh-extras-0.6.1.tgz
845540d0bddff5e16950eb0a480cadf7c7d982db0d070d3418c183206f781206  dsh-extras-compact-context-0.6.1.tgz
641a81a52a3c31278b8d4c8c50bc745fedd9a76abab9a58553296b10d38262f7  dsh-extras-retry-0.6.1.tgz
2b71f294e8fd240fe3e8525eba9f8f16c67323bb84836f0a892d773504ec8b1c  dsh-extras-chime-0.6.1.tgz
07cc3940ef95136ae06dce2516142e4dc44201b065aeddacecc49de964b22583  dsh-extras-goal-wait-0.6.1.tgz
70ac929988bfd44e3ec5fb604dc26b5c65a7f31f1cbaf64ad8be81998adcebbb  dsh-extras-model-policy-0.6.1.tgz
```
