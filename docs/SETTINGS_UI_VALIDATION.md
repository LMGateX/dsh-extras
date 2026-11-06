# Settings presentation repair validation

## Request and fixed baseline

The user reported that only Chime had styled, Chinese settings; the other modules were unstyled and English-only. The comparison base is `fcdadb504be69e3623fa490f94b03d1fab984751` (released 0.2.0). This is a presentation repair under UI-1 / CLIENT-1 / DIST-1 / REASON-6, not a configuration or feature-policy change. No contract is narrowed.

## Diagnosis and scope

- The common settings renderer used bare HTML controls and only grid spacing, with English literals and no native locale subscription. The preserved Chime editor already had bilingual copy and native theme styles.
- The compact-context, retry and goal-wait split client manifests also omitted the native locale package dependency. All five now declare it.
- Shared settings styling uses actual native DSW theme variables, local to the mounted Extras editor. It covers cards, groups, controls, actions, focus/disabled states and narrow layouts, without styling the host shell or overriding the preserved Chime controls.
- Labels, units, hints, actions, known phases, owned runtime notices, conflicts and validation/save errors have Chinese and English presentation. The native optional locale service chooses the language; absent service uses Chinese, matching Chime. Language changes do not remount field or policy editors or write configuration.
- Provider/model/effort IDs, native model names, configuration keys, user drafts, raw migration reports and unknown diagnostics remain unchanged. Reasoning-specific translations stay in the selected reasoning source, not unrelated split payloads.
- Chime feature logic is unchanged. Its only production source change corrects an existing invalid error-color token to the actual native state-error token.

## Regression evidence

- Initial `node --test test/client/settings-presentation.test.ts`: both symptom-specific checks failed (missing Chinese title; missing scoped theme styling), then passed after the common fix.
- Independent packed-client baseline exercised all five actual tarballs in isolated Chromium. It reproduced unlocalized headers, missing non-Chime card borders/radii/padding and missing locale subscriptions. This was not a screenshot assumption or source-only string search.
- The first integrated packed test exposed an invalid test input: Chime's preserved number input has a 1000 ms step, so 2500 ms produced actual `validity.stepMismatch=true` and prevented native form submission. The test now uses valid 3000 ms and explicitly checks native validity before submitting. No production validation was changed or bypassed.
- Spec review found two additional real presentation gaps: untranslated owned runtime reasons and a nonexistent alert-color token. Added packed regressions for Chinese runtime notices and Chinese/English conflict alerts using actual native error colors in light/dark themes; corrected both production gaps.

## Verification boundary and maintenance notes

Tests run only in dedicated Git worktrees and disposable native HOME/DSH_HOME/profiles, with temporary ports distinct from the live GUI. No installation or test targeted the real DSH home/profile. No GitHub Actions, npm publication, GitHub push or release replacement is part of this repair.

Standards review found no hard documented violation. Two nonblocking maintenance observations remain: optional locale service arrival/replacement after Extras activation requires an Extras reload (the existing Chime behavior); selected validator translations intentionally map the current owned diagnostic prose, so wording changes must update the translation tests. Ordinary language preference changes on an existing service are exercised without reload and retain drafts.

## Executed final gates

Production patch reviewed and tested at `cf98c387ee62f9751f1e0e8cbc1eef82c9d97a35`. Later changes to this record are documentation-only.

| Command / check | Result |
| --- | --- |
| `npm run typecheck` | Passed, strict TypeScript. |
| `npm test` | 470/470 passed; no skipped or cancelled tests. |
| `node --test test/client/settings-presentation-browser.test.ts`, also included in the full source gate | All five actual packed clients; 25 subcases plus aggregate passed in the final full gate. Includes absent-locale Chinese, native English/live switching, DOM/draft retention, exact writes, locale dependency metadata, owned runtime reasons, light/dark native error colors, narrow and desktop layout, subscription cleanup. |
| `npm run build && npm run pack` with disposable HOME/DSH_HOME/npm cache | Five candidate tarballs built and packed from the same frozen source. Not published or installed into production. |
| `git diff --check` | Passed. |

## Independent review

- **Standards:** zero hard documented violations; the two nonblocking maintenance observations above are retained rather than represented as fixed. Its isolated native-Cordis late-provider probe is distinct from browser execution.
- **Spec:** two initial P2 findings (owned status localization and native error color token); both independently rechecked and closed against the final production patch. Zero current actionable Spec findings. Reviews were read-only and do not substitute for executed tests.

## Final artifact / native gate

`node --test --test-concurrency=1 test/artifacts/native-profile.test.ts test/artifacts/native-reasoning.test.ts test/artifacts/packages.test.mjs`: **10/10 passed**, zero failed, skipped or cancelled (107.6 seconds).

This executed an actual native CLI installation into a disposable web profile, served packed-client byte checks, the native settings persistence/reload/toggle scenario in isolated Chromium, composition of all five manifests and split peers, native offline summary policy checks for both selected distributions, all five clean installable consumers, and external-dependency checks. The temporary native Web port was not the production GUI port. This is separate evidence from the synthetic public-service browser presentation harness.

Configuration/feature behavior preservation was additionally checked with `git diff --exit-code fcdadb504be69e3623fa490f94b03d1fab984751...HEAD -- src client/forms.ts client/reasoning.ts client/status.ts`: no changes. The Chime diff is exactly the error-token correction described above.

The patch and this evidence record are committed locally; candidate artifacts remain unpublished. The released 0.2.0 tag/assets have not been changed.


