# Extras 0.7.1 publication authorization and final-artifact gate

Fixed before release-identity edits, 2026-11-18 (Asia/Singapore). After the completed rc.4 compatibility check, the user explicitly requests “push、发版”. This authorizes push of the scoped work to main, an annotated `v0.7.1` tag and a final GitHub Release. It does not authorize production installation, update, configuration writes, restart or live-GUI tests. No GitHub Actions or Extras npm publication.

## Scope and evidence

The [original rc.4 check contract](<DSH_RC4_071.md>) and [candidate validation](<VALIDATION_RC4_071.md>) remain historical records, including their then-correct no-publication boundary. This follow-up supersedes only that publication restriction and the candidate identity. Exact official npm DSH 0.2.2-rc.4 / Cordis 4.1.0, the audited Goal digest, host-timezone fingerprints, ownership guards, native policy and seven synchronized distributions remain unchanged.

Current observed state before identity edits:

- Remote `origin/main` is `5b1780861f2ab6cc4ea30641856c55fc019ed63c`; `v0.7.1` is absent locally and remotely.
- The compatibility candidate HEAD is `ace35b7`; tested product/archive source is `310bff3`. Candidate evidence is 825/825 source tests and 67/67 packed/native/browser tests.
- Historical `v0.7.0`, `v0.6.1`, `v0.6.0`, previews and their assets must remain untouched. Do not force-push over concurrent work, move an existing tag or replace old assets.

## Final publication gates

1. Change the current README/install instructions, active development navigation and packed assertions to final `0.7.1` / exact rc.4, preserving historical records. Add a `RELEASE_071` note with Chinese and English identity, compatibility choices and explicit non-claims. No runtime, dependency, lock or feature-policy change is expected.
2. Because README is shipped, rebuild/repack all seven final archives and re-execute the complete source and packed/native/browser suites against the exact rc.4 npm graph. Record final commit, commands, counts, logs, seven archive hashes and the `SHA256SUMS` hash. Candidate results do not substitute for final identity results.
3. Obtain independent Standards and Spec follow-up reviews of the publication diff. Static review and execution evidence stay distinct.
4. After passing gates, make a clean scoped release-record commit; fast-forward local main to the release commit and atomically push remote main plus a new annotated `v0.7.1` tag at that same commit. Publish only the seven final tarballs and `SHA256SUMS` as a non-draft, non-prerelease Latest release.
5. Download the eight actual remote assets to a new temporary directory. Verify byte equality against the tested local files, checksums, sizes, package identities/version/engines, safe tar contents, remote main, tag target, release flags and Latest identity. Append a postpublication receipt to the GitHub release body without changing the tested tag/source identity.

## Production and personal-profile boundary

No production operation is authorized. All build/test/native installs use explicit disposable HOME/DSH_HOME/profile/XDG/cache/TMP and non-3080 ports. Close all owned test processes and verify isolated resources without accessing production settings or the live GUI.

The earlier rc.4 check recorded that no task-start profile baseline existed, so hash equality was not certified. This release follow-up uses the enforceable **agent operation and disposable-fixture boundary**, consistent with the superseded check contract and prior release practice: no production write, restore, investigation, instrumentation, installation or restart, and no claim that a mutable personal profile equals a historical hash. It does not authorize reopening that personal-profile question.
