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

## Approved preview re-review

The user subsequently explicitly chose the source-built preview rather than wait for npm rc.2. Pre-code amendment `407e981` fixes the narrower, honest artifact boundary and consistent toolchain-only lock/source-host provisioning; implementation `63dadfe` adds the development-only public linker/preflight. Two new fresh-context Standards/Spec agents reviewed the full baseline through `63dadfe` independently. Both accepted the explicit user authorization and consistent lock without treating source output as npm bytes. Standards retained only the nonblocking inert-artifact-metadata duplication heuristic.

Both identified/confirmed one **P2 development evidence fence**: receipt preflight could approve graph A while explicit DSH_RUNTIME_ROOT or DSH_TEST_INSTALL_ANCHOR selected graph B in downstream tests. The frozen one-graph contract and README already require selectors to match; no contract narrowing is needed. A public CLI regression reproduced the old acceptance (exit1 assertion: DSH_RUNTIME_ROOT must refuse before mutation, actual link status0). The fix compares resolved manifest realpaths for each set selector before link plans or checked admission, rejects bad/foreign selectors and retains documented equivalent resolution bases. All5 public host-development tests then passed, including before-mutation refusal, read-only refusal, same-graph aliases and unchanged receipt timestamp. This change is development-only; no product hook, retry, migration or Goal authority widened. Both axes independently rechecked `63dadfe..6ea37f4` and the exact red/green logs and explicitly closed P2: Standards has0 open hard findings/1 optional low heuristic; Spec has0 open confirmed implementation defects. This closes the code finding, not an unexecuted packed or network gate.

The missing worktree-name restriction was explicitly judged **not a demonstrated defect**: bounded generic clean-consumer cwd support is intentional, and speculative repository-only checks would break the agreed public fixture seam. Dirty/unbuilt-source checks are implemented; shared source fault injection remains intentionally unperformed and honestly documented, not represented as executed coverage.

## Final native-browser closeout review

Both independent axes read through `e032fed9551a83563ebd6825d82dab7357712cfd`, including the complete added standalone native-browser fixture/cases and focused5/5 execution log. They found0 new confirmed Standards/spec/code-test defects. They explicitly recognized actual per-split native CLI installation, whole Web GUI boot/served client identity, selected-only UI, accepted settings/reload and canonical global/workspace opaque-ID roundtrip as closing the missing strict per-split RC2-W lane. Existing combined assertions remain intact; capability status is not substituted for fresh provider execution. Parent then independently completed full730-source and54-packed suites with0 failures/skips/cancellations. Final review remains Standards0 hard blockers/1 optional low heuristic; Spec0 open confirmed implementation defects. Future remote release gates were not pre-certified by either reviewer.

## Integration follow-up

Parent full source run initially passed722/724 and found two stale rc.1 assertions in the native migration proof fixture, not product failures. Commit `6aa7614` updates the counterfeit module fixture to the supported rc.2 version so it actually reaches the unchanged pre-import fingerprint rejection, updates the observed baseline assertion and explicitly adds historical rc.1 rejection beside unknown-version rejection. The focused native migration file then exited0. Full merged source and six packed-native/browser gates are rerun separately and recorded in validation, not inferred from review.
