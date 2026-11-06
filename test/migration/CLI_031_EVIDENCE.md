# 0.3.1 native ownership adapter lane evidence

Date: 2026-11-07 (Asia/Shanghai). Integration base: `94cbfcd7cd0db5f62effde9a2c395896bf692cce`. Dedicated branch: `fix-native-owner-runtime-031`. This lane did not bump versions, push, publish, install into production, start/restart a host, or access the live GUI.

## Scope and repair

- [Native ownership adapter](<../../src/migration/native-owner.ts>): erase eager Cordis value import; preserve Fiber type import and return offline-unverified before acquisition. Resolve the actual Cordis manifest and runtime through the explicit installation anchor, require exact audited name/version `@deepseek-ai/cordis@4.0.6-alpha.2`, check Context identity/public isolation/root/service shape, and return bounded non-secret refusal reasons for missing/version/shape failures. Keep existing root-lifetime and callback markers, exact Loader/root/namespace/fiber/registry tuple, retired-stock semantics and callback checks unchanged.
- [Source regression](<native-owner-runtime.test.ts>): public `inspectMigration` with a genuine audited Context and an intentionally incomplete anchor (native callback available but Cordis absent). Uses the actual read-only native discovery facade only to reach runtime proof with this deliberately incomplete anchor.
- [Packed public runtime regression](<../artifacts/migration-runtime.test.mjs>): real npm archive installation with ordinary dependencies only; plain Node subprocess imports the documented migration export without local Cordis or loader/bootstrap hooks. Actual native Context and MemoryLoader supply the stock tuple. Run the shared migration API in all five archives, explicitly inspecting the Goal ownership seam; this does not mount or claim Goal feature implementation in non-Goal splits.
- After a separate parent/artifact-agent real-bin RED, [CLI entry guard](<../../src/migration/cli.ts>) narrowly canonicalizes argv and module filenames through nonthrowing realpath comparison. Imported modules and absent/unresolvable argv do not launch migration; npm bin symlinks are direct entries. Artifact agent owns the full actual-bin regression assertions.

Implementation commits: `948d6d00a74068fc54abd51c2e45f3221a7695ef` (adapter and source regression), `7698bfb5be98314561d459469afaa3c2466e1da4` (CLI guard only).

## Isolation and commands

Node 24.17.0; native DSH 0.2.2-alpha.3; Cordis 4.0.6-alpha.2. Development dependencies resolve read-only from the existing repository ancestor. The explicit read-only test anchor is resolved from `@deepseek-ai/dsh/package.json`; no author path is embedded into runtime code.

Every install/runtime test uses explicit disposable HOME, DSH_HOME, profile, cache and TMPDIR outside repository/host ancestry. Child packed consumers start from a fresh environment containing only PATH and these disposable paths. No NODE_OPTIONS, NODE_PATH, native resolver bootstrap or global loader hooks are passed; `--expose-internals` is the audited native runner requirement. No server is started, so no ports are allocated. Actual child Context/Loader disposal is awaited.

The following exact environment pattern was executed, with separate mktemp prefixes per run (source-red, source-green, packed-red, packed-green, packed-recheck, final-check, build and build-final):

	s=$(mktemp -d /tmp/ex-owner-final-check-XXXXXX)
	mkdir -p "$s/home" "$s/dsh" "$s/profile" "$s/cache" "$s/tmp"
	env -i PATH="$PATH" HOME="$s/home" DSH_HOME="$s/dsh" \
	  DSH_PROFILE_DIR="$s/profile" XDG_CACHE_HOME="$s/cache" \
	  npm_config_cache="$s/cache/npm" TMPDIR="$s/tmp" \
	  node --expose-internals --test --test-concurrency=1 \
	  test/artifacts/migration-runtime.test.mjs test/artifacts/packages.test.mjs

Other executed command tails under that same explicit disposable environment:

	node --expose-internals --test --test-concurrency=1 test/migration/native-owner-runtime.test.ts
	node --expose-internals --test --test-concurrency=1 test/migration/native-owner-runtime.test.ts test/migration/goal-ownership.test.ts
	DSH_EXTRAS_ARTIFACT_DIR=<retained-original-030-artifacts> DSH_EXTRAS_ARTIFACT_VERSION=0.3.0 node --expose-internals --test --test-concurrency=1 test/artifacts/migration-runtime.test.mjs
	node --expose-internals --test --test-concurrency=1 test/artifacts/migration-runtime.test.mjs
	sh -c 'node scripts/build.mjs && node scripts/pack.mjs'

Typecheck: `/home/dev/dev/dsh-extras/node_modules/.bin/tsc --noEmit`, exit 0. Build/pack exit 0, five archives each time. No dependency installation was needed in the development worktree; each packed consumer uses real `npm install --ignore-scripts --omit=optional --legacy-peer-deps --no-audit --no-fund <archive>`. Existing peer-provided artifact tests retain their original npm install and explicit host-peer symlink stage.

## RED before GREEN and executed outcomes

| Step | Result |
| --- | --- |
| New source public regression, before product changes | Exit 1, 0/1 pass: `true !== false`. Existing code incorrectly returned verified true with a genuine Context but missing anchored Cordis proof. |
| Parent's new original-archive startup regression | Parent notified this lane of independent 0/5 help RED, exact missing-Cordis error, before authorizing product edits. This is reported coordination evidence, not substituted for this lane's executions below. |
| New packed API regression against pristine retained 0.3.0 | Exit 1, 0/5 pass: all actual public migration entries fail with `ERR_MODULE_NOT_FOUND: Cannot find package '@deepseek-ai/cordis'`. Negative consumer-local resolution assertion passed first. Original archives remained read-only. |
| Adapter source regression plus existing ownership suite | Exit 0, 11/11 pass. Existing live canonical stock/scoped-root and known-retired-stock positives remain verified, not universally false. Existing native tuple, foreign/programmatic callback, root lifetime, marked callback, latest suppression/recovery and offline Goal safety remain green. |
| All-five changed packed API regression | Exit 0, 5/5 pass, repeated after diagnostic/read-only assertions were strengthened. |
| Independent simple bin-symlink probe before CLI correction | `node <temporary-symlink-to-built-migrate.js> --help` exits 0 with **empty** stdout. Parent then independently reported actual npm bin RED from artifact agent and authorized the guard fix. |
| Source symlink after correction | Exit 0 with documented help text. Safe CLI import with argv1 set to a nonexistent sentinel prints only the caller sentinel, no migration. |
| Final rebuilt archives: new runtime regression plus old packages/peer-provided tests | Exit 0, 11/11 pass, 58.7 seconds. Includes all five package installs/public exports/declarations, linked peer path, help, payload/dependency metadata and all five anchored ownership scenarios. |
| Typecheck | Exit 0 after adapter and after CLI repair. |

Each packed runtime consumer executes these assertions:

1. Consumer Cordis cannot resolve; documented migration API imports in plain Node. No peers are linked into that consumer to make the API work.
2. Actual canonical native Loader stock is active, exact public callback/namespace/fiber/entry identities agree, and root/scoped Context both yield verified true/stockActive true.
3. A consumer-local shadow Cordis whose module throws if evaluated is visible through consumer resolution but ignored by anchored verification; normal stock stays verified.
4. A genuine root with unavailable isolation evidence refuses with Context/root diagnostic, then the original descriptor is restored.
5. Missing anchored Cordis, unsupported version, incompatible isolate export, and foreign anchored Context implementation each refuse with the precise bounded unavailable/version/shape category. Actual read-only native facade injection is restricted to these intentionally incomplete anchors.
6. Genuine different root plus foreign Loader inventory, unowned programmatic official callback, and changed Loader artifact namespace refuse; fixtures restore original evidence afterward.
7. Root lifetime lease and startup callback markers refuse even when caller asserts native startup ownership.
8. Exact disposed Loader stock pointer is verified inactive (never a fresh restoration grant).
9. No Context plus unavailable anchored Cordis yields the original offline refusal before acquisition; profile manifest/patch bytes and DSH_HOME remain unchanged.

## Archive identity (development bytes, not release assets)

Per delegation, this worktree deliberately retained source version 0.3.0. Its locally rebuilt changed archives are **not** the original release and were not published. The parent must rebuild/retest final 0.3.1 bytes; these checksums identify only this lane's final tested development archives after both repairs:

| Distribution archive | SHA256 |
| --- | --- |
| dsh-extras-0.3.0.tgz | 2c823fed43bbcefdac963d937d45230e2c1f1c2b285b7b42ff5ed587f7dfda30 |
| dsh-extras-compact-context-0.3.0.tgz | bba941322b7cf3811ae1dc5da7b394221b3bcdbedb372ee570f406f813958184 |
| dsh-extras-retry-0.3.0.tgz | 32e7ce8a08383a71d0b7272dfc6590746dd0d7eafcc2f10fd52a5901755cdaf7 |
| dsh-extras-chime-0.3.0.tgz | b40747fe93222b90fc998ecab4923148fd1daf4bc9387fb99f17382bed943bbd |
| dsh-extras-goal-wait-0.3.0.tgz | a21770652adbb1db7211c7348d8b61c0f6a7d8fc64cffa4021de84ea831c8d0f |

The pristine combined RED archive checksum is `4af6c0968fd7aa6f40d5cf93f2c894ea42ee70a9298253ae4f7ecaf8fb26ae50`; original retained checksums were read, not overwritten.

## Limitations and disposition

- This lane executed in-process native Context/Loader and packed consumer evidence, not a full web host/browser or production integration. No browser coverage is claimed.
- Focused source latest-legacy recovery uses the existing explicit legacy-row adapter unless the separate legacy-source environment variable is supplied; this lane did not independently execute the predecessor source. Parent full source/native-artifact gates must supply actual audited legacy source as required.
- Full serialized source/artifact acceptance, real peer-disabled native profile install, mutation/recovery artifact matrix and final actual-bin/preserve-symlinks/import-sentinel assertions belong to parent/artifact-agent integration. Focused GREEN does not certify those unexecuted gates.
- Exact supported Cordis/version/root checks intentionally fail closed for unknown host versions/foreign Contexts. No peer installation, second runtime or fallback to consumer-local Cordis is added.
- No production profiles, original host/predecessor sources, or retained release archives were modified. No background jobs or persistent terminal sessions were started. Dedicated worktree/branch retained for parent cherry-pick and audit; generated artifacts remain ignored/unpublished.
