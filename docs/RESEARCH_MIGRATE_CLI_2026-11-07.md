# 0.3.0 standalone migration CLI peer-resolution defect

Date: 2026-11-07 (Asia/Shanghai). Status: reproduced; research and repair plan only, no implementation. Baseline: annotated `v0.3.0`, commit `9d226e29d8d4aeaecdc5b16cbb5abd199a7306c7`. Node: 24.17.0; native DSH: 0.2.2-alpha.3.

## Conclusion and scope

This is a distribution/standalone-entry defect, not a requirement that users hoist host peers into a profile. A normal native profile install with peer auto-install disabled succeeds, but launching the installed migration bin as an ordinary Node process fails during ESM linking, before argument parsing or migration execution. A valid `--install-anchor` cannot repair an import that must resolve before CLI code executes.

All five 0.3.0 distributions share the defect. It affects `--help`, inspect/dry-run and the standalone recovery entry; the public `./migration` JavaScript entry also fails on import without visible Cordis. Apply/retry share the same startup graph and are consequently blocked too, although this research deliberately did not execute their mutation paths.

For a machine with no legacy modules to migrate and no recovery needed, there is no need to invoke this CLI now. This failure alone does not establish a failure of plugin execution inside the native host: its peer-resolution environment is different. This investigation did not re-run the full native feature/browser acceptance suite or inspect the other machine, and does not certify its whole profile. The unavailable recovery path is a real release defect even when a fresh installation currently avoids it.

## Primary-source chain

1. [CLI entry](../src/migration/cli.ts#L4) statically imports the engine before [argument/help processing](../src/migration/cli.ts#L8-L18).
2. [Engine](../src/migration/engine.ts#L9) imports discovery; [discovery](../src/migration/discovery.ts#L8) statically imports native ownership inspection.
3. [Native owner adapter](../src/migration/native-owner.ts#L1) imports the runtime `Context` value from Cordis at module scope. Its correct conservative [offline return](../src/migration/native-owner.ts#L20-L26) is reached too late to avoid linking that dependency. Even non-Goal distributions import this graph.
4. [Build](../scripts/build.mjs#L22-L24) bundles the CLI and migration entry but keeps `@deepseek-ai/*` external. [Manifest generation](../scripts/build.mjs#L35-L53) declares Cordis as an optional peer, not an ordinary installed dependency. This is appropriate for host runtime identity; the CLI must respect that arrangement rather than assume profile hoisting.
5. Existing [artifact tests](../test/artifacts/packages.test.mjs#L45-L55) symlink all peers into a clean consumer before [CLI help](../test/artifacts/packages.test.mjs#L89-L94). They prove the peer-provided path, not a host-only/non-hoisted standalone path. Native install coverage in [the profile tests](../test/artifacts/native-profile.test.ts#L31-L40) does not invoke this independently launched CLI in that layout.
6. Other migration native dependencies already use the explicit anchor: [read-only app-boot discovery helpers](../src/migration/discovery.ts#L100-L108) and [native writer lock](../src/migration/storage.ts#L28-L33). A startup-only eager Cordis import is inconsistent with these existing seams.

See the independent [dependency-contract audit](research/MIGRATE_CLI_DEPENDENCIES_030.md) for additional primary host-source references and alternatives.

## Executed evidence

The combined archive is byte-identical to the previously published/tested asset, SHA256:

```text
4af6c0968fd7aa6f40d5cf93f2c894ea42ee70a9298253ae4f7ecaf8fb26ae50
```

The other four archives were the same retained 0.3.0 release assets. Their product code was not patched. All commands ran with disposable HOME/DSH_HOME/profile directories outside the repository ancestry, with no inherited NODE_OPTIONS/NODE_PATH. No production DSH/profile or live GUI was used.

### A. Actual native profile installation

Using the audited development host executable and an empty disposable home:

```bash
node "$DSH_CLI" --profile repro --from-default-profile web --dump-config
node "$DSH_CLI" plugin --profile repro add "$ARCHIVE" \
  --ignore-scripts --no-optional --config.auto-install-peers=false
node "$DSH_HOME/profiles/repro/node_modules/dsh-extras/lib/migrate.js" --help
```

Initialization and native pnpm installation both exited 0 (pnpm 11.8.0, five packages added). The standalone CLI exited 1 with:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@deepseek-ai/cordis' imported from <disposable-profile>/node_modules/.../dsh-extras/lib/migrate.js
```

Three repeat runs gave the same error/exit. A fourth run with NODE_PATH explicitly pointing at the audited development host dependencies still failed identically: it is not an ESM resolution repair. No app server or browser was started.

### B. Five actual packed distributions and causal control

A second disposable profile installed the combined archive and its declared ordinary dependencies with npm (no optional peer auto-install). The four actual split archives were unpacked alongside it, sharing those ordinary dependencies. An initial archive-only attempt failed first on missing YAML and was excluded from the Cordis measurements; all observations below were made after declared ordinary dependencies were installed.

| Layout / invocation | Observations | Result |
| --- | --- | --- |
| Cordis absent from profile; `--help` | All five distributions | 5/5 exit 1, exact missing-Cordis error |
| Same layout; inspect with valid explicit profile/home/host anchor | All five | 5/5 same startup failure |
| Same layout; dry-run | All five | 5/5 same startup failure |
| Same layout; rollback with a deliberately nonexistent operation | All five | 5/5 same startup failure, never reaches journal handling |
| Same layout; import public `./migration` JS entry | All five | 5/5 same import failure |
| Only change: link the same audited host Cordis into temporary profile | All five, help/inspect/dry-run | 15/15 exit 0; inspect/dry-run JSON parsed |

The explicit host anchor independently resolved Cordis even during the failing phase. That controls against a bad `--install-anchor` as the cause. Making exactly that peer visible removed the startup failure, controlling against missing unrelated feature packages. The control symlink is experimental evidence, not a supported remediation recommendation. It was created only in disposable storage and did not install a second Cordis runtime.

Exit 0 from inspect/dry-run means the command produced its report; it does not mean offline Goal ownership was verified or a migration became active. The existing conservative offline Goal conflict remains intended. No successful rollback or apply/retry is claimed by these observations.

A minimal red-capable feedback command, after installing an actual archive and ordinary dependencies into a disposable profile without Cordis, is:

```bash
env -i PATH="$PATH" HOME="$TEMP_HOME" DSH_HOME="$TEMP_DSH_HOME" \
  node "$TEMP_PROFILE/node_modules/dsh-extras/lib/migrate.js" --help
```

Expected product result: exit 0 and usage text. Observed 0.3.0 result: exit 1 and missing-Cordis error. For inspect/dry-run, additionally supply explicit `--profile-dir`, `--dsh-home`, and a valid host `package.json` as `--install-anchor`; this also failed before parsing.

## Repair plan (proposed patch release 0.3.1, approval required)

### 1. Fix contract and lock down the failing artifact seam

Record an evidence-based clarification of [migration](MIGRATION.md) and [acceptance](ACCEPTANCE.md): ordinary Node launch of the standalone CLI/public offline entry must not assume profile-local host peers; explicit profile/home/host anchor is authoritative. Help requires only installed ordinary package dependencies. A functional migration still requires supported anchored native helpers; this is not a promise of host-free migration. Preserve all current Goal ownership, journal, CAS, and no-ambient-profile rules.

Add packed regressions before changing implementation. Run them before the existing test helper symlinks peers, outside any repository node_modules ancestry, with sanitized environment and an explicit negative assertion that no profile Cordis resolves. The current archives must fail these tests for the exact reported error. Keep the existing peer-provided/native tests too.

### 2. Remove the eager dependency, preserve the safety check

Make the offline graph of native-owner inspection independent of runtime Cordis imports. Preserve type-only imports as needed. If no continuation Context exists, return the existing offline-unverified result without acquiring runtime packages. When a real Context exists, obtain the required runtime identity from the explicitly anchored audited host (or a narrow host-provided adapter), rather than an unanchored lazy bare import. Validate supported version/shape and preserve the root-lifetime marker check, canonical Loader correlation, namespace/callback/fiber checks and stock-inactivity semantics. Failure to acquire proof must return unverified, never infer permission to take over a driver.

A simple `import("@deepseek-ai/cordis")` only delays the same resolution assumption for public API consumers; it is not by itself a complete anchored adapter. The current audited `Context.isolate` uses a global symbol, so do not justify this repair by claiming every extra Cordis copy necessarily changes that symbol. Avoiding duplicated runtime/registry state remains an independent packaging invariant.

Optionally separate lightweight argument/help parsing from engine loading as defense in depth. That is not a substitute for fixing inspect, recovery and the public migration entry. Retain shared implementation across all five distributions.

### 3. Improve bounded diagnostics without weakening refusal

Distinguish missing/unsupported anchored native helpers and invalid explicit paths with non-secret actionable diagnostics. Do not replace startup failure with silent success, swallow failed ownership checks, use ambient HOME lookup, or weaken offline Goal restrictions. Retain existing report semantics and per-module isolation; review any exit-code changes explicitly rather than sneaking them into a packaging fix.

### 4. Required regression matrix

- All five actual packed bins: help, missing/invalid explicit flags, inspect/dry-run in native/pnpm non-hoisted profiles; public migration import and offline invocation without visible peers.
- Actual native `dsh plugin add` (peer auto-install disabled), followed by independently spawned Node/bin invocation. Keep host/profile physically separate; do not solve the fixture by hoisting.
- Disposable legacy fixtures for apply/retry and journaled selective rollback: native lock, interruption, concurrent edits, owned delta checks, process-liveness checks; no hidden startup import failure. Include retry/chime cases and the conservative offline Goal refusal.
- Real runtime Goal ownership tests: root-lifetime marker, exact native tuple, foreign callbacks, missing/incompatible anchor and nonconfigurable/ownership-loss cases must still refuse safely.
- Anchored host missing/incompatible vs profile-local foreign Cordis: report/refuse without fallback to another runtime; no second bundled Cordis, no runtime copy installed as a workaround.
- Re-run typecheck, source tests, five builds/packs, clean consumers/declarations and native packed integration. Re-run browser gates when required by release acceptance or any client/shared-host impact; this research did not execute those gates.

### 5. Review and delivery

Develop in dedicated worktrees/subagents; conduct independent Standards/Spec review. Publish a new synchronized patch only after actual artifact regressions are green, with checksums and unauthenticated download verification. Do not overwrite the 0.3.0 tag/assets. Do not push, release, install, upgrade, restart or operate the live GUI as part of this research request; seek authorization for implementation/release scope.

## Interim advice and retained resources

No legacy migration/recovery needed: continue using the host-loaded plugin; do not invoke the broken standalone CLI merely as an installation prerequisite. If recovery is required before a fix, first preserve the profile backup and journal and design a supported host-anchored invocation in a clone; do not improvise profile edits or manually add/hoist Cordis on the real machine. The control symlink above was only a causality probe.

No product source, build, version or release artifact was changed in this investigation. The dedicated `research-migrate-cli-peer-030` worktree and disposable reproduction logs/scripts are retained for audit, not reported as cleaned. Only this report and the independent audit are intended for the research commit. The other machine's raw stack, exact install method and layout remain uncollected; they are useful for matching its specific invocation but are no longer prerequisites to confirming this defect.
