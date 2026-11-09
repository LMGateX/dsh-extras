# Recovery and workspace settings — follow-up UI contract

Fixed before implementation on 2026-11-09 (Asia/Shanghai), from the direct user screenshot and three requested improvements. Baseline is published Extras 0.5.0 (a253960). This is an isolated follow-up, not permission to replace the published tag, publish/install a new build, restart the active host, or modify the referenced repository.

## Recovery visibility and presentation

A per-message recovery surface belongs only to the latest request/owning turn that actually terminated in native model-request error. Successful, running, cancelled, historical and ordinary tool-error turns must not display an unavailable recovery widget. Unknown native turn/failure evidence is not proof. Never infer failure or retry exhaustion from rendered text or retry counters. Latest-turn proof must survive paged event windows: use public native turn outline/head metadata and error-bound turn identity, or public event-window evidence only when it actually proves the current head, never assume the newest loaded old event is the session head.

A working action still requires the native current, latest, revision-bound budget-exhausted checkpoint. Native request/admission/permission/idempotency authority is unchanged. Broader error visibility never broadens recovery eligibility. An error-bound card may explain unsupported/unavailable recovery without a fake action. Global settings diagnostics remain truthful; unsupported-host notices are not repeated beneath ordinary replies.

Use an independent restrained card: heading, status indicator, explanation and separated primary/secondary actions. Theme-aware light/dark colors, border/spacing and responsive wrapping distinguish it from conversation content. State is expressed by text and semantics, not color alone. No raw provider errors/secrets. Chinese/English remain supported. In-progress, failed refresh, duplicate/lost-response, stale/new-turn and disable/unload behavior retain existing safety gates.

## Global and multiple-workspace settings

Both model defaults and shared compaction offer an actual switcher between global defaults and multiple native workspaces. Follow interaction principles of the user-named read-only [reference repository](/home/dev/dev/dsh-mattpocock-skills/): scope selection, explicit global inheritance and workspace overrides. Exact reference findings belong in validation notes; do not copy its instrument/ownership model into Extras.

Discover names/IDs from the existing public native workspace registry/client service. Labels help humans; persistence remains exact opaque workspace IDs, not names, cwd, paths or prefixes. Global cannot collide with a workspace ID resembling a sentinel. Keep configured-but-not-currently-listed overrides accessible. If discovery is unavailable, report it honestly and preserve a validated explicit-ID fallback; never silently choose global.

A workspace without an override inherits global. Clearly show inherited/customized state and effective inherited values. Model roles inherit independently; explicit null retains native selection and is not missing data. Shared compaction retains its whole-policy override semantics: false and empty rules are explicit values, not inheritance.

Reading/selecting scope creates no overrides. Editing one workspace never changes global/another workspace. Model reset remains staged until Save. Shared compaction retains its existing explicit, immediate, CAS-guarded reset operation (reasoning.ts submit/reset); its label must make immediate acceptance clear. Either reset removes only the selected workspace override and returns to the latest accepted global policy, never restores a stale copied global value. Global updates propagate to inheritors without copied workspace policies; custom workspaces remain unchanged.

Unsaved/in-flight drafts lock scope switching, preserve conflict/revision checks and never auto-save/rebase. Collapse preserves drafts. Catalog discovery/refresh does not write or change policy revisions. Canonical shared storage shape, profile namespace and single executor remain unchanged. Selected-feature packaging must not pull model/shared features into unrelated distributions.

## Read-only reference and native interface evidence

The named reference [client scope picker and per-leaf source display](/home/dev/dev/dsh-mattpocock-skills/src/client.ts#L1420-L1498), [decoder](/home/dev/dev/dsh-mattpocock-skills/src/client.ts#L1021-L1027) and [host list](/home/dev/dev/dsh-mattpocock-skills/src/host.ts#L1263-L1267) establish all-workspace selection and explicit inheritance. Its instrument-specific gates and transport are not reused. Native browser integration instead uses the already public workspace controller: ctx.workspaces.list.getSnapshot()/subscribe(), whose WorkspaceSnapshot is items + state (idle/loading/error) + phase (pending/ready) + error. A complete healthy list requires ready + idle + null error; ready alone is only arrival history. Native rows use workspaceId/title, not the reference host projection id/status. Extras subscribes with bound receiver and never starts/stops the native follow stream. Only the model and compact-context selected client manifests gain the workspace-controller dependency; canonical policy storage and backend routes do not change.

## Existing agreed seams and acceptance

Reuse the user-confirmed public seams in [workspace contract](WORKSPACE_POLICY_050.md#agreed-public-test-seams) and [native recovery contract](NATIVE_RECOVERY_050.md): public native chat TurnTail/session plus operation interfaces; ConfigForm and authenticated policy routes; emitted/packed settings and actual isolated browser; clean selected consumers. No new private seam or live GUI fixture.

1. Red regression demonstrates ordinary closed-turn widget, then proves hidden on success/running/cancel/old turn and shown on the current native error, with action only for genuine eligible checkpoint. Retain duplicate/admission/finite-budget/tool-preservation assertions.
2. Browser exercises global plus at least two workspaces, inherited effective values, customize one while preserving another/global, save/reload/reset, opaque IDs, unavailable catalog, saved IDs and draft/conflict safety for both editors and both shared entry surfaces.
3. Emitted browser evidence covers Chinese/English, light/dark/narrow layouts, keyboard/focus and action hierarchy without horizontal overflow. Source/style string checks alone are not browser proof.
4. Focused regression, typecheck/full source, rebuilt six-package/artifact gates, independent Standards/Spec review and precise limitations are required. No real profile/GUI/native production changes.
