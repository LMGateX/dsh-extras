# DSH Extras

A collection of independently selectable DSH enhancements delivered together or separately.

## Language

**Extras**: The enhancement suite as a product, independently of its installation shape.
_Avoid_: Monolithic feature

**Module**: One independently enabled Extras capability: compact-context, retry, chime, or goalWait.
_Avoid_: Separate implementation

**Compact-context**: The native-policy compaction capability, including optional agent-facing tools and an independently enabled compaction-request reasoning policy. It is not a general context-pruning engine.
_Avoid_: Context (ambiguous capability name), context pruning

**Distribution**: An installable combined or single-module edition of the same Extras release.
_Avoid_: Fork

**Legacy plugin**: One of the four predecessor packages from which Extras can import settings and take over a capability.
_Avoid_: Split distribution (new Extras splits are not legacy plugins)

**Handover**: A capability's transition from a previous running owner to a new running owner.
_Avoid_: Import (configuration import alone does not complete a handover)

**Migration**: A profile-scoped, recorded transfer of legacy configuration and ownership into Extras.
_Avoid_: Uninstall

**Recovery**: Continuation or selective reversal of an interrupted migration without overwriting unrelated later edits.
_Avoid_: Full-profile reset
