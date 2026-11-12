# Extras0.6.0 — published npm rc.2 validation

Pre-publication isolated acceptance complete on2026-11-12. This record distinguishes actual npm evidence from the historical source-built preview. Push/release/download receipts occur subsequently and are recorded in the GitHub release body; this frozen source record does not preclaim them. Apply the [pre-implementation npm contract](<DSH_RC2_NPM_060.md>) and every retained rc.2 safety gate.

## Observed official registry and installation

On2026-11-12 a fresh query of https://registry.npmjs.org returns exact @deepseek-ai/dsh0.2.2-rc.2 with tarball https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.2.tgz, SHA1ff003ca75f37975c40b800fb925df70b38841fd4 and SRI `sha512-J727r2C471x2cYXGjqZ0D9T1ZyaYQDFH/Ynx8iq+85oslM4nky5YTBnbAuTtxMhW7nhY8wuAEfjjFCQ+K6Swgw==`. Registry metadata alone is not runtime proof.

Parent independently created a new disposable package and real npm lock with only exact @deepseek-ai/dsh0.2.2-rc.2, then ran `npm install --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org`. All HOME/DSH_HOME/profile/XDG/cache/TMPDIR variables were explicit. **669 packages installed, exit0,6m**. No lifecycle rebuild or byte patch was needed. Actual installed CLI `--version` returned0.2.2-rc.2; `--profile isolated --from-default-profile web --dump-config` passed, exit0. None of these commands target production.

Actual installed Goal driver compiled index SHA256 is `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`, byte-identical to the recorded canonical-source driver. An independent research lane also verified the shipped source index and prompt hashes and unchanged observer/caller coordinates. Therefore no runtime digest/frame guard is widened. Unknown/changed bytes still refuse. The installed public lock records real Goal SRI `sha512-EJEm/Ub72TBXnrFod5PCp0fLkloantPaJzp+Zn8GvayZoM1kFTrg+EZiUxbU1dfMi/vg/rj91/MvV3jzuvJg5w==`.

The prior day’s full-source disposable checkout is no longer present. This run does not pretend to have re-read or rebuilt it: the npm distribution itself includes src files, and the committed earlier hashes/reports are the historical comparison basis. Registry manifests omit gitHead; byte equality and source counterpart attribution are not a claim that registry metadata authenticated a Git revision.

## First full-source run and observed lifecycle race

The first new npm full run executed 748 tests: 747 passed and one native PTC live-model override assertion observed 120000 instead of 420000. This was not suppressed or counted as acceptance. Focused full-file repetition reproduced the same failure (fourth run), and a minimal public-state probe later reproduced it with correct Agent options slow/model while the public module status was `migration-pending`, ready=false, reason "running Extras configuration has not adopted planned settings". The native persistence/Loader completion barrier precedes asynchronous Extras migration admission; model ownership was not the cause.

The existing test now waits for the existing bounded public `ready()` status after each configuration edit before asserting the unchanged exact PTC results (450000, explicit zero returning native120000, model-specific420000). No product runtime, timeout policy or assertion was changed, and no blind delay was added. All diagnostic instrumentation was removed. Twenty-five consecutive complete native PTC-file runs passed after this correction. The subsequent complete run passed748/748, zero failures/cancellations/skips, in222168ms, exit0; that complete run closes the source gate.

## Final isolated owner acceptance

Product/build inputs were frozen at `db9526e4a69449fea2862d7f658a5c1404b754cd`; final source-test snapshot is `25fccc4dba1fb70d2c3c4705f9091109e7d9e859`. The latter changes only the test lifecycle barrier and this failure disclosure. Subsequent release-closure changes are documentation only, outside the packed inputs; the six tested archives were not regenerated or replaced.

Environment: Linux x64, Node24.17.0; explicit disposable HOME, DSH_HOME, DSH_PROFILE=isolated, XDG_CONFIG_HOME/XDG_CACHE_HOME/XDG_DATA_HOME, TMPDIR and npm cache; existing isolated Chromium1248. Both DSH_RUNTIME_ROOT and DSH_TEST_INSTALL_ANCHOR select this fresh consumer installation, never the separate bootstrap host or production.

| Executed command | Actual result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund --registry=https://registry.npmjs.org` | exit0;679 installed packages in24s |
| `npm run host:check` | exit0;337 installed native packages; exactrc.2/Cordis4.1.0/Goal hash |
| `npm run typecheck` | exit0; actual native declarations |
| `npm test` (final complete rerun) | exit0;748/748;0failed/cancelled/skipped |
| `npm run build` then `npm run pack` | both exit0; six final0.6.0 distributions |
| `npm run test:artifacts` | exit0;54/54;0failed/cancelled/skipped;525148ms |
| Native PTC entire-file loop after correction |25/25 complete invocations, exit0 |

Packed acceptance is not just CLI composition: it executed the combined **whole real native GUI** and five separate **whole real native split GUIs**, each served by a real temporary native host with its packed client, selected-only Configure controls, persisted save/reload and no browser errors. Native CLI installation, split coexistence, Loader lifecycle/migration/recovery, opaque workspace overrides, one executor, Goal cancellation/ownership and declarations/import/metadata guards also passed. The separate actual-emitted browser renderer tests are not mislabeled as whole-GUI coverage.

Reproducibility SHA256: committed public lock `9137c8f5bf5ef3face8c55553081f180679fafd8e02c0b917f6c68962ee4471a` unchanged after fresh ci; final source log `b9797a54b90e8273edee49f6e1b8dec135b3326ef0bcc6fca3adeba5d07f9a51`; packed log `b986307a6d64e709e980548999ba5bd272217f0f060e6b592f531602d52ce22b`; six-entry SHA256SUMS itself `0f62a5644b22990869f99e8c3b0d64b715bb97a2f2d5c9ba0091fc27fc4668d6`. Disposable logs are retained locally for audit, not shipped as profile or receipt assets.

## Tested final archive identities

```text
be2903be0d125b1ae1f6f74448389766e91da16c86c95866b3b07c27c7fbdada  dsh-extras-0.6.0.tgz
2335eab5147ab7e164730225627e2b26041c2105ebd37fedd6e0cc836e78e8b4  dsh-extras-compact-context-0.6.0.tgz
7a03fea8210f0e13e524affef9b171b0b0489149d04efe1034ecb957430ff573  dsh-extras-retry-0.6.0.tgz
78001ff053ef6fd776346e7e1545283c4a0d26e70c48713921927fa2712514ed  dsh-extras-chime-0.6.0.tgz
4d77d41f669087a3e50535ee5af85a6a7c22cdee83ba8c95f7ed496f9436fa9e  dsh-extras-goal-wait-0.6.0.tgz
a36cd73d434fe50af8788667218ca49cd3c02cde7c437fad4b0846a67ba4570f  dsh-extras-model-policy-0.6.0.tgz
```

## Review, isolation and publication boundary

Independent Standards and Spec reviewers each found zero required or optional findings, first across the six npm-transition commits and again across the isolated lifecycle-test correction. See [review record](<REVIEW_NPM_060.md>). Their read-only findings are not substituted for owner execution.

Production profile manifest SHA256 `44c8c34bfc797220755b145cd10bc2ff138555b7925663666680605778390dd4` and patch SHA256 `bd84ac7ffa623768fcc6ef1e4848922ede733df7fda1f4c390fc5c274f8cbf8e` matched task-start fingerprints at the post-test safety check. No production DSH installation/update/restart/live-GUI access, source reclone/rebuild, GitHub Actions or Extras npm publication was performed. Temporary test hosts/browsers are closed by fixture teardown; no owned test job or terminal remains after collection.

The parent verification worktree and its research/npm-development child worktrees are deliberately retained, clean, for audit; the child patches are integrated. Older/unrelated worktrees and the original local main checkout are not reset or deleted.

Mandatory next network steps: clean fast-forward remote main plus new matching annotated v0.6.0 tag, final GitHub release preserving v0.6.0-rc.1, and fresh download of exactly six tested archives plus identical SHA256SUMS. Verify every remote digest, manifest identity/engine, main/tag target and release metadata; append the actual post-publication receipt to the release body rather than rewriting this frozen snapshot or pretending the receipt predated publication.
