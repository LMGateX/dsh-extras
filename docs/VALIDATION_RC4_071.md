# Exact DSH rc.4 compatibility validation — unreleased Extras 0.7.1

Date: 2026-11-18, Asia/Singapore. Scope is the [pre-implementation contract](<DSH_RC4_071.md>), committed as `f9fb59b` before runtime changes. This is a local compatibility check, not a release or production-installation receipt.

## Frozen candidate and acquisition

- Base: published Extras 0.7.0 / rc.3 commit `5b1780861f2ab6cc4ea30641856c55fc019ed63c`.
- Product/build/full-source candidate: `310bff3` (42 files; manifests, exact guards, refusal classification, tests and user-facing rc.4 labels). Later commits are test/documentation-only; the shipped source and the seven tested archives remain the `310bff3` build.
- Exactly one full `git clone https://github.com/deepseek-ai/deepseek-harness.git` to disposable `/tmp/extras-rc4.v42Q00/upstream`, then detached `dsh-v0.2.2-rc.4` = `3f321d32bfe382212a8ed8785c1d47a5a300aa23`. The clone's tracked status is clean. rc.3 resolves to `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`. No incremental source-page reads, second clone, source build, linker or upstream modification.
- Official release metadata was fetched once with `gh release view`. Actual exact rc.4 npm packages were downloaded with `npm pack` for source-independent byte checks; no npm Git revision is inferred.
- Actual exact official npm rc.4 dependencies, not a source-linked or production host. `npm install --ignore-scripts --no-audit --no-fund` with disposable HOME/DSH_HOME/profile/XDG/cache/TMP state changed 530 packages in about two minutes; the physical graph contains **682 installed packages**, **338 `@deepseek-ai` native packages**, and the same audited Goal digest. Lock SHA256 is `37137c35fd25ae2d1599b46372968b3cfa4349a64000aa12aef91f55b6a0d8cd`.
- Node `v24.17.0`, npm `11.13.0`, Linux x86_64; existing Chromium 1248 selected with `DSH_EXTRAS_CHROMIUM`. Extras itself is not published to npm.

## Isolation and reproducible commands

The dedicated Git worktree is branch `adapt-dsh-022-rc4`. Disposable evidence root `/tmp/extras-rc4.v42Q00` is retained for audit. The full install/build/source/packed acceptance used this explicit environment:

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
node --expose-internals --test --test-concurrency=1 \
  test/modules/retry/plugin.test.ts test/modules/retry/integration.test.ts \
  test/modules/compact-context/plugin.test.ts test/host-timezone/artifacts.test.ts \
  test/migration/native-owner-runtime.test.ts test/integration/native-driver-lease.test.ts \
  test/modules/compact-context/reasoning-compatibility.test.ts test/host-timezone/client.test.ts
npm test
npm run test:artifacts
~~~

Whole native GUI fixtures allocate their own disposable profiles and loopback ports; the observed packed combined run used port 46463, never the live 3080. Native model tests use synthetic offline adapters and forbid provider fetch. The live GUI and personal sessions/providers are not test inputs.

## Observed results

- `npm run host:check`: **passed**, exact rc.4 / Cordis 4.1.0, 338 admitted packages, unchanged Goal digest `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`, physical graph and lock selected.
- `npm run typecheck`: **passed**.
- Seven `npm run build` outputs and `npm run pack` archives: **passed**.
- Focused public retry/compaction/Goal/migration/host-timezone guard run (`node --expose-internals --test --test-concurrency=1` over the eight focused files): **200/200 passed**, exit 0, 5893.164684 ms; log SHA256 `e67a8f9483b3a307f3da90da739836af63e1296cfba03fa82d2c1814964bb87b`.
- Complete source suite: **825/825 passed**, exit 0, 0 failed/cancelled/skipped, 245100.327692 ms. This includes the new `CONTENT_REFUSED` retry and compaction regressions, rc.3/previous-version refusal fixtures, unchanged Goal digest, unchanged host-timezone fingerprints, and all prior ownership/migration/config tests.
- Complete packed/native/browser suite: **67/67 passed**, exit 0, 0 failed/cancelled/skipped, 653987.342236 ms. This actually executed seven packed distributions (combined plus six splits): six split whole-GUI persistence runs, combined and host-timezone packed browser lifecycle runs, native CLI composition/coexistence, settings persistence/selected module scopes, host-timezone restart/cache/live-zone cases, clean npm consumers and public declarations.
- Source log SHA256 `c9ab9aaef442b3bca2684fe72c06838b5373e5fafe12f9131d8b531dfbf7fef8`; packed log SHA256 `a6d266a06a878208fa7b352f79e0404f9bf5824caa78c37096baaf8087adc8c7`.

One packed native startup log reports `mcp-manager ... failed to import` and `warning: 1 entry did not activate`. The isolated consumer installs with `--omit=optional`; this is an optional MCP graph resolution warning, not an Extras module failure, and every packed assertion passed. It is recorded as an environmental observation, not suppressed.

## Independent source audit

The separate RC4-S audit recorded in the [review report](<REVIEW_RC4_071.md>) independently re-ran the tag diff, extracted-archive comparisons, hashes, installed-graph checks and guard inventory. It returned **PASS** on all four claimed areas, with static-audit caveats (it did not execute the suites, and some unchanged-package emitted bytes were not independently compared). Those are limits of that audit, not execution evidence.

## Red/green evidence and safety preservation

1. Before the exact guard refresh, the real rc.4 graph failed public preflight as expected: `Wrong native version or unlocked identity: @deepseek-ai/dsh` (exit 1). This was a terminal observation; no pre-change log was retained, and it is not presented as a retained artifact. After the coordinated manifest/guard refresh the same preflight passed with the output above.
2. Previous-version refusals are retained in public tests: rc.3 manifests with otherwise unchanged Goal bytes and matching lock still fail the npm graph preflight; rc.1/rc.2/rc.3/unknown driver versions and Loader proofs refuse; rc.2/rc.3/unknown compaction and host-timezone versions refuse; changed bytes still fail before module evaluation.
3. New rc.4 refusal regressions prove `CONTENT_REFUSED` keeps its permanent code in the unit classifier and the real LLM-stream/official-retry seam, and that the compaction retry classifier does not retry a synthetic `CONTENT_REFUSED` failure even when its message also carries a transient marker. The compaction assertion exercises the deterministic classifier through the tool harness; it does not itself dispatch a native summary request. No new retry loop, synthetic message or provider dispatch was added.
4. The audited Goal compiled/source/prompt bytes and the three host-timezone browser fingerprints are unchanged from rc.3; rc.3 and rc.4 npm archives differ only in `package.json` for those packages. Their exact guards still move to rc.4, so an old version is not admitted by a byte coincidence.
5. No product feature behavior, migration authority, native compaction/retention/routing, native retry execution, Goal strategy/default or distribution payload was rewritten. Only the refusal classification and exact-version labels changed.

## Published npm provenance

Actual rc.4 Goal archive SHA256 is `97586255e0b6a8bda7813f2a1c360baad56f90cdfc5c2eadd5476cbcd455b8b7`; SRI is `sha512-WyHncynJBVAdLwymd31rRoI9bMrEGzw6cob44v48A0TtueMmWC1m7TyfMVpyjf/Pv2WiHnyAF53Mbp15twej6g==`. Its compiled `lib/index.js` remains `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`, shipped `src/index.ts` remains `fd7a5e4c436f951ca5d236df83a7b0dd662c2ebbffffe49a30714fe55ce4bfe7`, and `src/prompt.ts` remains `48410d77077e88053cded777736a425534e91b36402ab46dc151ea9867a3db97`. Session-controller `lib/client.js` remains `e9af25a01168a8405730c107471cbd6befccfab3294e793b10e1467c57255852`; schedule `lib/client.js` remains `b8dda300c8f835d825c8cbc23e56d66ffb4167d9c072f30468897611a9f34379`; connection `lib/client.browser.js` remains `5f6107953fa764c80b6c06aa161be318ffa0b71e565ac81536fc4267d5d62412`. Registry manifests again omit `gitHead`; registry signatures were not independently cryptographically verified. Source, npm integrity and execution evidence are separate.

## Production safety and remaining boundary

No production installation/update/restart, live-GUI use, Actions, push, tag, release or asset upload is performed. Historical published 0.7.0/rc.3 and earlier assets remain untouched.

The task-start production-profile baseline was **not captured**, so final equality is explicitly **not certified**. A final read-only observation found exactly two profile files at the previously known profile location; their current hashes, mtimes, ctimes and sampling command are retained only in the disposable evidence root (`profile-safety.txt`, SHA256 `27a7f241695fa488cc49fc10059aefb77f6f43955f01ae52ad1db636f5503bb7`). No profile path, hash, content or other identifying profile fact is committed. Both mtimes and kernel ctimes precede the task-start sample; ctime changes on writes, renames, chmod and attribute updates, so this is positive no-write evidence for those two files, not equality proof. Every install/build/test command used disposable HOME/DSH_HOME/XDG/TMP state; the only production-profile commands were read-only `sha256sum`/`stat`; no agent command targets the live 3080 GUI. The [documented amendment](<AMENDMENTS.md>) records the unresolved equality rather than claiming it passed. No personal-profile mutation, restoration or attribution is claimed.

The check does not certify arbitrary future native versions, third-party wrappers, the experimental LiveShare fix itself, or complete runtime equivalence of all unchanged source trees. The host-timezone adapter remains exact-byte and fails closed; the audited Goal driver remains exact-digest and fails closed.

## Candidate archive checksums

All seven archives were rebuilt and packed locally, not relabeled published assets. Direct `sha256sum -c SHA256SUMS` passed 7/7. Manifest SHA256 is `5d1f939a57be38592ea4f799ac38c5e142c5bee10d96a19a2c2edf6591661f6f`.

```text
1fe06e6c74751a58f120a1dafefca25c6c2d932460a177421aa104fd7f42ddf6  dsh-extras-0.7.1.tgz
fb601fade5ccc420d555ceac850bab0bb9d8d7582a3bbb3afbc498f166af3b6a  dsh-extras-chime-0.7.1.tgz
57b9aa004a854662315fe1768fa62a6a9e0b243279d934f40f917d18cdb9a92a  dsh-extras-compact-context-0.7.1.tgz
8f63051e1c77c70b65074aba294640349350abccc6b8a43fddf8f46d5e6c0ae8  dsh-extras-goal-wait-0.7.1.tgz
4b170a16d3f04795da1fff8bba45f4ba0810a1c0f80d8c45cf59566dc6fdf2d6  dsh-extras-host-timezone-0.7.1.tgz
aa61864605c585297d72a283700b9d0060baf2b49fc8c63b5222cd15414bf169  dsh-extras-model-policy-0.7.1.tgz
0723fb96f5b9adf932f0902db674270b4817160d01056edb8ed307f7b66d8c07  dsh-extras-retry-0.7.1.tgz
```

## Process and resource disposition

After both suites exit 0, process inventory found no remaining owned test process naming the rc.4 worktree or disposable root. The evidence root, dedicated worktree, installed dev graph and ignored candidate archives are retained for audit, not production installs or shipped source content. Original repositories, published release identities and the live GUI were not changed.
