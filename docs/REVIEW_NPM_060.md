# Extras 0.6.0 — independent npm-transition review

Two fresh read-only reviewers evaluated the nonempty fixed diff `6ee5d387f04733cdaca0773a8376232bd12c8333...db9526e4a69449fea2862d7f658a5c1404b754cd` (six commits). They independently followed up on `db9526e4a69449fea2862d7f658a5c1404b754cd...25fccc4dba1fb70d2c3c4705f9091109e7d9e859` after the owner diagnosed the native PTC test lifecycle race. No reviewer installed packages, changed files, launched hosts/browsers or performed publication.

| Axis | Reviewer | Initial review | Follow-up |
| --- | --- | --- | --- |
| Standards |71199370-d6db-406b-b0d0-080872f6f2ef |0 documented-standard breaches;0 actionable optional Fowler smells |clear;0 required/optional findings |
| Spec |665b0c5f-315b-4f75-a840-d4ce726c1b97 |pass within static-review scope;0 required/optional findings |clear;0 required/optional findings |

## Standards evidence

Documentation-first contract/amendment precedes implementation. The new read-only admission helper audits the physical graph owner’s real public lock, exact installed metadata, required/optional/peer identities, emitted files, Goal bytes and both explicit selectors without native evaluation or writes. Public CLI fixtures cover real installed and borrowed graphs as well as refusal cases. Static lock inspection found776 records,345 native lock records, no nonpublic/invalid-SRI/link/nested-native/wrong-DSH-version records. These lock counts include optional packages, not a claim that all were installed or independently signature-verified. Published provenance retains missing-gitHead and historical-source distinctions; product guards are unchanged.

## Spec evidence

The [pre-implementation npm contract](<DSH_RC2_NPM_060.md>) explicitly replaces only the temporary source-only provisioning workaround, retains physical identity and every semantic/release gate, preserves the historical preview, and prohibits production installation. Exact npm dependency pins, standard lock, independent registry/archive/source comparison and unchanged product policy meet that scope. Combined plus five split whole-native-GUI tests remain required; CLI composition does not replace them.

## Lifecycle correction follow-up

Both reviewers inspected the unchanged exact initial300000, updated450000, explicit-zero/native120000, model-specific420000 and ownerless120000 PTC assertions. The only test change awaits the existing public module admission status after native configuration persistence/Loader completion. The existing observation is bounded at4s and state-driven, not an unconditional sleep or assertion retry. Terminal nonactive statuses accepted by that helper cannot bypass the unchanged timeout assertions. No runtime, build input, lock, policy, test predicate or packed byte changed. The initial747/748 failure and25 successful focused repetitions remain disclosed, not erased.

## Scope of acceptance

Reviewer opinions establish neither program execution nor release completion. Owner subsequently completed the entire748/748 source rerun and54/54 packed/native acceptance, including all six real whole GUIs, against independently reproduced npm dependencies. See [factual validation](<VALIDATION_NPM_060.md>) for commands, frozen snapshots, archive/log digests, isolation and remaining post-publication network receipt boundary. This review record closes both code axes; it does not preclaim a push, remote download or production deployment.
