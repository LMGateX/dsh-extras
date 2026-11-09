# Specification amendments

Changes must cite the observed host/source constraint, explain the trade-off, and state the changed acceptance evidence. Scope cannot be silently reduced.

No amendments at the original specification freeze. Later approved amendments follow.

## 2026-11-09 — Approved workspace policy, shared compaction ownership, settings and retry (0.5.0)

The user approved the read-only design, then explicitly chose standalone capability in both compact-context and model-policy with one deterministic runtime executor and two shared-setting surfaces. The [fixed 0.5.0 contract](WORKSPACE_POLICY_050.md) supplements the baseline: five modules/six artifacts; opt-in workspace root/descendant defaults; profile-authoritative shared compaction policy and safe handover; hierarchical settings; native provider retry management. Native preparation captures selection before pre-step and deprecated agent/request forbids routing; native always retry is provider-owned and has broader permanent-error semantics. Message-free terminal recovery remains a mandatory evidence/explicit-scope-decision gate, not permission to fabricate an API or silently omit the feature. All prior native compaction/retry authority and old safety gates remain.

The user confirmed four public test seams before tests and authorized isolated subagent work, push/release, and (after clarification) installation into the current local DSH. Production installation is an explicit new exception only after isolated/remote release verification, restricted backup and native target discovery; all development/tests still exclude live profile/GUI. GitHub Actions and npm publication remain prohibited.

## 2026-11-07 — Requested exact DSH rc.1 compatibility baseline (0.4.0)

The direct user request authorizes isolated/subagent adaptation to DSH 0.2.2-rc.1, push and release without production installation. Official release notes identify breaking Cordis/Fiber, tool/prompt, request-model and projection contracts; the registry publishes an exact synchronized rc.1 package set. The [fixed compatibility contract](DSH_RC1_040.md) sets a new exact audited baseline rather than widening alpha.3 guards without evidence, and adds RC-1 through RC-6 while retaining all previous safety and acceptance gates. Alpha.3 remains served by 0.3.1. GitHub Actions and npm publication remain prohibited.

## 2026-11-07 — Approved standalone migration peer-resolution repair (0.3.1)

The user approved the [reproduced missing-Cordis CLI defect and repair plan](RESEARCH_MIGRATE_CLI_2026-11-07.md), with documentation first, isolated subagent development/testing, then push/release and no local production installation. The [fixed patch contract](MIGRATION_CLI_031.md) clarifies independently launched offline entries versus native host peer resolution and adds CLI-1 through CLI-7. This supplements MIG-6/DIST-1/HOST-1; it does not weaken offline Goal ownership refusal, recovery/CAS invariants, mandatory existing gates or the no-second-Cordis rule. All five distributions remain synchronized. GitHub Actions and npm publication remain prohibited.

## 2026-11-06 — Context backend follows the selected native agent scope

**Evidence.** Executing the packed combined plugin in a disposable, stock DSH 0.2.2-alpha.3 web profile exposed a native composition difference: the web bundle explicitly disables the host-plane compaction backend, and its shipped standard/cordis/PTC presets mount isolated compaction backends within each agent scope. The original standalone context plugin required a root-plane compaction service, so a direct root port remained permanently unavailable in that otherwise supported composition. Native Agent exposes its scoped context publicly; this is not a reason to mount a second engine or rewrite presets.

**Contract clarification.** Keep one Extras configuration/card and canonical tools. The context adapter registers once in the owning host, resolves the exact target agent’s native backend and policy for each invocation/render, and retains the original root backend path for non-preset compositions. Backend absence is reported for that target; it never selects another agent’s backend or invents a global fallback engine. All native retention, pressure, transaction and PTC authority remain native. Other modules and legacy ownership rules are unchanged.

**Acceptance addition (not a reduction).** Exercise actual native Agent scope composition with two isolated backend/policy instances, canonical tool visibility, per-agent dispatch, status/pressure, live settings and unload. Re-run the full native stock-web packed-client/configuration acceptance against the corrected adapter. No automatic preset/profile edits are introduced.


## 2026-11-06 — Direct user prohibition of GitHub Actions

The user explicitly instructed “禁止使用 github action”. This supersedes the original release-gate reference to CI. Repository Actions are disabled, existing in-progress runs are cancelled if any, and all GitHub workflow definitions are removed. No further GitHub Actions execution, dispatch, or release workflow is permitted.

The replacement release evidence is the complete locally executed isolated source/type/native/browser/packed-artifact suite, independent review rechecks, unchanged production-profile/source integrity, an annotated matching tag and direct authenticated `gh` publication/download/checksum verification. Public Git storage and GitHub Releases remain authorized; no npm publication or production-profile installation is added.

## 2026-11-06 — Approved compact-context naming and request reasoning extension

The user approved the fixed request-wide reasoning policy and required the development-only module id `context` to become `compact-context` without compatibility aliases. This distinguishes native-policy compaction from unrelated context-pruning engines. Rename all owned configuration/status/ownership/client/build/source/test identities before implementing the policy. Native canonical tool names and predecessor package identities do not change. The breaking release is 0.2.0. The direct user instruction authorizes GitHub push (with a lease if force is needed), publication and isolated subagent development, but explicitly excludes installation into the real local profile.

The [fixed implementation contract](COMPACTION_REASONING.md) records source evidence, defaults, exact scope/action semantics, version-limited clone-first adapter constraints, lifecycle/status behavior, agreed public test seams and mandatory all-entry coverage. This narrowly adds an opt-in summary reasoning control without taking retention, summary model routing, transaction or retry authority from the host. The compatibility adapter is not a native transform extension; coverage and recovery must be demonstrated in disposable native engines before publication. Unknown support remains unavailable, not tool-only success. No privacy-bearing sessions or provider configuration enter source/release assets. GitHub Actions remains prohibited.

## 2026-11-06 — Approved latest legacy parity restoration (0.3.0)

The user approved the evidence-based supplemental research and instructed documentation first, isolated subagent development/testing, then push/release without local installation. Goal-wait is updated from the accidentally old 0.3.0 source to the public 0.4.23 ordinary-row four-strategy capability. This supersedes the conventional-only product scope, not the exclusion of arbitrary experimental startup ownership. The [fixed contract](LEGACY_PARITY_030.md) defines configuration, driver ownership/disable restoration, real runtime status, both-version safe migration/recovery, grouped settings and declarations, and PAR-* gates.

The old absolute prose about all external disarms was stronger than the activation boolean seam permits; the accepted research/old ADR already document same-value overlap ambiguity. The contract explicitly records that inherited activation limitation, requires truthful status/docs and the replacement alternative, prohibits invented rearm authority and retains the existing externally-disarmed/terminal-goal safety checks. This is not permission to hide a new regression or waive native owner acceptance. Canonical tool/compaction/retry/chime policy and all previous gates remain. GitHub Actions and production installation remain prohibited.
