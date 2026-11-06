# Standalone packed migration CLI evidence

## First vertical slice: pristine release RED

Baseline source: `94cbfcd7cd0db5f62effde9a2c395896bf692cce`; test commit: `b2721186606cfb39cdd08d8b50ef2d8b663aa397`. No product source changed. Original retained release archives were read-only.

```sh
DSH_EXTRAS_ARTIFACT_DIR=/home/dev/dev/dsh-extras/.agents/worktrees/research-legacy-parity-021/.agents/worktrees/restore-legacy-parity-030/artifacts node --test --test-concurrency=1 test/artifacts/migration-cli.test.mjs
```

Executed on Node 24.17.0: **exit 1; 5 tests, 0 pass, 5 fail, 0 skip**. All five actual npm-installed 0.3.0 distributions failed standalone Node `--help` with `ERR_MODULE_NOT_FOUND` for `@deepseek-ai/cordis` imported from their packed `lib/migrate.js`. The install and explicit require/ESM absence checks passed before the startup assertion. This is a product RED, not a missing ordinary dependency or fabricated implementation function. The installed bin assertions follow the Node assertion and were not reached in this first RED. Parent was notified immediately, before authorizing product implementation.

Each consumer and its HOME, DSH_HOME, profile inputs, TMPDIR and npm/cache paths lived under a unique `/tmp/extras-standalone-cli-*` directory outside repository/host ancestry. Child environments whitelist variables and exclude NODE_OPTIONS/NODE_PATH/bootstrap hooks. No peer links, production installation/restart, server, browser, live GUI, Actions, npm publication, push or release occurred.

## Second vertical slice: actual bin launcher RED

Locally cherry-picked product-only native-owner fix `948d6d00a74068fc54abd51c2e45f3221a7695ef` as `1ad40c9` solely to build/test; it is not part of the test deliverable. Built and packed all five with whitelisted environment and a disposable `/tmp/extras-cli-build-*` HOME/DSH_HOME/TMPDIR/cache. Build and pack exited 0. These local development archives retained version 0.3.0 and are distinct from original release assets.

Executed:

```sh
node --expose-internals --test --test-concurrency=1 test/artifacts/migration-cli.test.mjs
```

**Exit 1; 10 tests, 0 pass, 10 fail, 0 skip.** Each direct Node-script help and public migration subpath import now succeeded. Each actual npm-installed bin silently exited 0 with empty stdout; its missing-argument guard also returned 0 instead of rejecting. Tests correctly failed on real launcher output/guard behavior rather than accepting exit 0 alone. Parent was notified and independently reproduced this additional entrypoint defect, then requested the minimal canonical-path guard fix. The fix was not implemented in this lane.

A focused packed public checkpoint run then passed the concurrent-edit refusal scenario but failed journal enumeration after a successful retry: the test helper included the persistent report file as if it were a journal. The helper was corrected to distinguish journal, backup and report filenames; this was a test defect, not a product regression. No recovery implementation was replaced or patched.

## Scope allocation

This lane owns packed CLI-1/2 and non-Goal CLI-3 public seams only. The source lane/parent owns actual continuation Context/Loader tuple and native-owner runtime coverage (CLI-4), all-source and existing full artifact/browser gates. Help/import success does not establish native ownership or recovery correctness. The exact executed corrected-archive evidence follows; broader gate ownership is stated explicitly below.

## Corrected 0.3.1 archives: final GREEN

Product repairs supplied by the source/integration lanes: anchored runtime evidence (original commit 948d6d00a74068fc54abd51c2e45f3221a7695ef) and canonicalized bin entry guard (original commit 7698bfb5be98314561d459469afaa3c2466e1da4). The test worktree manifest remains 0.3.0; the explicit archive version helper selects parent-built 0.3.1 without modifying the tested package or implementation.

Exact final command, run from the dedicated test worktree:

~~~sh
DSH_EXTRAS_ARTIFACT_DIR=/home/dev/dev/dsh-extras/.agents/worktrees/release-migrate-cli-031/artifacts \
DSH_EXTRAS_ARTIFACT_VERSION=0.3.1 \
node --expose-internals --test --test-concurrency=1 test/artifacts/migration-cli.test.mjs
~~~

Result: **exit 0; 15 tests, 15 pass, 0 fail, 0 skip, 0 cancelled; 195688.421348 ms**. Tested test-source commit: 6ca8bbca434335ee5ca9c95ac7ae3a180d83affa. All child commands are plain sanitized Node without inherited native bootstrap hooks; the runner flag does not leak through NODE_OPTIONS. Tests default to the real source manifest version and local artifact directory; DSH_EXTRAS_ARTIFACT_DIR and optional DSH_EXTRAS_ARTIFACT_VERSION enable exact external/retained-byte checks.

| Gate | Executed public behavior |
| --- | --- |
| CLI-1 | Every real npm-installed distribution: Cordis require/ESM absence checks before any peers; actual bin, Node script, Node bin, and preserve-symlinks-main bin help; documented usage rather than empty successful exit; missing/unrelated/unresolvable argv imports never execute; no profile/journal writes. |
| CLI-1 guards | Every distribution, both actual bin and Node script: missing required paths, malformed arguments, unknown distribution/command, missing rollback selectors and removed context module id refuse with the existing controlled diagnostic, not loader startup errors. |
| CLI-2 | Every documented migration subpath imports all required public functions without peers. Real separate host anchor supplies native app-boot discovery/compose; inspect/dry-run return parsed structured decisions and preserve profile manifest/patch and HOME/DSH_HOME snapshots. Original explicit false, zero, empty string and array values survive. |
| CLI-2 native install | A separate fresh disposable tree initializes an actual native web profile and runs native plugin add with --ignore-scripts --no-optional --config.auto-install-peers=false (actual native pnpm install), then independently invokes the resulting Node script/bin help and Node inspect. No ancestor npm consumer/peer links are available. Installed package version and Cordis absence are checked. No host server/browser is started. |
| CLI-3 mutation/recovery | Combined and retry split: actual installed bin apply, Node retry, then selective rollback in two separate bin processes. Imported settings remain offline/restart-required, retry preserves operation id and owned deltas, first rollback closes the new capability before second process restores legacy retry selection. Backup and journal remain permission-private and preserved; unrelated later manifest/profile edits survive; unrequested compact-context stays migrated. |
| CLI-3 interruption/concurrency | Packed public runMigration checkpoint after-journal throws intentionally, leaving original documents intact. CLI retry resumes the same durable operation id idempotently. A separate fixture edits profile bytes after interruption; CLI retry refuses and retains newer bytes, original legacy selection, journal and backup. Native anchored atomic-write locking runs in these real calls; lock-contention stress remains in the parent source suite. |
| Offline Goal isolation | Supported 0.4.23 predecessor metadata/config appears in combined/Goal-split fixtures: Goal remains conflict, disabled, runtime/restart proof required. Combined independently valid non-Goal migration proceeds; old Goal selection remains untouched. No continuation Context is fabricated. |

### Intermediate corrected-byte failures, and fixture fixes

The first complete 0.3.1 matrix was **13 pass, 2 fail, 0 skip**. Both failures were the new rollback fixture's unrelated profile edit. A targeted retry remained **0 pass, 2 fail**. Calling the genuine packed public rollback API (temporarily, only to expose the exception hidden by the CLI's existing bounded diagnostic) identified native YAMLException: the fixture appended block YAML after the engine's preserved flow-sequence closing bracket. No product safety regression was inferred from the generic refusal. The fixture now uses YAML document addition, preserving owned comments and valid syntax. Actual installed-bin rollback assertions were restored after diagnosis. Targeted native-install plus rollback rerun then exited 0 with **3 pass, 0 fail, 0 skip** (27474.70073 ms), followed by the complete 15/15 run above. Native-install isolation was strengthened before these final runs to remove the unrelated npm consumer ancestor.

### Exact archive SHA256 identities

The original release archives remained read-only. Recheck command shape was sha256sum ARTIFACT_DIR/*VERSION.tgz; checksum comparison identifies bytes, not a new download/publication claim.

| Distribution | Original tested RED 0.3.0 | Corrected tested GREEN 0.3.1 |
| --- | --- | --- |
| dsh-extras | 4af6c0968fd7aa6f40d5cf93f2c894ea42ee70a9298253ae4f7ecaf8fb26ae50 | 9ee4573d247a30599ee4bd06dbc4eb6222fd74998855a6451e499ca7a3f60d4e |
| dsh-extras-compact-context | ce4dbc27f3900e3968bc3c843141707cf4e62b007d0859dc4ebbf4b22849364b | 0249f556bf061b429f924c557b05db127d0920cf17c1be3f02998894f95a35b3 |
| dsh-extras-retry | a38c3c8bed43f916ec56a7f5f64114a3f3c34eff9d99f6c92661baf361aa29c4 | ad59fe96971f31f3a928dd3b5f3642a0634fc36bae24fab83cdc5ab0387e9f01 |
| dsh-extras-chime | e1b87b2009d75c25bc95b677222dc3a2617f1e087ff98a324313a127ec214623 | e0afbb6efa17931584953251d1b8c712d2b27e3a242222da54dfc82fa7bd26cf |
| dsh-extras-goal-wait | ec9850f8811f9110b74d25f92d589138eed500070c8a8898b2db50f7c880bde7 | 051da3696421d50aaa670f17ae201a2551815044cccb209189c1b9596b06bd7d |

## Coverage boundaries and disposition

Legacy fixtures are detached supported-version package metadata/configuration; predecessor feature code deliberately throws if evaluated. This proves native read-only discovery/config transfer and recovery, not predecessor feature execution. Actual native-owner Context/Loader/runtime proof (CLI-4), runtime/process-owner conflicts, interrupted recovery journal replay, full source/native legacy suite, existing peer-provided artifact tests, payload/declaration audits and browser gates remain assigned to the parent/source lane. Parent explicitly agreed to retain and rerun those existing public/native suites; no execution success for those gates is claimed by this report. No mandatory row is silently skipped by these tests.

All disposable test consumers are removed by test cleanup. The dedicated test worktree/branch is retained for integration review; its only deliverable changes are the new test and this evidence file. Product commit 1ad40c9 is a local testing prerequisite and must not be cherry-picked as a test deliverable. Only initial RED b2721186606cfb39cdd08d8b50ef2d8b663aa397, expanded tests 6ca8bbca434335ee5ca9c95ac7ae3a180d83affa and the evidence follow-up are delivered. No production profile, host/predecessor source, live GUI, root version/docs, release, push, npm publication or GitHub Actions were modified or invoked in this lane.
