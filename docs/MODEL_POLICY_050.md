# Model policy 0.5.0 — implementation and evidence

## Public contract

The module exports ordinary Cordis `name/inject/Config/apply`, `resolveConfig/validateConfig/runtimeStatus`, and root-owned `mountSettings(ctx, distribution)`. Module id: `model-policy`; plugin name: `extras-model-policy`. Combined/split root orchestration owns admission and default-off upgrade mapping.

Configuration is structured native ConfigForm data, not JSON text:

```ts
{
  enabled: false,
  root: null, // or { provider, model, reasoningEffort?: string | null }
  descendants: null, // all delegation depths; same exact-native-ID shape
  workspaceOverrides: [{ workspaceId: "native-registry-id", root: null }],
  compactionReasoning: { enabled: false, rules: [{ scope: "all", mode: "inherit" }] }
}
```

Workspace omitted roles inherit global roles; explicit null retains native selection. IDs are case-sensitive, control-free native IDs of at most 200 characters. Workspace entries are bounded to 100 and unique by exact native workspace id. Arrays replace rather than merge. Null/omitted effort becomes **omitted** in native selection, never an invented cross-provider mapping or a pinned adapter default.

Native Schemastery 3.19 treats a nullable default as absent for absent input: `selection().default(null).volatile()` can expose `get() === undefined`. Explicit null is retained. `resolveConfig` normalizes global omitted roles to null but preserves omitted workspace roles. Both native global representations retain native selection; the workspace distinction remains intact. No upstream schema patch or custom serialization transform is used.

## Native lifecycle and workspace ownership

- Selection uses public `agent.model.select` before preparation: awaited `agent/created` for fresh creation/safe resume, plus accepted `loader/volatile-update` for live agents. No agent options mutation, deprecated `agent/request`, prepared-request change or step-loop patch.
- The LLM in the actual Agent context validates exact provider/model/effort through `resolveCallConfig`. The returned adapter default is not persisted as an explicit effort. Unknown provenance or unsupported native capabilities retain the original native selection and expose a bounded unavailable diagnostic, never raw provider error bodies.
- Workspace resolution is shared with standalone compaction through [the common provenance helper](../src/shared-compaction/workspace.ts). Immutable `session.header.origin === "subagent"` and `parentSession` are followed to the root. Missing ancestors use public `sessionQuery.observeSession` and the observation lease is disposed. Missing ancestry/cycles fail closed. Ordinary root forks remain roots even when historical parentSession exists.
- The root uses unique native registry membership. Native session controllers attach membership **after** awaited Agent creation, so fallback uses native `workspaceRegistry.resolveByPath(root.header.cwd)`: exact registry lookup of the immutable root creation header, never mutable working-directory state or path prefixes. Descendant worktree/cd cannot switch policy workspaces.
- Accepted updates use an enable-lifetime/disposal epoch and per-Agent relevant-request tickets, then revalidate the latest exact target after awaited native metadata. Unrelated workspace/compaction edits do not invalidate still-wanted pending creation/live selections. Disable/re-enable and related A→B→A targets invalidate older awaits. The original native choice and latest public model/selection sequence are rechecked, so an intervening explicit native selection is respected even when it records the original options value. No unobservable native no-op is assigned fabricated provenance. Prepared in-flight calls keep their captured selection; future safe steps receive accepted updates.
- Disable stops future selection and local compaction participation. It does not restore a previous choice or overwrite durable native selection on unload.

### Default-mode cold resume clarification

This is a **default**, not perpetual routing enforcement. Cold native resume with a durable `request/header` or `model/selection` retains that choice. The module does not guess whether existing durable selections came from a human, tool, another policy or an old version. Historical-session choices and explicit human/tool choices survive disposal/restart. A resume without a recorded choice may receive defaults. Fresh spawn/fork startup still receives descendant defaults, overriding inherited root seeds. Explicit later accepted policy update/enable may update already-live targets. No fabricated owner marker/session event is introduced.

## Shared compaction

The module uses `participateCompaction` from the same source/coordinator as compact-context. Nested `compactionReasoning.enabled`, additionally gated by module enablement, is local participation intent, not another canonical authority. Common profile store/revision, workspace overrides, migration, executor/standby/handover and HTTP admission belong to the shared implementation. Root-owned mountSettings mounts deduplicated authenticated settings even when the feature is off. Model-policy alone installs no compact-context tools and does not change summary provider/model, retention, transaction or cancellation authority.

## Browser adapter

[The editor](../client/model-policy-settings.ts) exports `createModelPolicyAdapter(React).createView(ctx)` and `createModelPolicySettingsView(React, catalog?, locale?)`. The component receives a **module-section** `{form: ConfigForm, runtime?, workspaceId?}`. Optional parent native workspaceId preselects a workspace; without one the exact stable registry id is entered manually, never guessed from a path.

English/Chinese views support global/workspace scopes, separate root/all-descendant choices, retain-native/inherit-global modes, exact native effort metadata, staged resets, discard and conflict-safe save. Global reset emits native unset operations to recover inherited base values; workspace reset removes that override row. Both are staged until save. A workspace scope with missing/blank/control-bearing/oversized ID is non-editable and never falls back to global scope. The public editor independently refuses invalid workspace targets. A dirty draft is bound to one scope: both scope and workspace ID remain locked until save/discard, including conflict drafts. Workspace saves emit only workspaceOverrides operations; global saves never carry workspace overrides. Saves carry the captured expectedRevision. Concurrent revisions preserve drafts and refuse overwrite rather than rebase. Errors use role=alert, and data-extras-dirty supports parent collapse summaries. Parent UI composes module enablement and the shared compaction editor, not duplicate local copies.

## Executed evidence

Tests use the four user-approved public seams. Native fixtures reuse the existing public Agent offline fixture with real AgentRegistry, Session persistence/query, WorkspaceRegistry and JSON domain storage. Browser bundles use esbuild write:false and real Chromium on an ephemeral loopback port. No production profile, upstream package mutation, paid provider or port 3080 is used.

```sh
T=$(mktemp -d /tmp/extras-model-env.XXXXXX)
HOME="$T" DSH_HOME="$T/dsh" DSH_PROFILE=model-test \
DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome \
node --expose-internals --test --test-concurrency=1 test/model-policy/*.test.ts
```

Result after independent-review fixes: **22/22 pass**: 16 native cases, 2 emitted-browser locales, 3 ConfigForm cases and 1 configuration case. Vertical red→green slices caught off→on deduplication, global reset inheritance, cold-resume human-choice overwrite, disabled-module shared participation, blank-workspace global-edit leakage, and unrelated-policy edits invalidating pending native selection before fixes. Review regression coverage also exercises valid workspace-only writes, dirty scope/ID lock with save/discard unlock, enable-lifetime and related-target-cycle fencing, and same-value explicit native selection sequence fencing. Native assertions include actual spawn/seeded fork at depths one/two, mutable cwd in another workspace, ordinary seeded root fork, cold resume/resident follow-up, first dispatch with opaque effort, unavailable provenance/exact effort, prepared-call capture, disable during awaited metadata resolution, and standalone native /compact reasoning without compact tools/default routes.

Source plugin and native runtime must use one coherent dependency tree. Setting only DSH_RUNTIME_ROOT to another physical rc.1 installation while source imports local peers creates different native constructor lineages; audited compaction compatibility correctly reports unavailable instead of patching the other copy. Final packed consumers must supply coherent peers.

Typecheck passed during development. Subsequent complete-worktree checks reported concurrent unrelated lane work (first migration journal nullability, later the not-yet-created retry recovery import), with no model-policy/client diagnostics. Parent integration owns final frozen-worktree typecheck and six packed artifacts. This lane did not rebuild dist/pack after the shared build lock, and does not claim final packed-browser/installation/release coverage.
