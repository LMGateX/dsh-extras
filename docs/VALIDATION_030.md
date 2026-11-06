# 0.3.0 parity restoration — validation checkpoint

**Integration is still in progress. This document is not release approval.** No 0.3.0 push, tag or release has been made, and nothing has been installed into the active local DSH profile.

## Frozen scope and execution boundaries

The [fixed parity contract](<LEGACY_PARITY_030.md>) was committed before implementation, supplementing the existing [acceptance matrix](<ACCEPTANCE.md>). Development and testing use dedicated worktrees, independent subagents and disposable HOME/DSH_HOME/XDG/profile/cache paths. The global DSH installation and predecessor repositories are read-only. The live GUI is not a test target. There is no GitHub Actions execution or npm publication.

Audited baseline: Node 24.17.0, TypeScript 5.9.3, DSH 0.2.2-alpha.3, Cordis 4.0.6-alpha.2, native Loader 1.0.7-alpha.2 and Chromium 1248. Driver identity is the exact published artifact SHA-256 recorded in [provenance](<../src/modules/goal-wait/driver/provenance.json>). No compatibility with future native artifacts is inferred.

## Executed intermediate evidence — not final sign-off

| Execution | Observed result and limitation |
| --- | --- |
| Initial merged source suite before final Goal/migration integration | 504 passed, zero failed/skipped. This is historical integration evidence, not the final 0.3.0 source gate. |
| Integrated migration plus status against actual legacy 0.4.23 source | 152 passed, zero failed/skipped. Subsequent independent review found that an unmanaged official callback could impersonate restored stock; those earlier green tests were insufficient. |
| Corrected migration lane with actual legacy source and integrated Goal module | 151 passed, zero failed/skipped, after reproducing and fixing unmanaged callback, fake inventory, cross-root entry and overly strict retired-pointer defects. Live stock proof now requires the current canonical Loader entry/root/namespace/raw-fiber/registry tuple. A retired pointer proves inactivity only and grants no new restoration authority. Details and exact commands are in [migration evidence](<../test/migration/PARITY_EVIDENCE.md>). |
| Goal module/native strategy lane | 65 passed before the final native-owner follow-ups. Actual jobs, progressing/parked children, external provider cleanup, pending dependencies, exact-ref restoration and concurrent disarm were exercised. This does not prove public ConfigEditor recomposition or browser saves. See [Goal evidence](<../test/modules/goal-wait/EVIDENCE.md>). |
| Packed combined and Goal split: quiet Job continuation | 2 passed. Both actual archive roots waited armed with no revision change, dispatched one offline model round on quiet Job settlement, and restored stock on module disable. These were interim 0.2.1-labelled development archives, not release assets. |
| Expanded packed native strategy/authority gate | Initially 2 passed / 2 failed: actual ConfigEditor counted the intentionally stopped stock Entry as a new activation failure. The instance-only descriptor-owned effective-disabled view plus native-intent guard fixed the actual failure. Parent rebuilt/repacked and executed all four unchanged combined/split cases: 4 passed, zero failed/skipped. This remains interim-version evidence. |
| Native web/Chromium strategy Save | Expanded actual installed native browser test first failed because a strategy Save persisted but was not acknowledged. After the runtime-view fix, 1 passed: replacement → off → native → activation, staged drafts, native Save acknowledgment, exact requested/mounted HTTP diagnostics, displayed mount, unchanged native-row overrides, plus timeout/retry/unset/watermarks/tools/reasoning/Chime/reload assertions. No live GUI was targeted. |
| Comprehensive integrated source checkpoint | 510 passed / 4 failed, zero skipped. Two disposable build fixtures omitted the newly required public-types document; one settings expectation omitted the new default strategy; one old gate fixture used an unsupported unmanaged stock mount. These test fixtures were corrected without weakening authority assertions. Focused re-execution of all four affected files: 42 passed / zero failed/skipped, including actual emitted/packed browser builds. A final full-suite rerun is still required. |
| Public declarations and actual clean installed consumers | The defaulted nested-input repair passed all 11 package/declaration tests. Parent then ran all five npm-installed clean JS/strict NodeNext consumers and declaration/archive checks, including all four Goal strategy inputs, resolved volatile strategy output and runtime/TS rejection of unsupported startup strategy: 11 passed, zero failed/skipped. Final-version rerun remains required. |
| Fresh packed authority regressions | New actual combined/split tests independently reproduce both fresh review findings: 4 existing cases passed / 4 new cases failed. Reliably observed external revocation still advanced revision 1→2, and same-function descriptor attribute replacement was deleted. These safety failures block publication pending Goal-lane repair and an unchanged packed rerun. |

PTC execution/lifecycle and retry empty-stop unload evidence is recorded separately in [PTC execution evidence](<../test/modules/compact-context/PTC_EVIDENCE.md>); settings persistence is never substituted for runtime execution proof.

## Independent reviews

Standards and Spec are independent axes, not one combined approval. Earlier reviews drove repairs for foreign-owner restoration/late-observation races, defaulted public input types and unmanaged callback restoration grants. Both fresh full-integration reviewers independently reproduced two further defects: legacy activation-gate cleanup bypassed the temporary observer after a reliably observed external revocation, and that observer compared only function identity instead of the complete descriptor. These are not the approved unobservable-overlap limitation. Both are in repair.

The separate native-health/intent delta dc7efa7 → 1442bfe received no confirmed new finding on either axis. Standards independently executed 7 selected native lease cases; Spec independently executed 21 public-seam cases (14 existing strategy cases plus seven additional public-module owner/intent/foreign/import-failure checks). Neither ran parent packed/browser acceptance. Final Goal repair delta review is still mandatory.

## Remaining mandatory release gates

- Finish the complete observer descriptor CAS and sole-authority gate cleanup repairs; ensure a non-installable observer cannot prevent native owner cleanup, while preserving external disarm/descriptor intent.
- Pass actual packed combined/split strategy, authorized preservation, concurrent external revocation, off/native, module-disable and whole-row-disable tests.
- Re-run the passed actual installed native Chromium strategy group Save acknowledgment, persistence and requested-versus-mounted diagnostics on final 0.3.0 bytes.
- Re-run full isolated source/typecheck, serialized native/artifact tests, all five clean JS/strict NodeNext consumers and exact asset/provenance selection on synchronized 0.3.0 outputs.
- Resolve independent Standards/Spec findings and review the final delta.
- Freeze release evidence and checksums; fast-forward clean main; push matching main and annotated tag; directly publish five archives plus SHA256SUMS; publicly download and compare the exact bytes/checksums.

## Explicit limitations retained

Legacy activation cannot reliably identify a repeated external same-value disarm during an already-owned hold; replacement waiting avoids that hold pattern. The temporary transition observer is exact-artifact/frame-limited and refuses unknown/source-mapped shapes. Direct external descriptor writes have no native change event: runtime-slot ownership loss is checked at observed public checkpoints/transition boundaries, not magically at assignment. Arbitrary unnamed, unmarked custom schedulers are outside the cooperating native ownership model; offline CLI Goal operations therefore remain fail-closed. All model requests in acceptance use deterministic offline adapters. No assertion about active-profile byte contents is made, because that profile is neither an installation nor an acceptance target.
