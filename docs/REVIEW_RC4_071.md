# RC4 compatibility review and independent audit — Extras 0.7.1

Date: 2026-11-18, Asia/Singapore. Fixed review point: `5b17808` (published 0.7.0 / rc.3). Reviewed candidate: `310bff3` plus later research/validation/test-wording commits. The two axes are reported separately; review judgment is not a duplicate execution pass.

## Independent source/artifact audit (RC4-S)

A separate read-only auditor independently re-ran the source and npm-artifact checks against the same complete clone. It did not rely on the parent's report for its commands.

- Source: rc.3 `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`, rc.4 `3f321d32bfe382212a8ed8785c1d47a5a300aa23`; eight commits; 395 changed paths, of which 15 are not `package.json`; all 380 manifest hunks are version/pin lines only. The broader consumed-tree diff with `:(exclude)**/package.json` is empty.
- Goal artifact: `lib/index.js` `8c56696e…`, `src/index.ts` `fd7a5e4c…`, `src/prompt.ts` `48410d77…`; rc.3/rc.4 extracted archives differ only in `package.json`; 22 tar members with zero non-manifest differences.
- Client artifacts: session-controller `e9af25a0…`, schedule `b8dda300…`, connection `5f610795…`; each archive differs only in `package.json`; 221/202/90 tar members with zero non-manifest differences.
- Extras: the rc.4 guards and refusal protections are present, the installed graph hashes match the audited values, no active rc.3 version guard remains outside the intentional historical comment/provenance entry, and the lock contains no rc.3 package. Judgment: **PASS** on all four audit claims, with no concrete missing consumed-code change.
- Audit caveats: the auditor did not execute the suites; some unchanged source packages' emitted `lib/` bytes were not independently compared because their rc.3 npm tarballs were not in the evidence set; native `always` retry policy can still retry a refusal by explicit user configuration, a pre-existing warned boundary. These are limits, not code gaps.

## Standards

| Finding | Disposition |
| --- | --- |
| RC4-SAFE equality unmet: no task-start profile hash baseline. | **Accepted limitation, not a pass.** The [amendment](<AMENDMENTS.md>) records the missing baseline and the underlying no-production-mutation evidence: disposable HOME/DSH_HOME/XDG/TMP for every command, only read-only profile inspection, and mtimes/ctimes preceding the task-start sample. Exact equality remains **unresolved**. |
| RC4-S "two independent audits" unproven in the repository. | **Fixed.** This report records the separate RC4-S audit above; the parent's [research report](<RESEARCH_DSH_RC4_2026-11-18.md>) is the other primary-source audit. Both use the same complete clone by design. |
| Compaction test title claimed a transient message that was not present. | **Fixed.** The test now uses a message containing a transient marker, and the validation wording distinguishes classifier coverage from an end-to-end native summary request. |
| Focused 200/200 run lacked a command/log/hash. | **Fixed.** The focused command is in the validation command block; its log is retained outside Git with SHA256 `e67a8f9483b3a307f3da90da739836af63e1296cfba03fa82d2c1814964bb87b`. |
| Duplicated deterministic-code inventory between retry matcher and compaction classifier. | **Accepted judgement call.** They are separate classification axes with separate ownership; sharing a permanent-code set would couple the retry plugin to compaction. Only one rc.4 literal is duplicated; the existing overlap predates this change. |
| Similar previous/unknown fixture shapes with different kind names. | **Accepted judgement call.** The suites have separate local vocabulary and fixtures; a shared test helper would add cross-suite coupling without reducing product risk. |
| Packed host-timezone test derives the expected release version from `package.json`. | **Accepted.** The packed package test still pins `0.7.1`; deriving the archive version in the host-timezone test prevents a duplicate version pin from drifting while still asserting archive/package identity. |

No hard source or standards violation other than the explicitly unresolved equality gate remains. Three evidence/documentation findings were fixed, three judgement calls were accepted, and one safety limitation remains recorded rather than waived.

## Spec

| Finding | Disposition |
| --- | --- |
| RC4-SAFE is unmet (no before/after profile comparison). | **Accepted limitation.** The contract's clarification and the amendment require the unresolved equality to be reported, not claimed as passed. The underlying safety requirement is evidenced by the isolated command environment and pre-task ctimes, but is not an equality proof. |
| Validation committed private profile paths and hashes, contrary to [PROVENANCE.md](<PROVENANCE.md>). | **Fixed.** The profile path/hash block was removed. Current observations are retained only in the disposable evidence root; the committed report records only that two files were sampled and that equality is unresolved. |
| "Refused native compaction request" overstated the synthetic classifier test. | **Fixed.** The validation now says the tool harness exercises the deterministic classifier and does not dispatch a native summary request. Native-stream refusal is covered by the real LLM-stream/official-retry regression. |
| Focused run and pre-refresh failure lacked retained evidence. | **Fixed/clarified.** The focused command and log hash are recorded. The pre-refresh failure is explicitly labelled a terminal observation with no retained pre-change log, not an artifact claim. |

No missing contract implementation or unrequested product behavior was found. The remaining open item is exact profile-baseline equality, which is impossible to establish retroactively and is recorded as unresolved.

## Bound and verdict

The reviewed product archives are those built from `310bff3`; later commits are test/documentation-only and do not alter shipped source or archives. This review does not certify publication, production installation, arbitrary native versions, or the experimental LiveShare fix. Standards: **0 hard code findings; 3 evidence/documentation findings fixed; 3 judgement calls accepted; 1 accepted safety limitation**. Spec: **0 missing product requirements; 3 evidence/wording findings fixed; 1 accepted safety limitation**.
