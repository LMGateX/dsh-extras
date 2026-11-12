# Published npm DSH rc.2 verification — Extras 0.6.0

Fixed before implementation on 2026-11-12 (Asia/Shanghai), following the direct request: “v0.2.2-rc.2 npm 已发布 再检查一遍 然后 push、发版，暂时不要为本机 dsh 安装”. This supplements the existing rc.2 contract and preserves every applicable safety/acceptance gate.

## Observed evidence and release identity

The first fresh public-registry query now returns @deepseek-ai/dsh **0.2.2-rc.2**, tarball https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.2.tgz, shasum `ff003ca75f37975c40b800fb925df70b38841fd4`, integrity `sha512-J727r2C471x2cYXGjqZ0D9T1ZyaYQDFH/Ynx8iq+85oslM4nky5YTBnbAuTtxMhW7nhY8wuAEfjjFCQ+K6Swgw==`. Registry metadata is not yet installation/runtime proof; those gates remain open until executed.

On success publish **six synchronized Extras0.6.0 distributions**, a new GitHub release/tag, not replacement of the historical0.6.0-rc.1 source-built preview or its assets. Exact DSH0.2.2-rc.2 remains the supported host boundary; no speculative version range. Extras itself is not published to npm.

## Development provisioning transition

The source-built-only workaround was explicitly temporary while npm rc.2 was absent. For0.6.0 use a normal public-registry npm lock with exact native development dependencies, reproducible `npm ci` and one physical native Cordis/schema/DSH graph. Replace the preview-only mutating source linker/receipt preflight with a **read-only native npm graph check**; preserve historical preview documentation at its tagged source. Do not silently discover an ancestor/live host. A consumer may borrow a whole already-installed node_modules graph for build fixtures; validation binds to that physical graph and its owning public lock, not to a consumer Git-worktree name.

Validate exact native/core versions, declared local native runtime/peer edges, required emitted entrypoints, observed Goal-driver bytes and lock provenance before build/test/typecheck admission. Explicit DSH_RUNTIME_ROOT and DSH_TEST_INSTALL_ANCHOR must resolve to the same verified physical CLI graph; missing/foreign selectors fail without module evaluation or mutation. No postinstall linker, download, source clone/build, package-store repair, profile writes or local-path/fabricated integrity in tracked dependencies. npm may execute only necessary official package lifecycle steps within explicitly disposable state if initial ignore-scripts installation proves insufficient; never rebuild/patch published JS to pretend its bytes match.

The previously observed source-built Goal digest is not automatically a published-byte observation. Compare actual npm driver bytes and source coordinates; if different, independently audit published code and narrowly update every exact artifact/provenance/migration gate together before executing it. Unknown bytes and foreign Loader/callback/Context still refuse; no blanket widening. Preserve native authority, default-off policies, four Goal strategies/defaults, durable workspace provenance and truthful native Continue vs optional checkpoint distinction.

## Required acceptance and release gates

1. Fresh exact official npm host installation in explicit disposable HOME/DSH_HOME/profile/XDG/cache/TMPDIR; observed registry/lock/package versions and integrity, actual published driver hash/coordinates, CLI boot and one-graph identity. Reuse available local evidence; no incremental GitHub source-page queries or duplicate host acquisition. The previous disposable full-source checkout may have been externally cleaned since the prior day; do not claim it still exists or invent a fresh source comparison. Published bytes and retained committed provenance are the primary evidence now.
2. New public preflight regression tests: missing/ancestor-only host refusal, exact actual installed graph admission, borrowed graph, unknown/missing/wrong-version/foreign identities, explicit-selector mismatch and read-only/nonmutation behavior. Replace obsolete source-only provisioning tests honestly rather than claiming them as npm coverage.
3. Full typecheck and complete source suite against published rc.2; every existing native Goal/Loader/ownership/migration/cancellation/compaction/retry/model/provenance refusal and semantic gate remains.
4. Build/repack six final0.6.0 archives; full packed suite including six actual native whole-GUI runs, clean consumers/CLI/API/declarations, real native semantics, live settings/reload/global-workspace opaque IDs/inheritance, recovery visibility and Chime ownership. Own temporary loopback ports, never3080; close owned browsers/processes/sandboxes. No old preview archive relabeling without rebuilding/retesting.
5. Independent Standards and Spec reviews, scoped commits, clean pushed main and matching annotated new tag; upload only six tested tarballs plus SHA256SUMS, freshly download all seven and verify against tested bytes/manifest/remote identities. Preserve historical records; publication receipt must be executed, not predicted.
6. No production DSH installation, update, restart, live GUI or personal-profile use; no GitHub Actions and no npm Extras publication. Record isolation resources retained for audit honestly.
