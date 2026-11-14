# DSH Extras v0.6.1 — exact DSH rc.3 compatibility

## 中文

此版本适配官方 npm **DSH0.2.2-rc.3**，要求 Node>=24.9.0、Cordis4.1.0。仍提供组合包与五个独立功能包，共六个同步版本0.6.1的发行包。

- 一次性完整克隆官方源码，对比 rc.2 与 rc.3；Extras 消费的 Agent、LLM、Session、压缩、重试和 Goal 核心接口没有实现变更。新增工作区/侧栏入口不要求改写现有接入。
- 使用实际官方 npm rc.3依赖图重新验收，协同更新开发预检、Goal驱动/所有权/迁移、原生重试设置及共享压缩的精确版本守卫。原有编译字节指纹、生命周期位置和未知/外来所有权拒绝规则保持不变。
- 保留 Goal-wait 的 activation/replacement/native/off 四种策略及默认值。原生推进中任务树汇合不等于通用 Jobs 等待；只需要原生任务树协调时可选 native。
- 保留默认关闭的模型/压缩策略、单一共享压缩执行者、原生模型选择/保留/重试权威，以及迁移和恢复的 fail-closed 边界。
- 原生“继续生成”仍是内容为空的新 retry 消息/普通 follow-up，不是精确失败请求检查点重放。不会附带或启用 rc.1 非官方恢复组件。

**版本匹配：** rc.3使用0.6.1；rc.2保留0.6.0；rc.1保留0.5.1。历史0.6.0-rc.1源码构建预览不被覆盖。

**安装示例（非本次执行动作）：**

```sh
dsh plugin --profile web add https://github.com/LMGateX/dsh-extras/releases/download/v0.6.1/dsh-extras-0.6.1.tgz
```

按需使用其他独立包；先校验 SHA256SUMS。包不捆绑第二份 DSH/Cordis，也不会执行 postinstall 迁移。

## English

Exact compatibility refresh for official npm **DSH0.2.2-rc.3**, Node>=24.9.0 and Cordis4.1.0. Six synchronized0.6.1 distributions retain the same five feature implementations.

One complete official source clone and independent integration/Goal audits found no consumed core implementation changes from rc.2. Exact guards move together; the observed Goal compiled digest and lifecycle coordinates are unchanged. Unknown bytes, unsupported versions and foreign owners remain fail-closed. Native compaction/model/retry authority, four Goal strategies/defaults, immutable workspace provenance and one shared executor are preserved. Native Continue remains ordinary retry-source follow-up, not immutable checkpoint recovery.

Use Extras0.6.0 for rc.2 and0.5.1 for rc.1. Prior releases/previews remain unchanged. This release does not install, update, configure or restart local production DSH. No GitHub Actions or Extras npm publication.

## Validation and publication boundary

The initial isolated compatibility candidate passed751/751 source tests and54/54 packed/native tests including six real GUIs. Final-identity README changes require rebuilding/repacking and rerunning all final gates; those results are recorded in docs/VALIDATION_RELEASE_061.md before publication. This source note does not preclaim the subsequent network upload/download receipt.
