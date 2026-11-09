# DSH Extras

A collection of independently selectable DSH enhancements delivered together or separately.

## Language

**Extras**: The enhancement suite as a product, independently of its installation shape.
_Avoid_: Monolithic feature

**Module**: One independently enabled Extras capability: compact-context, model-policy, retry, chime, or goalWait.
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

**Migration recovery**: Continuation or selective reversal of an interrupted migration without overwriting unrelated later edits.
_Avoid_: Full-profile reset, request recovery

**Model default policy**: A workspace-scoped preferred provider/model/reasoning choice for root agents and all descendants, without forced replacement of every later explicit selection.
_Avoid_: Model enforcement, cwd routing

**Shared compaction policy**: One accepted compaction-reasoning policy that may be provided by either participating module but has one actual executor.
_Avoid_: Mirrored rule lists, duplicate compaction

**Policy participant**: A module offering to provide the shared compaction capability independently of the shared policy master switch.
_Avoid_: Executor (a participant may be on standby)

**Request recovery**: Explicit resumption of a genuinely failed terminal request without another conversation message or replay of completed work.
_Avoid_: Migration recovery, hidden continue message, whole-turn replay
