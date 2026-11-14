# Final Extras0.6.1 publication validation

Date:2026-11-14 (Asia/Shanghai). This follow-up implements the explicit [publication authorization](<DSH_RC3_RELEASE_061.md>), not a relabeling of the [initial check](<VALIDATION_RC3_061.md>). No production installation, update, configuration writes, restart, GUI use or personal-profile investigation. No Actions or Extras npm publication.

## Frozen inputs and retained evidence

- Compatibility product source:2012b6e78b92e6e6b2c84b4b16dbefbdcdb6f3d7, initial check closure35bae9759ce9a677d51e14218574737419f93c54.
- Pre-identity publication contract:779401e; final README/install/packed-assertion snapshot:**b48f34aa219b797f965ae9a3ce5f22224b463526**. No runtime, client logic, schema, native guard, dependency or lock change in the publication follow-up.
- Reuse the already authenticated official npm rc.3 dev graph:338 native packages, Nodev24.17.0/Cordis4.1.0, unchanged public lock SHA256d816c0f785381a133134d50b14543e2f5342c2c83c3ef4af952cca03a31156fd. No second upstream clone/build/install; original one-clone source and npm-byte provenance remain in earlier reports.
- New disposable state/evidence root:`/tmp/extras-061-release.WB5DzA`. Old candidate archives are copied there before rebuilding, preserving their historical checksums.

## Isolation and commands

```sh
root=/tmp/extras-061-release.WB5DzA
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

Native GUI fixtures allocate their own explicit disposable profiles and port0, assert non3080 and close browsers/process groups. No live personal profile is a fixture or release dependency. Historical hash-drift observation remains unassigned/not-certified; this follow-up uses the explicit operation/isolation boundary in the publication contract and does not claim unchanged live fingerprints.

## Current executed results

- Host preflight, full typecheck, six builds/packs: **passed exit0**.
- Existing packed consumer regression first rejected the old candidate README (1test/1fail, exit1), then passed (1/1,exit0) after final README rebuild. These are identity-red.log and identity-green.log, not hidden failures or the full suite result.
- Mechanical per-member comparison of all six old/new archives: identical member sets and **only package/README.md differs** in each. Runtime/client bundles, maps, manifests, declarations, licenses, sounds and Goal provenance are byte-identical to the already-tested candidate. Final archives nonetheless receive full fresh packed acceptance.
- Final complete source suite: **751/751 passed**, exit0, 0failed/cancelled/skipped,233138.17157ms, at frozen snapshotb48f34aa219b797f965ae9a3ce5f22224b463526.
- Final complete packed/native/browser suite: **54/54 passed**, exit0, 0failed/cancelled/skipped,348777.784466ms. Actually executed six whole native GUIs (combined and five splits), CLI composition/peer coexistence, selected module/settings persistence, native Goal/ownership/compaction behavior, clean consumers and public declaration entries. Combined fixture used its own port33887, never3080.
- Independent final Standards/Spec reviews: **both0required / 0optional findings** on fixed35bae97...b48f34a. Separate static opinions in [follow-up review](<REVIEW_RELEASE_061.md>), not inferred execution or publication receipts.

## Final archive checksums

```text
e1046daef19cd81a9bb00ebeaf44a786a34a92d42e531f0b8f632fbdb8d1c943  dsh-extras-0.6.1.tgz
77eaf02f9042ccc74180209c0b6adf6da4741639d1b8278d1018472d5aee185c  dsh-extras-compact-context-0.6.1.tgz
ef063dd578ef0fd684471d09f666f17e90b25bad9175f5df8f7861f9b5531f4d  dsh-extras-retry-0.6.1.tgz
b482081d95c9550776244d44cd4bcfe8c1fec029417a5417dcbc151b11f9d210  dsh-extras-chime-0.6.1.tgz
2d071f7dec5879bd0bc42e374022bd066dd7eb369c697d21982f69dd6d9982bf  dsh-extras-goal-wait-0.6.1.tgz
6deacfd36fdce2924f09c60d76b625e7579fb5071398969b42f7278ff9f52f2e  dsh-extras-model-policy-0.6.1.tgz
```

SHA256SUMS SHA256:`eac89aacba9dc8b0cc70625fe0e72fbc8da04742867147ad8f634de2b086d05f`.

## Publication boundary

All final local gates above passed. Source log SHA256:`0a4297a70cb328b18f7bdcbf35a032c3a24f4e38122a4a07eeedf694b1865003`; packed log SHA256:`9a21856eace12e9ca90875e2a712dfdd67f1fb5e7271c8e5dd073ab3ec106334`. Direct SHA256SUMS verification passed6/6.

After both suites exit0, process inventory found no remaining owned tests under the release root/rc.3 worktree, native-sandbox glob was empty, job inventory had no running/stopping jobs, and terminal inventory was empty. Both final review agents completed. Release and prior audit state/worktrees/dev graph/candidate archive copy/final archives are explicitly retained for audit; they are not production installs or committed payloads.

This record freezes **prepublication** evidence. Push/tag/release/remote receipt are subsequent actions, not preclaimed facts in this commit. Source notes and this record are committed before atomic main/tag push. Actual seven-asset download verification is appended to the GitHub release body without changing the tested tag/source identity. Preserve previous releases/tags/assets.
