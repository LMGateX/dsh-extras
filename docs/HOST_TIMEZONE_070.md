# Host time-zone privacy — Extras 0.7.0 implementation/release contract

Fixed before runtime implementation, 2026-11-16. The user accepts the narrowed [privacy scope](TIMEZONE_POLICY.md), then explicitly authorizes: documentation, development/testing in isolated environments and subagents, push, release, and installation into this machine’s DSH. This supersedes documentation-only/no-install restrictions only for the present capability and final verified installation. No GitHub Actions or npm publication.

## Scope and baseline

- Prevent browser-detected zones from being automatically reported to requests; use the DSH host process zone. No arbitrary fixed selector, global Intl/Date/TZ changes, extra time injection, refresh/reader/retry/goal/compaction changes or tool environment rewriting.
- Start from remote main `2090e8c66a8ba8e0545a39ac740e00d4241fc908` (released Extras 0.6.1, exact published DSH 0.2.2-rc.3 / Cordis 4.1.0), not the older local 0.4.0 checkout. Preserve every currently shipped module and shared-policy owner contract. The two prior timezone documentation commits are rebased onto this current baseline; original main/source checkout remains untouched during development.
- Add one independently enabled, default-off `host-timezone` module and its real standalone `dsh-extras-host-timezone` distribution from the same feature source. Extras 0.7.0 therefore has six modules and seven synchronized archives. No new legacy source is invented; upgrade must preserve all previous settings and add the new capability disabled until explicitly enabled.
- Prompt telemetry and automatic schedule defaults must be distinguished from user-selected/stored task rule zones. Do not overwrite explicit TZID/time_zone rules at the RPC boundary: automatic-default provenance is lost there.

## Seam decision gate

Primary-source investigations are in [host seam research](research/HOST_TIMEZONE_HOST_SEAM.md) and [client seam research](research/HOST_TIMEZONE_CLIENT_SEAM.md). The native /api intercept slot is already owned; host payload replacement is also too late to prevent wire disclosure. Select a narrow **served-artifact compatibility adapter**, not a time-context hook or global browser API override.

Exact rc.3 public interfaces: clientModules.graph(), clientPath(id), fetchBundle(Request), webServer.register(resource), and webserver/index-inject. Native bootInjections emits structured global __DSH_BOOT__ plus preload/script-src rows. Clone and retarget only target-containing combo/entry references to an owned /extras/host-timezone resource namespace, leaving the native graph and files untouched. The owned resource delegates the original /plugins request to fetchBundle, verifies exact known package version/raw SHA256 and unique function anchors, and replaces only automatic browser sampling/default construction in session-controller and schedule client artifacts. Preserve explicit stored/user-selected rules. Use distinct non-immutable/no-store responses; never serve changed bytes under the native immutable revision URL. No monkeypatch of fetchBundle or connection.rpc is needed.

A served page uses the host process IANA zone, not a query-supplied fixed override; host-zone identity must participate in owned URL/cache-generation validation. Reject unsupported targets or mismatched transform expectations rather than silently serving unprotected bytes from the owned path. Report unavailable/reload-required accurately. Already-open pages/native cached scripts are outside immediate activation: enable/disable requires full page reload, and old unmodified pages are not claimed protected. The adapter registers no pre-step/time injection/reader/refresh/retry behavior and changes no tool environment.

## Pre-agreed test surfaces

The accepted HTZ gates use the exported Cordis feature interface (enable/disable/unload/status and host facts), actual emitted/packed client loading and serialized RPC requests from a native isolated GUI, plus unchanged native tool/task behavior. These are the test seams for vertical red/green slices; fake-port characterization alone cannot certify wire privacy. Test both browser and host IANA identities different but same offset, a cross-day/DST example, no browser value in added metadata, explicit task rule preservation, current connection/reload limits and unavailable support. Do not introduce new lifecycle semantics to make native clock injection refresh.

## Delivery gates

1. Run exact npm graph preflight, typecheck, focused tests regularly, complete source suite, all seven packed clean consumers and actual isolated native-browser gates. Build and install hosts only with explicit disposable HOME/DSH_HOME/profile/XDG/cache/tmp paths and non-production ports. Runtime implementation and test tasks run in subagents with disjoint edit ownership.
2. Independent Standards and Spec reviews, final diff review and rerun affected tests. Record real commands/results and limitations. No claimed native/browser coverage without execution.
3. Update final version/readme/declarations/provenance, rebuild/repack, verify all archives/checksums. Fast-forward remote main without overwriting concurrent work; new annotated v0.7.0 tag at final tested commit. Publish seven archives and SHA256SUMS as a formal GitHub release, then independently download and verify actual remote bytes/identity.
4. Only after those gates: discover the user-authorized local target through native interfaces, make a restricted backup outside Git, install through native plugin management, preserve unrelated personal settings, explicitly enable only the new capability as needed for the user’s request. Do not replace the native DSH installation or patch node_modules. Verify installed vs reload-required vs actually served/active separately. Keep rollback instructions and the prior artifact/config. A reload/restart requirement must be reported rather than falsely claiming protection for an already-loaded old page; do not unexpectedly restart this active conversation’s host.

## Historical boundaries

Earlier rc.3 source audit and no-install release documents remain historically correct. Prior mutable-personal-profile observations are not re-opened or used to force a restoration; only the current user-authorized installation requires bounded target discovery and new backup. Historical session contents are not scrubbed. Existing release, migration, ownership, no-duplicate-clock and no-secret-in-Git constraints remain applicable.
