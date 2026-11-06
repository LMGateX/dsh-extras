# Extras public package interface

Extras distributions are new package identities, not drop-in predecessor plugins. Each archive exposes only the package root, `./client`, `./migration`, and `./package.json`. Legacy `resolveConfig`, `client-types`, locale and source paths are not compatibility aliases. Feature implementation functions are not root exports.

## Root: native Cordis plugin

Runtime exports are exactly `name`, `inject`, `Config`, and `apply`. `ConfigInput` and `ConfigOutput` are type-only interfaces. Each split accepts only its selected module; the combined distribution accepts all four canonical modules. Module values use the actual source configuration interfaces, rather than an invented shared resolver.

```ts
import { Config, name } from "dsh-extras-retry";
import type { ConfigInput, ConfigOutput } from "dsh-extras-retry";

const input: ConfigInput = {
  modules: { retry: { enabled: true, providers: [], retryEmptyResponse: false } },
  migration: { auto: false },
};
const output: ConfigOutput = Config(input);
const enabled: boolean = output.modules.retry.enabled.get();
const providers: readonly string[] = output.modules.retry.providers.get();
```

Input and resolved output are distinct. In `compact-context`, the `compactionReasoning` policy object applies its own defaults: `{enabled: true}` inherits `rules: [{scope: "all", mode: "inherit"}]`, while `{rules: []}` inherits `enabled: false`. Either policy field may therefore be omitted in `ConfigInput`. This is a controlled one-level input projection derived from the source policy type, not recursive `DeepPartial`: rule entries still require scope, mode, provider/model where applicable, and effort for fixed mode. Resolved output always has both policy fields.

```ts
import { Config } from "dsh-extras-compact-context";
const enabledOnly = Config({modules: {"compact-context": {compactionReasoning: {enabled: true}}}});
const rulesOnly = Config({modules: {"compact-context": {compactionReasoning: {rules: []}}}});
const enabled: boolean = rulesOnly.modules["compact-context"].compactionReasoning.get().enabled;
```

The root schema makes every feature field volatile, including original fields whose feature schema is not volatile. Its returned fields are native `Volatile<T>` references, whose `get()` returns an immutable snapshot, **not plain values**. The migration auto flag is also volatile. `apply` accepts the native Cordis context and resolved root output. Host Loader remains the normal lifecycle owner; the example above only validates configuration.

## Client: native loading side effect

```ts
import "dsh-extras-retry/client";
```

This script registers with `window.__ModuleLoader__` in the native browser environment. It has no JavaScript module exports, no `apply` export, and no stand-alone browser lifecycle. Its declaration is intentionally only `export {};`. Do not import it in Node without providing the native loader environment.

## Migration: the actual public interface

`./migration` exposes the existing `MODULE_IDS`, `LEGACY_PACKAGES`, `LEGACY_DEFAULTS`, `inspectMigration`, `planMigration`, `dryRunMigration`, `runMigration`, `rollbackMigration`, and `startAutomaticMigration` exports plus their source-authored public types. Inspection and mutation require the declared native host/profile and target distribution inputs; rollback additionally requires an operation id and selected modules. Bootstrap returns the declared migration controller. Configuration import is not proof of live ownership handover. The generic migration module-id list includes all four capabilities in every distribution; it does not select or activate unshipped feature implementations.

Declarations are emitted by TypeScript from the public migration source and selected configuration interfaces. Only the emitted declarations reachable from those entries are collected; runtime-only validation imports do not pull unrelated feature declarations into splits. Relative declaration imports use `.js` for NodeNext resolution. Declaration implementation files are package-private; the package exports map does not expose source subpaths.

## Host dependency and verification rules

Native runtime peers resolve from the installed DSH anchor. Do not install a second Cordis/service registry to satisfy a consumer. The goal-selected distributions additionally declare the dynamically resolved DSH and goal-round-driver metadata peers used for ownership/version checks. Only goal-selected distributions carry port provenance/license assets when the port source exists; non-chime distributions carry no sound assets. Generated bundle patch enablement is unchanged.

Artifact tests npm-install the real archives with disposable `HOME`, `DSH_HOME`, and npm cache outside the checkout, anchor native peers to one installed DSH runtime, execute package-name JavaScript imports and native client registration, and compile strict NodeNext consumers with `skipLibCheck: false`. Negative imports assert that predecessor aliases and private source subpaths remain unavailable. Tests also check volatile output types, selected-only declaration/source-map payloads, migration inputs and exports. These checks do not establish behavior on unaudited DSH versions or replace native ownership/browser acceptance.
