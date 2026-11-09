# Shared compaction native profile authority — 0.5.0 correction

Recorded before implementation. This repairs the existing profile-scoped requirement in [the workspace contract](WORKSPACE_POLICY_050.md#L19); it does not relax it to a home-wide policy. Publication and local installation remain paused.

## Observed baseline defect

On exact stock rc.1, `@deepseek-ai/dsh-base` configures JSON storage with `dshHomePath('storages')`. The public helper resolves the DSH home, not the selected CLI profile. A fixed domain name therefore does not imply profile isolation. The native DomainFacility forwards the descriptor name unchanged to the public backend.

A disposable probe used native `initProfile`, `loadProfile`, `readProfilePatches`, `composeEntries` and `boot` to interpret the unchanged stock storage expressions. Both selected profiles used the same explicit temporary HOME, DSH_HOME and backend root. Each had its own native ProfileContext and independent complete Context lifetime. A saved revision 1 / A-only policy; fresh B incorrectly read A, saved revision 2 / B-only policy; reopened A incorrectly read B. There was one physical unqualified JSON unit. The isolated report and probe are retained at `/tmp/extras-profile-boundary.sxsHPB`; no real profile or active server was accessed.

The completed 7f8a3e typecheck/source683/build/pack, artifact49 and packed recovery6 gates did not include this same-home/different-profile criterion and do not override the reproduced defect. Previously closed irreversible-admission and native recovery findings remain closed, not conflated with this namespace issue.

## Required minimal authority binding

- Continue using native DomainFacility/JSON backend. Qualify the domain family `dsh_extras_compaction` with the full SHA-256 of the canonical directory of the current native profile: `dsh_extras_compaction_<profile-key>`. The native unit-name contract permits that identifier. Global canonical fields and all legacy/bootstrap/adoption tables belong to that same qualified unit. No second config authority, parallel policy map, private backend IO or per-module namespace is introduced.
- Obtain the selected profile only from the launcher-provided public `profileContext` / verified ProfileLocator seam already used by native migration. Canonicalization of that supplied directory uses the same realpath identity basis as migration discovery. Do not discover other profiles, derive identity from cwd, workspace, distribution, HOME or environment profile labels, or accept a missing/malformed identity as a default profile. Missing/unverifiable authority fails closed with a bounded unavailable diagnostic.
- Same-profile combined and split copies, restarts and owner handovers resolve the same unit and revision. Different profiles sharing one backend root resolve distinct units, canonical revisions, overrides and recoverable import records. The root coordination slot checks both native facility and profile key and refuses authority replacement. Do not weaken the irreversible-admission/owner-drain contract.
- An old unqualified, unreleased preview unit has no reliable profile-owner identity. Do not import it into the first profile, clone it into every profile, mutate/delete it or let it override a qualified accepted policy. Leave it intact for explicit ownership adjudication. This is not a newly supported legacy predecessor; existing 0.4/known predecessor configuration handoffs continue through the proven profile-scoped migration path.

## Gates before publication

1. Red then green at the existing agreed native plugin/storage seam: actual native profile factories, same HOME/backend root, independently closed/reopened roots, A/B canonical and workspace policy isolation, profile-local legacy/bootstrap/adoption records, same-profile persistence and combined/split sharing. No two independent storage roots masquerading as profile isolation.
2. Missing/malformed/unverifiable identity cannot create or mutate shared canonical storage; native authority replacement is rejected. Test fixtures must explicitly construct the native profile they claim, not add a production fallback for unidentified Contexts. Preserve existing assertions; update physical IO pause adapters to the documented qualified native namespace without weakening pre/post-admission outcomes.
3. Keep the old unqualified unit byte-for-byte unchanged in a controlled fixture and prove it is not silently assigned to a new profile. No raw profile paths are added to canonical API bodies or browser diagnostics.
4. Repeat typecheck, full source, six-package build/pack, native-profile/browser artifacts and exact-hash packed recovery gates, with independent Spec and Standards delta reviews. Original package/config/profile data remain untouched until the already authorized post-release installation stage.
