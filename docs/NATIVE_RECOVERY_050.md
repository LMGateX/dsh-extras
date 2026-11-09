# Native terminal request recovery — approved independent extension

2026-11-09 (Asia/Shanghai), fixed before native implementation. The user first approved deferring the unavailable stock-host button from Extras 0.5.0, then asked whether it could actually be built and explicitly accepted the proposed independent native DSH extension plus Extras operation surface. This does not authorize hand-editing the active DSH package directory or replacing the running process during development.

## Required semantics

A real model-request failure may exhaust its normal retry budget and terminate the native turn. Only a host-proven budget-exhausted failure with an eligible latest checkpoint exposes “Retry failed request”. No error-text/last retry-count inference. The operation appends no user message, hidden “continue”, empty prompt or synthetic model-visible instruction. It preserves committed context/tool results and resumes the failed model request through native preparation/replay/recovery authority; it never repeats completed tools or replays the whole user turn.

Retry pins the failed request selection and captured context, subject to current native permission/workspace/archival/Goal admission. Each click opens a new finite native retry budget (defaults five additional requests), not unbounded mode. A newly exhausted failure may expose a new checkpoint. Controls/inputs changed after failure make the operation reject or require an explicit separately specified action, never silently mix request versions.

The host must expose a structured recovery eligibility/disposition and an identity/revision-bound operation. Validate true idle, latest session/failed attempt, unconsumed checkpoint, policy/permission and no intervening conflicting work. Concurrent duplicate clicks yield one recovery execution; stale/foreign/busy targets fail explicitly. Audit records must distinguish terminal failure and recovery without pretending a user sent content. Native cancellation/disposal remains effective. Browser refresh can recover eligibility from the host. If restart recovery cannot be proven safe, restart invalidates capability explicitly; do not invent a durable replay guarantee.

## Work and test isolation

Work only in a dedicated checkout of the actual official source baseline; compare exact source behavior to installed rc.1 artifacts. Original source/installation and live profile remain untouched during development. The already user-confirmed public Agent/LLM, operation, emitted/packed browser and isolated installation seams apply. Red-green at public entry interfaces; test terminal budget-exhaustion vs nonretryable/cancel, prior completed tool calls, partial attempts, two workspaces, gate rejection, latest-failure fencing, duplicate clicks, finite re-exhaustion, refresh and restart invalidation/recovery behavior. No paid upstream dependence.

## Delivery boundary

Extras on stock rc.1 must continue to report native-terminal-recovery-unavailable, not show a fake action. An adapted host exposes verified capability and then enables the operation surface. Independent source patch/commit and tests are deliverables; publishing into upstream official repositories or impersonating an official DSH release is not authorized. Companion artifacts must be separately identified, source/provenance included, and validated in disposable installs. Any production host switch follows successful isolated validation and a clear backup/rollback plan; do not terminate this active agent host implicitly. The parent will record exact status and installation/restart needs truthfully.
