# DSH Extras 0.8.0 / DSH 0.2.3-alpha.2

## 中文

适配 [DSH 0.2.3-alpha.2](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.3-alpha.2) 的官方 npm 宿主。需要 Node.js `^24.22.3 || >=26.13.1`；不扩大宿主版本范围。组合包和六个独立功能包保留现有功能、默认开关和迁移安全限制。

- 适配 Cordis/Loader、运行时认证、浏览器会话状态和启动覆盖文件读取接口。使用独立 CLI 迁移时，如 DSH 启动使用了覆盖文件，每次都要按原顺序传入同一组 `--overlay PATH`。Goal 原生驱动字节未变；不匹配的驱动或宿主仍然拒绝接管。
- 配置界面随原生语言服务更新，不依赖插件管理器先加载；会话状态服务不可用时，提示音仍保留不依赖它的功能。继续中断的回滚必须使用原来选择的模块集合。
- 压缩模型和重试执行仍由 DSH 决定。`CONTENT_REFUSED` 保持永久错误；原生「继续生成」不等于原请求无损重放。
- 宿主时区模块使用精确校验的 alpha.2 客户端产物，保留原有的完整页面重载和过期来源拒绝规则。

DSH 0.2.2-rc.4 请继续使用 [Extras 0.7.1](https://github.com/LMGateX/dsh-extras/releases/tag/v0.7.1)。发布资产包含七个 `.tgz` 与 `SHA256SUMS`。Extras 未发布到 npm。

## English

Targets the exact official [DSH 0.2.3-alpha.2](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.3-alpha.2) npm host and requires Node.js `^24.22.3 || >=26.13.1`. One combined and six standalone distributions retain the existing functionality, feature defaults, and migration safety boundaries.

- Adapts Cordis/Loader, runtime authentication, client session status, and launcher overlay inputs. For standalone migration, repeat the same ordered `--overlay PATH` arguments on every command if the DSH launcher uses overlays. The native Goal driver bytes are unchanged; foreign or mismatched host/driver ownership still fails closed.
- Settings follow the native locale without waiting for Plugin Manager. When Session status is unavailable, Chime retains behavior that does not need it. Resume an interrupted rollback with the original module selection.
- DSH still owns compaction routing and retries. `CONTENT_REFUSED` stays permanent in Extras classification. Stock Continue generating is not exact failed-request replay.
- Host timezone uses exactly checked alpha.2 client artifacts and still requires a full reload for source changes; stale and raw sources are refused.

Use [Extras 0.7.1](https://github.com/LMGateX/dsh-extras/releases/tag/v0.7.1) for DSH 0.2.2-rc.4. Verify the seven GitHub release archives with `SHA256SUMS`. No Extras npm publication or production installation is part of this release.
