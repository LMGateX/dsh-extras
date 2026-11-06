# Compaction-request reasoning — 0.2.0 acceptance record

## Identity and scope

Local acceptance and the final independent reviews ran against production commit `652f69a4a889ec20c9a9aba3cd7464a0b3ac8fd1`, compared with the approved peeled `v0.1.0` base `1b8d43fca24e6a2817bd7c44d93a9b69cadde008`. The following evidence-only commit adds this report; it does not change packaged source, manifests, README, notices or assets. Remote publication/download verification follows that commit and is a separate delivery receipt.

The [fixed contract](COMPACTION_REASONING.md) and [acceptance criteria](ACCEPTANCE.md) govern this record. Historical 0.1.0 reports remain historical, not new execution evidence. The breaking canonical module id is `compact-context`; no old-id alias or migration is provided. Native tool and predecessor-package identities remain unchanged.

Audited environment: Node 24.17.0, TypeScript 5.9.3, DSH/DSH LLM 0.2.2-alpha.3, Cordis 4.0.6-alpha.2, existing Chromium 1248. The runtime rejects unverified LLM/Cordis versions rather than claiming universal compatibility.

## Final executed gates

All commands below exited 0. No final test was skipped or cancelled.

| Gate | Final result |
| --- | --- |
| `npm run typecheck` | Strict TypeScript pass |
| `npm test` | 439/439 pass, including emitted browsers and the actual selected-payload build/pack/browser fixture |
| `npm run build && npm run pack` | Five synchronized 0.2.0 distributions |
| `node --test --test-concurrency=1 test/artifacts/*.test.*` | 10/10 pass |
| Original native cold Web case, two additional fresh-profile runs | 1/1 + 1/1 pass; three consecutive final cold cycles including the artifact suite |
| `DSH_TEST_LEGACY_ROOT="$LEGACY_ROOT" node --test test/migration/*.test.ts` | 138/138 pass against actual predecessor config-only validators, read-only |
| `git diff --check v0.1.0...HEAD` | Pass |
| Frozen five-archive SHA-256 verification | 5/5 pass |

Commands ran from the release checkout with `env -i`, retaining only PATH and explicit disposable HOME, DSH_HOME, TMPDIR, XDG cache/config/data and npm-cache paths, plus CI/NO_COLOR and the existing browser executable. A short disposable TMPDIR avoids Chromium Unix socket path limits. Native CLI helpers create separate temporary profiles, use port 0 and `--no-open`, close browsers, stop their own process groups and remove their sandboxes. No validation targets the running GUI.

The artifact suite was serialized after an earlier registry ECONNRESET/install-timeout failure. Assertions were not weakened. Source selected-payload tests build/pack an allowlisted temporary source copy, not the release directory, so concurrent source acceptance cannot rewrite archives being consumed by artifact tests.

## Behavioral evidence

- [Configuration tests](../test/modules/compact-context/reasoning-config.test.ts) cover default-off policy, inherited default rule, explicit empty arrays, array replacement, exact case-sensitive ids, malformed/inapplicable fields and duplicate target rejection. [Native settings tests](../test/integration/settings.test.ts) reject invalid candidates before disk, revision or live-value mutation, including disabled modules.
- [Fifteen native engine tests](../test/integration/native-compaction-reasoning.test.ts) exercise original `/compact`, automatic pressure, overflow, model switch, the actual canonical agent tool and the public balanced-region interface. Oracles include outgoing adapter controls/call counts, durable source correlation and surface replacement, not status alone. Non-tool entry coverage includes `compactTool: false`.
- Native tests also exercise exact latest durable full snapshots, model-switch old-header timing, explicit outgoing summary routing, native materialized defaults, missing effort/header/session behavior, simultaneous sessions, retained isolated preset engines and new revisions. Module/policy off preserves native compaction. No-op and pruner-only replacements make no summary request.
- Native unsupported fixed effort fails before provider dispatch and is deterministic in the existing tool retry classifier: one attempt, no new retry layer, no fallback and unchanged surface.
- [Runtime](../test/modules/compact-context/reasoning-runtime.test.ts), [compatibility](../test/modules/compact-context/reasoning-compatibility.test.ts) and [lifecycle](../test/modules/compact-context/reasoning-lifecycle.test.ts) tests cover synchronous capture, original LOOP identity exclusion, clone-first scalar-only modification, receiver/nested cancellation identity, exact descriptor ownership, late/scoped/isolated/replaced services, atomic withdrawal, stale closures and recovery. Cancellation identity is compared at the native waterfall boundary; native engines may legitimately compose their own signal before it.
- [Packed native request tests](../test/artifacts/native-reasoning.test.ts) import the actual unpacked combined and compact-context tarballs. Fixed and durable inheritance modify real native summaries while agent tools are disabled; ordinary LOOP requests retain their own effort.
- [Selected-payload acceptance](../test/client/selected-payload.test.ts) checks actual emitted/packed JS equality and sourcemaps across all five distributions. Retry, chime and goal-wait omit the reasoning editor/validator/catalog implementation. Both selected packed clients execute real browser controls, exact opaque effort selection/save, persistence and subscription cleanup. Production uses selected adapters, not the all-feature source facades.
- [Original cold native Web acceptance](../test/artifacts/native-profile.test.ts) installs through native CLI, verifies served-versus-installed client bytes, edits policy and tools independently through native configForms, checks actual persistence/reload/live capabilities and preserves sibling fields. It passed three consecutive final fresh-profile cycles.

## Native page publication boundary

An earlier cold Web run exposed a subsequent sibling-toggle refusal. The exact historical schedule was not captured; a deterministic two-surface reproduction was therefore added rather than hiding it with a sleep or retry. Native ConfigFormController accepts the response into its mirror before returning true for the latest write, while page props can render later.

The [public two-surface regressions](../test/client/page-publication.test.ts) and [emitted Chromium regression](../test/client/page-publication-browser.test.ts) deliberately keep page props at revision 7 while the exact namespace mirror has accepted 8. Shared controls are fenced during the wire call; subsequent writes use the actual accepted 8. An explicit old revision is refused, never rebased or forwarded elsewhere. The read authority exposes only getSnapshot/subscribe; page.mutate remains the sole write endpoint. Page permission/status/revision barriers remain enforced. True same-revision no-op and off/on/remount cleanup are covered. Existing reasoning-controller and backend policy semantics are unchanged. The original unminimized cold scenario was then rerun successfully as recorded above.

## Independent review — Standards

A fresh read-only Standards reviewer inspected the fixed-base change and subsequent immutable deltas through `652f69a`. Final result: **0 documented-standard breaches; 1 retained P3 judgement-call advisory; no blocker**. The optional advisory is duplicate capability-status type declarations in server, runtime and client. A future browser-safe shared type can reduce drift; no behavioral requirement is missing. Selected source facades preserve real source APIs and were not treated as meaningless middlemen. Review execution is not represented as test execution.

## Independent review — Spec

A separate fresh read-only Spec reviewer initially found **1 P2 DIST-1 issue**: non-compact clients included the full new reasoning editor. Production composition was corrected in `4889ddc`, with actual packed JS/map absence and both selected browser regressions added. Final immutable re-review through `652f69a`: **0 actionable findings; original P2 closed; no blocker**. This axis is not merged with, downgraded by or reranked against Standards.

## Distribution and safety audit

| Distribution | Final tarball bytes |
| --- | ---: |
| dsh-extras | 556614 |
| dsh-extras-compact-context | 236836 |
| dsh-extras-retry | 195595 |
| dsh-extras-chime | 491138 |
| dsh-extras-goal-wait | 197674 |

The final archives contain only package-relative release files. Audits found no dependency trees, sandbox/profile/session state, logs, private baseline values, machine-specific runtime/source-map paths or live-GUI endpoints. Every external server host import is declared. Sound assets/notices appear only in combined/chime. Final parent archives independently passed selected-only JS/map checks and equality with their frozen build output.

Predecessor source commits remain those recorded in [provenance](PROVENANCE.md); pre-existing user changes in the gate repository were not touched. Private production integrity fingerprints remain ignored and are not included here. During the long validation the user independently changed an existing GUI preference and explicitly identified that action; it is unrelated to Extras development and was preserved. Whole-profile byte equality is therefore not claimed. The original baseline was not silently replaced, and no real configuration was restored or rewritten by this task. No Extras installation or npm publication was performed.

GitHub Actions is prohibited and remained disabled. Delivery uses a checked Git lease, annotated matching tag, direct GitHub Release upload and independent download/checksum verification; no workflow is dispatched.

## Limits

This is an experimental version-limited native-request compatibility adapter, not a supported universal transform API. Arbitrary third-party direct service replacement followed solely by direct get, cached old methods and custom backends bypassing the identified native stream/purpose remain outside the audited boundary. Unsupported coverage withdraws the policy, preserving native behavior. No external provider cache hit, latency, cost or output-quality improvement was measured. All adapter/provider execution in acceptance used synthetic offline data, not real provider credentials or user sessions.
