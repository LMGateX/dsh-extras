# Extras 0.7.0 host time-zone validation

Status: **in progress; not a publication or active-installation receipt**. Evidence is appended only after execution. The [fixed contract](HOST_TIMEZONE_070.md) and [HTZ scope](TIMEZONE_POLICY.md) govern this work; earlier release validations remain historical.

## Baseline and isolation

- Starting remote main: `2090e8c66a8ba8e0545a39ac740e00d4241fc908`, Extras0.6.1 / official npm DSH0.2.2-rc.3. The old local0.4.0 checkout is not the release base. Original checkout and existing release tags are not rewritten. Dedicated implementation worktree/branch retains the documentation history above this released baseline.
- All development commands use a fresh disposable HOME, DSH_HOME/profile, XDG/cache and TMPDIR under an explicit temporary root. Native test hosts use independent profiles and non-production ports; no live-GUI test is used as a substitute. Chromium may reuse only an existing browser executable, never a production browser profile.
- Fresh `npm ci --ignore-scripts --no-audit --no-fund`: PASS,681 packages. `npm run host:check`: PASS;338 native packages, exact0.2.2-rc.3 / Cordis4.1.0 and compiled Goal SHA256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. Local public lock/physical graph, not ancestor/live fallback.

## Implementation and focused evidence

Implementation candidate committed at `1ded0c5e16a882d8b9904153e98f9b294e6b52fe`; independent review and final packed evidence remain pending. Subagents own disjoint host/artifact/integration/packed-browser code. Primary source investigations identify the exact two bundle hashes and the public serving interfaces; investigations alone are not runtime acceptance. The server clones/references the boot graph and serves patched automatic-source functions in its own namespace; it never changes installed native files, time-context hooks or tool environments. Full reload is a real enable/disable boundary.

Focused evidence: artifact transform4/4 (parent independently reran); exported host plugin14/14; migration/config/settings integration195/195; final lane typechecks exit0. The complete parent source command below includes these cases, not an arithmetic sum or projected count. Initial new packed-browser execution passed archive identities but failed fixture setup before privacy assertions; that is not claimed as a feature pass, and fixture debugging is in progress.

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

## Guarantee limits

The feature protects newly generated automatic zones after a full protected page load, not arbitrary user text, explicit task choices, external content or old session history. It does not force native clock reinjection or unify tool environments. Installed, server-serving-ready and actually loaded browser protection must be reported separately. Unknown/changed bytes and unavailable host context are not successful protection. Local installation does not authorize native source patches, unrelated settings changes, automatic host restart or overwriting concurrent personal edits.
