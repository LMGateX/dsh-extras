# Extras 0.7.0 host time-zone validation

Status: **in progress; not a publication or active-installation receipt**. Evidence is appended only after execution. The [fixed contract](HOST_TIMEZONE_070.md) and [HTZ scope](TIMEZONE_POLICY.md) govern this work; earlier release validations remain historical.

## Baseline and isolation

- Starting remote main: `2090e8c66a8ba8e0545a39ac740e00d4241fc908`, Extras0.6.1 / official npm DSH0.2.2-rc.3. The old local0.4.0 checkout is not the release base. Original checkout and existing release tags are not rewritten. Dedicated implementation worktree/branch retains the documentation history above this released baseline.
- All development commands use a fresh disposable HOME, DSH_HOME/profile, XDG/cache and TMPDIR under an explicit temporary root. Native test hosts use independent profiles and non-production ports; no live-GUI test is used as a substitute. Chromium may reuse only an existing browser executable, never a production browser profile.
- Fresh `npm ci --ignore-scripts --no-audit --no-fund`: PASS,681 packages. `npm run host:check`: PASS;338 native packages, exact0.2.2-rc.3 / Cordis4.1.0 and compiled Goal SHA256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. Local public lock/physical graph, not ancestor/live fallback.

## Implementation and focused evidence

Implementation candidate committed at `1ded0c5e16a882d8b9904153e98f9b294e6b52fe`; independent review and final packed evidence remain pending. Subagents own disjoint host/artifact/integration/packed-browser code. Primary source investigations identify the exact two bundle hashes and the public serving interfaces; investigations alone are not runtime acceptance. The server clones/references the boot graph and serves patched automatic-source functions in its own namespace; it never changes installed native files, time-context hooks or tool environments. Full reload is a real enable/disable boundary.

Focused evidence: artifact transform4/4 (parent independently reran); exported host plugin14/14; migration/config/settings integration195/195; final lane typechecks exit0. The complete parent source command below includes these cases, not an arithmetic sum or projected count. Initial new packed-browser fixture failures were corrected without runtime changes. The basic matrix then passed4/4 (64.33s): seven archives, combined/NewYork, standalone/Shanghai and unknown-artifact refusal, including actual accepted child RPC/source and explicit task-rule preservation. Subsequent real restart and cached-native-factory tests exposed two P1 blockers; those basic passes do not certify the correction.

## Final command gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Exact npm graph | PASS | Fresh npm ci and host preflight above |
| Typecheck | PASS | `npm run typecheck`, exact native preflight plus tsc |
| Full source suite | PASS | `npm test`:778/778,0 fail/skip,243812.783438ms; explicit isolated environment |
| Build seven distributions | Initial candidate PASS | Seven actual distributions built; final repack after review remains required |
| Pack/checksums | Initial candidate PASS | Seven real0.7.0 tarballs plus SHA256SUMS; not yet a final/publication receipt |
| Full packed clean-consumer/native/browser suite | Pending | — |
| Actual new automatic request fields / explicit task rule preservation | Pending | — |
| Independent Standards / Spec reviews | Pending | — |
| Final diff / declarations / local docs | Pending | — |
| Atomic remote main / annotated tag / formal release | Pending | — |
| Fresh remote asset download / byte equality | Pending | — |
| Restricted backup / native local installation / serving verification | Pending | Only after every preceding release gate |

## Review and negative evidence (publication blocked until corrected)

### Standards

One high-severity documented-standard violation at candidate1ded0c5: loaded literal sampling outlives the current native connection generation. Same-origin/same-profile native host restart from Singapore to Los Angeles reproduced an unexpected serialized prompt from the old page (expected0). No Fowler judgement-call findings were reported.

### Spec

One confirmed P2 implementation error at candidate1ded0c5: changing host process TZ after mount made repeated full reloads fail forever, because index rendering never rebuilt the source generation. No missing-requirement or scope-creep findings. The reviewer additionally identified cached raw target re-materialization; subsequent real Chromium testing confirmed a second P1: cached native single-entry URL returned200 without reaching the server503 guard, same-revision native retry re-materialized raw Session, and actual clientTimeZone became America/New_York instead of Singapore.

The [fixed correction](HOST_TIMEZONE_070.md#review-driven-source-validity-correction-fixed-before-implementation) precedes all repair code. Both axes require independent follow-up against the repaired commit; no red gate is waived.

Initial existing packed suite:59/60 PASS, one obsolete combined-GUI five-module assertion failed (actual six); this is a test expectation correction, not a successful final suite. All seven split/combined installable consumers and public declarations ran, but final full packed rerun remains mandatory.

## Repaired candidate observations (not final certification)

The parent reran exact preflight/typecheck and all source tests after the first correction:807/807 PASS,0 fail/skip,245305.495982ms. This predates the later combo-anchor and callable-owner corrections and does not certify those changes. Host focused gates subsequently reached26, pure transforms6 and client13; integration29 were executed, not projected as a combined suite count.

Candidate2 actual native-browser matrix:2/7 PASS,5/7 FAIL at first protected reload, before the restart/cache/live-TZ assertions. A real third native renderer/cordis factory reproduced the cause: the generic schedule export marker anchor appeared in multiple combo modules. Narrowing to the audited schedule-specific suffix preserved raw SHA checks and exact-one matching; real three-factory artifact/owned-resource tests changed RED503 to GREEN200 while leaving the third factory unchanged. Native cold-fetch source did not support the earlier speculative rebuild-event hypothesis; no prewarming or weakened generation fences were added.

### Standards follow-up at e9b7f46 plus eadd04f

Hard1/P1, Judgement0: unsupported/foreign RPC method checks marked unavailable before installing any refusal wrapper, allowing the prior implementation to dispatch. Independent in-memory evidence counted1 sensitive dispatch. This remains a publication blocker until refusal and zero-dispatch tests pass.

### Spec follow-up at e9b7f46 plus eadd04f

Missing0, scope-creep0, implementation-error1/P2: method name/arity/async descriptor shape alone did not certify the original native callable source. An equivalent-signature foreign implementation could be labeled ready. Actual emitted-native callable provenance and refusal of unknown owners require correction and independent re-review. Neither axis is hidden by previous positive source tests.

Candidate3 archives were built for stock-path native debug after the unique-anchor correction; they are not a formal release or final acceptance receipt. No production installation has occurred.

## Guarantee limits

The feature protects newly generated automatic zones after a full protected page load, not arbitrary user text, explicit task choices, external content or old session history. It does not force native clock reinjection or unify tool environments. Installed, server-serving-ready and actually loaded browser protection must be reported separately. Unknown/changed bytes and unavailable host context are not successful protection. Local installation does not authorize native source patches, unrelated settings changes, automatic host restart or overwriting concurrent personal edits.
