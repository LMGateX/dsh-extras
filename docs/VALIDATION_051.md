# Extras 0.5.1 — final release validation

Status: **final isolated engineering gates passed on the exact six 0.5.1 archives**. Date: 2026-11-09 (Asia/Shanghai). Baseline: published Extras 0.5.0, source `a25396014e6f8ded5b6ac2589d21d03029f79c70`. The follow-up behavior contract is [UI_REFINEMENTS_050.md](UI_REFINEMENTS_050.md); its implementation acceptance, red–green evidence and independent review are recorded in [UI_REFINEMENTS_VALIDATION.md](UI_REFINEMENTS_VALIDATION.md).

The reviewed product implementation is `adcdb7b78431fbbb57becd28be23d9051bb4aef3`. Release preparation `9bf1becc9ec8726a19aeb7e209d472879c1a823f` changes only version identities, README text and version assertions in two tests; no `src/` or `client/` byte changed since the independent review. The tested source below is that exact commit with a clean worktree.

## Executed gates

One parent-owned runner executed the complete sequence from a whitelisted environment with disposable HOME, DSH_HOME, TMPDIR, XDG cache/config/data and npm cache, `DSH_PROFILE=isolated`, the audited read-only Chromium, and explicit original/current Goal module entries. It recorded the source commit and an empty status file, then ran in order:

```sh
npm run typecheck
npm test
npm run build
npm run pack
npm run test:artifacts
env DSH_RECOVERY_CANDIDATE_ANCHOR=/tmp/dsh-native-recovery-stage-b70lEZ/node_modules/@deepseek-ai/dsh/package.json \
    DSH_RECOVERY_CANDIDATE_MANIFEST=/tmp/dsh-native-recovery-stage-b70lEZ/manifest.json \
    node --test --test-concurrency=1 test/native-recovery/packed-native.acceptance.ts
```

| Gate | Actual result | Execution log |
| --- | --- | --- |
| TypeScript | PASS | [typecheck](</tmp/extras-051-final-gates.RnN8ZT/typecheck.log>) |
| Full source | **698/698**, 0 fail/cancel/skip; 180853.97 ms | [source](</tmp/extras-051-final-gates.RnN8ZT/source.log>) |
| Six-package build | PASS | [build](</tmp/extras-051-final-gates.RnN8ZT/build.log>) |
| Six-package pack | PASS | [pack](</tmp/extras-051-final-gates.RnN8ZT/pack.log>) |
| Packed clean consumers, native CLI/profile/browser | **49/49**, 0 fail/cancel/skip; 344495.92 ms | [artifacts](</tmp/extras-051-final-gates.RnN8ZT/artifacts.log>) |
| Actual unofficial native candidate + current packed combined/retry | **6/6**, 0 fail/cancel/skip; 6004.92 ms | [native recovery](</tmp/extras-051-final-gates.RnN8ZT/native-recovery.log>) |

The runner settled with exit 0 / `ALL_051_FINAL_GATES_PASS`; the [runner](</tmp/extras-051-final-gates.RnN8ZT/run.sh>), [source head](</tmp/extras-051-final-gates.RnN8ZT/source-head.txt>) and [empty status](</tmp/extras-051-final-gates.RnN8ZT/source-status.txt>) are retained. No implementation byte changed during the run. The artifact suite includes actual native CLI installation into an isolated web profile, all six packed manifests, clean consumers, strict declarations and packed browser checks; the native recovery suite reruns exact request dispatch, duplicate/lost-response safety, disabled/admission/stale refusal, finite re-exhaustion, completed-tool preservation and fresh-process zero dispatch against the rebuilt archives.

## Exact tested archives

[Generated checksum receipt](<../artifacts/SHA256SUMS>) binds the six archives built by the pack stage; the release upload used the same files:

| Archive | SHA-256 |
| --- | --- |
| [dsh-extras-0.5.1.tgz](<../artifacts/dsh-extras-0.5.1.tgz>) | `542a935a946bd63a6121c5908b52d87acff37c09d94b81639c437c8c04c3559a` |
| [dsh-extras-compact-context-0.5.1.tgz](<../artifacts/dsh-extras-compact-context-0.5.1.tgz>) | `83914d85fc2a81a8f227470f36a3d86eab9d247532b3b6b793c8b91a05bcb635` |
| [dsh-extras-retry-0.5.1.tgz](<../artifacts/dsh-extras-retry-0.5.1.tgz>) | `30fa1b4abc9b4dbdd5ad78a739e8de1a1aa1e79c9427058dd9f7f062a3a03d6a` |
| [dsh-extras-chime-0.5.1.tgz](<../artifacts/dsh-extras-chime-0.5.1.tgz>) | `056492302450456f59fcccad5c3f8a5c563cc55ca6642689656993c49f03c25e` |
| [dsh-extras-goal-wait-0.5.1.tgz](<../artifacts/dsh-extras-goal-wait-0.5.1.tgz>) | `81bc4bc03595cb5741113be411157c41145fb8979b1a649ce20a83975d60e217` |
| [dsh-extras-model-policy-0.5.1.tgz](<../artifacts/dsh-extras-model-policy-0.5.1.tgz>) | `cd48403bb98a37f7241cf750ea0d037909fc7a5058016ad9ac21c249c9347861` |

The separately named unofficial companion is unchanged from 0.5.0: `c49d972192de304eae35deb9f5d520446af7b0b6ddcc42ba15c0faad3482a6ec`. It is not an official DSH release and is not activated by this release.

## Review, limits and separate receipts

The frozen implementation was independently reviewed on two axes with read-only source/Git inspection: **Standards: zero documented violations or blockers, one optional low-priority test-setup duplication heuristic; Spec: zero open source-level findings**. Both real Spec findings — non-model terminal errors requiring positive model-failure origin proof, and opaque-ID global inheritance in the native executor — were fixed with public RED→GREEN evidence and rechecked. The reviewers did not execute the release gates; the parent-owned logs above are the execution evidence.

Publication/download checksum verification and the explicitly authorized installation into the current local DSH profile are separate post-build operations. They are recorded on the `v0.5.1` Release and in the restricted local install receipt, not inferred from these tests. No live GUI was used as a fixture or modified. Stock DSH still reports terminal recovery unavailable without the separately installed unofficial companion. Installed bytes, saved configuration, the running server and browser refresh remain distinct states; no implicit restart is performed.

The release tag commit adds only this validation record, the [release notes](RELEASE_051.md) and the 0.5.1 acceptance row on top of the tested source; the product/packaging delta is empty.
