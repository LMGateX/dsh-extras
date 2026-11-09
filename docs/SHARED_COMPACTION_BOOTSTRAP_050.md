# Shared compaction bootstrap provenance clarification (0.5.0)

Status: necessary implementation clarification of the approved independent-participation and migration contract, 2026-11-09. No new authority to overwrite canonical policy or widen installation scope.

## Native evidence

The packed native browser gate first read canonical revision 0 with its master disabled. Updating only local compactionReasoning.enabled then caused GET to import the live configuration as legacy data, enabling the master at revision 1. Reordering the test to save canonical policy first would conceal this real independence defect and is rejected.

## Decision

1. Capture immutable accepted bootstrap policy at settings registration. Never reinterpret ordinary later accepted edits as legacy input. Persist a per-source consumed marker through native domain storage, including for default-only bootstrap. This metadata is not a canonical edit: default-only bootstrap preserves canonical defaults and revision 0. Initial nondefault input, including enabled:true with inherit rules, is backed up and imported exactly.
2. A live getter cannot distinguish later genuine migration adoption from a participation edit with identical bytes. Use a typed optional FeaturePlugin.onLegacyAdopted(ctx, acceptedModuleConfig, receipt) hook. Root invokes it only for a real applied/imported migration decision supported by its immutable operation/source journal. Keep/fresh decisions, blocked/partial imports, ordinary updates and status reads do not emit this receipt.
3. Receipt fields identify operationId and sourceModuleId. The shared helper consumes receipts idempotently, backs up the exact nested original and seeds only an unedited canonical authority. Accepted canonical policy always wins. Whole-module enablement controls participation, never the backup policy. Closing an owner prevents new seed admission. Its disposal completion must drain any already-admitted global commit; an irrevocably accepted write is not a cancelled write. Work that loses admission before committing remains unconsumed.
4. This internal provenance handoff is not a new HTTP write authority or duplicate migration journal. Selected feature hooks avoid introducing shared policy code into unrelated split packages. Do not hide receipt metadata in undocumented getter fields.

## Required public regressions

- Fresh owner GET, participation-only update, second GET: revision/defaults/workspaceOverrides remain exactly unchanged, including reload/restart.
- Initially disabled whole module retains and restores original nested enabled:true policy; equal nested policies do not conflict because whole-module flags differ.
- A real delayed native migration adoption after default bootstrap remains importable through its journal receipt; repeating it is idempotent. Keep/fresh/ordinary updates cannot invoke that path.
- Accepted canonical edits win over late adopted input, with original backups retained. Before global-write admission, disposal prevents seeding; after admission, disposal remains pending until that commit settles. No admitted authority write may complete after owner disposal has completed, and durable success must never be reported as cancelled.
- Preserve packed browser order: local participation first, then explicit canonical master Save, exact opaque IDs, durable storage and reload. No API-write shortcut, skip or preemptive canonical Save.

## Irreversible native write admission — evidence-based amendment

The independent final-global-write probes exposed a stronger boundary than the earlier backup-pause tests: a registered public JSON backend paused inside KvUnit.setGlobal, while the readable canonical revision was still 0. The old implementation allowed settings-owner disposal to finish before the paused revision-1 write completed; its adoption path could even report cancelled after that write persisted. These are real lifecycle/outcome defects, not evidence of successful cancellation.

The exact stock native DomainGlobal and KvUnit interfaces have no transaction, commit predicate or AbortSignal. DomainGlobal.set queues a durable backend replacement; memory and notifications publish only after durability. Native close explicitly drains accepted writes rather than aborting them. Cordis effect cleanup was independently executed and confirmed to await asynchronous disposers. Therefore native write admission and durability publication are distinct points: Extras cannot promise cancellation until fsync, nor implement rollback by private file access.

- Immediately before invoking the irreversible global setter, serialized store work performs its final source-generation/liveness/CAS check and registers the owning commit completion. This is the admission boundary, not a claim that new data is already visible. Until durability the canonical read still exposes the old accepted value and preparation remains pending.
- All sources registered by that final fence belong to the bootstrap batch. An inconsistent batch is backed up and rejected without choosing a master. A source enrolling after irreversible admission is subsequent input: it cannot retroactively withdraw the accepted write, overwrite the resulting canonical authority, or cause an artificial revision-0 claim. Its immutable original is backed up and preservation is diagnosed explicitly. Existing authority wins; no private compensation or speculative transaction is introduced.
- Owner cleanup synchronously closes new admissions, then awaits only its already-reserved global commit tickets. Pre-admission backup pauses still allow disposal to finish and prevent seeding. An admitted commit pause must keep disposal pending until release and settlement. Cleanup cannot wait on unrelated uncommitted backups.
- Durably imported work reports imported even if owner closure began during its native write. Committed receipt bookkeeping is part of completing that operation; an interrupted acknowledgement remains retryable from the same immutable receipt, never rewritten as a cancelled authority mutation. Failed or unknown-state native writes are not fabricated as success or automatically undone.

Required regressions pause the final public backend setter, not just an earlier backup: bootstrap disposal waits; adoption does not return false cancelled; a post-admission source is preserved with recoverable original input; a pre-admission conflicting source still blocks seeding; rejected native durability does not consume a receipt. The original preparation waiter must retain the complete stable-generation barrier.
