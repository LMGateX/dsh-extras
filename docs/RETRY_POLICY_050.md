# Native provider retry policy — 0.5.0

## Scope and integration contract

This lane preserves the existing stream/empty-response classifier unchanged. It adds configuration management, never a second request/recovery loop. The implementation follows the [fixed contract](WORKSPACE_POLICY_050.md). Stock DSH 0.2.2-rc.1 cannot safely recover a terminal failed request without a message; the truthful unavailable state below is **not** an implemented recovery action. The parent reports the direct user's explicit agreement to defer that button for this release. Any separately developed upstream recovery extension needs its own authorization, capability validation and acceptance evidence.

- [Feature entry](../src/modules/retry/index.ts) exports `mountSettings(ctx, distribution)` (alias `mountRetrySettings`). Root composition mounts it outside the classifier fiber, so native policy management remains accessible with the classifier disabled. The existing per-feature owner guards remain root-owned.
- [Client adapter](../client/retry-settings.ts) exports `createRetrySettingsAdapter(React).createView(ctx)`. The resulting component accepts `{rowId}`. Optional public source/view exports are `createRetrySettingsSource` and `createRetrySettingsView`.
- Exact HTTP path: `/extras/<encodeURIComponent(distribution)>/retry-policy`; methods GET and PUT only. Every request first passes native `connection.admit(req)` (owner principal required, native Host/Origin/auth fences).
- GET returns `{writable, targets:[{id,namespace,provider,revision,policy}], recovery}`. It exposes no provider fields, credentials, endpoints, headers, raw errors or host paths. IDs are opaque UI target identifiers, not arbitrary paths.
- PUT accepts exactly `{targetId,expectedRevision,policy}`. Policy is `{mode:'normal',maxRetries,initialDelayMs,maxDelayMs,jitterRatio}` or `{mode:'always',initialDelayMs,maxDelayMs,jitterRatio}`. Revision is mandatory. Content type must be JSON; body is bounded to 8192 bytes. Unknown fields, malformed/nonfinite values and inapplicable fields are refused before writing. Conflicts return 409, malformed values 400, absent target 404, unsupported MIME 415, excessive body 413, unavailable native contract 503. Raw native errors are not returned.
- Settings recovery metadata is `{phase:'per-session',reason:'native-recovery-checked-per-failed-session'}`: this provider editor makes no global capability claim. Stock rc.1 lacks terminal recovery; the [optional recovery adapter](REQUEST_RECOVERY_050.md) checks the actual capability per failed session. There is no exhausted-count inference, empty/send/replay workaround, direct provider invocation or held-open-turn workaround.

## Native ownership, paths and semantics

The [native bridge](../src/modules/retry/settings.ts) resolves the host packages from the active profile's explicit installation anchor and verifies exact DSH version. It correlates unique native SettingsForms namespaces with ConfigEditor Loader entries and the actual imported provider Config schema identity. Namespace spelling alone cannot impersonate a supported provider. Unsupported schemas/providers are not editable. Actual concrete native provider owners are:

| Package | Native route | Native path |
| --- | --- | --- |
| `@deepseek-ai/dsh-llm-deepseek-api-key` | `deepseek-official` | `retryPolicy` |
| `@deepseek-ai/dsh-llm-deepseek-account` | `deepseek-account` | `retryPolicy` |
| `@deepseek-ai/dsh-llm-pi-ai` | exact providers-dictionary key | `providers[route].retryPolicy` |

The base package `dsh-llm-deepseek` is a shared adapter/schema library, **not a standalone provider plugin**; no invented `deepseek` route is used. Changes call native `settings.mutate(namespace, leafOps, expectedRevision)`. Only mode, normal budget, and the three owned backoff leaves are written. Native ConfigEditor preserves credentials, headers, unknown raw fields, retryableCodes, unrelated provider options and sibling profiles. Switching to always intentionally leaves normal-only stored fields dormant (native resolver permits this layered shape); switching back explicitly sets the finite budget. No redacted section is ever replaced.

Native defaults are normal, five **additional** attempts (up to six requests), 500 ms initial / 10000 ms cap / 0.1 jitter. Native multiplier is 2; fixed maps initial = max, jitter = 0. Provider Retry-After handling remains native and can differ from the local fixed delay. Always has no attempt budget and includes permanent model-request failures; UI requires explicit risk acknowledgement before saving it. The current profile/provider scope is visible and is not described as workspace-specific. Disabling the Extras classifier does not disable native retry. Compaction-tool bounded retry is separate and untouched.

The UI distinguishes accepted configuration, unsaved draft, saved future-request configuration and in-flight captured policy. A stale revision preserves the draft, fetches the newest native state, and requires Discard before the next save. Errors never display raw provider responses. Collapse/unmount ownership is left to root settings composition; ordinary parent hide-based collapse preserves these editors.

## Stock-host terminal recovery audit

Audited installed package artifacts, all DSH version 0.2.2-rc.1:

| Package-relative artifact | SHA-256 |
| --- | --- |
| `dsh-llm-retry/lib/index.js` | `7420d436d6f4d3c8cf61e8d783ea1962c371c5c8d8116d1655a1be0d095e0b66` |
| `dsh-agent-loop/lib/index.js` | `a6fa8e0c7c90191caf5f4a3bb5c624a86e9845cf3c79d020b71420d0e20ae4c1` |
| `dsh-llm/lib/types/retry-policy.js` | `f0a8fe075ac24c56ed2aa5d5e359a85539f5ffa237af54b68d3f4fc5124b5d83` |
| `dsh-llm-pi-ai/lib/index.js` | `1a3ae58f9b4493e15459cc5000ec80f21b5d3f4a9dea6ffb6bc28e5b8817ae8a` |
| `dsh-llm-deepseek-api-key/lib/index.js` | `269bd9cfa20c6bc9f96d7487d36c94a5f7dbc5c40bfe3c33bc263fc94c30a07c` |
| `dsh-llm-deepseek-account/lib/index.js` | `385c362bb2675e13e13f6b2b59e58bce5e2c2415b857d98b866bc3f6737873f3` |

Exact evidence:

1. Native retry executor line 173: exhausted normal budget only delegates `return next()`; it appends no exhausted event/disposition. Lines 149/151 append scheduling/started events, not terminal proof. Line 196 exports only Config/RetryId/apply/inject/name.
2. AgentLoop lines 929–939 dispatch `agent/request-error` **inside the still-open step**. Non-retry decision throws LlmError. Lines 800–825 convert that to generic error and append `turn/end`. The plugin waterfall is a pre-terminal recovery seam, not post-terminal resumption authority.
3. Public Agent face has cancel, whenIdle, runMaintenance, send, followup, steer and inject. Send/followup/steer accept identified UserMessage and idle wake creates a turn; maintenance is not request resumption. No public terminal failed-request recovery operation was found in the audited Agent face. The native [execution evidence](../test/retry-policy/native.test.ts) additionally verifies actual budget exhaustion closes a single turn with generic error, emits no exhausted event, and exposes no proposed recovery methods.
4. Count + error text is insufficient: ineligible errors, provider Retry-After refusal, cancellation/disposal and exhausted budget may all delegate/terminate differently. Five recorded retries do not prove a recoverable terminal condition.

Minimum upstream extension: a structured durable terminal request disposition with exact failure/turn/step/provider/policy identity; a host-owned safe failed-request checkpoint; a public latest-failure-bound capability read; and an idempotent/revision-fenced recovery operation. The host must invalidate it after later turns, reset/change/cancel/disposal and route recovery through native request preparation, permission/workspace/Goal admission. It must resume **only** that failed request, never rerun completed tools or an entire turn, append user content, call a provider directly or pretend a waiting open turn has already terminated. Extras must capability-detect this future contract before showing an action.

## Executed validation (not paid-provider or production coverage)

[Native settings tests](../test/retry-policy/settings.test.ts) use actual concrete DeepSeek API-key and pi-ai plugins, their original Config schemas, actual LlmRuntime registrations, native SettingsForms/ConfigEditor/Loader and native Connection. They verify accepted policy registration after volatile updates, exact provider scope, zero/default budgets, secret/header/unknown/sibling preservation, revision refusal, authentication/Host/Origin, MIME/body bounds and semantic refusal. No model/provider network call occurs.

[Native execution tests](../test/retry-policy/native.test.ts) run the official native AgentLoop + retry executor with deterministic offline LlmAdapter. They verify normal5 = six dispatches/five retries/one step/one turn; always retries AUTH permanently past five and native cancellation during retry seven prevents another dispatch. No synthetic user message is added.

[Browser test](../test/retry-policy/browser.test.ts) runs esbuild-emitted React UI in real isolated Chromium against the actual native settings route and owner launch-token login on an OS-assigned disposable port (asserted not 3080). It verifies fixed 25/25/0 persistence, real HTTP 413, stale conflict + latest-state discard, explicit unlimited acknowledgement, native provider registrations and no recovery button. This is emitted source/browser evidence; packed-consumer evidence, when executed, is recorded separately below. It is not the live GUI or paid upstream execution.

TDD observed failures before implementation/fixes: missing mountRetrySettings; MIME 400 instead of 415; missing emitted client module; native authority-bound cookie 401 (fixture corrected via actual launch-token login); stale discard retained 5 instead of accepted 2; concrete route was mislabeled deepseek instead of deepseek-official. Each corresponding focused test was rerun green. Verification-only native stock behavior tests were not claimed as newly implemented host functionality.

Executed command pattern (read-only browser executable path abbreviated; all environment/profile/cache paths are explicit disposable paths):

```sh
TEST_HOME=$(mktemp -d /tmp/extras-retry-regression-XXXXXX)
HOME="$TEST_HOME" DSH_HOME="$TEST_HOME/dsh" XDG_CACHE_HOME="$TEST_HOME/cache" \
DSH_PROFILE=isolated DSH_EXTRAS_CHROMIUM=/path/to/read-only/chrome \
node --test --test-concurrency=1 test/retry-policy/*.test.ts test/modules/retry/*.test.ts
```

Final result: 65/65 pass (58 preserved classifier/native regressions + 7 new policy/native/browser tests), with actual concrete native provider plugins mounted. Final settings checks also read the persisted profile patch for retained test credentials/unknown fields and verify root disposal withdraws the route and captured handler authority. Repository typecheck subsequently passed with exit 0. Root/build/client core/composition were not edited by this lane; no original DSH installation or real HOME/profile/3080 was modified.
