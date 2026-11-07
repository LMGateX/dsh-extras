# Extras 0.4.0 — exact DSH rc.1 release validation

Status: engineering acceptance passed on final repaired bytes; physical publication/download receipt follows separately. Date: 2026-11-07 (Asia/Shanghai).

## Fixed contract and audited changes

The [rc.1 contract](DSH_RC1_040.md) was committed as `2f50c92` before implementation; all inherited baseline, REASON, PAR and CLI gates remain mandatory. Independent [package research](RESEARCH_DSH_RC1_2026-11-07.md) and [native-owner audit](RESEARCH_NATIVE_RC1_2026-11-07.md) distinguish official package identity changes from byte-identical runtime entrypoints. Extras 0.4.0 supports exact DSH `0.2.2-rc.1`, Cordis `4.1.0`, Loader/Include `1.1.0`, Schemastery `3.19.0`; alpha.3 users retain Extras 0.3.1.

Initial implementation `297867099530b8936542a359b8cec04bb80148c7` refreshes exact reasoning/Goal/anchored ownership guards. Independent Spec review identified one inherited missing migration source proof; final product commit `d7a4bf9c6221b7e1c8aa58ce27906f886bc58da6` adds anchored exact driver name/version/SHA-256 verification before callback import plus exact Loader identity, with [public red-to-green source and all-five packed regressions](../test/migration/NATIVE_PROOF_RC1_EVIDENCE.md). Unknown-version/artifact/foreign-owner refusal remains mandatory. Native driver SHA-256 remains `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de`. Two inherited contract gaps found during audit have red-to-green public regressions: prompt guidance follows current native executable scope/toolSet rather than cached registration, and unsupported reasoning effort cannot become TRANSPORT via a custom retry list. No new retry loop, provider routing or compaction engine is introduced. See [focused feature evidence](../test/modules/compact-context/RC1_EVIDENCE.md).

## Reproducible isolation and commands

Dedicated integration and delegated Git worktrees only. Development dependency installation was confined to the integration worktree with `npm install --ignore-scripts --no-audit --no-fund`, explicit disposable HOME/DSH_HOME/XDG/cache paths. It never installed a production plugin or modified the global DSH installation.

Every final gate runs from a clean environment whitelist with PATH and synthetic per-run HOME, DSH_HOME, TMPDIR, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME and npm_config_cache, all rooted in a newly created `/tmp/ex-040-<gate>-*` directory. Temporary test consumers are outside repository node_modules ancestry, preserving absent-peer/missing-anchor negatives. No provider credentials are inherited. Explicit source seams:

```sh
export DSH_TEST_LEGACY_ROOT=/home/dev/dev
export DSH_TEST_LEGACY_GOAL_ENTRY=/home/dev/dev/dsh-goal-wait-gate/.agents/worktrees/feat/dsh-0.2.2-alpha-support/src/index.ts
export DSH_TEST_EXTRAS_GOAL_ENTRY="$PWD/src/modules/goal-wait/index.ts"
export DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
# In the whitelisted environment (not the ambient production environment):
npm run typecheck
node --expose-internals --test --test-concurrency=1 \
  test/client/*.test.ts test/integration/*.test.ts \
  test/migration/*.test.ts test/modules/*/*.test.ts
npm run build
npm run pack
node --expose-internals --test --test-concurrency=1 test/artifacts/*.test.*
```

The ordinary package test runner now applies the same native Node flags. Historical Goal entry was verified at `cbd86273660893336afaee31794b5fd76487db78`, clean. Historical config-only validators are read-only. The legacy native-strategy handover comparison is not a claim that the old alpha-pinned replacement/startup implementation supports rc.1.

## Executed release gates

Initial cumulative execution on `2978670` completed exit 0: typecheck; **578/578 source tests** (zero failed/skipped/cancelled), including all three actual legacy/current seams; build and pack; **43/43 artifact tests** (zero failed/skipped/cancelled), including all five native CLI compositions and actual packed combined native Web/Chromium on loopback port `33901`; final bounded integrity check. Independent Spec review then found a migration source-proof gap, so this green result is retained only as pre-review evidence. Final repaired-byte execution then completed exit 0: **585/585 source tests** in 113.751 seconds and **43/43 packed artifact tests** in 291.237 seconds, zero failures/skips/cancellations/todos in either suite; typecheck/build/pack also exit 0. Native combined Web/Chromium ran on temporary loopback port `43891`, exercised actual installed client bytes, native settings Save/persistence/reload, reasoning toggles, all four Goal strategies, retry/rest/chime controls and zero browser errors. All-five native CLI composition, clean consumers, absent-peer CLI/API, anchored native ownership/refusals and packed Goal/reasoning tests passed. Chime audio/disable/fresh-page legacy handover is specifically the separate emitted-client Chromium gate; it is not claimed to execute a legacy chime installation inside the combined native host. Exact accepted archive hashes are below. Initial unadapted source inventory failed the exact Goal guards as expected and was deliberately stopped after establishing red evidence, not counted as complete acceptance.

## Independent review

Two fresh read-only subagents reviewed `git diff v0.3.1...2978670` in parallel, then independently rechecked fixed `2978670..d7a4bf9`. [Separate reports and closure](REVIEW_040.md): Standards has zero hard findings plus one deferred, low-priority inherited metadata-maintenance heuristic; Spec’s blocking migration exact-source-proof P2 is closed by static recheck, with no new concrete finding. Neither reviewer claims execution evidence; final cumulative execution is separate.

## Safety and boundaries

The final read-only before/after SHA-256 comparison confirms seven selected production profile/global-install manifest files unchanged; HEAD/status comparisons confirm nine original repositories unchanged (**7 files, 9 repositories, zero problems**). This is a bounded integrity check, not a claim to hash all session/history files. No live GUI request, production service restart or local production installation is part of acceptance.

Native and browser coverage is synthetic/offline: real adapters/engines/Loader/ConfigEditor and packed clients, never external model credentials or provider cost/cache guarantees. Full native Web/Chromium is required for the combined distribution; all-five emitted/packed browser presentation and native CLI composition are separate gates, not five full native-host browser runs. Existing browser autoplay and version-limited reflection/descriptor/stack compatibility boundaries remain.

GitHub Actions were independently read disabled before publication, and npm publication is prohibited. Publication must create a new annotated `v0.4.0` tag/normal Release, keep clean main and peeled tag synchronized, and upload exactly the six frozen assets below without overwriting prior versions. The physical receipt is appended to the [linked Release](https://github.com/LMGateX/dsh-extras/releases/tag/v0.4.0) only after real upload, tag/ref checks and fresh-HOME unauthenticated curl downloads match all accepted bytes.

Integration, research, compact/retry, Goal/native audit and native-proof-repair worktrees are deliberately retained for reproducibility, not claimed deleted. Disposable fixture consumers/profiles/native browser processes were closed by guarded teardown; outer development dependency/cache/log roots remain ignored and are not Git/Release payloads. Every relevant parent job was collected; the final parent job inventory has no running jobs and terminal inventory is empty. Delegated lanes reported their jobs collected; both final reviewers finished read-only. Existing unrelated worktrees are untouched.

## Final accepted byte ledger

Final product commit `d7a4bf9c6221b7e1c8aa58ce27906f886bc58da6`; later commits in this record are documentation-only. Runtime/source Git tree `87492f240fd148e0a744a2d6f70bedbbd8a41d08`, client tree `7501bf1e1020647fd2adbac81e25edc377b0108b`, scripts tree `f2b971a04608579adb2894b60708df18bb569ece`. Test implementation at that commit has tree `56b12dcec9fdea79023beb17e379579a05010a8e`; the later focused-evidence Markdown adds no executable changes. Lockfile resolves one Cordis entry, version `4.1.0`. Runtime/client/scripts/manifests/README must remain unchanged after these gates.

All five archives were rebuilt/repacked after the migration proof repair and passed the complete final packed gate. A separate final checksum check returned five OK results; a bounded payload scan checked 108 text entries across five archives, with no node_modules/sandbox/.env payloads, developer-home paths or selected secret patterns. This scan is not a universal secret-detection guarantee. Accepted hashes:

| Release archive | SHA-256 |
| --- | --- |
| [dsh-extras-0.4.0.tgz](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-0.4.0.tgz) | `673ef65eede6ae6cb0e51fd41f9232c7d77005ae93ddd7d40e8dfccb92b6d4b6` |
| [dsh-extras-compact-context-0.4.0.tgz](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-compact-context-0.4.0.tgz) | `d1c04ec44d90a13a39453697b77cc6537c45d32a6e6d77b31ac6ae073f3b4dee` |
| [dsh-extras-retry-0.4.0.tgz](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-retry-0.4.0.tgz) | `7089529a3c99fadc4a80074885ff18a37e0200e28194df861f56d2a823226d91` |
| [dsh-extras-chime-0.4.0.tgz](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-chime-0.4.0.tgz) | `b43eff81562024e6649c32b155cc91b8e94a7c29d29b4a2bf0b2060e9754c688` |
| [dsh-extras-goal-wait-0.4.0.tgz](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-goal-wait-0.4.0.tgz) | `10bbee0d9eb66eb16bc5eb4f016fc4c0f612685789bae519c30ad2988275777d` |

[Checksum manifest](https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/SHA256SUMS) is a separate sixth Release asset; GitHub-generated source archives are not installable Extras packages.
