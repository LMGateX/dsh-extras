# DSH Extras 0.4.0 — exact DSH 0.2.2-rc.1 compatibility

Engineering acceptance passed on final repaired bytes: **585/585 source tests and 43/43 packed tests**, zero failures/skips/cancellations. Typecheck/build/pack and independent Standards/Spec rechecks passed; actual packed combined native Web/Chromium and all-five native CLI composition executed. Combined archive SHA-256: `673ef65eede6ae6cb0e51fd41f9232c7d77005ae93ddd7d40e8dfccb92b6d4b6`. See the [validation record](https://github.com/LMGateX/dsh-extras/blob/v0.4.0/docs/VALIDATION_040.md) and [independent review](https://github.com/LMGateX/dsh-extras/blob/v0.4.0/docs/REVIEW_040.md). Publication/download verification is recorded separately after upload.

## 适配与修复 / Changes

- 五个同步发行包适配精确 **DSH 0.2.2-rc.1 / Cordis 4.1.0 / Loader、Include 1.1.0**。这是新的已审计宿主基线，不是任意未来版本兼容承诺；**DSH alpha.3 用户保留 Extras 0.3.1**。Node 要求仍为 **>=24.9.0**。
- 根据官方发布包核对工具、Agent、配置、LLM、Goal、HMR 及原生驱动契约；不把发布公告误当作 alpha.3→rc.1 的源码差异。原生 Goal 驱动入口与此前审计版本字节相同，保留原生策略与 MIT 溯源。
- 修复工具提示使用缓存注册信息的问题：压缩提示和压力引导现在遵循当前 step 的原生 executable scope/toolSet，已关闭、不同 Agent 或未获准的步骤不再误宣告可用工具。
- 将不受支持的 reasoning effort 错误保留为确定性错误；即使用户将其填入自定义重试列表，也不能伪装为 TRANSPORT 重试。默认关闭的推理控制、原生模型选择与重试权限不变。
- 加固迁移所有权证明：在导入原生回调前核对显式宿主 anchor 的驱动版本与源码指纹，并核对 Loader 身份；未知/修改过的驱动、错误 Loader 和外来所有者拒绝进入迁移授权。保持离线无 peer 启动、可恢复 journal、回滚和运行时四策略语义。

## Compatibility, safety and delivery

Choose the combined distribution **or** distinct non-overlapping splits. All five archives share one feature source and external host peers; no second Cordis runtime is bundled. Offline Goal migration cannot prove absence of live programmatic owners and still requires native runtime/restart verification. Existing exact-artifact, transient ownership, browser-autoplay and reasoning reflection boundaries remain; no provider cache/cost/latency guarantee is made.

Full native Web/Chromium acceptance is for the packed combined distribution; all-five native CLI composition, packed/emitted presentation and clean-consumer checks are distinct evidence, not five full native-host browser runs.

Five synchronized 0.4.0 tarballs plus SHA256SUMS accompany this new Release; prior releases are not overwritten. Verify checksums before installing. See [installation instructions](https://github.com/LMGateX/dsh-extras/blob/v0.4.0/README.md#install).

Direct GitHub publication only: **no GitHub Actions and no npm publication**. **本次开发与发版不为作者本机真实 DSH/profile 安装、升级或重启，也不访问在线 GUI。** All dependency/test installs and hosts use dedicated worktrees and explicit disposable environments.
