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

This lane owns packed CLI-1/2 and non-Goal CLI-3 public seams only. The source lane/parent owns actual continuation Context/Loader tuple and native-owner runtime coverage (CLI-4), all-source and existing full artifact/browser gates. Help/import success does not establish native ownership or recovery correctness. Further executable results will be appended after testing changed archives.
