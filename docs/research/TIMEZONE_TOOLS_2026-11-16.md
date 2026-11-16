# 时区覆盖补查：模型工具边界（2026-11-16）

## 范围与证据口径

- 基线：已安装 DSH 一方包 `0.2.2-rc.3` 的随包源码、schema 与 manifest。
- 本文只调查工具边界，不实现；唯一新增产物为本文，不提交、不修改宿主。
- 已认可的设计：请求 `clientTimeZone` 可按 browser 自动、fixed 指定、host 策略覆盖。
- 实际检测值独立保留；禁止为实现模型策略而修改全局 `Intl` 或进程 `TZ`。
- “受覆盖影响”下文专指直接数据路径；模型据有效时区生成不同参数属于间接影响。
- `Date.now()`、epoch、UTC ISO、耗时不是“时区注入”，不能与本地时间显示混淆。
- 主调查确认官方 tag `dsh-v0.2.2-rc.3` 指向 `38a6a5c965aa99ab525161efb7cc5cf1fe62fced`。
- manifest 确认官方仓库为 [deepseek-ai/deepseek-harness](<https://github.com/deepseek-ai/deepseek-harness>)，并逐包取得 repository.directory。
- 本调查未联网、未逐项比对 tag 与安装内容；主调查报告首个官方源码地址 404。
- 因此以下使用“包名@版本 + src 路径 + 行号”可复核定位，不构造未经核实的 blob URL。
- 证据索引均指上述包内源码；仓库目录映射另列于末节，不含本机绝对路径。

## 关键结论

1. **请求时区不是工具运行环境。** 已查 shell、PTY、PTC、MCP 路径未见把 `clientTimeZone` 注入工具参数或 `TZ`。[E04–E09, E14]
2. **调度有独立时间权威。** `rrule` 显式带 UTC 或 TZID；结果的 local 字段按规则时区，不按请求时区。[E01–E03]
3. **shell 与 PTC 不可等同。** shell/PTY 继承清理后的宿主环境；PTC 主动移除大多数环境（包括继承的 `TZ`），程序看到空环境。[E05–E08]
4. **结果不自动附带时区解释。** 通用成功结果按各工具 renderer 生成，后台通知也不统一附加“当前时区”。[E10–E13]
5. **保留环境事实。** 命令打印的本地时间、外部服务时间、文档计算值应注明来源，而不是偷偷改成有效请求时区。[E04–E16]
6. **不承诺全系统统一显示。** 调度 UI 的浏览器显示、DND、本地化日期由主调查单列，不从工具结果反推。

## 路径矩阵 A：schedule

| 入口 | 时间来源 | 模型可见内容 | 直接受请求覆盖影响 | 设计/测试 | 未验证项 |
| --- | --- | --- | --- | --- | --- |
| `schedule_create` schema | 模型显式提交的 DTSTART/RRULE | UTC/TZID、DST、UNTIL 等说明 | 否；只有参数生成可能间接受影响 | S1、S2；不得隐式重写显式 TZID | 未实际创建任务 |
| `schedule_edit` schema | 新 rrule；省略则保留旧规则 | 同创建格式；active；expectedUpdatedAt | 否 | S3；覆盖切换不修改旧任务 | 未执行并发编辑 |
| create/edit/list/view 结果 | 持久化规则 + 调度服务时钟 | scheduledAt、scheduledAtLocal、updatedAt、lastDelivery | 否 | S4；字段权威保持不变 | 未比较实时 UI |
| 定时投递单条/批量消息 | 到期 occurrence 的 UTC instant | occurrence_at；任务 id 与 prompt | 否 | S5；请求策略与 occurrence 分离 | 未运行定时器/崩溃恢复 |
| 定时消息激活后的 time-context | pre-step 的当前时刻；可用请求来源/回退 | 独立注入的时钟提示 | 取决于覆盖设计接入点，不是提醒字段自动继承 | S6；明确自动唤醒策略 | 新/旧目标会话跨策略行为待实现验证 |

### schema 与字段语义

- 创建工具只接受 `rrule`；schema 说明要求一行 DTSTART 加一行 RRULE。[E01]
- DTSTART 必须以 Z 结尾或携带 IANA TZID；固定偏移借 `Etc/GMT-*` 表达且正负反向。
- TZID 跨 DST 保留当地钟点；生成的不存在时间跳过，重复时间只取较早 instant。
- DTSTART 本身必须是存在的当地时间；UNTIL 必须是 UTC Z；这些是工具说明，不是覆盖策略。
- 编辑没有独立 `timeZone` 参数；只有提交新 rrule 才能改变规则时区。[E02]
- `active: true` 只在尚有未来 occurrence 时恢复；否则需新规则。
- `expectedUpdatedAt` 是编辑并发条件，应原样回传，不是待重新格式化的显示日期。
- 返回 schema 兼容 rrule/cron/every/after/at/daily/weekly 等已有记录。[E02]
- `scheduledAtLocal`：rrule 从规则取 zone；有 timeZone 的记录使用该字段；其余 UTC。[E03]
- 其格式是带数字 offset 的当地 ISO 日期时间；不能解释为“浏览器 local”。
- `scheduledAt` 为下一 occurrence 的 UTC；lastDelivery 分开表示 scheduledAt 与 deliveredAt。
- `deliveredAt` 在目标会话持久化确认后用 `new Date(Date.now()).toISOString()` 采样。[E03]
- 单条提醒只含 `occurrence_at`（UTC），批量亦如此；不附规则 TZID 或 clientTimeZone。
- 提醒使用 `source.kind = schedule`，不是带浏览器 rpcId 的 user 来源。[E03, E13]
- 因而请求覆盖不能被宣称已自动传入未来投递；此处需要设计并测试，而非改写历史提醒。

## 路径矩阵 B：执行器、结果与异步工作

| 入口 | 时间来源/环境 | 模型可见内容 | 直接受请求覆盖影响 | 设计/测试 | 未验证项 |
| --- | --- | --- | --- | --- | --- |
| `bash` / `pwsh` | shellEnv 的 DSH_* + executor overlay + scrubbed host env | stdout/stderr、退出/中断/耗时标记；结构化 timeoutMs | 未见 | X1；命令本地时间视为执行环境事实 | Windows/pwsh 后端未启动 |
| `terminal_open/send/read` | PTY 创建时宿主基环境 + terminal override；后续会话自有状态 | 启动输出、viewport、wait/session 状态 | 未见；不重写已有 PTY | X2；策略切换不改变终端 | 实际终端启动脚本/用户修改未核验 |
| `run_code` Node 程序 | 新/保留 Node 环境；移除普通继承环境；Date/Intl 仍可被程序调用 | 仅打印值、返回值及附加图像 | 未见 | X3；验证无 TZ 注入与 OS 默认差异 | 系统 ICU、OS zone、沙箱后端实测缺失 |
| PTC 内 `tools.*` 子调用 | 保留 agent/toolSet、parent 与 signal；工具各自执行 | canonical JSON value，失败为异常 | 不另传请求 zone；agent 内后续政策待接入 | X4；与直接调用同参数同语义 | 其他 PTC runtime 未审 |
| 普通工具成功结果 | 工具自己的 output renderer | 工具定义的文本/JSON/图像 | 无统一时区包装 | X5；保持 value/content 一致 | 第三方 wrapper 可另加上下文 |
| 通用 timeout policy | elapsed timeoutMs + abort signal | TOOL_TIMEOUT，timed out after Nms | 否 | X6；预算、取消不受时区切换影响 | 未测跨 DST/系统时钟跳变 |
| `job_list/output/kill` | 注册/结束时 Date.now() | canonical startedAt/finishedAt epoch；正文/状态 | 否 | X7；epoch 不转作本地钟点 | 未实际启动后台 job |
| job 完成通知 | 任务状态与有限输出 | finished/status；可能内联正文或要求 job_output | 否；无浏览器来源 | X8；自动唤醒的独立 clock 策略 | 未测 idle/busy owner 通知 |

### 继承细节与潜在宿主暴露

- shellEnv 的已查内建为 home、shell、node executable、session、profile 与安装目录身份；没有内建时区变量。[E04]
- contributor 机制可添加托管 DSH_*；本文没有枚举所有动态插件，不把“内建无时区”夸为运行时绝无扩展。
- subprocess 清理凭据形名称与 DSH_*，并非白名单：`TZ`、locale 等普通环境可保留。[E05]
- bash-local overlay 仅 NO_COLOR/TERM/PAGER/GIT_PAGER，再合并普通 env 与受信 dshEnv。
- pwsh 工具也调用 shellEnv.collect；未见从 clientTimeZone 导出 TZ。[E04–E05]
- terminal-bash 只加终端/提示符/身份相关项；不会因请求 zone 改变而重建 shell。[E06]
- shell 中 `date`、PowerShell Get-Date 或子程序 Intl 的输出可能暴露宿主时区，但这不是错误注入。
- Node PTC 启动 tombstone 宿主大部分 env；仅保留 PATH/PATHEXT/SYSTEMROOT/WINDIR/TEMP/TMP 等启动项。[E07]
- 程序环境随后置空；不能据此声称 Date/Intl 已统一 UTC，或已按 fixed zone 执行。
- 对 PTC 本地 Date/Intl 的具体输出只列“OS/运行时默认潜在暴露”，本调查未运行探针。
- PTC `tools.bash` 仍走宿主工具派发，不继承程序空 env 作为 shell 的环境。[E08]
- 耗时 timeout 只是预算；job epoch 只是 instant，均没有携带 zone 身份。[E09–E12]
- 通知与定时消息可能唤醒新一轮；clock 提示来自单独 pre-step，不来自结果自动补足。[E12–E13]

## 路径矩阵 C：外部/文档工具

| 入口 | 明确时间字段/时间来源 | 模型可见内容 | 请求覆盖影响 | 设计/测试 | 未验证项 |
| --- | --- | --- | --- | --- | --- |
| MCP tool bridge | 服务自定义 schema/内容；stdio 子进程可继承 TZ | description/schema、content、structuredContent、图像 | 未见附加 zone；参数原样交服务 | E1；显式服务 zone 参数优先 | 不连接服务；第三方协议扩展未审 |
| MCP stdio / HTTP | stdio 用 scrubbed host env + 配置 env；HTTP 用配置 headers | 服务响应中可能含当地时间 | 无自动 clientTimeZone 转发 | E2；保留服务时间来源 | 远端 zone 与 SDK 内部默认未实测 |
| `office_render/convert/recalculate` | 外部文档/引擎；工具 schema 无时区参数 | 图像/输出文件、bytes/pageCount/fonts | 未见 | E3；NOW/TODAY/动态字段列专测 | 引擎真实计算时钟/zone 未证实 |
| `web_search` | provider supplied publishedAt；DeepSeek page_age 映射 | 搜索条目附原样日期/recency 字符串 | 无自动转换 | E4；不要将含糊 page_age 当 UTC | 不调用网络；provider 远端时间未知 |
| `web_fetch` | 网页正文自身日期；fetch 的 HTTP 状态/URL | 正文转文本/markdown，非当前时钟 | 未见 | E5；正文日期保留原语义 | 远端按IP/locale差异未知 |

- MCP callTool 只提交工具名、arguments，加 signal/timeout；没有合成 zone 参数。[E14]
- schema 时间字段属于远端工具，不可通过全局字符串替换或递归改写 structuredContent 纠正。
- Office 工具输出 schema 没有 createdAt/modifiedAt/timeZone；引擎 request 也无 zone。[E15]
- Office `recalculate` 会刷新公式缓存，但当前证据不能断言 NOW/TODAY 必定使用宿主时区。
- 转换产物可含文档原始日期或引擎动态内容；若未来要求确定性需独立引擎能力契约。
- web `publishedAt` 是任意 provider 字符串；DeepSeek 实现来自 page_age，可能并非规范 ISO。[E16]
- 已查 web 搜索请求仅含 query 等业务配置；HTTP fetch 默认 headers 没有请求时区。

## 建议验收组（只设计，均未执行）

- **S1**：固定同一 wall-clock instant，browser/fixed/host 三模式生成默认日期解释；raw 检测值原样保留。
- **S2**：显式 TZID 与有效请求 zone 冲突时仍按 TZID；覆盖不修改 DTSTART/UNTIL。
- **S3**：切换策略后仅编辑 title/prompt/active，规则与 expectedUpdatedAt 不被重新格式化。
- **S4**：验证 UTC scheduledAt 与规则 scheduledAtLocal 表示同一 instant；覆盖不改变任务结果。
- **S5**：跨 DST gap/fold、停机补发、批量投递；occurrence_at 始终是原规则 occurrence。
- **S6**：this_session/new_once/new 的无人定时唤醒；分清投递 instant、当前采样时间、有效政策来源。
- **X1–X2**：一次性 shell 与保留 PTY，在 host TZ 与策略 zone 不同情况下仍报告真实执行环境。
- **X3**：Node PTC 分别用 host 有/无 TZ，比较 process.env、Date/Intl 与显式 timeZone 格式化。
- **X4**：相同工具直接调用与 PTC 调用的参数、agent 归属、值一致；不引入隐藏 zone 参数。
- **X5–X6**：renderer、结构化值、异常、超时文本不加入虚假“浏览器时间”；不改变 timeoutMs。
- **X7–X8**：完成/失败/取消、前台转后台、idle/busy 通知；epoch 与原日志不被策略重写。
- **E1–E2**：伪 MCP 返回多 zone 字段；参数和内容不被吞改；stdio TZ 与 HTTP 显式字段分开断言。
- **E3**：隔离环境中探测 Office 动态日期、公式缓存和元数据；在引擎能力未知前不承诺覆盖。
- **E4–E5**：伪 provider 返回 UTC/offset/自然语言 recency；验证 publishedAt/正文不被自动转换。

## 证据索引

以下为包内行号，不是运行证据。共同版本均为 `0.2.2-rc.3`；目录映射来自各包 manifest。

```text
E01 @deepseek-ai/dsh-tool-schedule@0.2.2-rc.3
    src/index.ts:192-226,373-388（授权、创建描述、RRULE_HELP、创建参数）
E02 @deepseek-ai/dsh-tool-schedule@0.2.2-rc.3
    src/index.ts:76-111,254-275,434-484（结果schema、modelTask、编辑）
E03 @deepseek-ai/dsh-schedule@0.2.2-rc.3
    src/domain.ts:1151-1191,1195-1201,1314-1318；src/runtime.ts:352-362
E04 @deepseek-ai/dsh-shell-env@0.2.2-rc.3 src/index.ts:159-200
    @deepseek-ai/dsh-tool-bash@0.2.2-rc.3 src/index.ts:512-520
    @deepseek-ai/dsh-tool-pwsh@0.2.2-rc.3 src/index.ts:526-543
E05 @deepseek-ai/dsh-subprocess@0.2.2-rc.3 src/index.ts:47-86
    @deepseek-ai/dsh-subprocess-local@0.2.2-rc.3 src/spawn.ts:36-53,462-480
    @deepseek-ai/dsh-bash-local@0.2.2-rc.3 src/index.ts:20-32,149-173
E06 @deepseek-ai/dsh-terminal-bash@0.2.2-rc.3 src/index.ts:62-86,204-220
    @deepseek-ai/dsh-tool-terminal@0.2.2-rc.3 src/render.ts:106-141
E07 @deepseek-ai/dsh-ptc-runtime-node@0.2.2-rc.3
    src/worker.ts:279-298；src/environment.ts:1-19；src/execution.ts:137-155
E08 @deepseek-ai/dsh-tool-executor-ptc@0.2.2-rc.3 src/ptc.ts:506-546
E09 @deepseek-ai/dsh-tool-call-timeout-policy@0.2.2-rc.3 src/index.ts:34-74
E10 @deepseek-ai/dsh-tools@0.2.2-rc.3 src/pipeline.ts:544-574
E11 @deepseek-ai/dsh-tool-jobs@0.2.2-rc.3 src/render.ts:11-59,75-83
    @deepseek-ai/dsh-jobs-local@0.2.2-rc.3 src/index.ts:262-272,628-633
E12 @deepseek-ai/dsh-tool-jobs@0.2.2-rc.3 src/index.ts:128-164,355-394
    @deepseek-ai/dsh-tool-bash@0.2.2-rc.3 src/render.ts:28-81
E13 @deepseek-ai/dsh-time-context@0.2.2-rc.3
    src/request-zone.ts:13-26；src/index.ts:199-242（单独pre-step采样与来源）
E14 @deepseek-ai/dsh-mcp-client@0.2.2-rc.3
    src/transport.ts:15-44；src/tools.ts:145-160,304-338
E15 @deepseek-ai/dsh-tool-office@0.2.2-rc.3 src/index.ts:86-133
    @deepseek-ai/dsh-office-kit@0.2.2-rc.3 src/types.ts:109-136；src/index.ts:347-355,421-425
E16 @deepseek-ai/dsh-tool-web@0.2.2-rc.3 src/search.ts:86-99；src/fetch.ts:328-336
    @deepseek-ai/dsh-web-search-deepseek@0.2.2-rc.3 src/provider.ts:174-184,243-252
    @deepseek-ai/dsh-web-fetch-http@0.2.2-rc.3 src/provider.ts:111-120
```

### 官方仓库目录映射

```text
dsh-tool-schedule → packages/schedule/tool-schedule；dsh-schedule → packages/schedule/schedule
dsh-shell-env → packages/shell/shell-env；dsh-bash-local → packages/shell/bash-local
dsh-tool-bash → packages/shell/tool-bash；dsh-tool-pwsh → packages/shell/tool-pwsh
dsh-subprocess → packages/subprocess/subprocess；dsh-subprocess-local → packages/subprocess/subprocess-local
dsh-terminal-bash → packages/terminal/terminal-bash；dsh-tool-terminal → packages/experimental/tool-terminal
dsh-ptc-runtime-node → packages/ptc-runtime/ptc-runtime-node
dsh-tool-executor-ptc → packages/core/tool-executor-ptc；dsh-tools → packages/core/tools
dsh-tool-call-timeout-policy → packages/guard/timeout-policy；dsh-time-context → packages/context/time-context
dsh-tool-jobs → packages/jobs/tool-jobs；dsh-jobs-local → packages/jobs/jobs-local
dsh-mcp-client → packages/mcp/mcp-client
dsh-tool-office → packages/document/tool-office；dsh-office-kit → packages/document/office-kit
dsh-tool-web → packages/web/tool-web；dsh-web-search-deepseek → packages/web/web-search-deepseek
dsh-web-fetch-http → packages/web/web-fetch-http
```

## 检查范围限制

- 仅 glob/grep 发现、read 上下文与一次目录列表诊断；未读个人 profile/session/credentials 数据。
- 未执行 host、网络、安装、调度、shell 日期探针、PTY、MCP、Office 转换或浏览器测试。
- 未审所有第三方插件、其他 PTC runtime、LibreOffice 原生/wasm 内部时区、OS/ICU 配置。
- 已查入口“未见注入”不等于证明整个部署不存在额外 wrapper、环境设置或远端个性化。
- 交付是后续设计/测试清单，不是已实现覆盖或 native 集成验收通过的声明。
