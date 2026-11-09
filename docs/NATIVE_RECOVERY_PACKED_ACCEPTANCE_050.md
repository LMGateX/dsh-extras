# Unofficial native recovery candidate — packed adapter acceptance

This appendix records an independently executed integration gate, not an official DSH release or a production-install approval. The [native extension contract](NATIVE_RECOVERY_050.md), [adapter contract](REQUEST_RECOVERY_050.md), and [release acceptance matrix](ACCEPTANCE.md) remain authoritative.

## Reproducible opt-in entry

[packed-native.acceptance.ts](../test/native-recovery/packed-native.acceptance.ts) is deliberately **not** named *.test.ts and is not added as a default npm-test skip. It requires an explicit disposable HOME/DSH_HOME/profile and an explicit unofficial candidate manifest. Missing prerequisites fail rather than skip. Its [candidate fixture](../test/native-recovery/candidate.fixture.ts) extracts actual Extras archives read-only into its own temporary consumer, uses the staged native dependency graph, verifies all five replacement package versions/index SHA-256 values and one Cordis Context identity, and executes actual native Loader, Include, ConfigEditor, Connection owner admission, Agent registry, AgentLoop, LLM runtime, native Retry and tool executor.

Example (replace the candidate paths deliberately; do not use an installed personal host):


default command:

    TEST_HOME=$(mktemp -d /tmp/extras-candidate-acceptance-XXXXXX)
    HOME="$TEST_HOME" DSH_HOME="$TEST_HOME/dsh" XDG_CACHE_HOME="$TEST_HOME/cache" \
    DSH_PROFILE=isolated \
    DSH_EXTRAS_CHROMIUM=/path/to/read-only/chromium \
    DSH_RECOVERY_CANDIDATE_ANCHOR=/tmp/isolated-candidate/node_modules/@deepseek-ai/dsh/package.json \
    DSH_RECOVERY_CANDIDATE_MANIFEST=/tmp/isolated-candidate/manifest.json \
    node --test --test-concurrency=1 test/native-recovery/packed-native.acceptance.ts

Optional DSH_EXTRAS_ARTIFACT_DIR selects a frozen archive directory. No build/dist writer runs in this gate. Every test rehashes its consumed archive at the end, prints its exact hash and native implementation identity, and uses an OS-assigned port asserted not 3080. All model responses come from registered offline LlmAdapter implementations; no paid/provider credentials or network calls are used.

## Three gates for each of combined and retry-only

1. **Real native owner HTTP + packed host adapter.** A normal native budget ends an actual turn with error and a structured budget-exhausted checkpoint; GET returns that checkpoint. Concurrent POSTs carrying different browser operation IDs must share the first canonical native receipt/execution and cause one additional provider dispatch. The resumed GenerateOptions deeply equal the failed request except a fresh AbortSignal. No new user/developer/system messages are appended; the old terminal turn stays closed. Structured request/failure and request/recovery records are observed. Native ConfigEditor disable prevents execution; a current native agent/pre-step policy rejection prevents dispatch; changed accepted context rejects an expired checkpoint. Native retry budget two gives the finite request counts 3 → 6 → 7 and a strictly newer checkpoint on re-exhaustion. Native owner authentication and foreign Origin produce 401/403 respectively.
2. **Actual native chat owner + packed client in Chromium.** [The browser carrier](../test/native-recovery/browser-bundle.fixture.ts) reads unmodified emitted native client factories and the staged stock web-frontend index/vendor assets, recording hashes. It obtains the actual static-module table from the stock WebBoot public module-loader create seam rather than replacing SlotCore/store/primitives with mocks. Stock boot stops deliberately at that boundary; this is not whole-GUI boot. Real emitted UiConversation/ConversationNodeAssembler derive the closed turn and native tail node from the complete native Session event history. Real emitted ui-chat apply registers TurnTailNodeView and declares its own turnTail child slot. The minimal acceptance root declares only the keyed native chat-node parent seat; it **does not fabricate a turnTail owner**. The actual native owner calls renderSlot and the actual packed Extras contribution displays the action. Reload restores eligible availability; a synchronous double click forwards one POST. A deliberately lost accepted HTTP response is retried using the same operation identity, gives one native execution, and displays accepted-started/not-completed wording. Refresh then forwards the complete post-recovery history, including both new required audit event types, through the actual assembler with no filtering; historical/current tails have no consumed action. Native module disable unregisters the contribution. The only permitted browser console resource error is exactly the intentionally aborted accepted POST URL; all other console/page errors fail.
3. **Completed tools + actual process restart.** A real tool executes before the terminal request failure. Recovery resumes exactly that failed request including its committed tool result; the completed tool count stays one, not two. Native Agent replacement from full historical seeds invalidates exact recovery. The [restart fixture](../test/native-recovery/restart.fixture.mjs) also launches in a fresh OS process using the same explicit candidate anchor, ingests the complete native event seed (including new audit events) through public Agent creation, observes exact-snapshot-unavailable, rejects the old command, and performs zero provider requests. This proves process-local non-reconstruction; it is **not** a claim to restore a failed request from durable journal alone.

## Native identity and observed progression

The independently staged candidate used here is version 0.2.2-rc.1-native-recovery.0, implementation commit 2121312aacce481d2970ae582fdfc9a3056039ca, baseline tag dsh-v0.2.2-rc.1 / commit 66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db. Its manifest says official:false and process-local checkpoint lifetime. The five replaced packages are dsh-agent, dsh-agent-loop, dsh-session, dsh-llm-retry and dsh-goal. Original host/profile was not modified by this acceptance lane.

Initial c69 packed scope run: owner-HTTP same-operation gates passed 2/2; native owner/browser/lost-response gates passed 2/2; native completed-tool/fresh-process gates passed 2/2. These were exploratory candidate results, **not a final release receipt**. The c69 combined archive hash was a32ad53936d484554745b64280eef4e14690e648a2e3d4ae0e5867ebbc6127a2; retry-only was 4892047f7ee47dee8075464ce8eea44b03934d83cedbbb7e05b98fe44b479343.

An independently identified cross-layer defect was then reproduced RED against both actual packed host adapters: different browser operation IDs for one checkpoint produced a native canonical first-operation receipt, but Extras incorrectly required the submitted operation ID and returned 503. [The source bridge](../src/modules/retry/recovery.ts) and [client receipt parser](../client/request-recovery.ts) now retain the canonical native operation ID unchanged, while strictly validating its bounded identifier, execution identifier and exact checkpoint match. Public adapter/transport cases passed 6/6 after commit 1b50d02f44ad9eb046852ac19bd3e6bac6ed878c; actual packed distinct-operation GREEN must be recorded against the final rebuilt archive hashes, not inferred from source results.

Final rebuilt-archive six-case receipt: pending the parent-owned build/pack freeze. This appendix must be updated with the actually executed hashes/results before claiming that final gate passed.

## Explicit remaining boundaries

- The browser acceptance uses real installed stock frontend components, renderer, registry, native event window and assembler, but its **session transport and accepted configuration store are bounded fixture faces**, not the complete SessionController Remote mux/wire decoder or full sidebar/composer/application boot. No required audit event is dropped to obtain a button. There is no claim that a stock complete wire reader accepts newly required candidate records; complete native-controller/GUI bootstrap compatibility is a separate gate.
- Restart uses actual fresh-process public Agent creation from complete native event seeds, not a full CLI cold-open of a persisted native JSONL profile. Candidate persistence compatibility and downgrade refusal remain the native extension's separate tested contract.
- The current native policy test uses the real agent/pre-step admission pipeline with an explicit rejecting policy. Workspace/archival/Goal-specific recovery policy behavior belongs to the native extension's focused and baseline suites; this appendix does not substitute a generic fixture for those particular policies.
- The adapter's legacy native-like fixture remains useful unit evidence but is not used as proof of the genuine native checkpoint implementation here.
- No production switch/restart, upstream publication, or production-profile rollback is authorized or performed by these tests.
