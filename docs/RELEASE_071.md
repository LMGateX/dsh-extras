# DSH Extras v0.7.1 — exact DSH 0.2.2-rc.4 compatibility

## 中文

此版本适配官方 npm **DSH 0.2.2-rc.4**，要求 Node >=24.9.0、Cordis 4.1.0。仍提供组合包与六个独立功能包，共七个同步版本 0.7.1 的发行包。

- 一次性完整克隆官方源码，对比 rc.3 与 rc.4。rc.4 的非 manifest 实现变更仅限 DeepSeek 内容拒答翻译、`dsh-llm` 失败码和实验性 LiveShare 修复；Extras 消费的 Agent、LLM、Session、压缩、重试、Goal 和时区目标源码没有实现变更。
- 使用实际官方 npm rc.4 依赖图重新验收，协同刷新开发预检、Goal 驱动/所有权/迁移、原生重试设置、共享压缩和 host-timezone 的精确版本守卫。已审计的 Goal 编译摘要与三个浏览器字节指纹保持不变；旧版本、未知版本、变更字节和外来 owner 仍 fail closed。
- rc.4 新增原生 `CONTENT_REFUSED`：Extras 的流错误分类和压缩重试分类都将其视为永久失败，不重映射为 `TRANSPORT`，也不重试被拒摘要；不新增自动重试循环、合成消息或额外 provider 派发。
- 保留 Goal-wait 的 activation/replacement/native/off 四种策略及默认值；保留默认关闭的模型/时区策略、单一共享压缩执行者、原生模型选择/保留/重试权威，以及迁移和恢复的 fail-closed 边界。
- 原生“继续生成”仍是普通 retry-source 跟进，不是精确失败请求检查点重放；不附带或启用 rc.1 非官方恢复组件。

**版本匹配：** rc.4 使用 0.7.1；rc.3 保留 0.7.0；rc.2 保留 0.6.0；rc.1 保留 0.5.1。历史预览/发行资产不被覆盖。

**安装示例（非本次执行动作）：**

```sh
dsh plugin --profile web add https://github.com/LMGateX/dsh-extras/releases/download/v0.7.1/dsh-extras-0.7.1.tgz
```

按需使用其他独立包；先校验 SHA256SUMS。包不捆绑第二份 DSH/Cordis，也不会执行 postinstall 迁移。rc.3 / Extras 0.7.0 用户仍可使用保留的旧资产：`https://github.com/LMGateX/dsh-extras/releases/download/v0.7.0/dsh-extras-0.7.0.tgz`。

本发行不安装、更新、配置或重启本机生产 DSH；不使用 GitHub Actions；不发布 Extras 到 npm。此说明不预称后续网络上传/下载回执。

## English

Exact compatibility refresh for official npm **DSH 0.2.2-rc.4**, Node >=24.9.0 and Cordis 4.1.0. Seven synchronized 0.7.1 distributions retain the same six feature implementations.

One complete official source clone and independent audits found the rc.4 non-manifest production delta limited to DeepSeek content-refusal translation, the `dsh-llm` failure code and an experimental LiveShare fix. Exact guards move together; the audited Goal compiled digest and three browser fingerprints are unchanged. Unknown versions, changed bytes and foreign owners remain fail-closed. rc.4's native `CONTENT_REFUSED` stays permanent in Extras stream classification and compaction retry classification; there is no new retry loop, synthetic message or provider dispatch. Native compaction/model/retry authority, the four Goal strategies/defaults, one shared executor and migration fail-closed boundaries are preserved. Native Continue remains ordinary retry-source follow-up, not immutable failed-request replay.

Use Extras 0.7.0 for rc.3, 0.6.0 for rc.2 and 0.5.1 for rc.1. Prior releases/previews remain unchanged; the retained rc.3 asset is `https://github.com/LMGateX/dsh-extras/releases/download/v0.7.0/dsh-extras-0.7.0.tgz`. This release does not install, update, configure or restart local production DSH. No GitHub Actions or Extras npm publication.

## Validation and publication boundary

Final 0.7.1 archives were rebuilt/repacked and passed **825/825 complete source tests** and **67/67 complete packed/native/browser tests**, including seven distributions, six split whole-GUI persistence runs and combined/host-timezone packed browser lifecycle cases. Native preflight/typecheck and clean consumers/public types passed; independent Standards/Spec follow-up reviews passed after documentation corrections (see final review). Only the shipped README and final identity/assertions differ from the checked candidate; runtime/client payloads remain byte-identical.

[Final validation](https://github.com/LMGateX/dsh-extras/blob/v0.7.1/docs/VALIDATION_RELEASE_071.md) records frozen inputs, commands, log hashes, seven archive hashes, identity comparison, isolation and process cleanup. [Independent review](https://github.com/LMGateX/dsh-extras/blob/v0.7.1/docs/REVIEW_RELEASE_071.md) separates review judgment from execution. This source note does not preclaim the subsequent network upload/download receipt.
