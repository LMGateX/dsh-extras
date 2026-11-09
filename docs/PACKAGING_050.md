# 0.5.0 packaging and root-integration validation

Scope: five canonical capabilities, combined plus five independently selected split archives. This note records integration-lane evidence, not whole-release approval. No real DSH home, live GUI, provider account or production port was used. Builds, consumers, profile installs and hosts use explicit disposable HOME/DSH_HOME/profile/cache locations; native web uses port 0 and rejects 3080.

## Contracts verified

- Root source and generated server select the same five module implementations. Every archive is version 0.5.0; no split embeds an unselected feature backend. Common migration admission may include the existing pure compaction reasoning policy, and both compaction-capable splits include the shared reasoning implementation without the compact tool backend or model-selection backend from the other feature.
- Only the four historical capabilities have predecessor package/default/version mappings. MODULE_IDS has five entries; LEGACY_MODULE_IDS has the original four. New model-policy defaults off in schema, fresh/legacy migration planning, schema-less runtime and status fallback, and peer discovery. Explicit opt-in and false/zero/empty/null values are retained.
- A completed four-module migration journal admits a safely validated additive model-policy gate without replacing operation id, backup, old decisions, step images, original target/input identity, source provenance or recovery ownership. Failed additive peer admission can be retried after the conflict clears. Interrupted pre-upgrade journals are not silently reinterpreted or granted new recovery authority.
- Selected modules expose optional mountSettings independently of feature enablement. Generic runtime does not import feature settings implementations, preserving split source isolation.
- Generated client arguments were coordinated before changing the entry: descriptor, React, optional chime, reasoning, model-policy and retry factories. Shared reasoning receives its distribution row identity. Model/retry editors are selected only for their owning distributions. Their native remotes metadata is declared.
- Host peers preserve the baseline metadata and automatically include actual new external imports from the server build metafile (not all feature peers everywhere). Retry also declares the DSH version-metadata peer it dynamically reads; goal-selected metadata/provenance remains selected-only.
- Public root JavaScript exports remain exactly name/inject/Config/apply. Strict NodeNext consumers test positive and negative selected configuration values, volatile outputs, exact selections, partial compaction-policy inputs, private-path rejection and migration imports.

## Native nullable defaults

Audited Schemastery returns undefined for omitted fields whose declared default is null, including a nullable selection union; explicit null remains null. Feature resolveConfig normalizes omission to semantic inherit/null. The emitted model-policy root/descendants getter value types therefore include undefined, rather than claiming the physical native output always contains null. Tests verify both omitted semantic inheritance and explicit-null preservation.

## Evidence so far

Commands below were run with a shell-created temporary root, HOME=$T/home, DSH_HOME=$T/dsh and npm_config_cache=$T/cache. No npm install/ci was performed by this lane in the shared source tree. Parent provisioned the dedicated worktree dependencies.

- Focused config/default/planner/peer admission cycles: captured red behavior before minimal fixes, then green.
- node --test --test-concurrency=1 test/migration/*.test.ts and scoped root config/identity/lifecycle/status/default integration tests: pass. This includes native Loader/HMR, faults, concurrency and selective recovery regressions.
- npm run typecheck: pass after journal callback narrowing.
- npm run build && npm run pack: six synchronized 0.5.0 distributions built and packed successfully (development snapshot, not final frozen release).
- Actual npm clean-consumer installs for all six archives, strict NodeNext public-type consumers, selected-only declaration/source maps, safe packed defaults and host-import metadata: pass.
- Combined packed CLI/types/consumer command initially had 29/30 passing; the sole failure was an old native CLI assertion of four decisions instead of five. That gate now asserts five plus new model-policy off; final rerun is pending frozen artifacts.
- An actual isolated native browser run exposed a pre-existing adoption bug for documented enabled-only compactionReasoning inputs: native output supplies default rules, while admission compared the partial input literally. A public native Loader regression was red (migration-pending forever), then green after resolving only that policy on both sides. Other object maps/arrays keep exact comparison; explicit empty rules remain distinct.
- Packed native offline compaction acceptance: combined, compact-context split and model-policy split all pass. Real JSON storageDomain and owner-authenticated canonical GET/PUT are used; tool-disabled native summaries preserve effort, exact single dispatch, cancellation identity and native surface replacement.
- Native CLI composition/install for all six archives and all five distinct splits together: pass.
- Actual isolated native browser settings test: pass after the policy-adoption fix and correctly awaiting the independent shared HTTP source on reload. The installed packed client is hash-compared with the served client; all five modules are present with new model-policy disabled. Original field/Goal strategy writes, tools disabled while reasoning active, canonical rule saves, page reload persistence, retry disable and chime rest/disable all pass. The observed web port was temporary (33595), never 3080.
- Selected settings admission callback is tested through native lifecycle: actual activation grants true, disabling revokes it, and a captured getter remains false after root disposal. The callback does not itself activate features.

Final frozen-artifact rebuild, complete artifact/native/browser rerun and independent review remain the coordinating parent's release gate. This lane makes no publication, paid-provider execution or live-install claim.
