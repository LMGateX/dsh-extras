# DSH Extras 0.5.1 — recovery and workspace scope refinement

0.5.1 是 0.5.0 的后续修正，宿主基线不变：精确 **DSH 0.2.2-rc.1 / Cordis 4.1.0**，Node **>=24.9.0**。在最终 0.5.1 源码与六个重建包上，类型检查、**698/698** 源码测试、**49/49** 产物/原生 CLI/浏览器测试和 **6/6** 打包后原生恢复测试全部通过，零失败/跳过/取消。详细命令、哈希和限制见 [release validation](VALIDATION_051.md)。

## 本版改进 / Changes

- **恢复入口只在真实最新失败时出现**：完整的原生回合大纲确认最新回合，连续的原生失败请求证据确认是模型请求错误；普通完成、运行中、取消、历史、工具准备/钩子异常和未知来源保持静默。可点击操作仍只来自当前、最新、修订绑定的原生预算耗尽检查点，不新增消息、不重放已完成工具、不绕过原生准入。
- **恢复区域独立呈现**：标题、文本状态、说明、边框/间距和分隔的主次操作，使用原生明暗主题，支持中英文、窄屏和键盘焦点，不再与普通上下文混在一起。
- **全局与多工作区设置**：模型默认值和两个共享压缩设置入口都可以在全局默认与原生发现的工作区之间切换；没有覆盖的工作区继承全局，并显示来源和有效值。显式 `null`、`false` 和空规则仍按既有语义保留；读取/切换不写配置，脏/保存中锁定切换；重置只影响所选工作区。已保存但当前不在列表中的工作区 ID 仍可访问。
- **原生继承边界修复**：合法 opaque 工作区 ID（例如 `toString`）没有自身覆盖时，原生共享压缩执行器正确回退到规范默认值，不再受 JavaScript 原型成员影响。
- 包版本、README 安装地址和测试版本断言统一为 0.5.1；canonical schema、存储、profile 命名空间、权限和单执行器选举不变。

## Compatibility, safety and limits

- 仅针对上述精确宿主基线；alpha.3 用户保留 0.3.1。
- 普通 DSH 仍然没有安全的终止请求恢复操作，因此恢复按钮如实不可用。非官方 native recovery companion 与 0.5.0 **字节相同**，本次重新作为独立资产提供，但它不是官方 DSH 发行；切换原生宿主是另一次受保护安装，必须使用匹配的 profile 备份。
- **已安装/已保存不等于已经运行**。安装包、服务端进程和浏览器缓存是不同状态；本次发布本身不会隐式重启或操作在线 GUI。
- 没有 GitHub Actions、npm 发布、合成消息、整个回合重放或第二个请求循环。

## Assets and installation

六个同步 Extras 包共用同一功能源码；可选的非官方 companion 是单独命名的资产，不属于官方 DSH。先备份所选 profile，再用原生插件管理器安装：

```sh
dsh plugin --profile YOUR_PROFILE add https://github.com/LMGateX/dsh-extras/releases/download/v0.5.1/dsh-extras-0.5.1.tgz
```

下载后请用同目录的 `SHA256SUMS` 校验；GitHub 自动生成的源码归档不是可安装的 Extras 包。

| Asset | SHA-256 |
| --- | --- |
| dsh-extras-0.5.1.tgz | `542a935a946bd63a6121c5908b52d87acff37c09d94b81639c437c8c04c3559a` |
| dsh-extras-compact-context-0.5.1.tgz | `83914d85fc2a81a8f227470f36a3d86eab9d247532b3b6b793c8b91a05bcb635` |
| dsh-extras-retry-0.5.1.tgz | `30fa1b4abc9b4dbdd5ad78a739e8de1a1aa1e79c9427058dd9f7f062a3a03d6a` |
| dsh-extras-chime-0.5.1.tgz | `056492302450456f59fcccad5c3f8a5c563cc55ca6642689656993c49f03c25e` |
| dsh-extras-goal-wait-0.5.1.tgz | `81bc4bc03595cb5741113be411157c41145fb8979b1a649ce20a83975d60e217` |
| dsh-extras-model-policy-0.5.1.tgz | `cd48403bb98a37f7241cf750ea0d037909fc7a5058016ad9ac21c249c9347861` |
| dsh-native-recovery-companion-0.2.2-rc.1-native-recovery.0.tar.gz | `c49d972192de304eae35deb9f5d520446af7b0b6ddcc42ba15c0faad3482a6ec` |

Direct GitHub publication only: **no GitHub Actions and no npm publication**.
