# Release acceptance matrix

Preserve every baseline row for 0.2.0 and additionally satisfy REASON-1 through REASON-7 from the [fixed request reasoning contract](COMPACTION_REASONING.md). Exceptional fail-closed scenarios must remain explicit, not partial success. Record exact commands/results and limitations in the release validation report before publication.

| ID | Criterion |
| --- | --- |
| DOC-1 | Specification committed before implementation; source provenance and notices recorded. |
| MOD-1 | Compact-context tools/policy/retention/PTC regression tests preserved; canonical tools unchanged. |
| MOD-2 | Stream and empty-response classification preserved, cancellation/unload safe, no extra retry loop. |
| MOD-3 | Browser chime completion/blocked/question/error, rest/DND, debounce, no child/ordinary fork misclassification and unload/audio cleanup verified. |
| MOD-4 | Gate jobs/live descendants, owned hold/release, external disarm/goal phase/unload invariants verified. |
| LIFE-1 | Module toggles register/dispose effects; unavailable dependencies isolate affected module; explicit status. |
| MIG-1 | Fresh install, partial legacy install, all four, disabled old modules, overrides/defaults, false/0/empty arrays, custom ids. |
| MIG-2 | Exact target precedence; idempotency after restart; absent capabilities off in migration mode; no secret/transient import. |
| MIG-3 | Backups+journal+profile lock; injected failure before/after each mutating stage; interrupted recovery and concurrent edit protection. |
| MIG-4 | Native persistent legacy bundle/manual-row disable, actual host and browser handover, restart-required accurately reported. |
| MIG-5 | Read-only/malformed/dynamic/multi-instance/unknown version/experimental startup cases fail closed without breaking old owner. |
| MIG-6 | Inspect/dry-run/retry/selective rollback exposed and tested, no unrelated later edits overwritten. |
| DIST-1 | Five real installable tarballs, selected feature-only payloads, one source, same version, correct exports/bundle/client metadata. |
| DIST-2 | Split peers coexist; combined/split duplicate modules never activate twice; safe diagnostic/handover on conflict. |
| UI-1 | Combined single card/sectioned settings, every setting editable with correct units, module status and migration report accessible. |
| HOST-1 | Baseline native host composition and lifecycle run in disposable HOME/profile/process; packed artifacts consumed rather than live sources alone. |
| CLIENT-1 | Actual emitted client loads in isolated browser/harness; settings persistence/toggles and no duplicate chime handover are exercised. |
| SAFE-1 | Original source repos remain unchanged; active profile hashes unchanged; no local production installation or live GUI mutation. |
| REASON-1 | Breaking canonical module rename has no alias/import translation; host/client/ownership/CLI/build/packed exports agree. |
| REASON-2 | Default-off/explicit empty arrays, shared strict target validation, exact outgoing-route priority, fixed/inherit and latest full durable header semantics; no legacy-default feature enablement. |
| REASON-3 | Actual native pressure, original manual compact, agent tool/public range, overflow and model-switch summaries reach the policy; non-tool paths work with compactTool=false. Real events and surface replacement corroborate request controls and call counts. |
| REASON-4 | Ordinary/LOOP calls untouched; detached summary envelope preserves nested/cancellation identities and call-site receiver; unsupported efforts rejected natively with zero provider dispatch/no broader fallback or extra retry. |
| REASON-5 | Existing/new/isolated/replaced native runtimes and exact sessions; toggles, in-flight capture, HMR/unload/descriptor ownership; unsupported version/shape reports unavailable and preserves native compaction, never tool-only active. |
| REASON-6 | Independent structured policy editor, native effort choices/opaque ids, validation, add/remove/empty/save/discard/reset, revision conflicts and independently reported live capability status. |
| REASON-7 | Combined and compact-context split packed exports execute the request policy against native offline adapters; emitted and actual packed web settings persist; all five clean-consumer artifacts are revalidated. |
| PUB-1 | Public GitHub repository, clean committed main, complete local isolated acceptance (no GitHub Actions, per direct user override in AMENDMENTS), matching annotated tag, release assets and SHA256SUMS verified remotely. |
