# DSH Extras 0.3.1 — standalone migration CLI repair

Draft engineering notes; final acceptance and publication verification must be recorded before release.

## 修复 / Fixes

- 修复独立 `dsh-extras-migrate` 在 profile 未 hoist Cordis 时的启动失败：离线路径不再提前加载仅运行时需要的宿主 peer。五个发行包共享同一修复，公共迁移 API 的离线导入也不再要求本地 Cordis。
- 实际运行时所有权证明仅从显式宿主安装 anchor 获取已审计 Cordis，并验证版本与 Context/root 结构。缺失或不兼容证据保持 unverified；不捆绑或安装第二份 Cordis，不放宽 Goal 的所有权保护。
- 修复实际包管理器 `.bin` 符号链接启动时静默退出的问题：主入口两侧采用规范路径比较，同时保持被导入模块不自动执行 CLI。
- 安装文档明确 `--install-anchor` 是 DSH 应用内的绝对文件路径，通常为其包清单，而不是 profile 清单或目录。

## Compatibility and limits

Audited baseline remains DSH **0.2.2-alpha.3**, Cordis **4.0.6-alpha.2**, native Loader **1.0.7-alpha.2**, Node **>=24.9.0**. No future-host or host-free migration promise. Offline Goal operations still cannot prove absence of live programmatic owners and conservatively require native runtime/restart verification. Existing activation same-value-overlap and exact-artifact limitations remain unchanged.

No feature policy, four-strategy default, configuration shape, public tool identity or journal/rollback ownership invariant is intentionally changed. Choose combined or distinct non-overlapping splits.

## Installation and verification

Five synchronized 0.3.1 tarballs and SHA256SUMS are intended for the new Release; never overwrite 0.3.0 assets. See [installation instructions](https://github.com/LMGateX/dsh-extras/blob/v0.3.1/README.md#install) and the [validation record](https://github.com/LMGateX/dsh-extras/blob/v0.3.1/docs/VALIDATION_031.md).

Direct GitHub publication only: no GitHub Actions or npm publication. **本次开发和发版不为作者本机实际 DSH/profile 安装、升级或重启。** All acceptance installs and native/browser processes use explicit disposable environments.
