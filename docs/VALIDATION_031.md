# 0.3.1 standalone migration entry — validation record

**Engineering release gates passed**, 2026-11-07 (Asia/Shanghai). Publication/upload/anonymous-download verification are separate operations, whose physical receipt belongs on the [0.3.1 Release](<https://github.com/LMGateX/dsh-extras/releases/tag/v0.3.1>); they are not inferred from tests or this authored report. Contract fixed before implementation in [MIGRATION_CLI_031.md](MIGRATION_CLI_031.md), commit `94cbfcd7cd0db5f62effde9a2c395896bf692cce`. User authorized isolated development/tests, then push/release, with no production installation/restart/live GUI operation.

## Completed diagnosis and first red-green slice

- [Research](RESEARCH_MIGRATE_CLI_2026-11-07.md) and [independent source audit](research/MIGRATE_CLI_DEPENDENCIES_030.md) established the original exact missing-Cordis startup failure.
- New actual packed help regression committed as `b2721186606cfb39cdd08d8b50ef2d8b663aa397` in its isolated subagent tree before product edits. On all five pristine 0.3.0 archives: **0 pass / 5 fail**, exact missing-Cordis error after ordinary dependencies installed and both CJS/ESM negative peer-resolution checks. Parent independently reran the new test against those bytes and obtained the same 0/5 outcome. This is intended RED, not passing acceptance.
- A public inspectMigration source regression also reproduced an incomplete host anchor incorrectly accepting an actual Context supplied from elsewhere. Minimal repair first landed as `948d6d00a74068fc54abd51c2e45f3221a7695ef`; source agent reported focused 11/11 green and typecheck. The complete integrated source and final-byte acceptance receipts are recorded below.
- Initial parent build/pack of all five 0.3.1 candidate archives exited 0 in disposable HOME/DSH_HOME/XDG/TMPDIR/cache. These are development candidates, not published or final-tested assets.

## Second red slice: actual installed bin

After the Cordis startup repair, the same parent five-package help regression still failed **0 pass / 5 fail**: direct Node script execution produced usage, but the actual npm `.bin` symlink exited 0 with empty stdout. The artifact agent independently reproduced all five actual installed bins and their missing-argument guard failures. The source agent reproduced a direct symlink too. This revealed the old main-entry comparison used a real module URL but an uncanonicalized argv path; the narrow canonical-entry correction landed as `7698bfb5be98314561d459469afaa3c2466e1da4` under CLI-1, preserving imported-module no-run behavior. The real-bin assertion is retained; the final cumulative packed gate passed as recorded below.

## Integrated source and build execution

Product source baseline: `e645584` (anchored adapter plus canonical CLI entry). Later runtime-artifact/evidence changes in `60f1b18` do not modify source, manifests or archive inputs. Audited baseline remains Node **24.17.0**, TypeScript **5.9.3**, DSH **0.2.2-alpha.3**, Cordis **4.0.6-alpha.2**, native Loader **1.0.7-alpha.2**, React **18.3.1**, Chromium **1248**.

| Gate | Executed result |
| --- | --- |
| Typecheck | `npm run typecheck`, exit 0. |
| Complete source suite, 45 test files | **570 passed, 0 failed/skipped/cancelled/todo**, serialized native-compatible runner, 109.086 seconds. Actual audited predecessor Goal source 0.4.23 at commit `cbd86273660893336afaee31794b5fd76487db78` and integrated current Goal entry were explicitly selected. Includes original recovery/ownership/process-owner/native-driver/PTC/browser regressions; not merely the new missing-anchor test. |
| Build/pack after both product repairs | `npm run build` and `npm run pack`, both exit 0; all five synchronized 0.3.1 archives. Build 15.198 s; pack 2.763 s. |
| Additional archive audit | Recomputed five archive SHA256s and checksum-file hash, checked identities/versions, external optional Cordis peer/no ordinary Cordis dependency, no eager Cordis import in either migration entry, and no node_modules/Git/profile/sandbox/environment payloads, author-machine paths or private-key headers. Passed; bounded audit, not universal secret detection. |

Parent execution created separate short `/tmp/ex-031-gates-*` roots for build and source, with checked explicit HOME, DSH_HOME, TMPDIR, XDG cache/config/data and npm cache. Each run started a whitelisted environment; no inherited resolver/bootstrap hooks. Source used `node --expose-internals --test --test-concurrency=1` and all discovered non-artifact test files, not the convenience runner without native flags. Chromium was the existing audited executable, not a newly installed browser. Logs and command/environment inventories are retained ignored for audit. Full artifact acceptance was executed separately rather than inferred from source/build success.

## Independent review — separate axes

The review fixed point is annotated `v0.3.0`, peeled commit `9d226e29d8d4aeaecdc5b16cbb5abd199a7306c7`; both fresh read-only reviewers rechecked cumulative code/tests through `fa6e3e5e3b8dc8578819ae09db3bf9f6f72e65f2` and the final CLI delta after the runtime matrix. The approved contract remained unchanged from `94cbfcd`; product inputs remained unchanged after `e645584`.

### Standards

**0 confirmed documented-standard violations; 0 actionable baseline-smell findings.** The final review read the full 238-line packed CLI test, runtime matrix, evidence and source-validation checkpoint, and independently recomputed unchanged archive hashes. Public bins/exports/checkpoints and actual native lock/journal seams remain the tests; no private implementation-string replacement, duplicate feature source, second runtime or fail-open ownership shortcut was found. This reviewer independently ran five packed-help/bin cases and eleven native ownership cases, both green in disposable environments. Their legacy-adapter cases are not represented as actual predecessor-source execution.

### Spec

**0 confirmed Spec defects or unasked scope.** The final review matched actual-bin/import guards, five anchored read-only plan consumers and native peer-disabled install to CLI-1/2; packed apply/retry/two-process selective rollback and durable interruption/concurrent refusal to CLI-3; actual native canonical/scoped/retired positives and missing/incompatible/foreign/shadow/root/marker/tuple refusals to CLI-4. This reviewer independently ran five help/bin cases, eleven native ownership cases, additional public import/bin/inspect/offline-Goal/context probes for all five unchanged archives, and the combined packed native matrix; all passed. Parent full gates and publication were explicitly not claimed as the reviewer’s own execution.

Both axes closed the final code/test delta without findings. They do not substitute for the separately executed full artifact/native/browser gate or publication receipts.

## Final cumulative artifact acceptance

All **7 artifact test files** executed in one serialized native-compatible command against the same five audited 0.3.1 archives: **43 passed; 0 failed/skipped/cancelled/todo**, exit 0, **271.386 seconds**. The checked runtime environment selected actual audited predecessor/current Goal source, Chromium and disposable paths. Native Web acceptance used **127.0.0.1:41593**, not the live GUI.

Breakdown:

- **15** new standalone CLI cases: all five no-peer help/API/argument/import guards and anchored read-only inspect/dry-run; actual separate native pnpm peer-disabled profile install; combined/retry apply, idempotent retry and selective rollback in two separate processes; durable interruption/retry and concurrent-edit refusal. False/zero/empty settings, private journal and original backup, later unrelated edits and unrequested owned deltas survive. Offline Goal conflict stays local while non-Goal migration proceeds.
- **5** new packed public-runtime cases: every archive imports without consumer Cordis/hooks, then uses genuine anchored Context/native Loader evidence. Active/scoped and exact retired-stock positives remain effective. Missing/version/isolate/foreign/shadow/root/marker/namespace/programmatic callback mismatches deny ownership and preserve profile/home inputs. Shared migration API testing does not claim mounting Goal feature code in non-Goal splits.
- **8** existing archive-root native Goal/Loader/Agent/job cases across combined and Goal split: waiting stays armed, quiet completion dispatches one deterministic round, strategy switches retain exact authority, observed revocation remains revoked, replacement descriptors are not overwritten, and only eligible original stock can restore.
- **2** existing real native CLI/profile cases: installed combined Web plus Chromium, and all-five native manifest composition/distinct splits. Actual Save/persisted values/live diagnostics verify replacement → off → native → activation, plus grouped editing, retry/timeout/unset/watermark/tools/reasoning/Chime/reload behavior.
- **2** existing packed native compaction-reasoning cases with agent-facing tools disabled, combined and compact split.
- **11** existing clean package/public JS/strict NodeNext TypeScript, payload/external-peer/declaration cases. The older peer-provided stage is retained, not substituted for the new absent-peer stages.

All model execution uses deterministic offline adapters, not live third-party model credentials. Source recovery/process-owner/native contention suites were fully rerun, not inferred from CLI startup. New non-Goal CLI fixtures intentionally contain inert predecessor metadata/config rather than execute predecessor feature code; actual audited legacy Goal execution belongs to the separately passed full source suite. See [CLI lane evidence](<../test/artifacts/MIGRATION_CLI_EVIDENCE.md>) and [native ownership lane evidence](<../test/migration/CLI_031_EVIDENCE.md>) for their original red/green receipts and correctly bounded lane coverage. The temporary invalid-YAML and report-file-enumeration fixture errors were diagnosed and corrected without changing product recovery code or weakening assertions.

## Executed command inventory

The actual driver discovered and sorted every test filename, captured subprocess argv, and supplied a whitelisted environment beneath separate realpath-checked disposable roots. The command inventory below is grouped by gate, not a claim of one shell or chronological ordering. HOME, DSH_HOME, TMPDIR, XDG_CACHE_HOME, XDG_CONFIG_HOME, XDG_DATA_HOME and npm_config_cache were explicit; native test children used disposable profile paths. DSH_TEST_LEGACY_GOAL_ENTRY selected the audited 0.4.23 source; DSH_TEST_EXTRAS_GOAL_ENTRY selected the integrated source; DSH_EXTRAS_CHROMIUM selected audited Chromium 1248. No inherited NODE_OPTIONS/NODE_PATH/bootstrap hooks were supplied.

~~~sh
npm run typecheck
node --expose-internals --test --test-concurrency=1 \
  test/client/browser.test.ts \
  test/client/chime-regression.test.ts \
  test/client/compaction-reasoning.test.ts \
  test/client/emitted.test.ts \
  test/client/forms.test.ts \
  test/client/lifecycle.test.ts \
  test/client/page-publication-browser.test.ts \
  test/client/page-publication.test.ts \
  test/client/reasoning-browser.test.ts \
  test/client/selected-payload.test.ts \
  test/client/settings-presentation-browser.test.ts \
  test/client/settings-presentation.test.ts \
  test/integration/admission-race.test.ts \
  test/integration/config.test.ts \
  test/integration/goal-strategies.test.ts \
  test/integration/lifecycle.test.ts \
  test/integration/module-identity.test.ts \
  test/integration/native-compaction-reasoning.test.ts \
  test/integration/native-driver-lease.test.ts \
  test/integration/native-ptc-timeout.test.ts \
  test/integration/ownership.test.ts \
  test/integration/scoped-compact-context.test.ts \
  test/integration/settings.test.ts \
  test/integration/status.test.ts \
  test/migration/discovery.test.ts \
  test/migration/engine.test.ts \
  test/migration/goal-ownership.test.ts \
  test/migration/native-lifecycle.test.ts \
  test/migration/native-owner-runtime.test.ts \
  test/migration/planner.test.ts \
  test/migration/rollback-ownership.test.ts \
  test/migration/validation.test.ts \
  test/modules/chime/config.test.ts \
  test/modules/compact-context/end-to-end.test.ts \
  test/modules/compact-context/manual.test.ts \
  test/modules/compact-context/plugin.test.ts \
  test/modules/compact-context/reasoning-compatibility.test.ts \
  test/modules/compact-context/reasoning-config.test.ts \
  test/modules/compact-context/reasoning-lifecycle.test.ts \
  test/modules/compact-context/reasoning-runtime.test.ts \
  test/modules/goal-wait/host.test.ts \
  test/modules/goal-wait/live.test.ts \
  test/modules/goal-wait/plugin.test.ts \
  test/modules/retry/integration.test.ts \
  test/modules/retry/plugin.test.ts
npm run build
npm run pack
node --expose-internals --test --test-concurrency=1 \
  test/artifacts/migration-cli.test.mjs \
  test/artifacts/migration-runtime.test.mjs \
  test/artifacts/native-goal.test.ts \
  test/artifacts/native-profile.test.ts \
  test/artifacts/native-reasoning.test.ts \
  test/artifacts/packages.test.mjs \
  test/artifacts/public-types.test.mjs
git diff --check
~~~

The native-compatible flag and serialized execution are material; the convenience runner without that flag was not silently substituted. Additional bounded archive audit and **101 local documentation-link targets in 13 changed Markdown files** passed.

## Exact frozen release assets

Build/source inputs were fixed at product baseline `e645584`; executable test content was finalized at `fa6e3e5`. The later evidence-only commit `22a4e1f` and final validation/release prose do not alter any packaged source, manifests, README, license/notices or public declaration documentation. Archive hashes were recomputed after the complete artifact gate and remained identical. Do not rebuild/replace these tested bytes merely to incorporate unshipped validation prose.

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| [dsh-extras-0.3.1.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/dsh-extras-0.3.1.tgz>) | 662593 | 9ee4573d247a30599ee4bd06dbc4eb6222fd74998855a6451e499ca7a3f60d4e |
| [dsh-extras-compact-context-0.3.1.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/dsh-extras-compact-context-0.3.1.tgz>) | 291466 | 0249f556bf061b429f924c557b05db127d0920cf17c1be3f02998894f95a35b3 |
| [dsh-extras-retry-0.3.1.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/dsh-extras-retry-0.3.1.tgz>) | 243066 | ad59fe96971f31f3a928dd3b5f3642a0634fc36bae24fab83cdc5ab0387e9f01 |
| [dsh-extras-chime-0.3.1.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/dsh-extras-chime-0.3.1.tgz>) | 538440 | e0afbb6efa17931584953251d1b8c712d2b27e3a242222da54dfc82fa7bd26cf |
| [dsh-extras-goal-wait-0.3.1.tgz](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/dsh-extras-goal-wait-0.3.1.tgz>) | 294448 | 051da3696421d50aaa670f17ae201a2551815044cccb209189c1b9596b06bd7d |
| [SHA256SUMS](<https://github.com/LMGateX/dsh-extras/releases/download/v0.3.1/SHA256SUMS>) | 473 | 70257dba2ec72d345ef4650378bf877e3df550178591f9965f6bfe098f44e2a6 |

## Isolation, limits and disposition

Research, initial contract, short-path integration, CLI artifact tests and runtime-owner development each used dedicated worktrees/subagents. Those worktrees are deliberately retained for reproducibility/audit, not claimed removed. Disposable test consumers and native/browser processes were closed by fixture teardown; outer checked gate/cache/log roots are retained ignored, never Git or Release payloads. Every relevant parent job was collected; parent job and terminal inventories contained no running entries. Delegated lanes reported collected jobs/closed sessions and clean retained worktrees.

Original predecessor/global host sources remained read-only; production HOME/profile files were neither inspection nor write targets. No production installation, upgrade/restart or live-GUI operation was performed. Native installs/hosts were confined to disposable profiles and temporary ports. GitHub Actions were independently read disabled before publication, and npm publication is prohibited.

Existing limits remain: offline Goal proof conservatively requires live native/restart verification; no unknown-future-host guarantee; exact audited runtime/artifact boundaries remain. Same-value external disarm during an already-owned legacy boolean hold can remain unobservable; observed transition/descriptor ownership loss must still revoke authority. This patch does not weaken those protections or claim live-model acceptance.

Publication must create a new annotated v0.3.1 tag/normal Release, keep main and peeled tag synchronized, upload exactly the six frozen assets above, and verify unauthenticated fresh-HOME curl downloads byte-for-byte. The publication receipt is appended to the linked Release after those real operations; 0.3.0 tags/assets are never overwritten.
