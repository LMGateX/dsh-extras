# rc.2 retry and client recovery lane evidence

## Audited contract before implementation

Baseline: frozen Extras docs `7bd3a1a` + `45667b0`; official source commit `ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c`. Registry rc.2 initially returned 404; any execution below is explicitly source-build evidence, not npm artifact certification.

- [Native failure codes](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/error.ts#L17-L70) now include account sign-in/token, model support/context/config/catalog/replay, request extension/header and unsupported-option permanent cases. Preserve native authority: these machine codes must not become `TRANSPORT` through Extras custom literal mapping, including carrier text. This is an evidence-based compatibility clarification of the existing permanent-failure guard, approved by parent before implementation; it is not a second retry policy or loop. Newly protected list will be recorded with tests below. Native provider `always` can still retry permanent errors.
- [Native retry policy](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/llm/llm/src/retry-policy.ts#L15-L25) retains default normal five retries (six attempts); provider schemas and `resolveRetryPolicy` remain the settings seam. Change the exact-version bridge from rc.1 to rc.2 only, retain Config identity checks and revision-fenced leaf writes, never copy secrets.
- [Native prompt admission](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/commands.ts#L321-L338) accepts eligible empty-content `queue` followups under maintenance; [Remote source](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/index.ts#L467-L491) is `retry`. The durable new user message and changed request history are NOT captured-request checkpoint replay.
- [Native continuation projection](https://github.com/deepseek-ai/deepseek-harness/blob/ddac96760b6edf8fa0fe17cbdcf0b512f4c12b2c/packages/api/session-controller/src/continuation.ts#L8-L48) explicitly admits RATE_LIMIT/SERVER/TIMEOUT/TRANSPORT/EMPTY_RESPONSE/STREAM_CLOSED after admitted human work and a failed attempt, independently of automatic retry configuration. Permanent/tool/cancel/history-only cases cannot stand in for exact optional-protocol proof.
- Fixed rc.2 doc decision 6 already authorizes suppressing stock absent-protocol per-turn unavailable cards. Only `native-recovery-unavailable` is silent; incompatible protocol and transport/action diagnostics remain truthful. Optional `Agent.recovery` stays an independent strict checkpoint protocol, never mapped to native continue. Existing latest-turn/model-origin/seq/session/busy/disposal/idempotency guards remain.

Pre-agreed test seams: exported retry plugin stream; actual native Agent/LLM executor and provider settings routes; exported optional recovery route/factory and native emitted TurnTail slot; native Session Remote prompt operation separately. No live GUI or real HOME/profile/installed host is used.

## Commands and results

### Isolated environment

All upstream APIs were read/grepped from the one complete shared official checkout, not incremental GitHub fetches. Parent provisioned `pnpm run build:artifacts` there (parent reported exit 0). This lane consumes actual emitted rc.2 host/browser outputs, not the installed production host. Node 24.17.0. Tooling symlink is ignored/untracked. No production HOME/profile/GUI, push or release operation was used.

Every execution used a new disposable environment prefix:

```sh
T=$(mktemp -d /tmp/extras-rc2-lane.XXXXXX)
mkdir -p "$T"/{home,dsh,cache,config,data,tmp}
export HOME="$T/home" DSH_HOME="$T/dsh" DSH_PROFILE=isolated
export XDG_CACHE_HOME="$T/cache" XDG_CONFIG_HOME="$T/config" XDG_DATA_HOME="$T/data" TMPDIR="$T/tmp"
export DSH_RUNTIME_ROOT=/tmp/extras-rc2-host.SCmVMY/source/apps/cli
export DSH_EXTRAS_CHROMIUM=/home/dev/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome
```

Chromium executable was read-only; browser profiles/cache are disposable. Browser servers use `listen(0, "127.0.0.1")`, assert port != 3080 and close their servers/browsers with test cleanup.

### Red → green slices

1. `node --test --test-name-pattern="rc2 permanent" test/modules/retry/plugin.test.ts`: red exit 1, ACCOUNT_SIGN_IN_REQUIRED became TRANSPORT. After guard: `node --test test/modules/retry/plugin.test.ts`, exit 0, 21/21. Added 25 protected codes: ACCOUNT_SIGN_IN_REQUIRED, ACCOUNT_TOKEN_INVALID, CLIENT_UPGRADE_REQUIRED, MODEL_UNSUPPORTED, INVALID_MODEL_CONTEXT, INVALID_MODEL_INFO, INVALID_MODEL_MAX_TOKENS, INVALID_MODEL_REASONING, INVALID_REPLAY_STATE, REQUEST_EXTENSION, REQUEST_HEADERS, UNSUPPORTED_OPTION, UNSTORABLE_PROVIDER_ID, NO_CREDENTIAL_STORE, INVALID_ADAPTER, INVALID_CATALOG, INVALID_DIRECTORY, INVALID_DISCOVERY, DUPLICATE_ADAPTER, DUPLICATE_DIRECTORY, DUPLICATE_DISCOVERY, REGISTRATION_DISPOSED, DISCOVERY_UNSUPPORTED, NO_DISCOVERY, MODEL_SWITCH_COMPACTION_FAILED. Three public stream forms per code remain unchanged. Nine native thrown LlmError cases additionally verify normalization and exactly one dispatch.
2. `node --test test/request-recovery/source.test.ts`: red exit 1, incompatible protocol diagnosis sanitized to generic unavailable; green exit 0 after retaining bounded known incompatible/module-disabled reasons. Unknown raw reasons remain stripped.
3. `node --test --test-concurrency=1 test/request-recovery/browser.test.ts test/retry-policy/settings.test.ts`: initially incomplete parent peer links caused MODULE_NOT_FOUND before behavior (parent resolved provisioning, not an API change). Then behavior red exit 1: one absent-protocol card instead of zero; rc.1-only settings pin returned 503. Green `node --test --test-concurrency=1 test/request-recovery/*.test.ts test/retry-policy/settings.test.ts`: exit 0, 11/11 after narrow silence and exact rc.2 pin. Native owner/Host/Origin/MIME/body/CAS/leaf-edit/secret-preservation fences passed.
4. `node --test test/retry-policy/browser.test.ts`: red exit 1 on old rc.1 text; green exit 0 after English/Chinese native-continuation-vs-checkpoint wording. Also asserts permanent-error/repeated-billing risk and required acknowledgement in always mode, fixed/always saves and CAS conflict. Logged HTTP409 is intentional stale revision.

### Final focused integration

Imported parent-approved common runtime fixture commit `0d86dbc57a73afae01d444b6f28bdda42b773b47` (local cherry-pick `ad87b31`); not authored by this lane. No common fixture/root package/lock/readme changes are part of the lane commit.

```sh
node --test --test-concurrency=1 --test-skip-pattern="package manifest declares" test/modules/retry/*.test.ts test/retry-policy/*.test.ts test/request-recovery/*.test.ts test/client/request-recovery-composition.test.ts test/native-recovery/ui-visibility.test.ts test/native-recovery/stock-continue.test.ts
```

**Exit 0, 92 tests, 92 passed, 0 failed**, 15.9 seconds. Local full log: `/tmp/extras-rc2-final.O3u4hx/lane.log`.

- Real Agent/LLM/native executor: default normal five means exactly six requests; always retries permanent AUTH beyond five until native cancellation; same-step clean failed-partial exclusion; real spawn/fork/parallel/cold-resident retry; completed tool exactly once; no Extras redispatch without native executor.
- Seven separate stock Continue generating operation tests call real public SessionController.prompt over real AgentLoop/projection/maintenance/inbox/LLM. Unrelated transport/attachment/workspace faces are deterministic doubles, not a networked whole GUI. Verify durable empty retry user messages, new turns/changed history, native request-id dedup, re-failure then success; stock Agent.recovery absent. Fresh/completed/permanent AUTH/invalid credential/unsupported model/effort/ABORTED/steer/pending-human/maintenance cases refuse without dispatch. **Normal followup evidence, not checkpoint recovery.**
- Actual unchanged emitted native TurnTail/slot/conversation/locale/static registry with emitted Extras for retry split and combined: absence silent, incompatible protocol diagnostic; historical/paged/tool/hook/cancel/unknown-origin proof fail closed; optional checkpoint/session/terminal matching, accepted/rejected/lost-response identities, busy/disposal/module fences. Chromium executes English/Chinese, light/dark, narrow layout and keyboard focus. Existing browser bundle fixture required no API change. Minimal shell and deterministic session transport are explicit: **not whole-GUI or final packed-release certification**.

Actual source-built frontend hashes: index-BgUyXZcc.js SHA256 `c7e9821660f7e0f0524cc7cb1a375a5171eebbe68e167b80d290bd2ea391286d`; vendor-BUMdD3V7.js SHA256 `7675048a90d0419365a342c4eb81713aa8582b82a76b08ba2a8fc27160575265`. Optional protocol execution remains fixture-only. No rc.1 companion shipped, activated or rebranded.

### Parent integration gates still required

- Excluded manifest assertion was explicitly run without exclusion: fails only because frozen root manifest declares engines.dsh=0.2.2-rc.1. Parent owns root/peer/lock update and must rerun it; not waived.
- `node_modules/.bin/tsc --noEmit`: exit 2, exactly two pre-existing Goal-lane errors ([background-work.ts](../src/modules/goal-wait/driver/background-work.ts#L79), lines 79 and170: removed AgentRegistry.isOwnedBy). No retry/recovery/client or added-test type errors. Parent must rerun after integration.
- `git diff --check`: exit 0. Parent owns six-distribution build/pack, actual final packed native/browser/full-GUI gates, source-wide tests/reviews and registry artifact availability; scoped source-build/emitted-client evidence does not waive them.

