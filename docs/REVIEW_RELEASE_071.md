# Final 0.7.1 publication follow-up review

Date: 2026-11-18 (Asia/Singapore). Initial reviewed identity `d49cdc2...acaf1ea`; final re-acceptance identity `git diff d49cdc2...dc8e1e1` (commits `d49cdc2` publication authorization, `acaf1ea` first final identity, `dc8e1e1` restored historical install trail and final README/assertion wording). Two fresh read-only reviewers ran concurrently in the dedicated rc.4 worktree and then re-checked the final identity. The runtime compatibility diff was reviewed separately in the [initial review](<REVIEW_RC4_071.md>).

## Standards

The Standards reviewer found **no hard runtime/code violation**. Two documentation gates were identified as hard while the diff stood:

- The release note preclaimed that final Standards/Spec reviews had passed before this review existed, and linked a review document that was not yet committed. **Fixed by** committing the final validation and this review before creating the tag, and by limiting the shipped release note to a statement that is true at the tagged commit.
- The final validation record was untracked while the release note linked it at `v0.7.1`. **Fixed by** including it in the release-record commit; the tag is created after those documents exist.

Judgement calls accepted without product change:

- The two negative README assertions next to the positive identity regex pin the absence of stale candidate prose; they are redundant but deliberately guard against reintroducing the old boundary text.
- Version/URL literals recur in README, release notes and packed assertions; this is the established release-identity pattern and the packed test checks the installed README, not the source string.
- `RELEASE_071` (user note) and `DSH_RC4_RELEASE_071` (authorization gate) are distinct documents by design; README names the latter as the publication contract.
- Final test counts and the “only README differs” identity check match the separately retained evidence; publication and profile-hash bounds are not overclaimed.

Standards result after fixes: **0 required/optional code findings; documentation findings resolved; judgement calls recorded.** Static judgment, not program execution evidence.

## Spec

The Spec reviewer found **no runtime, dependency, lock, feature-policy or unrequested scope change**. Three publication-record findings were raised:

1. The final validation record was untracked while linked from the release note. **Fixed** by the release-record commit before tagging.
2. The Chinese release-note section lacked the explicit production/Actions/npm/remote-receipt non-claims. **Fixed** by adding them to the Chinese section.
3. The historical rc.3 / Extras 0.7.0 install trail was deleted from README. **Fixed** by retaining the previous `v0.7.0` asset URL alongside the new `v0.7.1` install example.

The reviewer confirmed the final README/install identity is `0.7.1` / exact rc.4, packed assertions match, final counts are distinct from candidate counts, the remote receipt is explicitly disclaimed, the `v0.7.0` tag is untouched, and the production boundary is retained.

Spec result after fixes: **0 missing runtime requirements; documentation findings resolved.** Static judgment, not program execution evidence.

## Re-acceptance at dc8e1e1

The final identity changed after `acaf1ea` to restore the retained `v0.7.0` install URL, clarify “actual published npm DSH packages” and match the packed assertion to that wording. Both reviewers inspected the final identity read-only. Standards confirmed no required blocker: README SHA256 `84619264…`, the packed assertion, all seven archive hashes, the `dc8e1e1` validation snapshot with 825/825 and 67/67 log hashes, and the absence of a review preclaim all match. Spec confirmed no remaining blocker after this record's review scope was updated to `dc8e1e1`; it verified the same final values, the Chinese non-claims and the historical install trail. Final Standards/Spec result for the tagged identity: **0 required/optional findings after documentation corrections**.

## Execution boundary and summary

Neither reviewer installed, tested, launched a host/browser, fetched/cloned source, edited files, pushed/published or accessed a personal profile/GUI. Both read the fixed identity diff and publication contract only. Actual final source/packed results and archive hashes belong to [final validation](<VALIDATION_RELEASE_071.md>), not review inference. Remote upload/download verification is a subsequent receipt appended to the GitHub release body and is not preclaimed here.
