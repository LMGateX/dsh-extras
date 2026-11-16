# Extras 0.7.0 host time-zone validation

Status: **final pre-publication acceptance PASS**, against runtime/source commit `0f77d9c35c944fe09d1630af8141377db7d2332b`. This is not a publication or active-local-install receipt. Repository/tag publication and fresh remote-byte verification follow these gates; their receipt is recorded in the [formal release](https://github.com/LMGateX/dsh-extras/releases/tag/v0.7.0). Personal local configuration and installation backups do not belong in Git or release assets.

The [fixed contract](HOST_TIMEZONE_070.md) and [HTZ scope](TIMEZONE_POLICY.md) govern the result. Historical failed candidates below remain evidence, not current successful gates.

## Baseline and isolation

- Released starting main: `2090e8c66a8ba8e0545a39ac740e00d4241fc908`, Extras0.6.1 / official npm DSH0.2.2-rc.3 / Cordis4.1.0. The old local0.4.0 checkout was not used as the release base. Development occurred in a dedicated worktree, preserving original checkouts and existing release tags.
- Every development/install/host test explicitly selected disposable HOME, DSH_HOME/profile, XDG/cache and TMPDIR. Native hosts used temporary non-production ports and separate profiles; Chromium reused only an executable, never the production browser profile. No development test targeted the live GUI.
- Fresh `npm ci --ignore-scripts --no-audit --no-fund`:681 packages, exit0. Native preflight:338 packages, exact0.2.2-rc.3/Cordis4.1.0, Goal artifact SHA256 `8c56696eaac68e61a38b1068ea0f0dff976440e72b49ef4814fbea93c8b48b0c`. No ancestor/live fallback was used.

## Final executed gates

| Gate | Actual result | Evidence |
| --- | --- | --- |
| Exact native graph and typecheck | PASS | `npm run typecheck`, native preflight plus tsc, exit0 |
| Complete source suite | **819/819 PASS** | `npm test`,0 fail/cancel/skip/todo;245416.819479ms |
| Seven builds and synchronized manifests | PASS | `npm run build`: combined plus six selected-only distributions, all0.7.0 |
| Seven real archives and checksums | PASS | `npm run pack`; SHA256SUMS frozen before final packed execution |
| Complete packed clean-consumer/native/browser suite | **67/67 PASS** | All eight artifact test files,0 fail/cancel/skip/todo;743879.149164ms |
| Seven clean installs and public declaration consumers | PASS | Included in the67: native CLI/profile, all selected consumers, external dependency checks and7 public declaration entries |
| Automatic reports and real child accepted/durable source | PASS | Actual serialized native RPCs for combined/NewYork and standalone/Shanghai, hostSingapore; ordinary/queue/steer and real child paths |
| Schedule defaults and explicit/stored rules | PASS | Original one-hour-ahead/minute-default semantics, host date/day; explicit NewYork DST/cross-day occurrence and title-only edits preserved |
| Lifecycle/cache/restart/live-TZ | PASS | Actual same-origin native restart, real immutable browser-cache/native same-revision rematerialization, isolated live hostTZ change; sensitive sends refused/drafts retained until reload |
| Unknown bytes and loaded-page disable | PASS | Unavailable is not protection; old protected page refuses, fresh disabled reload restores native browser behavior |
| Independent Standards | **0 hard /0 judgement** | Final follow-up at0f77d9c; originalP1 closed for exact controllable native ABI; reviewer independently ran25/25 client/artifact tests |
| Independent Spec | **0 missing /0 scope /0 implementation findings** | Final static follow-up at0f77d9c closed originalP2; no runtime coverage invented by that reviewer |
| Diff, links and declarations | PASS | Diff whitespace checks,11 release/scope/research documents and local link/fence validation; declarations covered in67 |

The complete packed command was executed with `--expose-internals --test --test-concurrency=1` over migration-cli, migration-runtime, native-goal, native-profile, native-reasoning, native-host-timezone, packages and public-types tests. The final seven-case timezone browser matrix is part of67, not an additional sum or a reused candidate result. Source and packed logs are retained only in the restricted disposable evidence root; no secret/profile dump is committed.

## Standards

Final independent follow-up of0f77d9c: **Hard violations0; Judgement calls0**. Refusal is installed before compatibility approval. Unknown methods and readonly RPCs are fenced on the current controllable native Connection; unrelated receiver/arguments are preserved. Exact emitted callable source plus the unmodified browser-artifact hash are checked, not merely name/arity. Previously closed pages get a one-shot refusal on a newly mounted Connection without rearming or retaining observers. Fully frozen foreign Connection objects never get ready and are not represented as zero-wire coverage.

## Spec

Final independent follow-up of0f77d9c: **Missing/partial0; scope creep0; new implementation errors0**. Native time injection/reader/refresh/retry/goal/compaction and tool TZ remain unchanged. The source proof uses exact native bytes and connection/module identities; the adapter does not rewrite request payloads or explicit task rules. The previous callable-owner finding was closed by actual emitted source comparison and refusal-first admission.

Summary: Standards0 findings (no worst issue); Spec0 findings (no worst issue). These separate axes do not replace executed packed/native/browser acceptance.

## Historical negative evidence and corrections

- Initial source778/778 and basic new-browser4/4 passed, but real tests then reproduced stale host reporting after same-origin restart and browser-zone leakage after cached raw target rematerialization. Review also proved full reload could not recover a changed host zone. The source-validity correction was documented before code, rather than waiving HTZ-03.
- The first existing packed run was59/60: a stale five-module GUI assertion failed against the actual six. Both obsolete combined counts were corrected; final67 includes rerun coverage.
- Repaired candidate source807/807 passed, but candidate2 native/browser was2/7: generic schedule export tails collided in real multi-factory bundles and correctly triggered strict exact-one refusal. Real renderer/cordis collision tests reproduced503, then passed200 after using an audited target-specific suffix. SHA/exact-one/generation checks were not relaxed. Native cold-fetch source did not substantiate a speculative rebuild-event theory, so no prewarming was added.
- Follow-up review found unavailable-only compatibility rejection could still dispatch, and same-name/arity foreign callables could obtain ready. Refusal-first own-call/frozen-RPC facade, exact stock callable source, unmodified connection-browser SHA and actual emitted-native VM tests corrected both.
- Candidate3 then passed the7 real browser cases, including restart/cache/live-TZ red-to-green, but that result was not used to certify the later owner correction. The final819-source/67-packed runs above cover the final code.

## Frozen compatibility and limits

- The two transformed raw native artifacts remain SHA-pinned; the unmodified client-connection `lib/client.browser.js` is additionally pinned to `5f6107953fa764c80b6c06aa161be318ffa0b71e565ac81536fc4267d5d62412`, with exact callable source digest `e9f0a1690441d6b00726bc296ad541776a9b711717e5ed3f72dc7375d35ee51b`. Full upstream MIT attribution is preserved.
- Only newly generated automatic zones on a verified protected page are covered. Existing history, explicit task choices, user/external text and normal native time-context reuse are not scrubbed. This is not whole-request anonymity or a sandbox against malicious code in the same JavaScript realm. Custom carriers/fully frozen foreign Connection ABI are not certified and are never labeled ready.
- Enable/disable, connection/source loss and host-zone changes require a full page reload; the addon does not restart the host, auto-reload a page or discard drafts. Server standby/needs-full-reload and current-page validity are distinct.
- Atomic main/tag publication, formal release, fresh remote asset equality and restricted native local installation are **subsequent execution receipts**, not assertions manufactured by this pre-publication report. Installation must preserve unrelated settings, use native management, retain restricted backups and conditional target-scope rollback, and never force-restart an active host.
