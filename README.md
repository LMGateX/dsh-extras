# DSH Extras

One install, independent enhancements. **一体安装，功能独立开关。**

Compact-context, native retry classification, browser session chimes and goal waiting behind one plugin card. Four genuinely independent single-feature packages are built from the same source, not maintained as forks.

**Target (Extras 0.4.0):** exact DSH `0.2.2-rc.1`, Node `>=24.9.0`. No unverified broad compatibility claim. Alpha.3 users should retain Extras 0.3.1. Not published to npm: install a GitHub Release tarball.

## Distributions

| Package | Capabilities |
| --- | --- |
| dsh-extras | All four, independently selectable |
| dsh-extras-compact-context | Native-policy compaction tools, independent request reasoning policy, optional status/guidance/pressure and PTC timeouts |
| dsh-extras-retry | Stream-error and empty-response classification; official DSH retry owns execution |
| dsh-extras-chime | Completion/blocked/question/error sounds, quiet hours, rest mode, sidebar and banners |
| dsh-extras-goal-wait | Four goal-continuation strategies: activation gate, pinned background-aware replacement, native, or off |

Choose the combined package **or** any subset of distinct splits. Two distributions claiming the same capability produce a fail-closed ownership conflict, not duplicate hooks/audio. Splits do not require the combined package and omit unrelated feature implementation and audio.

## Install

Choose the intended profile explicitly. Example for an existing web profile:

```sh
dsh plugin --profile web add https://github.com/LMGateX/dsh-extras/releases/download/v0.4.0/dsh-extras-0.4.0.tgz
```

For one capability replace the asset name, e.g. `dsh-extras-retry-0.4.0.tgz`. Verify downloads against release SHA256SUMS. The matching DSH runtime must already exist; packages do not install a second host runtime.

Open **Plugins → DSH Extras → Configure**. All module settings, including the compaction reasoning editor, follow the native Chinese/English language preference and theme. With no locale service, settings use Chinese, matching the preserved Chime editor. Switching language keeps unsaved drafts; technical configuration keys, native route/model/effort IDs, and raw migration diagnostics are not translated. Combined settings have compact-context, retry, chime and goalWait sections. Each module and every original option is independently editable. Status distinguishes active, disabled, missing dependency, migration-pending, conflict and failed. Enable/disable joins feature disposal before reactivation. Policy-only changes use validated live snapshots without remounting in-flight retry classifiers or releasing goal holds.

Fresh installs use preserved source defaults. When any legacy plugin is discovered, absent capabilities begin disabled and can be explicitly enabled later. Explicit Extras values win over imports. Missing optional services affect only the corresponding module. In native web presets, compact-context operations follow the selected agent’s isolated native compaction backend and policy; Extras does not enable a second global engine or rewrite presets. A preset without a backend returns an explicit unavailable result for that agent.

## Automatic legacy migration / 自动迁移

First active load inspects **only the owning profile**, validates effective configuration, records protected backups/journal and persistently disables old bundle/row owners after preparation. Old packages and configuration are retained. No postinstall effects, profile sweep, forced restart or uninstall.

Known predecessors: dsh-tool-compact-context, dsh-stream-retry, dsh-session-chime and the ordinary dsh-goal-wait-gate row at audited versions **0.3.0 and 0.4.23**. Version 0.3.0 imports the activation strategy; 0.4.23 preserves its selected strategy. Unknown versions, dynamic expressions, ambiguous instances, overlays, read-only profiles and experimental **startup** lifetime owners fail closed: old ownership remains, the affected new module is gated, and the report explains the problem. The ordinary 0.4.23 replacement strategy is not the unsupported experimental startup entrypoint.

**Saved is not active.** If native reconciliation cannot safely finish, restart DSH yourself after finishing ongoing work. Migrating legacy chime requires a fresh host process and **full page reload** because old timers and in-flight decode cannot be reliably cancelled. Extras checks fresh host-index evidence, not browser wall-clock time; it stays silent when proof/status is unavailable.

Read the migration report in Extras settings. Profile `.dsh-extras/` holds permission-restricted journal/backups; these can contain original feature text, so do not publish them. Repeated starts do not reimport over later Extras edits.

### Inspection and selective recovery

Every distribution exports `./migration` and the `dsh-extras-migrate` CLI. In 0.3.1, independent CLI help and offline API startup no longer require profile-hoisted Cordis or native loader hooks. Do not install another Cordis copy to make the CLI start. Actual migration still uses matching native helpers from the explicit host installation anchor: an absolute file inside the DSH application, normally its package manifest, not the profile manifest or a directory. Explicit profile/home/install anchor are mandatory for migration operations; nothing scans all profiles:

```sh
dsh-extras-migrate inspect --profile-dir /absolute/profile --dsh-home /absolute/dsh-home --install-anchor /absolute/dsh-install/package.json
dsh-extras-migrate dry-run --profile-dir /absolute/profile --dsh-home /absolute/dsh-home --install-anchor /absolute/dsh-install/package.json
dsh-extras-migrate retry --profile-dir /absolute/profile --dsh-home /absolute/dsh-home --install-anchor /absolute/dsh-install/package.json
dsh-extras-migrate rollback --operation OPERATION_UUID --modules retry,chime --profile-dir /absolute/profile --dsh-home /absolute/dsh-home --install-anchor /absolute/dsh-install/package.json
```

For splits add `--distribution dsh-extras-retry` (or the selected split). Rollback restores only migration-owned values that still match its writes and refuses conflicting later edits. Handover back is staged: first gate Extras, stop the currently recorded owning host processes when instructed, then repeat explicit rollback to restore old selection. Every enabled target host registers before activation; restoration waits for its actual process to stop, not merely the process that originally migrated. An offline CLI-created migration with no later runtime owner can also complete recovery after that CLI exits. New overlapping owners or ambiguous edits refuse restoration. Simply disabling Extras never silently re-enables legacy plugins. The CLI binary lives in the selected profile’s `node_modules/.bin`; invoke its absolute path if it is not on your PATH.

## Configuration shape

The canonical module id is `compact-context`. The development-only `context` id is removed without aliases, journal translation or automatic configuration rewrites; use the new key explicitly. Native `compact_context` / `context_status` tools and the predecessor `dsh-tool-compact-context` identity are unchanged.

```yaml
modules:
  compact-context:
    enabled: true
    compactTool: true
    statusTool: false
    compactionReasoning:
      enabled: false
      rules:
        - scope: all
          mode: inherit
  retry:
    enabled: true
    errorCodes: [upstream_stream_read_error, stream_timeout, stream error]
    providers: []
    retryEmptyResponse: true
  chime:
    enabled: true
    restMode: false
  goalWait:
    enabled: true
    strategy: activation
    waitForJobs: true
    waitForSubagents: true
    maxHoldMs: 0
migration:
  auto: true
```

Splits use this same envelope but expose only their module. `maxHoldMs: 0` means no forced expiry. Compact-context status/guidance/pressure extras remain opt-in. Native retention, provider routing and retry budgets stay native. Goal waiting changes process-local activation only, never durable phase.

## Grouped editing / 分组编辑

Retry codes, provider routes and empty-response classification share one staged draft. Compact-context retry count/delay and PTC default/per-model timeouts share another; Goal-wait strategy and waiting policy are saved together. **Save** submits each group in one native revision-fenced mutation; **Discard** drops local edits. **Reset to inherited** stages removal of explicit fields and takes effect only after Save, including boolean fields. A concurrent configuration change retains your draft but blocks overwriting the newer revision. Language changes do not discard drafts.

重试、压缩超时和 Goal-wait 策略采用分组草稿：保存时整组原子提交；放弃只清除本地修改；“恢复继承值”先暂存字段移除，再点保存，不会把当前默认值写成永久覆盖。界面的超时单位为秒，存储仍为毫秒，显式 0 与空列表/映射保留原有含义。水位阈值 notifyAtRatio / pressureStep 也可直接编辑，下一次相应提示/状态读取使用新值。请求推理策略仍有独立编辑器，不会因启用工具而自动启用。

## Goal continuation strategies / Goal 续跑策略

Durable goal phase (active/paused/complete/blocked), process-local armed/disarmed activation, gate-owned holds and native progressing-descendant joins are different concepts. Waiting must not masquerade as changing durable goal phase.

| Strategy | Actual behavior |
| --- | --- |
| activation (default) | Keep the official stock driver; the conventional gate disarms while configured jobs or registered descendants remain and releases its owned hold afterward. This deliberately retains the older all-live-descendant policy. |
| replacement | Temporarily suspend the verified stock driver and run the exact-artifact-pinned native-derived driver. Job eligibility waits without disarming; the audited native join handles progressing descendants without imposing a second hold on idle/parked resident children. |
| native | Keep/restore the official driver with no Extras wait gate. |
| off | Suppress automatic goal continuation while the module is enabled. This is **not** equivalent to disabling the module. |

Disabling the module or Extras removes its gate/port effects and releases temporary stock-driver suppression. It does not rewrite the official row to permanently disabled and does not re-enable legacy plugins. A native row explicitly disabled or removed by the user is not forcibly restored. Ownership switches join the previous driver teardown before starting another; busy/failed/unknown transitions are reported rather than silently mounting a second continuation driver. Saved **Requested** strategy and live **Mounted** behavior/fallback are displayed separately; a mounted feature shell alone is not proof its continuation driver is active.

**Known activation limitation:** the native boolean seam cannot identify an overlapping, repeated external disarm during an already-owned gate hold. Such a same-value call can be indistinguishable from the gate hold, so activation cannot offer an unconditional external-overlap ownership guarantee. Replacement waiting avoids this gate disarm/resume pattern. Ordinary external disarm before acquisition and paused/completed/blocked goals remain protected. Driver switching uses a temporary descriptor-owned, exact-artifact lifecycle observer; unknown/changed call-frame shapes never grant permission to resume. This is a narrow compatibility adapter, not an official native authority token.

**激活门控的已知限制：** 门控已持有 disarmed 状态时，外部再次写入同一个 disarm 可能没有事件或修订变化，因此无法给出绝对的重叠撤权归属保证。replacement 等待不靠临时 disarm/resume，且在当前宿主上沿用原生“正在推进的子任务”汇合语义，不会因仅常驻、闲置或已停放的子 agent 再额外卡住父级。off 会关闭自动续跑；关闭模块则释放 Extras 的临时驱动接管，二者不可混同。

## Public imports / 公共导入

The supported package entries are the Cordis root (name/inject/Config/apply), the native browser-loading side-effect entry **./client**, and the public **./migration** API. The client script is loaded by DSH’s module loader; it is not a standalone React application or an exported server apply function. Declarations describe these actual entries and only the selected distribution’s configuration. Predecessor resolveConfig/client-types/locale subpaths are **not** drop-in compatibility aliases under the new package identities.

## Compaction request reasoning / 压缩请求推理强度

In **Compact-context** settings, agent-facing tools and the request reasoning policy have separate controls. The policy is **off by default**, including legacy imports. Enabling it does not require `compactTool`; keeping `compactTool: false` still allows the policy to cover native pressure, `/compact`, overflow and model-switch summaries. Agent tool/range summaries use the same request boundary. Pruner-only/no-op operations have no LLM request to modify. Disabling the module withdraws both capabilities.

Rules match the **actual outgoing summary provider/model**, not the conversation model. The fixed priority is `provider-model > provider > all`; duplicate targets are invalid. `inherit` reads the exact request session latest durable reasoning effort; a missing value leaves the original request/default untouched and does not try a broader rule. `fixed` supplies an exact adapter-owned effort id and may replace an existing effort. An explicit `rules: []` matches nothing. Identifiers are case-sensitive; no wildcard, alias, effort remapping or silent fallback. `off` is not a universal disable-thinking switch. Native exact-model validation rejects unsupported efforts without an extra retry.

The editor uses advertised effort choices for an exact model when available, with explicit native-id entry when discovery is unavailable. Save/discard/reset and revision conflicts follow native configuration forms. Runtime policy availability is reported independently from tool availability: saved or enabled does not mean active.

**Experimental compatibility boundary:** clone-first wrapping of the native public LLM stream, audited for DSH LLM `0.2.2-alpha.3` / Cordis `4.0.6-alpha.2`; not an official request-transform hook. Unsupported versions/runtime shapes withdraw this policy and preserve original compaction. Audited native provision, isolation, replacement and HMR are included; arbitrary third-party engines or silent service replacement/cached-method paths bypassing native stream access are not a compatibility guarantee. Ordinary conversation/title calls, native retention/routing and cancellation are unchanged. Matching effort can remove one upstream cache-namespace mismatch; it does not guarantee cache hits or lower latency/cost.

See the [fixed contract and synthetic rule examples](<docs/COMPACTION_REASONING.md>) for exact defaults, matching, lifecycle and coverage gates.

## Development

```sh
npm ci --ignore-scripts
npx playwright install chromium
npm run check
npm run pack
npm run test:artifacts
```

Tests resolve the local baseline DSH dev dependency. `DSH_RUNTIME_ROOT` can explicitly select an installed baseline. Native HOME/profile/processes are disposable; no developer live profile is used. The [release specification](<docs/SPEC.md>) and [acceptance matrix](<docs/ACCEPTANCE.md>) define the frozen release gate; [0.3.0 validation evidence](<docs/VALIDATION_030.md>) records executed results and limitations. `DSH_EXTRAS_CHROMIUM` may select an existing Chromium executable for isolated tests.

## Safety boundaries

- No automatic restart, hidden legacy reactivation or experimental startup-driver migration.
- Do not delete running journals or copy them into another profile.
- Audio obeys normal browser gesture/autoplay rules; unlock it in settings. Chime is browser-only.
- Native management concurrency is not advertised as universally atomic: conflicts fail boundedly and require inspection/retry.
- This development/release task does **not** install Extras into the author's active local profile.

MIT. Selected source notices are included in each distribution; chime includes unchanged CC0 sounds and third-party attribution.
