# Final Extras 0.7.1 publication validation

Date: 2026-11-18 (Asia/Singapore). This follow-up implements the explicit [publication authorization](<DSH_RC4_RELEASE_071.md>), not a relabeling of the [initial check](<VALIDATION_RC4_071.md>). No production installation, update, configuration writes, restart, GUI use or personal-profile investigation. No Actions or Extras npm publication.

## Frozen inputs and retained evidence

- Compatibility product source: `310bff3`; initial check closure: `ace35b7`.
- Pre-identity publication contract: `d49cdc2`.
- Final README/install/release-note snapshot: **`dc8e1e130863cd605883fbe1e18c7e4a0a729532`**. No runtime, client logic, schema, native guard, dependency or lock change in this publication follow-up.
- Reuse the already authenticated exact npm rc.4 development graph: 338 native packages, Node `v24.17.0`, Cordis `4.1.0`, unchanged public lock SHA256 `37137c35fd25ae2d1599b46372968b3cfa4349a64000aa12aef91f55b6a0d8cd`. No second upstream clone, source build or install.
- Disposable evidence root: `/tmp/extras-rc4.v42Q00`. Candidate archives were copied to `candidate-artifacts/` before the final rebuild, and the first final-identity archives to `identity-acaf1ea-artifacts/` before the README historical-trail correction, preserving both earlier checksums.

## Isolation and commands

~~~sh
root=/tmp/extras-rc4.v42Q00
export HOME="$root/home" DSH_HOME="$root/dsh" DSH_PROFILE=isolated
export XDG_CONFIG_HOME="$root/config" XDG_CACHE_HOME="$root/cache"
export XDG_DATA_HOME="$root/data" XDG_STATE_HOME="$root/state"
export XDG_RUNTIME_DIR="$root/runtime" TMPDIR="$root/tmp"
export npm_config_cache="$root/npm-cache" npm_config_registry=https://registry.npmjs.org
export DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
unset DSH_RUNTIME_ROOT DSH_TEST_INSTALL_ANCHOR
npm run host:check
npm run typecheck
npm run build
npm run pack
npm test
npm run test:artifacts
~~~

Native GUI fixtures allocate their own explicit disposable profiles and loopback ports, assert non-3080, and close browsers/process groups. No live personal profile is a fixture or release dependency.

## Identity comparison

All seven candidate/final archive pairs were extracted and compared member by member. Each pair has the same member set and **only `package/README.md` differs**; runtime/client bundles, maps, manifests, declarations, licenses, sounds, host-timezone artifacts and Goal provenance are byte-identical to the already-tested candidate. The final README member hash is `84619264b78c68dc197ea55a1ed5b94f263072f0243de0ce6ac95afbc1f8f863`. Final identity-diff log SHA256: `1a9af80d8ef76c4b320b56112b2ce9653f04a2e866c23f3d9a30d689e57855e9`.

Final archives nonetheless received a fresh complete source and packed acceptance after the last shipped README edit.

## Current executed results

- Host preflight, full typecheck, seven builds/packs: **passed exit 0**. Typecheck log SHA256 `e755c4d02f0898f52da8d7b3e13f080ea9a9eaa9c2c963feb4e87b4ac24b412b`.
- Final complete source suite: **825/825 passed**, exit 0, 0 failed/cancelled/skipped, 239933.929861 ms at frozen snapshot `dc8e1e1`. Source log SHA256 `53b3e7311ff133a6cf134165bbd28c40a0ee64630964c3816f7c3c9d4bd474b5`.
- Final complete packed/native/browser suite: **67/67 passed**, exit 0, 0 failed/cancelled/skipped, 756980.067937 ms. It executed seven packed distributions, six split whole-GUI persistence runs, combined and host-timezone packed browser lifecycle runs, native CLI composition/coexistence, settings persistence/selected module scopes, migration/recovery, host-timezone restart/cache/live-zone cases, clean consumers and public declaration entries. Packed log SHA256 `e61b6a636cba1acbf669f4c7b365bfbd92dfd5ef2ae3ff57fbabd8bb66d507ac`.
- The packed native startup log again records the optional `mcp-manager` import warning under a `--omit=optional` consumer; every packed assertion passed. It remains an environmental observation, not an Extras failure.

## Final archive checksums

```text
c28af59701a4a86d17438371bcf6d56e7d1b6a1cbc7861b46cd00c8985e062c7  dsh-extras-0.7.1.tgz
94acb2d5484dc7f1d21660044be4c4ffeae3c5c58137182ad83754f8431670ad  dsh-extras-compact-context-0.7.1.tgz
c23376f731b5202018a9f3f156dd911e38ba9367a158e2519fc243b10eaaeac9  dsh-extras-retry-0.7.1.tgz
40803d1599e8159b59862dadd56877ea6086a4717ea25bd64d205747fd4e74f0  dsh-extras-chime-0.7.1.tgz
7533904a15b7f7278a6f18ed50cd97b6fa9295148d2c29d513f35733c5882e3d  dsh-extras-goal-wait-0.7.1.tgz
26c3ded832f84309d6f9c0c447fc0b04a041322bb7d600f8467208e83ef35cf0  dsh-extras-model-policy-0.7.1.tgz
965973c8cc382d83bec5b063b81af190d41de1de53b2aa9a34a9a339e0c62a43  dsh-extras-host-timezone-0.7.1.tgz
```

`SHA256SUMS` SHA256: `ce8719932292a9fc20535fbeee723800f81cb4d0d90b6698f6c23470c8d98c5d`. Direct verification passed 7/7.

## Production safety and publication boundary

No production operation, live-GUI request, Actions run or Extras npm publication. All builds/tests/native installs used the disposable environment above. The publication contract's agent-operation/disposable-fixture boundary applies; the earlier check's unresolved profile-hash equality is not relabeled as passed and is not re-investigated.

This record freezes **prepublication** evidence at `dc8e1e1`; the release-record commit adds this validation and the final review only. Push, annotated tag, GitHub Release and remote receipt are subsequent actions, not preclaimed facts here. Actual remote-asset download verification will be appended to the GitHub release body without changing the tested tag/source identity. Previous releases/tags/assets remain untouched.

## Process and resource disposition

After both suites exit 0, process inventory found no remaining owned test process naming the rc.4 worktree or evidence root. The evidence root, dedicated worktree, installed dev graph, candidate/previous-identity archive copies and final archives are explicitly retained for audit; they are not production installs or committed payloads.
