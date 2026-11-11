# Extras 0.6.0 independent review

Review base `58a3acd42ff9712454cdcf1151ae4492d447d180`; reviewed head `2903886`, plus the explicitly uncommitted candidate root manifest. Two fresh-context read-only subagents ran concurrently, independently of implementation lanes. Neither performed installations, live-GUI work, builds or duplicate large tests. Upstream checks used only the complete permitted local official tag checkout. This review is not a final validation receipt.

## Standards

**Hard documented-rule breaches: none found.** Documentation precedes implementation; changed ownership checks remain exact-version/exact-byte and fail closed. Existing teardown coordination, native retry execution and selected-feature packaging remain intact under [AGENTS](../AGENTS.md) and [architecture](ARCHITECTURE.md). The local upstream revision and Goal source/compiled hashes independently match the declared source-built provenance; this does not establish npm-published bytes.

**P3, nonblocking possible duplication smell:** the audited fingerprint remains repeated across [driver host validation](../src/modules/goal-wait/driver/host-version.ts), [native owner validation](../src/modules/goal-wait/host-owner.ts), [migration owner proof](../src/migration/native-owner.ts) and provenance. Consider dependency-free shared artifact metadata in future. Do not import the Goal implementation into every split via common migration code; selected-only packaging remains mandatory. This is retained maintenance debt, not a newly proven authority defect. No speculative refactor is added to this compatibility patch.

**Release recommendation: HOLD pending existing gates.** Source-built evidence is valid within its explicit boundary, not certification of unobserved published artifacts. Do not fabricate integrity or publish a mismatched lock. Final six-archive/native/browser/migration and remote-checksum evidence remains necessary; no production install is authorized.

## Spec

**No additional confirmed implementation/spec defect or unasked scope expansion found.** Four strategies/defaults remain; replacement delegates exact native root-tree joins without an extra idle-resident barrier and retains Jobs policy. Native Continue generating remains separate from optional exact checkpoint recovery. Durable origin/parentSession provenance remains separate from mutable cwd/live membership; native retry execution and selection authority remain. Six distributions derive from one selection source.

**P1, known open release gate — dependency/artifact provenance:** the candidate manifest declares0.6.0/exact rc.2, while [validation](VALIDATION_060.md) explicitly leaves registry/lock and published-byte certification open. [The fixed contract](DSH_RC2_060.md) forbids inferring published fingerprints from a source build. Resolve reproducible dependency/lock provenance without fabricated integrity or a silently mismatched rc.1 lock, retain unknown-driver fail-closed behavior and state the actual supported artifact boundary before publication.

**P1, known in-progress acceptance — final execution/publication:** scoped lane reports are not completion receipts for packed native/browser or six remote archives. Record actual final exact-artifact gates, clean committed source, push/tag and remote checksum verification before compatibility publication. Do not interpret the in-progress validation document as acceptance.

**Release recommendation:** implementation review may proceed; not release-ready at review time.

## Separate-axis summary

Standards: **0 hard breaches, 1 nonblocking possible smell** (duplicated exact artifact metadata). Spec: **0 new confirmed defects, 2 acknowledged release-gate incompletions** (provenance/lock and final acceptance/publication). Neither axis waives the other or any safety criterion.

## Integration follow-up

Parent full source run initially passed722/724 and found two stale rc.1 assertions in the native migration proof fixture, not product failures. Commit `6aa7614` updates the counterfeit module fixture to the supported rc.2 version so it actually reaches the unchanged pre-import fingerprint rejection, updates the observed baseline assertion and explicitly adds historical rc.1 rejection beside unknown-version rejection. The focused native migration file then exited0. Full merged source and six packed-native/browser gates are rerun separately and recorded in validation, not inferred from review.
