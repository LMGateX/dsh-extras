# DSH Extras 0.3.0 — legacy parity restoration

> Release-candidate notes. Publication is gated by the completed [validation report](<VALIDATION_030.md>); the current integration checkpoint is not release approval.

## 本次恢复 / Restored parity

- **Goal-wait 四策略**：默认 `activation` 保留原生驱动与传统门控；`replacement` 使用精确原生版本派生的后台感知驱动，等待 Job 时不 disarm，沿用原生正在推进的子 agent 汇合；`native` 不加门控；`off` 在模块启用期间抑制自动续跑。关闭模块会释放临时接管，不等于 off。
- **安全切换与实际状态**：等待旧驱动完全退出后再接管；保留用户显式禁用/移除的原生行；区分 Requested、Mounted 与不可用/回退原因。运行时原生行的临时有效禁用视图不是持久配置修改。
- **旧版迁移**：审计并支持普通 Goal-wait 0.3.0 与 0.4.23 的配置语义和最新策略。首次原生恢复证明必须对应真实 canonical Loader entry、同 root、namespace、raw fiber 与活动 registry；仅相同官方 callback 不构成归属证明。实验性 startup owner 与无法验证的运行时保持 fail-closed，不影响其他无冲突模块。
- **完整设置编辑**：Retry 标记/路由/错误码、压缩重试/PTC 超时、Goal 策略/等待策略采用分组草稿和原生 revision fence。恢复继承值会移除显式覆盖，包括布尔值；notifyAtRatio/pressureStep 可编辑。语言切换保留草稿。
- **PTC 与 retry 生命周期**：PTC timeout 适配实际原生 runtime 的挂载、替换和卸载，保留显式请求优先级；empty-response retry 的卸载回归受保护。压缩工具与请求推理策略仍独立。
- **真实公共类型**：五个包为 root、client、migration 提供与实际导出一致、仅所选功能可达的声明；默认化的嵌套输入允许省略默认字段，但规则必填字段不放宽。旧包私有导入路径不提供兼容别名。

## Compatibility and important limits

Audited host: **DSH 0.2.2-alpha.3**, Cordis **4.0.6-alpha.2**, native Loader **1.0.7-alpha.2**; Node **>=24.9.0**. Goal runtime ownership and the native-derived port are exact-artifact adapters, not a compatibility promise for future releases.

Activation retains its documented limitation: a repeated same-value external disarm during an already-held boolean gate can be unobservable. Reliably observed transition revocations must still fail closed. Transition preservation compares complete descriptor ownership and uses the current goal reference; unknown or changed lifecycle call frames never grant rearm authority. Descriptor writes have no native event, so runtime slot loss is checked at observed public checkpoints rather than claimed detectable at assignment. Arbitrary unnamed/unmarked custom schedulers are outside the cooperating ownership model; offline CLI Goal operations remain conservative.

Compaction reasoning remains off by default, tool-independent and an audited experimental request-boundary adapter. No real-provider cache, cost or performance improvement is claimed from deterministic offline acceptance.

## Assets and installation

Five independent, synchronized distributions: `dsh-extras`, `dsh-extras-compact-context`, `dsh-extras-retry`, `dsh-extras-chime`, `dsh-extras-goal-wait`. Choose combined **or** non-overlapping splits. Verify each archive against SHA256SUMS before an explicitly profile-targeted installation; see the [installation instructions](<../README.md#install>).

Direct GitHub Release publication only: no npm publication or GitHub Actions execution. **本次开发/发版不为作者当前本机 DSH/profile 安装、升级或重启。** All acceptance installs and native/browser processes use disposable isolated environments.
