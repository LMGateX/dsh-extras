# Compact-context module identity validation

Scope: rename-only follow-up to approved docs baseline `4bdcc6e`. No reasoning policy is implemented by this change. The local worktree retains baseline package version 0.1.0; release versioning is a separate parent change. These results do not replace historical evidence in [VALIDATION.md](VALIDATION.md) or [NATIVE_PROFILE_VALIDATION.md](NATIVE_PROFILE_VALIDATION.md).

## Isolation

All commands run from the dedicated `compact-context-rename` worktree. Existing ancestor dependencies are resolved read-only; there is no install into ancestor node_modules. Every execution uses explicit disposable state:

```sh
mkdir -p .sandbox-rename/{home,dsh-home,cache,config,data,npm-cache}
export HOME=$PWD/.sandbox-rename/home
export DSH_HOME=$PWD/.sandbox-rename/dsh-home
export XDG_CACHE_HOME=$PWD/.sandbox-rename/cache
export XDG_CONFIG_HOME=$PWD/.sandbox-rename/config
export XDG_DATA_HOME=$PWD/.sandbox-rename/data
export npm_config_cache=$PWD/.sandbox-rename/npm-cache
export DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
```

The existing Chromium executable is read-only; browser state belongs to the sandbox. Packed-consumer tests install only into disposable worktree-local consumer directories/caches. No live GUI (3080), real HOME/profile, push, tag or release is used.

## Executed checks

- Before implementation, `node --test test/integration/module-identity.test.ts` failed 2/2, identifying old public ids and migration admission.
- Focused configuration: `node --test test/integration/module-identity.test.ts test/integration/config.test.ts` passed 8/8 after renaming.
- Focused feature/integration/migration/client: `node --test test/integration/*.test.ts test/migration/*.test.ts test/modules/compact-context/*.test.ts test/client/forms.test.ts test/client/emitted.test.ts` passed 229/229, zero failures/skips. Includes native in-process scoped compaction, tools, retention and lifecycle regressions, not provider requests.
- Strict typecheck: `/home/dev/dev/dsh-extras/node_modules/.bin/tsc --noEmit` passed, including compile-time no-old-id and new-id assertions for host, migration and client unions.
- Complete source: `node scripts/test.mjs` passed 389/389, zero failures/skips, with the explicit Chromium executable above.
- `node scripts/build.mjs && node scripts/pack.mjs` generated all five distributions/tarballs using safe JS binding aliases and quoted canonical module keys.
- `node --test test/artifacts/packages.test.mjs` passed 5/5 clean-consumer installs, imports, native schema/false/zero values, selected feature payload/notices, unchanged canonical tool names and CLI help identities. No old plugin/config/notice alias is emitted.

## Boundaries

The removed `context` module id is not a migration source or alias. Root Schemastery retains existing unknown-field behavior: an unrecognized old input key is not consumed as the new module configuration and is never automatically rewritten. Use `modules["compact-context"]` explicitly. Native `Context`, model context metadata, `systemPrompt.context`, `compact_context` / `context_status` and predecessor `dsh-tool-compact-context` stay unchanged.

Packed native CLI/web-profile acceptance in [native-profile.test.ts](../test/artifacts/native-profile.test.ts) was updated for renamed schema, status and DOM selectors but is not claimed executed by this rename-only check. The release owner must rerun complete native/packed/browser acceptance on the final integrated, versioned tree. No external provider execution or reasoning interception coverage is claimed.
