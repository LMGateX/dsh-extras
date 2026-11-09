# Shared compaction bootstrap provenance clarification (0.5.0)

Status: necessary implementation clarification of the approved independent-participation and migration contract, 2026-11-09. No new authority to overwrite canonical policy or widen installation scope.

## Native evidence

The packed native browser gate first read canonical revision 0 with its master disabled. Updating only local compactionReasoning.enabled then caused GET to import the live configuration as legacy data, enabling the master at revision 1. Reordering the test to save canonical policy first would conceal this real independence defect and is rejected.

## Decision

1. Capture immutable accepted bootstrap policy at settings registration. Never reinterpret ordinary later accepted edits as legacy input. Persist a per-source consumed marker through native domain storage, including for default-only bootstrap. This metadata is not a canonical edit: default-only bootstrap preserves canonical defaults and revision 0. Initial nondefault input, including enabled:true with inherit rules, is backed up and imported exactly.
2. A live getter cannot distinguish later genuine migration adoption from a participation edit with identical bytes. Use a typed optional FeaturePlugin.onLegacyAdopted(ctx, acceptedModuleConfig, receipt) hook. Root invokes it only for a real applied/imported migration decision supported by its immutable operation/source journal. Keep/fresh decisions, blocked/partial imports, ordinary updates and status reads do not emit this receipt.
3. Receipt fields identify operationId and sourceModuleId. The shared helper consumes receipts idempotently, backs up the exact nested original and seeds only an unedited canonical authority. Accepted canonical policy always wins. Whole-module enablement controls participation, never the backup policy. Disposal while storage is pending cannot perform a late seed or mark failed work consumed.
4. This internal provenance handoff is not a new HTTP write authority or duplicate migration journal. Selected feature hooks avoid introducing shared policy code into unrelated split packages. Do not hide receipt metadata in undocumented getter fields.

## Required public regressions

- Fresh owner GET, participation-only update, second GET: revision/defaults/workspaceOverrides remain exactly unchanged, including reload/restart.
- Initially disabled whole module retains and restores original nested enabled:true policy; equal nested policies do not conflict because whole-module flags differ.
- A real delayed native migration adoption after default bootstrap remains importable through its journal receipt; repeating it is idempotent. Keep/fresh/ordinary updates cannot invoke that path.
- Accepted canonical edits win over late adopted input, with original backups retained. Disposal cannot materialize late authority.
- Preserve packed browser order: local participation first, then explicit canonical master Save, exact opaque IDs, durable storage and reload. No API-write shortcut, skip or preemptive canonical Save.
