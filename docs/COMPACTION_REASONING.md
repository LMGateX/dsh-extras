# Compaction request reasoning policy — fixed implementation contract

Status: approved before implementation. Target release: 0.2.0. Audited host: DSH 0.2.2-alpha.3; Node >=24.9.0.

## Scope and terminology

The canonical module id is `compact-context`, matching the `dsh-extras-compact-context` distribution. It groups native-policy compaction tools and a separate request-wide reasoning policy; it is not a general context-pruning engine. The former development-only `context` id is removed without aliases, import compatibility, journal translation or automatic configuration rewrites. Rename owned plugin identity, source/test paths, client sections, status/ownership keys, CLI module selection and packaging metadata together. Native vocabulary (`Context`, model context metadata, `compact_context`, `context_status`, request purpose `compaction`) and predecessor package identities remain unchanged.

Combined and split distributions share one implementation. Both capabilities are independently selectable under the module: exposing the agent tool is not a prerequisite for the request policy. Disabling the module withdraws all its feature effects. No new package/distribution or second compaction engine is introduced.

## Problem and source evidence

The baseline basic backend builds a cache-reusing replay prefix and appends its summary instruction, but sets no `reasoningEffort`. It chooses the configured summary provider/model, otherwise the latest durable request target, otherwise the agent target. Sharing that target does not inherit its reasoning control. Some upstreams partition routes or cache namespaces by effort, so a missing control can prevent reuse. Matching effort addresses this difference, not every possible cache miss.

Primary sources, all from the published 0.2.2-alpha.3 packages:

- `@deepseek-ai/dsh-compaction-basic/lib/index.js:292-323`: summary target and request envelope, including `purpose: "compaction"`, with no reasoning effort.
- `@deepseek-ai/dsh-compaction-basic/lib/types/index.d.ts:20-49`: all summaries share the dynamically dispatched `summarize` method.
- `@deepseek-ai/dsh-llm/lib/types/index.d.ts:33-45`: `llm/stream` next takes no replacement options; LOOP inputs are immutable.
- `@deepseek-ai/dsh-llm/lib/index.js:2187-2209`: exact-route defaults and effort validation; unsupported values fail rather than alias or clamp.
- `@deepseek-ai/cordis/lib/index.js:112-156`: use-site tracing and method shadows mean a root service proxy is not proof of complete runtime coverage.

Do not copy real sessions, telemetry, provider configuration or upstream addresses into this repository as evidence or fixtures. There is no universal cache-hit, latency, cost or summary-quality guarantee.

## Configuration interface

`modules["compact-context"].compactionReasoning` has:

- `enabled: boolean`, default `false`, including fresh installs and upgrades.
- `rules: Rule[]`, default `[{ scope: "all", mode: "inherit" }]`. An explicit empty list stays empty. Arrays replace, never concatenate.

Each rule is exactly one of the three match scopes and one of two actions:

```ts
type Match =
  | { scope: "all" }
  | { scope: "provider"; provider: string }
  | { scope: "provider-model"; provider: string; model: string };
type Action =
  | { mode: "inherit" }
  | { mode: "fixed"; effort: string };
type Rule = Match & Action;
```

Identifiers are exact, case-sensitive native provider routes, model ids and adapter-owned effort ids, not display labels or URLs. No wildcard, regular expression, slash-concatenated identity, case normalization, effort aliasing or cross-provider strength mapping. Reject empty/control-bearing identifiers, unknown or inapplicable fields, malformed shapes and duplicate match targets. Bound rule counts and identifier lengths in the shared validator and mirror those limits in the editor. A scope/action switch clears inapplicable fields.

Match the actual outgoing summary provider/model after native summary routing. Priority is provider-model > provider > all; input order is not precedence. The winning rule does not fall back to broader rules if inheritance has no value or native validation rejects the selected effort.

Inheritance reads only the exact request session latest effective durable `requestHeader().config.reasoningEffort`. Missing session/header/effort preserves the original request value or omission; never guess medium, borrow another session, scan transcript text or fetch real storage. Fixed sets the configured native id, replacing any existing summary effort. Both actions change only that scalar on a detached request. The host owns exact-model validation; unsupported effort fails explicitly before provider dispatch, with no silent fallback. Treat `UNSUPPORTED_REASONING_EFFORT` as deterministic in any existing Extras tool-level transient retry classification. Do not add a retry mechanism.

Example (synthetic identifiers only):

```yaml
modules:
  compact-context:
    enabled: true
    compactTool: false
    compactionReasoning:
      enabled: true
      rules:
        - scope: all
          mode: inherit
        - scope: provider
          provider: example-provider
          mode: fixed
          effort: high
        - scope: provider-model
          provider: example-provider
          model: example-model
          mode: inherit
```

## Request adapter and lifecycle

Use a version-limited clone-first compatibility adapter around the exact native LLM runtime public `stream(options)` entry. This is not an officially supported request-transform hook. Match explicit `purpose === "compaction"`, exclude LOOP-owned requests, and verify the supported native envelope. Capture configuration and the exact-session inheritance value per request before asynchronous work. On match, shallow-copy the top-level envelope and change only `reasoningEffort`; call the original stream once with the original call-site receiver. Reuse messages, tools, tool history and cancellation identities unchanged. Non-compaction requests pass through untouched.

Do not mutate hook inputs, recursively redispatch from `llm/stream`, bypass adapter validation/replay, read private adapter registries, patch prototypes, change provider defaults, copy the native summary prompt, replace the compaction backend or install a second engine. No additional model metadata preflight in the adapter: keep native capability resolution tied to dispatch.

Install only while enabled. Identify actual service instances despite Cordis proxies; account for already-existing, later-created, isolated and replaced services and preserve use-site contexts. Repeated toggles must not stack wrappers. Restore original own descriptors/inherited state only if still owned; never overwrite a later wrapper. Dispose observers and request-policy effects on disable/unload. In-flight calls keep their captured request; subsequent calls see new accepted settings. Expose active/disabled/unavailable status and a bounded, non-secret reason. Saved configuration is not proof of active coverage. Do not make the reasoning capability depend on tool visibility or optional tool-only services.

Audited discovery uses the public Cordis `symbols.original` and symbol-keyed `reflect.store`, with global synchronous `internal/service` notifications and a one-next `internal/get` read-side check for `llm`. Restrict the runtime package evidence to DSH LLM 0.2.2-alpha.3 and Cordis 4.0.6-alpha.2, resolved from the external host packages. A scope-sensitive session read uses the incoming receiver context. Native provision/disposal/HMR and first use are covered by these audited surfaces. Cordis direct `set`/`reflect.set` followed solely by direct `get` emits neither observer; arbitrary third-party replacement/cached-method dispatch that bypasses the audited native access path is not an extensibility guarantee. Do not patch reflection prototypes or claim these observers cover such a bypass. Keep this boundary explicit in tests and status documentation; it does not remove any baseline native compaction entry from the gate.

All baseline native LLM compaction requests are required: automatic pressure, original manual compact, agent tool/range compact, overflow recovery and model-switch compaction. Pruner-only/no-op operations issue no reasoning request. Complete coverage is a release gate: inability to prove required runtime coverage means unavailable/fail closed for this feature, never tool-only fallback. Keep original compaction operational. Custom backends that bypass the identified stream/purpose and other host versions are unsupported until validated; do not advertise universal compatibility.

## Settings, ownership and migration

Show separate groups for agent-facing compaction tools and request reasoning policy. Provide an independent master toggle and a structured rule editor for all scopes/actions, fixed priority, native ids, add/remove, explicit empty lists, validation, save/discard/reset and revision conflicts. Prefer advertised native effort choices when available; preserve opaque valid ids and permit explicit entry when discovery is unavailable. No invented universal effort list. Report policy availability independently from tool availability.

Extend target configuration validation, including the detached migration validator. Never add this feature to predecessor historical defaults or infer enablement from old compactTool values. Existing ownership conflict and recoverable legacy handover rules remain in force, using only the new module id. No compatibility owner for the development-only old id is introduced.

## Agreed test seams and delivery gates

The user approved these public test seams in the fixed plan; no private-method tests are required:

1. Plugin configuration interface: defaults, disabled/empty values, schema errors, duplicate target rejection and migration target admission. Does not prove native runtime interception.
2. Exported plugin plus native LLM adapter request interface: exact matching/inheritance, preservation of original input, ordinary-call exclusion, native effort rejection, concurrency, lifecycle, scope and service replacement. Does not measure external provider cache policy.
3. Native engine entry interfaces: each automatic/manual/tool/overflow/model-switch path with deterministic offline adapters, compactTool=false, independent sessions and retained preset backends. Does not prove arbitrary third-party engines.
4. Native configForms/settings interface in emitted and packed clients: editing, native-id handling, empty lists, conflicts, persistence, runtime status and independent toggles. Does not claim real provider execution.
5. Packed distributions through disposable native CLI/web consumers: five artifacts, same source/version, correct module id and no unrelated payload, safe ownership and active request policy. No live profile installation.

Use vertical red-green slices at these seams and record exact focused commands/results. Run the complete existing source/type/build, migration, native/browser and artifact suite on the final tree. Review Standards and Spec independently and repair blockers before publication. Configuration renaming is tested before reasoning implementation.

All installs/hosts run with explicit disposable HOME/DSH_HOME/profile/cache paths, synthetic data, no provider credentials and temporary loopback ports; never target the live GUI. No GitHub Actions. Publish five verified tarballs, checksums and an annotated matching tag using Git/gh after local acceptance. The user authorizes the breaking rename and force push with lease; never overwrite an unexpected remote update. No npm publication or installation into this machine real profile.
