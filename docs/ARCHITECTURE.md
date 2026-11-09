# Architecture and cross-lane contracts

## Deep modules

Feature modules hide implementation behind the existing Cordis plugin interface (name/inject/Config/apply). The Extras host owns orchestration, not feature policy. Browser settings and chime use native client modules and configForms/slots. Shared code is introduced only for actual repeated behavior.

For 0.3.0, apply the [fixed parity contract](LEGACY_PARITY_030.md). The additive feature runtimeStatus(ctx) returns capabilities and optional non-secret details for the exact active fiber; the root authenticated status route reads it once and does not cache it past disable/disposal. A live Cordis feature shell is distinct from a successfully mounted continuation driver.

Goal-wait’s native owner coordinator hides runtime-only stock suppression, exact callback/Loader-entry proof, synchronous remount guards, serialized drain/restore and generation fences. It never persists native disabled flags. activation/native leave the official owner in place; replacement/off temporarily take its slot. Disposal must await its full close before dropping the guard or admitting another owner. Native lifecycle goal mutations are observed only by the exact-artifact transition adapter documented in the parity contract, not inferred from a broad transition window. Ordinary public module/native lifecycle test seams remain the validation boundary.

## Canonical configuration

The root namespace has modules keyed compact-context, model-policy, retry, chime, goalWait. New model-policy defaults off; the four original defaults are preserved. Each module value is { enabled: boolean, ...originalFeatureFields }; original chime.enabled remains the same flag, not a second nested switch. Defaults come from the feature's Config/resolveConfig. Root orchestration metadata is separate from user feature fields. Existing scalar/array zero, false and empty values must survive mapping. Arrays replace rather than concatenate.

Combined row/package id: dsh-extras. Split row/package ids: dsh-extras-compact-context, dsh-extras-model-policy, dsh-extras-retry, dsh-extras-chime, dsh-extras-goal-wait. Splits may use the same canonical envelope with only their supported module in their schema. The browser selects a distribution by package/row identity and module selection, not by global singleton assumptions.

Feature code location: src/modules/compact-context, src/modules/model-policy, src/modules/retry, src/modules/chime, src/modules/goal-wait. Each exposes index.ts. Adapt original feature-only code and focused regression tests here. Feature modules never directly edit profiles or disable other distributions.

Host orchestration and configuration: src/index.ts, src/config.ts, src/runtime.ts (integration owner). Migration: src/migration/* (migration lane). Browser code: client/* (client lane). Build/packaging/scripts/CI and public docs (integration owner). Agents may propose contract amendments but must coordinate shared file changes.

## Shared policy authority and execution

For 0.5.0 the [workspace policy contract](WORKSPACE_POLICY_050.md) is authoritative. Both compact-context and model-policy ship the same deep shared-compaction implementation, including full standalone execution. Native domain `dsh_extras_compaction` owns one profile policy/revision and exact workspace overrides, plus recoverable legacy imports; per-module participation is not another canonical rule list. Separately bundled copies coordinate one executor through a root-global symbol and prefer compact-context. Standby/handover are real capability states, not unavailable or extra streams. Executor disposal restores only owned methods and never overwrites a foreign owner. In-flight requests retain their captured policy.

An optional feature mountSettings hook registers authenticated management endpoints even while effects are disabled; generic runtime never imports unrelated feature implementations. Browser generated entries compose only selected model/retry/shared factories. Canonical writes and native provider leaf writes use independent relevant revisions; no hidden last-write-wins merge. Model defaults use native selection before request preparation and immutable session workspace origin, with manual/cold-resume choices preserved in non-enforcement mode. Retry execution remains native; the classification module does not acquire another retry loop.

## Migration seam

Migration planning is pure and accepts detached discovery snapshots (profile identity, owner entries and versions, inherited/explicit config, disabled/live state, target selection and explicit target settings). Its result is per-module import/skip/conflict with reasons. Execution accepts injected storage, lock and host adapters; writes a journal before changes, revalidates snapshots and verifies actual lifecycle results. The native adapter is profile-scoped and uses host configuration/management contracts. Export a narrow public entry for inspect/dry-run/recovery; integrate with deferred host bootstrap, never package postinstall.

Integration will adapt the migration lane's exported concrete contract rather than duplicate it. The migration lane must publish interface names to the parent before writing the native adapter. Avoid nested native HMR exclusive operations or waiting for the current Loader task from inside itself.

## Distribution

The [0.3.1 standalone entry contract](MIGRATION_CLI_031.md) separates offline startup from native runtime evidence acquisition. Common migration support must not eagerly acquire Cordis for a plain-Node/offline caller; a real runtime Context uses the explicit audited host anchor and existing fail-closed ownership checks.

One source tree, one synchronized version, six self-contained tarballs generated by scripts. Runtime host imports stay external; do not bundle a second Cordis/service registry. Split artifacts contain only their selected feature code/assets plus common orchestration/migration support. Preserve MIT source attributions and CC0 sound notices. No credentials or machine-specific paths in emitted runtime code. Tests may locate a host using an explicit environment variable.

Each supported public entry has a truthful declaration: root Cordis exports, native browser-loader side effects and the migration API. Build selection includes only that distribution’s feature configuration and goal-port provenance/license assets; common migration support does not authorize shipping unrelated feature implementations or compatibility aliases.

## Testing seams

Inject host ports for planner/executor fault tests. Test features at their exported plugin interfaces. Use real published baseline host packages in disposable process/HOME/profile for native composition/reload tests. Exercise generated packed client code using browser-compatible module loading; browser integration must not reuse the live GUI URL. Verify every .tgz in a clean consumer and check its actual file list, imports, exports, bundle patch and sound assets.
