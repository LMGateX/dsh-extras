# 请求、界面与时区注入调查

> 范围修正：本文保留早期源码观察与回放证据。按[当前主契约](../TIMEZONE_POLICY.md)，功能仅阻止浏览器自动时区上报、改用 DSH 本机值；刷新、注入和后台生命周期事实不再转化为本功能待修任务。

日期：2026-11-16（Asia/Shanghai）。范围：已安装 DSH `0.2.2-rc.3` 的源码阅读，以及实际 `time-context` 模块配合 fake projection/event ports 的隔离特征回放。没有实现时区覆盖，也没有运行真实宿主、浏览器、模型请求、定时任务或生产配置修改。

主契约：[请求上报时区覆盖](../TIMEZONE_POLICY.md)。补充：[工具路径](TIMEZONE_TOOLS_2026-11-16.md)、[后台生命周期](TIMEZONE_LIFECYCLE_2026-11-16.md)。

## 1. 证据身份与限制

下表 S* 是已读安装包源文件的精确 locator：包名统一前缀 `@deepseek-ai/`，版本均为 `0.2.2-rc.3`；仓库内 Extras 来源为基线 commit `c78f7fd50dded258e6a4991b6cc14dc9405e3352`。可由对应版本发布包中的 `src` 复核，而非把文件名当作当前仓库内文件。

包 manifest 的 repository 指向官方仓库并给出目录。官方 [tag ref API](https://api.github.com/repos/deepseek-ai/deepseek-harness/git/ref/tags/dsh-v0.2.2-rc.3)返回 commit `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`，但首次逐文件 raw URL 抓取返回 404，**未完成安装源码与远程 commit 逐字比对**，不能将这些 locator 包装成已验证的 GitHub blob 链接。包版本身份参考 [time-context 清单](https://registry.npmjs.org/@deepseek-ai%2fdsh-time-context/0.2.2-rc.3) 与 [session-controller 清单](https://registry.npmjs.org/@deepseek-ai%2fdsh-api-session-controller/0.2.2-rc.3)；本次未独立下载或比对完整发布依赖闭包。

| 编号 | 包与源码 locator | 已确认事实 |
| --- | --- | --- |
| S1 | `dsh-api-session-controller src/client/time-zone.ts:8–13` | 直接调用浏览器 Intl 检测；无偏好解析 |
| S2 | 同包 `src/client/sessions/session.ts:270–310`；`src/client/contract/session.ts:98–103` | 普通与人工子 agent prompt 都直接采样；内置 prompt interface 没有时区覆盖参数 |
| S3 | 同包 `src/index.ts:467–491`；`src/types.ts:323–332,400–402` | RPC 接受可选 clientTimeZone，宿主规范化；空内容 source=retry，非空 source=user |
| S4 | `dsh-time-context src/index.ts:52–63,133–156,158–197,199–244` | 配置只是时钟 fallback；投影收集本轮 zones；先节流再解析时区；通过 pre-step 追加持久来源消息 |
| S5 | 同包 `src/request-zone.ts:18–26,61–91` | 只认 user+rpcId+clientTimeZone；同轮 zones 去重；missing/mixed 都要求澄清 |
| S6 | `dsh-util-time src/index.ts:33–45` | canonicalClientTimeZone 使用原生规范化，而非信任任意字符串 |
| S7 | `dsh-client-connection src/client/connection.ts:6–17` | 公开 Host facts 只有 home，尚无 host timezone |
| S8 | `dsh-client-ui-settings-general src/client/index.ts:266–273` | 有 settings.general.item slot；存在 UI 插槽不证明内置发送可覆盖 |
| S9 | `dsh-client-ui-chat src/client/chat/message-chrome.ts:24–38,86–99` | 本地午夜、日期判断和时钟均用浏览器 Date 本地方法 |
| S10 | `dsh-client-ui-schedule src/client/editor-timing.ts:36–60` | 新建草稿默认浏览器时区和本地起始时刻，独立于 prompt RPC |
| S11 | 同包 `src/client/RuleSelectRow.tsx:39–69` | 时区菜单以浏览器 systemZone 为基准 |
| S12 | 同包 `src/client/schedule-format.ts:225–240` | 显式规则有自己的 zone；at/after/every 无规则 zone，UI 可采用浏览器显示时区 |
| S13 | [Extras client/chime.ts:991–1018](../../client/chime.ts#L991-L1018) | DND 的 HH:mm 根据浏览器 getHours/getMinutes；restMode 和播放毫秒窗口另行判断 |

## 2. 按最新目标裁定范围

| 路径 | 已知事实 | 本功能裁定 |
| --- | --- | --- |
| 普通/queue/steer、人工子 agent prompt | S1–S3 自动读取浏览器并携带 clientTimeZone | 将新增自动上报来源改为宿主；不另传真实浏览器值 |
| UI 空消息 retry | 可带同一字段，但 reader 不认 retry 来源 | 只防该自动字段携带浏览器值；不修改 reader/source 身份 |
| 同轮 mixed、十分钟节流 | S4–S5 原生合并和刷新行为 | 不改、不绕过、不强制生成新时间提示 |
| goal/job/spawn/fork/SDK 等 | 已查入口没有新的浏览器检测字段 | 保持原生，不新增策略继承/快照/传播协议 |
| 聊天日期、任务编辑器与 Chime DND | S9–S13 的本地 UI/草稿行为 | 不统一显示、不联动；若某动作将检测值自动转送到请求，只修该发送来源 |
| 本机工具、任务规则及外部时间 | 宿主环境、显式规则或原始数据 | 不视为浏览器泄露，保持原有引用与结果 |

要验证的是新增自动字段不再携带浏览器检测值，而不是提示下一步必定刷新。历史 browser 字段可能仍经原生历史进入模型请求；本功能不清洗旧会话。相同 UTC offset 也不能替代 IANA 值检查。

## 3. 可执行的现有行为证据

[特征回放脚本](timezone-context-replay.mjs)直接导入审计安装根下的实际 `dsh-time-context/lib/index.js`，使用固定时间 `2026-11-16T08:00:00Z`、假投影及 pre-step ports。它**不是**完整真实 agent/session 事件重放、RPC 或浏览器测试，不验证新功能已实现。

已执行，Node `v24.17.0`，退出码 0；八组断言全部 PASS：

1. browser Shanghai 优先于配置 fallback Singapore。
2. synthetic wire Singapore 同时进入原生主时钟与解释行（只证明消费端，不证明 UI override 已存在）。
3. missing browser 时主时钟 fallback Singapore，但解释行仍 unavailable/Ask。
4. source=retry 即使带 zone 也不被当作 user-rpc browser 事实。
5. 两个同 offset 的不同 IANA zones 仍为 mixed。
6. 距最近注入 60 秒时，即使请求 zone 变成纽约也无新注入。
7. 同轮已提交 Shanghai 与新提议 Singapore 合并为 mixed。
8. reject/abort 都不额外注入（两项断言合为一组）。

复核命令（先将环境变量设为经审计安装根，不是 profile；不会启动 DSH）：

```sh
: "${DSH_AUDIT_INSTALL_ROOT:?set the audited DSH installation root}"
scratch=$(mktemp -d)
mkdir -p "$scratch/home" "$scratch/dsh" "$scratch/profile" "$scratch/cache"
HOME="$scratch/home" DSH_HOME="$scratch/dsh" \
DSH_PROFILE_DIR="$scratch/profile" XDG_CACHE_HOME="$scratch/cache" \
node docs/research/timezone-context-replay.mjs
```

脚本执行前显式指向 rc.3 审计安装；不会安装依赖、启动模型调用、读取个人 session 或创建计划任务。原生包若将来变化，断言可失败，不能将失败改称“新版已支持”而免去调查。初始临时脚本中正则转义导致语法错误，已改为字面子串断言并重新运行通过；这不是宿主功能失败。

初版文档交付时另执行：脚本语法检查、缺少显式审计安装根时拒绝运行、42 个本地文档链接/标题与行号锚点及代码围栏检查，均通过。独立静态复核发现 host 含义不一致及 deliveredAt 表达式抄写问题，均已按主契约/原生源码修正；复核未代替运行时验证。未执行完整 Extras 构建/打包/浏览器套件，因为此次没有改动运行时功能或发布产物。

### 关键源码指纹（SHA-256）

| 来源 | SHA-256 |
| --- | --- |
| S4 `src/index.ts` | `b8779494ef88cfe5cf4e529c07c92084c16711e48e38c72af1ad2dee9881bd82` |
| S5 `src/request-zone.ts` | `ad017550cce3b1cace38c3d3678e8e16b6eac6b3652302aac8fb187f26ca4fab` |
| S1 `src/client/time-zone.ts` | `f050fc997ef97c8e2d6ebbc964933f30f6140978487bec993642016bc8724d6a` |
| S2 `src/client/sessions/session.ts` | `a8dd4b3ab8a1c11e4cc14edbc47612899e4c7044478117bd4b97cc2e31d4ce10` |
| S3 `src/index.ts` | `595a02cfeca055a498aa70cce949c648d0ce840a8bcdce01eb4bc65d692a79e8` |
| S10 `src/client/editor-timing.ts` | `607da18bbf15bd5e206ffcefa51032e4fb1a5c4d41c48823b730a58fb6f90866` |
| S9 `src/client/chat/message-chrome.ts` | `861a573c299317e5359f735a1c33381f93537e286a1b4fbd6ad0a0c01c98629a` |
| S13 Extras | `9ecbd9b505c1ab79a294bb40bf2603793ccecb89046600fefdf9329c263bfba0` |

## 4. 最新范围下的调查结论

- 源码事实仍成立，但“十分钟内必须刷新”“后台必须继承新时区策略”“摘要必须保真”等早期要求已撤回；它们都是 DSH 的原生职责。
- 必要的实现缺口仅是可信宿主时区的获取，以及自动上报字段的数据来源替换；不是新增时间注入/显示接口。
- 不要求真实浏览器时区为审计而持久化，更不能把它放进模型 metadata 或诊断请求，绕过主字段继续泄露。
- shell、PTC、任务及其他直接引用宿主时区的逻辑保持原样；不扩展成工具日期环境治理。
- 额外对 system-prompt、agent-instructions、harness-dev-context、repeat-tool-reminder、llm 的限定词负向检索未发现相关匹配；这不是全生态无日期注入的证明，也不要求为本功能改动它们。
- 上述八组回放仅证明原生行为；此次范围修正不改脚本、不修改该行为，不需要通过重写注入来让观察结果“转绿”。
- 将来功能验收仅按[HTZ 范围](../TIMEZONE_POLICY.md#5-收窄后的验收)，当前没有浏览器/RPC/打包集成验证。
