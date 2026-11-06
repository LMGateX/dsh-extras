# 0.3.1 standalone migration entry contract

Status: approved scope fixed before implementation, 2026-11-07 (Asia/Shanghai). User approved documentation first, isolated worktree/subagent development and testing, push/release afterward, and no production local installation. This supplements every existing [acceptance gate](ACCEPTANCE.md), [migration invariant](MIGRATION.md), and [0.3.0 ownership contract](LEGACY_PARITY_030.md); none is waived.

## Evidence and objective

The [executed research](RESEARCH_MIGRATE_CLI_2026-11-07.md) reproduced the exact missing-Cordis startup error in native peer-auto-install-disabled profiles and all five actual 0.3.0 packed CLI/API entries. The [independent audit](research/MIGRATE_CLI_DEPENDENCIES_030.md) traced the eager runtime import and the peer-provided-only test gap. The patch must make independently launched migration entries honor the explicit host anchor, without changing feature policy or introducing another host runtime.

## Required behavior

- All five synchronized distributions expose the existing bin and migration API. With ordinary package dependencies installed, their standalone help and migration API import must work without a profile-local/ancestor Cordis or native host loader hooks. Help requires no profile/host selection and creates no profile/journal files.
- All operations continue requiring explicit profile directory, DSH home, and host installation anchor. No ambient HOME/profile lookup, production scanning, automatic restart, postinstall migration, or implicit host installation. Full migration still requires supported native helpers through that anchor; this is not host-free migration.
- Offline ownership inspection must return the existing unverified Goal result before acquiring runtime Cordis. Missing live evidence remains a Goal-specific conflict/restart verification requirement, never an ownership grant or reason to reject independently valid non-Goal decisions.
- With an actual continuation Context, acquire required Cordis evidence only from the explicitly anchored audited native installation, not consumer-local bare resolution. Validate supported version and public identity/root shape; missing/incompatible evidence returns a bounded non-secret unverified reason. Preserve root-lifetime markers, canonical native Loader/root/namespace/fiber/registry correlation, callback markers, known retired-stock semantics and every restoration/CAS invariant. No broad catch may turn failed verification into success.
- Do not add Cordis as an ordinary dependency, bundle a private registry/runtime, require profile hoisting, install host peers automatically, or change feature source selection/public declarations gratuitously. Plain delayed bare import or help-only lazy engine import is insufficient as the full repair.
- Keep existing CLI report/exit semantics unless an explicit separately documented compatibility need is demonstrated. Errors remain fail closed; diagnostics must be actionable without printing raw user configuration/secrets. No new broad diagnostic redesign is required to repair the startup graph.

## Agreed public test seams and mandatory gates

The user approved these seams in the research plan. Tests exercise packed bins, documented migration exports and actual native Context/Loader/profile interfaces, not implementation-string replacement or private-method assertions. Product code is not changed until a newly recorded packed startup regression is red on the original bytes. Iterate test-first vertical slices, retaining the original known-red archive observation.

| ID | Mandatory executed evidence |
| --- | --- |
| CLI-1 | All five packed bins: help and argument guards before any peer links, sanitized plain Node, consumer outside repo/host ancestry. Prove Cordis is not locally resolvable; help succeeds and does not create profile/journal state. Test actual bin launcher as well as Node script entry. |
| CLI-2 | All five public migration entries import without visible Cordis. With separate matching host anchor, inspect/dry-run produce structured plans and leave current profile/home inputs unchanged. Include actual native pnpm profile installation with peer auto-install disabled followed by independently launched Extras CLI. |
| CLI-3 | Packed apply/retry and selective rollback in disposable supported non-Goal legacy fixtures use anchored native lock/journal/backup behavior. Recheck interrupted recovery, concurrent/owned-delta protection, process-owner conflicts and offline Goal refusal at public API/native seams; never claim startup repair alone proves recovery. |
| CLI-4 | Public packed migration API with real native Context and no bootstrap hooks/local peers uses anchored runtime evidence. Missing/incompatible host or root shape and consumer-local shadow Cordis fail closed; startup markers, foreign callback/native tuple and stock ownership regressions remain effective. Do not fabricate a context or waive the actual native tuple. |
| CLI-5 | Same fix/source in all five artifacts; exact external dependency metadata, declarations and selected payloads stay correct; no second bundled Cordis, author paths, secret/profile/sandbox data. Run old peer-provided tests too. |
| CLI-6 | Typecheck; full serialized source suite with native-compatible runner and actual audited legacy Goal; build/pack all five; full serialized artifact suite including real native host/browser/profile gates. Do not extend prior green results to changed bytes. |
| CLI-7 | Independent Standards and Spec reviews since v0.3.0, repairs and rechecks; exact tested archive hashes; synchronized 0.3.1 main/annotated tag/normal GitHub Release; unauthenticated public-download byte verification. No npm publish or GitHub Actions. |

## Isolation and delivery

Use dedicated integration and delegated worktrees. Every install/CLI/host/browser uses explicit disposable HOME/DSH_HOME/profile/cache paths and temporary ports, never the live GUI. Global audited host and predecessor sources remain read-only. Do not inspect or rewrite real production profile files. Source tests may use explicit predecessor/host paths read-only. Record actual commands, failures/fixes, counts, limitations, review closure, archive checksums and worktree disposition in the 0.3.1 validation report.

Release a new patch; do not overwrite 0.3.0 tags/assets. The user authorized push/release once development/testing completes, not local production installation or service restart.
