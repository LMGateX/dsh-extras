# 0.3.1 standalone migration entry — validation record

Status: work in progress; no release readiness claimed by this checkpoint. Contract fixed before implementation in [MIGRATION_CLI_031.md](MIGRATION_CLI_031.md), commit `94cbfcd7cd0db5f62effde9a2c395896bf692cce`. User authorized isolated development/tests, then push/release, with no production installation/restart/live GUI operation.

## Completed diagnosis and first red-green slice

- [Research](RESEARCH_MIGRATE_CLI_2026-11-07.md) and [independent source audit](research/MIGRATE_CLI_DEPENDENCIES_030.md) established the original exact missing-Cordis startup failure.
- New actual packed help regression committed as `b2721186606cfb39cdd08d8b50ef2d8b663aa397` in its isolated subagent tree before product edits. On all five pristine 0.3.0 archives: **0 pass / 5 fail**, exact missing-Cordis error after ordinary dependencies installed and both CJS/ESM negative peer-resolution checks. Parent independently reran the new test against those bytes and obtained the same 0/5 outcome. This is intended RED, not passing acceptance.
- A public inspectMigration source regression also reproduced an incomplete host anchor incorrectly accepting an actual Context supplied from elsewhere. Minimal repair first landed as `948d6d00a74068fc54abd51c2e45f3221a7695ef`; source agent reported focused 11/11 green and typecheck. Full integrated and final-byte acceptance remains required.
- Initial parent build/pack of all five 0.3.1 candidate archives exited 0 in disposable HOME/DSH_HOME/XDG/TMPDIR/cache. These are development candidates, not published or final-tested assets.

## Second red slice: actual installed bin

After the Cordis startup repair, the same parent five-package help regression still failed **0 pass / 5 fail**: direct Node script execution produced usage, but the actual npm `.bin` symlink exited 0 with empty stdout. The artifact agent independently reproduced all five actual installed bins and their missing-argument guard failures. The source agent reproduced a direct symlink too. This revealed the old main-entry comparison used a real module URL but an uncanonicalized argv path; the narrow canonical-entry correction landed as `7698bfb5be98314561d459469afaa3c2466e1da4` under CLI-1, preserving imported-module no-run behavior. The real-bin assertion is retained; full final packed evidence remains pending at this checkpoint.

## Isolation and pending gates

Research, initial contract, short-path integration, CLI artifact tests, and runtime-owner development each use dedicated worktrees. The short release tree avoids unnecessary deeply nested native fixture paths. Original predecessor repositories/global host remain read-only. Native installation tests target disposable profiles; no production profile is an installation or inspection target. Existing native GUI URL is never used.

Pending: complete CLI-1 through CLI-7, full source/type/native/browser/packed/declaration gates, independent Standards/Spec review closure, final manifest/payload/privacy audit and exact checksums, matching main/annotated tag/Release plus unauthenticated public-download verification. GitHub Actions remain disabled; no npm publication. Retained worktrees and ignored disposable logs are audit resources, not claimed cleaned or intended release payload.
