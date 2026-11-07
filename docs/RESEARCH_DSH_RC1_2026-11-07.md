# DSH 0.2.2-rc.1 compatibility research

Date: 2026-11-07 (Asia/Shanghai). Scope: research only, against Extras commit `7a1cd519e3f4dba5a368062d54d36fbb7ce16140` (0.3.1 / audited DSH alpha.3), before adaptation. No implementation, installation, host launch, browser session, push or release was performed by this research lane.

## Executive finding

**Treat rc.1 as a new exact audited package baseline, not as evidence that every migration advertised in its release notes is a new alpha.3 → rc.1 runtime API change.** Independently downloaded npm tarballs show byte-identical `lib/index.js` files in alpha.3 and rc.1 for tools, agent, agent-loop, LLM, Goal, native goal-round driver, session projection, basic compaction and HMR. The compared Cordis 4.0.6-alpha.2 → 4.1.0 and Loader 1.0.7-alpha.2 → 1.1.0 entrypoints are also byte-identical. Package identity/dependency declarations change; this does **not** prove the entire dependency closure or every secondary export identical. Exact version guards in Extras currently reject rc.1 even where entrypoint bytes match. [P1–P13]

The step-aware tool set, pinned model selection, asynchronous projection handle, and raw/candidate/effective Fiber APIs discussed below already exist in the **published alpha.3 artifacts** inspected here. Preserve those semantics and recertify the rc.1 composition rather than inventing a compatibility rewrite. Primary release prose and migration guides describe required contracts but are not a trustworthy chronology by themselves. [R1–R4, P2–P13]

## Repository contracts read

Read [AGENTS](../AGENTS.md), [specification](SPEC.md), [architecture](ARCHITECTURE.md), [migration](MIGRATION.md), [acceptance](ACCEPTANCE.md), [compaction reasoning](COMPACTION_REASONING.md), and the parent's fixed [rc.1 / 0.4.0 contract](DSH_RC1_040.md). Existing gates remain mandatory: one feature source, no second Cordis registry, exact anchored host ownership proof, no durable native suppression, no rearming externally disarmed goals, native compaction routing/retention/retry authority, five packed consumers and isolated real-web evidence. This note does not amend or weaken those contracts.

Research used a dedicated native `create_worktree` branch `research-dsh-rc1`. Official tarballs were fetched and extracted as inert data, with SHA-1 checked against each registry manifest before comparison. Scratch data is ignored, not committed. Every shell that downloaded/compared packages explicitly set disposable HOME, DSH_HOME, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME and npm_config_cache; no npm install or DSH execution was needed. The live GUI was not contacted. A transient SSL EOF interrupted one download batch; only missing packages were retried successfully. Initial /tmp scratch did not persist across tool invocations, so final comparisons used ignored worktree-local scratch instead.

## 1. Release identity and evidence priority

| Item | Published alpha.3 manifest | Published rc.1 manifest |
| --- | --- | --- |
| DSH | 0.2.2-alpha.3 | 0.2.2-rc.1 |
| Node engine | >=24.9.0 | >=24.9.0 |
| Cordis declared dependency | ~4.0.6-alpha.2 | ~4.1.0 |
| Loader | ~1.0.7-alpha.2 | ~1.1.0 |
| Include | ~1.0.11-alpha.2 | ~1.1.0 |
| Schemastery | ~3.18.6-alpha.2 | ~3.19.0 |

Source: exact [alpha manifest](https://registry.npmjs.org/@deepseek-ai%2fdsh/0.2.2-alpha.3) and [rc manifest](https://registry.npmjs.org/@deepseek-ai%2fdsh/0.2.2-rc.1). These are declared ranges, not a promise that every future satisfying resolution is audited. The specific Core/Loader versions compared here are 4.0.6-alpha.2 / 1.0.7-alpha.2 and 4.1.0 / 1.1.0. [P1, P12–P13]

Official tags are `dsh-v0.2.2-alpha.3` and `dsh-v0.2.2-rc.1`. The tag-ref API identifies commits `05b1cae8db6e674c5685101494d4eec24652424a` and `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db` respectively. Both GitHub releases are prereleases. **Discrepancy:** alpha.3 release prose names Core 4.0.0-rc.11 / Loader 1.0.0-rc.8 / Include 1.1.1, unlike its npm manifest. Use actual package metadata and bytes for runtime pins; retain the discrepancy rather than silently replacing either source. [R1–R3]

## 2. Tools: resolve / executable / prompt assembly

The published tool registry exposes:

```ts
register(definition, { when }?)
resolve({ agent, modelSelection, signal }): Promise<ResolvedToolSet>
get(name, scope?, toolSet?)
executable(name, scope?, toolSet?)
definitions(scope?, toolSet?)
schemas(scope?, toolSet?)
```

A `when` condition runs once at step preparation; false excludes the tool from executor descriptions, PTC bindings and execution; rejection fails preparation with TOOL_ACTIVATION_FAILED. The captured provider/model/effort is the same `modelSelection` used by prompt assembly. The step owns one admitted `toolSet`, passes it to both assembly and tool execution, reuses it for request retries, and disposes it after the batch. `get` without a set is registration inspection, not execution admission; `executable` without a set excludes conditional registrations. Unregister/restriction/same-name replacement must revoke not-yet-started work. [P2: README lines 69–77; declarations lines 78–95; R4]

The actual rc loop captures `agent.model.current()`, awaits `tools.resolve`, assembles with that exact selection and toolSet, then runs pre-step admission (published loop entrypoint lines 666–707). These entrypoint bytes are identical in alpha.3. [P3–P4]

**Extras seams / required validation, not a diagnosed new regression:**

- [Compact prompt visibility](../src/modules/compact-context/index.ts#L493-L517) caches `tools.get(COMPACT_TOOL, agent)` by agent and invalidates on registry changes. Its own registration is unconditional, so this is not alone proof of failure. If visibility is meant to follow conditional, step-owned admission, inspect the current assembly's toolSet rather than introducing a second resolver or interpreting a stale registration cache as admission.
- Direct `tools.get(...).execute(...)` calls in [scoped compaction tests](../test/integration/scoped-compact-context.test.ts) and [native compaction tests](../test/integration/native-compaction-reasoning.test.ts) exercise tool bodies, **not** the full executor/pipeline/admitted PTC contract. Retain those focused tests and add/retain actual native/PTC batch tests for restrictions, cancellation and disable/replacement revocation.
- Do not replace stable feature registration with per-request global register/unregister churn. The host already owns per-step resolution. [P2–P4]

## 3. agent.model and request routing

`agent/request` remains a deprecated compatibility hook. The loop fixes provider, model and optional explicit reasoning effort during preparation; the hook must preserve all three, including absence of effort. Published loop lines 1000–1001 explicitly throw on a changed route or effort and direct callers to `agent.model.select()` before preparation. This is present in both compared versions, not a newly observed rc-only break. [P3–P4]

The loop's `prepareRequest` builds a frozen seed from controls plus captured selection, invokes the hook, checks identity, and calls `llm.prepareCall` before admitting model-visible input. Use supported model selection rather than mutating AgentOptions or treating an arbitrary request listener as a routing authority. Header controls and selected model are distinct; the latest durable request header is not a substitute for every current step selection. [P4: entrypoint lines 985–1015; R4]

**Extras seams:** [PTC timeout route lookup](../src/modules/compact-context/ptc-timeout.ts#L21-L35) intentionally uses latest durable header then AgentOptions; evaluate its documented timeout semantics separately from current-step selection. [Compaction reasoning](../src/modules/compact-context/reasoning-runtime.ts#L19-L42) applies to non-LOOP auxiliary summaries, not agent/request: do not move it into the deprecated hook. [Retry classification](../src/modules/retry/index.ts#L66-L100) wraps llm/stream and classifies finish chunks, without owning model routing or another retry loop. None of these observations authorizes a policy rewrite. [P4–P5, P9]

## 4. Cordis 4.1 / Loader 1.1

Published rc Fiber declarations distinguish:

- `rawConfig`: retained raw, unevaluated input; setting it does not update running configuration.
- `resolveConfig(candidate)`: evaluate hooks/schema without publishing or committing volatile references.
- `effectiveConfig`: last activation / successful retained-update object; undefined before activation and still readable after unload, so check live Fiber state separately.
- `update(raw, noSave?)`: native candidate resolution and update lifecycle.

Both compared Core entrypoints and Fiber declarations match byte-for-byte; do not rewrite existing supported internal/config or effectiveConfig usage solely because Core's package version changed. [P12; R5]

Loader persistence is `EntryTree.commit(change: EntryChange): void` after applied mutations, not an old `write()` callback. Missing `legacy` means create; missing `options` means remove; both mean update/move. Loader locate/Entry.disabled/Fiber association and volatile updates remain load-bearing owner seams. The compared Loader entrypoints are identical, but identity guards must still be recertified. The official entry-tree migration guide also explains Include journal/flush ownership, file-edit conflict precedence and the nonpersistent in-memory parent of root profile Include patch-inserted rows. Do not confuse a runtime edit or completed commit callback with durable restart-safe profile mutation. [P13; R6]

**Specific hard refusals to update only after tests:**

| Extras seam | Existing pin / obligation |
| --- | --- |
| [Reasoning runtime baseline](../src/modules/compact-context/reasoning-runtime.ts#L13-L16) | Exact dsh-llm alpha.3 + Cordis 4.0.6-alpha.2; rc currently unavailable by design. Preserve complete service-instance coverage and owned descriptor restoration. |
| [Goal host profile](../src/modules/goal-wait/driver/host-version.ts#L16-L45) | Exact DSH participating packages, Core, driver hash; includes subagent tuple only when mounted. |
| [Goal owner discovery](../src/modules/goal-wait/host-owner.ts#L223-L245) | Exact driver/Core/Loader tuple, same callback selected by Loader and published anchor, one native entry, no foreign owners. |
| [Migration native-owner proof](../src/migration/native-owner.ts#L21-L37) | Explicit installAnchor Core 4.0.6-alpha.2; plain-Node offline callers must not acquire host peers implicitly or claim live Goal proof. |
| [Root orchestration](../src/runtime.ts#L18-L26) | Exact-fiber internal/config semantic validation before native commit; no candidate-as-active inference. |

## 5. Projection registration: inherited asynchronous contract

The alpha.3 **and** rc.1 published declarations expose asynchronous registration and retained handles. Both tag versions contain the same migration guide. Await `sessionProjections.register(definition)` in async apply / Service.init, retain the handle before exposing dependent operations, read `handle.stateOf(session)` or `readerFor(session)`, and await handle.dispose(). Registration is effect-owned; a retained reader may continue folding after global unregistration. Registry stateOf(session,key) is deprecated and cannot certify ownership. Callable-thenable compatibility is not the desired new registration API. [P8; R7]

[Pressure reading](../src/modules/compact-context/pressure.ts#L64-L91) consumes snapshot/cachedSnapshot wire values and falls back when unavailable; it is not a projection owner and should not manufacture a second registered unit. Startup fixtures must mount projections before agents/subagents and await owning services; missing snapshot state is not a justification to narrow supported native compaction paths. [P8; R7]

## 6. Native Goal driver and compaction request shapes

### Goal identity and behavior

The complete native driver entrypoint is identical in alpha.3 and rc.1. Both SHA-256 values are:

```text
1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de
```

This is already the fingerprint in [Extras host profile](../src/modules/goal-wait/driver/host-version.ts#L16-L19) and [owner coordinator](../src/modules/goal-wait/host-owner.ts#L33-L40). No driver behavior re-port is justified merely by a new version string. Still execute all activation/replacement/native/off transitions and native ownership tests with the rc dependency closure: byte equality of the driver does not prove service/lifecycle composition. Preserve descendant joins, cancellation/unload disarm semantics, exact queued-round identities and no durable phase rewrite. [P6–P7]

[Owner suppression](../src/modules/goal-wait/host-owner.ts#L179-L210) deletes only the exact registry callback identity before drainage to avoid native persistent disabled writes; speculative pending restore cancellation detaches only its exact owned Entry/Fiber association. A broader disable-all or permanent bundle patch would violate the existing contract even if tests appeared quieter. [P10, P12–P13]

### Compaction envelope

The entire basic compaction entrypoint also matches, SHA-256:

```text
eafe4adbccc2b87377e4839f1a6093ebe1a0858caadc6c3dbffef19cb1dbc54b
```

At published lines 292–323, native summarizeWithLlm chooses configured summary provider/model, else latest durable request header, else AgentOptions. It builds a plain top-level envelope with provider, model, messages, toolHistory, optional copied tools, maxTokens, sessionId, purpose: "compaction", optional original signal, then calls ctx.llm.stream once. It does not set reasoningEffort. This supports the existing clone-first reasoning adapter design; it does not authorize moving summary routing to agent.model, copying the summary prompt, mutating frozen LOOP input or adding provider retries. [P5, P9]

The LLM event contract retains `llm/stream(options, next: () => AsyncIterable)`: next takes no replacement request. LOOP requests are process-locally marked/frozen; auxiliary hand-built calls are caller-owned. Keep the version-limited instance stream wrapper and verify its reflection/discovery/receiver behavior against the exact rc Core, rather than assuming ordinary llm/stream listener mutation is an official request-transform hook. [P5; existing reasoning contract]

## 7. Evidence ledger and reproducibility

Each link below is an official npm tarball; its exact manifest is obtained by replacing the tarball path with `https://registry.npmjs.org/@deepseek-ai%2f<name>/<version>`. SHA-1 values below were independently verified against registry dist.shasum, not inferred from a local installed host. They identify compared compressed archives, not a general security attestation.

| ID / package | alpha.3 tarball SHA-1 | rc.1 tarball SHA-1 |
| --- | --- | --- |
| P1 [dsh alpha](https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh/-/dsh-0.2.2-rc.1.tgz) | c043d7b4d88e9c02c733cdd4ec5bb2092a007dc9 | 95d1cf510061a57c97b4a68d43336658bcec6af1 |
| P2 [tools alpha](https://registry.npmjs.org/@deepseek-ai/dsh-tools/-/dsh-tools-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-tools/-/dsh-tools-0.2.2-rc.1.tgz) | cd64ef4a75c0a37bf4706ff84a240b64147a81ec | 032096c285f4581d1d99add71d33abe2229729f8 |
| P3 [agent alpha](https://registry.npmjs.org/@deepseek-ai/dsh-agent/-/dsh-agent-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-agent/-/dsh-agent-0.2.2-rc.1.tgz) | 8b75e4a3223b737652ebea02a241411eb650bd3a | f1695583e3ec35565e2c580374164431867359ad |
| P4 [loop alpha](https://registry.npmjs.org/@deepseek-ai/dsh-agent-loop/-/dsh-agent-loop-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-agent-loop/-/dsh-agent-loop-0.2.2-rc.1.tgz) | b21a7708b442d1b460c896c9d372dca2ceb97fed | f1069aab74f87dcbdda4df8cd06077f152150d04 |
| P5 [LLM alpha](https://registry.npmjs.org/@deepseek-ai/dsh-llm/-/dsh-llm-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-llm/-/dsh-llm-0.2.2-rc.1.tgz) | bcb446b3368c3dd36f9133767e5130ce09debf04 | 291aaad9d98f2e0d29cbff4d8ad95c1d0bea27c7 |
| P6 [Goal alpha](https://registry.npmjs.org/@deepseek-ai/dsh-goal/-/dsh-goal-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-goal/-/dsh-goal-0.2.2-rc.1.tgz) | 947cdf16949a0d3e3fdcad8305fae562ad6ee8ae | 797562ee6c7242f2c90f327162a2d012b22cc659 |
| P7 [driver alpha](https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-goal-round-driver/-/dsh-goal-round-driver-0.2.2-rc.1.tgz) | 8ea9973b033be835a0e009fe146fa0dfcc9b27ef | 941cafe3876f93748b0c3f53f4e4352ae257b8b2 |
| P8 [projection alpha](https://registry.npmjs.org/@deepseek-ai/dsh-session-projection/-/dsh-session-projection-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-session-projection/-/dsh-session-projection-0.2.2-rc.1.tgz) | a1ef60426a5570cc82a9234b8c3e3a53cadc44ed | 2d71ab7d2bb5e02f33afa3acb7ec623695e1da64 |
| P9 [compaction alpha](https://registry.npmjs.org/@deepseek-ai/dsh-compaction-basic/-/dsh-compaction-basic-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-compaction-basic/-/dsh-compaction-basic-0.2.2-rc.1.tgz) | a290cdbf92685ce0a891f56ba4e8ba518467e3a0 | eb49e4cf59ab8ad90e2d157ef2a010e35be1e60b |
| P10 [HMR alpha](https://registry.npmjs.org/@deepseek-ai/dsh-hmr/-/dsh-hmr-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-hmr/-/dsh-hmr-0.2.2-rc.1.tgz) | 2f59e7f38eb5a5dee8a40f4c21352e50ab1380e7 | 15b4a749f55c2d25b57aca6bc32ce7bf302f80c0 |
| P11 [session alpha](https://registry.npmjs.org/@deepseek-ai/dsh-session/-/dsh-session-0.2.2-alpha.3.tgz) / [rc](https://registry.npmjs.org/@deepseek-ai/dsh-session/-/dsh-session-0.2.2-rc.1.tgz) | a28f1999900b3344355138d6840dd21011890492 | af35b15e909e35e90e98a1572dec3c176f6a1117 |
| P12 [Core 4.0.6-alpha.2](https://registry.npmjs.org/@deepseek-ai/cordis/-/cordis-4.0.6-alpha.2.tgz) / [4.1.0](https://registry.npmjs.org/@deepseek-ai/cordis/-/cordis-4.1.0.tgz) | ffabc37f46020716521d6406b990ea5af1974d33 | c4c62a252d8042cea30360c6a90368f3241e23c7 |
| P13 [Loader 1.0.7-alpha.2](https://registry.npmjs.org/@deepseek-ai/cordis-plugin-loader/-/cordis-plugin-loader-1.0.7-alpha.2.tgz) / [1.1.0](https://registry.npmjs.org/@deepseek-ai/cordis-plugin-loader/-/cordis-plugin-loader-1.1.0.tgz) | 58ad8e3dc86c5e8a4463af1e5d72269ee25eb26b | 15e25f16548fb0f23d80a4e324e7b753fae82d0a |

First-party release/source references:

- R1: [rc.1 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1), [alpha.3 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-alpha.3).
- R2: [rc tag identity](https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/tags/dsh-v0.2.2-rc.1), [alpha tag identity](https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/tags/dsh-v0.2.2-alpha.3).
- R3: [rc release API](https://api.github.com/repos/deepseek-ai/deepseek-harness/releases/tags/dsh-v0.2.2-rc.1), [alpha release API](https://api.github.com/repos/deepseek-ai/deepseek-harness/releases/tags/dsh-v0.2.2-alpha.3).
- R4: [versioned tools documentation](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/packages/core/tools/README.md), [model-selection migration guide](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/upgrade-guide/v0.2.1-alpha.4/session-model-selection/guide.md).
- R5: [versioned Fiber API](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/cordis-api/fiber.md).
- R6: [versioned entry-tree migration guide](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/upgrade-guide/v0.2.2-alpha.2/cordis-loader-entry-trees/guide.md). Its older dependency prose is not an rc npm lockfile.
- R7: projection handles guide in [alpha.3](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-alpha.3/docs/upgrade-guide/v0.2.1-rc.2/session-projection-handles/guide.md) and [rc.1](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.2-rc.1/docs/upgrade-guide/v0.2.1-rc.2/session-projection-handles/guide.md).

Reproduction after downloading/extracting each official archive beneath disposable scratch, with all HOME/cache paths explicitly disposable:

```sh
sha256sum "$R"/{0.2.2-alpha.3,0.2.2-rc.1}/dsh-goal-round-driver/package/lib/index.js
sha256sum "$R"/{0.2.2-alpha.3,0.2.2-rc.1}/dsh-compaction-basic/package/lib/index.js
for p in dsh-tools dsh-agent dsh-agent-loop dsh-llm dsh-goal \
  dsh-goal-round-driver dsh-session-projection dsh-compaction-basic dsh-hmr \
  cordis cordis-plugin-loader; do
  cmp "$R/0.2.2-alpha.3/$p/package/lib/index.js" "$R/0.2.2-rc.1/$p/package/lib/index.js"
done
diff -u "$R/0.2.2-alpha.3/cordis/package/lib/types/fiber.d.ts" \
  "$R/0.2.2-rc.1/cordis/package/lib/types/fiber.d.ts"
```

Executed results: each named cmp and Fiber diff succeeded with no differences; both hash pairs equal the fingerprints above. Core rc entrypoint SHA-256 `627409afa06a265f7253200d3bc4648e88805c39fd3768568eb9b9518a31fe8f`; Loader rc entrypoint SHA-256 `4f0a93a1ef5bb09bd6e1c64b30df11be25efd46c316b9505c5ddf308974367a6`. No native integration or browser coverage is claimed by this research. Full closure, emitted secondary modules, packed startup/CLI, migration safety, all reasoning entry paths and actual isolated web remain delivery gates for implementation lanes.
