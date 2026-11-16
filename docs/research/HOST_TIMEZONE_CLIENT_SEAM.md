# Host-zone 客户端最窄 seam 调查（rc.3）

日期：2026-11-16。状态：**源码研究与设计候选；不是已实现/已通过验收。** 本次仅新增本文，没有修改原生文件、提交、构建、安装、启动 host、访问实际 GUI，也没有读取生产 profile/session/credentials。遵循 [TIMEZONE_POLICY](<../TIMEZONE_POLICY.md>)：只改变自动请求 zone 来源；不提供 fixed 选择、不改时间注入/节流/reader/续跑/工具 TZ。用户后续开发/测试/发布授权由集成负责人按最新请求处理，不由本文扩权。

## 1. 结论先行

1. **未找到受支持的公共客户端 before-send/zone-provider seam。** `ctx.sessions` / `ISession` 是调用面，不是 outgoing middleware；Remote `$mount` 注册新贡献且拒绝同方法覆盖；slots 是 UI 组合，不是全请求变换。见 [S1]、[S2]、[G1]、[T1]、[U1]。
2. 最窄的纯客户端实验候选是：正常 clientModules 插件 + 独立可信 host-zone route + **严格版本/descriptor 所有权可撤销 adapter**，包装 `remote.session.prompt` 与 `remote.subagents.prompt` 的 own getter。已有 Session 每次动态访问这些属性，理论无需重建 instance；但不覆盖提前缓存的 Remote 函数，不阻止原生本地采样，不是公共稳定 hook。见第 3 节。
3. **任务 UI 默认 zone 确实进入请求**：`draft.timeZone` 最终进入 RRULE `DTSTART;TZID` 或 Cron `time_zone`。仅改 prompt 两个 getter不能声称完成全部自动字段保护；不能在 schedule RPC 中盲换所有 zone，这会改显式规则/原记录语义。见第 5 节。
4. 若允许精确产物实现适配，**宿主内存 served-artifact adapter 是更完整的窄候选**：锁定两个 native client bundle 的完整 SHA-256，改写内存中 browser 自动来源函数，不动磁盘；用自有资源 URL 及准确 index 注入避开原生 immutable 缓存。它可以同时覆盖 prompt 和 schedule 自动默认，并避免本地 browser zone 采样；但不是公共函数 hook，**现存已加载函数不能靠改 served bytes 变更，必须页刷新**。见第 6 节；资源 serving/index 注入 seam 由独立宿主调查验证，本文不把未验证 serving 机制说成已可用。
5. 若必须全部使用受支持公共接口、不接受 artifact/descriptor adapter：stock rc.3 应报告不可用，并向上游请求 prompt 自动 zone resolver 与 schedule 自动默认 provider；不能以 UI 文案或宿主接收后改写冒充保护。

## 2. 公共接口调查

### Sessions / ISession

- [公开 client entry][S1] 以 type 导出 `Session`，没有稳定运行时构造器替换 hook；源码路径能 import 不等于内部类有公共适配契约。
- [ISession.prompt][S2] 只有 `content, mode, signal?, requestId?`，无 zone 参数、resolver 注册或 waterfall。`ISessions` 暴露 retain/using、目录与 binding 等对象生命周期调用，不提供发送变换注册。
- [Session.prompt][S3] 普通分支 283 行直接采样，人工子 agent 分支 309 行直接采样；queue/steer 共用该方法。空内容 retry 仍可带此字段；不改其 retry source/reader 身份。不支持的子 agent file 分支原生拒绝、不发请求，应原样保留。
- 只包装新 retain/binding 返回值会漏掉已持有的 Session 引用；复制 Session.prompt 又会承担 first-prompt、echo retirement、receipt 映射等无关复杂性。
- [resolvedClientTimeZone][S5] 是模块内 import；覆写另一份 exports 不会改变 bundle 内本地绑定。不考虑全局 Intl/Date 替换。

### Remote 注册、middleware、serializer

- [TypertClientRemote][T1] 扩展面为 `$mount`、`$on`；后者订阅宿主转发事件，不是 outgoing prompt hook。Gateway 另外提供 `$stream`、`$host`，亦无 before-send 注册。
- [mount 校验][G1] 对已经 mounted 的同一 direct/scoped 方法报错。另挂同名贡献、卸载原生贡献后接管，都不是最小字段来源替换。
- [prepareInvocation][G2] 将位置参数映射为 wire args并组合 signal，[unary invoke][G4] 直接 `connection.rpc.call`。未见可注册 middleware/serializer 列表；generated codec 是描述符静态事实，lookup/context adapter 是身份投影，不是 nested request transformer。
- transport override / createWebConnectionRpc(doFetch) 是创建 transport 时的组合接口，不是已启动页面上插件注册 hook；不能为此夺取整个 connection 或改全局 fetch/WebSocket。
- [host connection.rpc.intercept][R1] 是接收后共享 `/api` 的 endpoint 所有权接口，且本安装只允许一个 interceptor。浏览器值已经过线，故不满足本目标。

### clientModules、clientSlots、entry/wrapper/public hooks

- rc.3 UI 实际服务名是 `ctx.slots`（[renderer 注册][U1]）；不是 clientModules 的 request hook。[clientModules][M1] 提供正常 Loader fiber 装载 `./client`；[factory 注册][M2] 拒绝重复 id。module external/import 只表达代码依赖，不是覆盖已捕获函数的权限。
- conversation 的 composer chain、hero HOC、composer bar entry 可组合 UI，但 [owner/standard props][U2] 仅有 input actions、blocked/disabled 等，没有自动请求 zone provider。
- 用 wrapper 增加状态或挡住一个 composer 不是全请求闸门：[uiConversation.send/default submit][U3]、直接 Session.prompt、其它插件调用仍可绕过。claimed-command submit 和附件 serializer 管文本/附件，不是所有 prompt 的字段 serializer。
- 原生 settings/configForms/slots 可承载最小关闭/已保护/不可用 UI；存在设置 slot 不能证明原生发送可覆盖。

## 3. 可撤销 Remote getter adapter：能力与局限

[Remote namespace 方法][G3] 在**实例上**定义 `configurable:true, enumerable:true` 的 getter；getter获取调用时 `this.ctx`、当前 direct/scoped record，再返回调用闭包。因此应包装原 getter，不能 apply 时捕获固定 bound method。

安装契约：

1. 限制为经过测试的 rc.3 精确产物，不仅检查版本字符串，还检查相关 bundle/descriptor 与参数形状；未知或外来 wrapper、重复 owner 要拒绝。
2. 正常注入 `remote.session` / `remote.subagents`，检查各自 own configurable getter（无 setter）与精确 endpoint、request 参数和可选 signal。两个都成功才标保护就绪；部分失败仅按当前所有权回滚。
3. 包装 getter在原调用者 receiver 上调用原 getter；保留 signal、requestId、mode/delivery、内容与附件。Cordis [traceable/shadow][C1] 在调用点传播 this.ctx；错误 bind 会破坏 agent scope/权限投影。
4. 每次实际调用确认 enabled、owner、generation、host zone ready，然后拷贝 request 并覆盖唯一 clientTimeZone；不记录或发送原检测值，不新增诊断/metadata，不改用户对象。
5. zone 未就绪/非法、重连、route 失败时，不以 browser 值调用原方法；应返回与原生 RemoteResult 同形的失败，让 [Session 失败分支][S3] 完成 echo/first-prompt 清理，不简单 throw 跳过结果处理。

已有 instance：原生 [Session 构造入口][S4] 保存 Remote 根；[prompt][S3] 每次动态读取属性，因此同一 namespace 的已有 Session 理论可覆盖。提前缓存的 `const f=remote.session.prompt` 不会重新读 getter，已发请求/旧历史不回溯；其它隔离 namespace 不自动纳入。已查 Session 原生调用不缓存方法，不能推广成全第三方保证。

采样限制：adapter只在序列化前丢弃原值，原生 browser Intl **仍被本地调用**。若 Intl 采样自身抛错，会在到达 adapter 前失败；本方案不修这一原生行为。若要求连本地采样也不用 browser，需要替换 resolver 来源。

卸载/重载：先撤销 live/代际并取消 zone 获取；尚未转交原生的调用不得继续发送。恢复 descriptor 前比较当前 descriptor 是否仍是自己安装的那个，不覆盖外来后来 owner。激活时返回的包装函数在 unload 后仍可能存活，需 revoked 检查；激活前缓存的原生函数无法撤销。恢复后重新读取原生 getter表示已关闭，不能继续宣称保护。

原生 namespace 卸载/HMR 可删除属性并创建新 instance；通过正常依赖注入 disposer/remount 重新校验，不把旧 descriptor 恢复到新对象。[client entry replacement][M3] 先 teardown fiber再 import/refresh，只提供生命周期机制、不自动证明无窗口。插件未加载/失效后，纯 UI 锁不能提供全页面永久阻断保证。

## 4. host zone 获取：独立只读 route

[ConnectionHostInfo][H1] 只有 home；[Remote host facts][H2] 只有 home/isLoopback。不能从 home、offset 或 browser 猜宿主 zone。

可用 [HostConnectionRpc.handle][R1] 注册独立只读 channel，通过现有 connection.rpc.call调用，沿用原生认证、trust及 disposal；或使用 [exact Fetch route][R2]（其合约明确 owner Peer-only，需验证 transport）。不要裸挂未认证 route。仅返回宿主进程当前解析的 canonical IANA zone 或 unavailable，不暴露 env/TZ原文/home/profile。

宿主读自己的 Intl.DateTimeFormat().resolvedOptions().timeZone，并以 [canonicalClientTimeZone][H3] 校验；不修改进程已有 TZ，不取不到就伪造 UTC。

只缓存内存中的 connection identity + generation id + zone；generation丢失/变化同步作废，异步结果核对代际后才发布，不持久化真实 browser 检测值。若需支持宿主时区运行中变化，发送前重取或明确刷新策略；不能将启动快照宣称为永久实时。这里不改变原生时间注入的十分钟节流。

## 5. 任务创建/编辑 UI：自动字段 vs显示

| 路径 | 源码事实与裁定 |
| --- | --- |
| 新建默认 | [defaultTiming][Q1] 用 getTimezoneOffset 生成 start、Intl生成 draft.timeZone。后者不是纯标签。 |
| guided once/minutely/hourly/daily/weekly/monthly | [rruleFromDraft][Q1] 将 zone 写入 DTSTART;TZID；[timingFromDraft][Q2] 包成 kind=rrule；create真正发送。 |
| Custom Cron | [timingFromDraft][Q2] 将 draft.timeZone 写入 timing.cron.time_zone。 |
| Custom RRULE | 已含 DTSTART 的用户文本不额外套 draft.timeZone；不扫描改写任意输入。 |
| 编辑原记录 | [timingFromRecord][Q2] 通常保留已有规则 zone；at/after 的自动草稿投影可使用 browser默认。只有 timing确实变化才写 patch.timing，标题/指令编辑不重发 timing（[Q3]）。 |
| 最终请求 | [schedule edit/create适配][Q4] 已无自动默认/显式选择/原记录保留来源标识。不能盲替换。 |
| 列表/编辑器文案、候选菜单 | [RuleSelectRow][Q5] systemZone用于候选/名称；用户点击才更新草稿。列表频率格式也可只用于显示，不应全部全局替换。 |

正确最小修复点是自动草稿创建/at-after自动投影来源：使用 host zone，在该 zone计算默认 start及weekday/monthDay，保留已有与显式规则。不允许只换TZID却保留browser offset生成的start。当前包内 helper本地导入，未见公共默认 provider；替换 exports无效。替换整套 task entry/store/component较宽，不推荐。

## 6. 精确 served-artifact adapter（后续集成候选）

在本机只读 [session native bundle][B1] 与 [schedule native bundle][B2] 后，因 read长行截到2000chars，进一步用grep完整匹配行提取函数。完整文件 sha256sum退出0：

| 原生产物 | SHA-256 |
| --- | --- |
| [session bundle][B1] | e9af25a01168a8405730c107471cbd6befccfab3294e793b10e1467c57255852 |
| [schedule bundle][B2] | b8dda300c8f835d825c8cbc23e56d66ffb4167d9c072f30468897611a9f34379 |

以下原文函数边界在对应bundle唯一精确匹配，尚未执行变换：

~~~js
function resolvedClientTimeZone(){const timeZone=new Intl.DateTimeFormat().resolvedOptions().timeZone;if(typeof timeZone!==`string`||timeZone.length===0)throw new Error(`browser time zone is unavailable`);return timeZone}
~~~

~~~js
function defaultTiming(){const date=new Date(Date.now()+60*6e4);const start=`${new Date(date.getTime()-date.getTimezoneOffset()*6e4).toISOString().slice(0,16)}:00`;const day=Number(start.slice(8,10));const weekday=(new Date(`${start.slice(0,10)}T00:00:00Z`).getUTCDay()+6)%7+1;return{frequency:`once`,interval:`1`,start,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,rrule:``,weekdays:[weekday],monthDay:day,dailyTime:start.slice(11,16)}}
~~~

schedule bundle已有本地 `startInZone(timeZone,at)`，可复用显式zone的Intl.formatToParts生成host当地start，仍将默认秒保留为00、默认一小时后。只改自动默认，不重写 rruleFromDraft/timingFromDraft/explicit rules；timingFromRecord调用defaultTiming，既有明确zone仍会覆盖默认。

实现应严格满足：完整原始hash匹配→每个锚点恰好一次→纯内存变换→自有版本化URL，原生源/源map不冒称修改后的源码；未知产物fail closed，不猜测宽松regex。注入值只能是宿主解析并验证后安全JSON编码的zone，不构造任意脚本字符串。

若把host zone常量嵌进served bundle，则保护状态及zone是**页面加载快照**；host zone/启用状态变化必须切换资源身份并明确要求页刷新，或提供已验证的最小运行时host-zone桥。不要声称修改服务端资源会自动更新已有instance或已执行函数；卸载也无法撤回已加载的改写闭包。若实现接入HMR，必须真实验证替换顺序/旧实例撤销，不能因有HMR receiver就承诺免刷新。

该路线的优势是直接改变自动来源，普通/queue/steer/空retry/人工子agent共用resolver，schedule自动默认也可覆盖，并无需替换全局Intl。其风险转为精确bundle支持、资源缓存、page lifecycle和serving所有权。父级并行核查clientResources/server/index注入接口；**本文未验证该路线能通过现有公开resource seam接入，也未宣称它已经交付。**

## 7. 真实浏览器/打包测试路线（未执行）

1. 最终tarball装入disposable HOME/DSH_HOME/profile、临时端口，加载真实clientModules产物，不改原生安装、不访问生产GUI；固定rc.3依赖与完整bundle hash。
2. 隔离host TZ=Asia/Singapore，Playwright context timezoneId=Asia/Shanghai（同offset不同IANA）；另测America/New_York与DST。浏览器Intl仍返回原环境值，证明未全局篡改。
3. 对实际发出body和隔离host接收payload双重断言：普通、queue、steer、空retry、人工子agent，既有Session启用与新Session；仅clientTimeZone=host，不在别名/诊断metadata泄露browser。file不支持分支仍原生拒绝。
4. 不用真实账号/provider：隔离测试插件注册确定性本地LLM adapter；用真实native运行中会话测试queue/steer与子agent链。network-only fixture可作快速测试，不冒充native-host验收。
5. 检查隔离session新增metadata/持久来源，不只看DOM。原生十分钟不刷新不是失败；历史不清洗。
6. 验证zone unavailable/invalid、慢响应、换host/重连、取消、disable/dispose/HMR、foreign descriptor、重复owner、缓存函数与未刷新的旧页。结果必须如实区分活跃/不可用/需刷新，不browser fallback。
7. schedule新建guided/Cron、编辑timing/只改标题、已有RRULE、显式用户zone、旧at/after分别抓包。核对start实际instant与weekday，不能仅换标签。显示/候选browser zone不等同自动请求字段。
8. served-artifact路线要测试原URL immutable缓存、bootstrap combo与split资源、已加载页/刷新页、未知hash拒绝、disable后新资源恢复及旧页状态；检查产物exports/filelist/metadata与实际下载字节。

## 8. 原始证据索引

均为本机审计安装源码/产物locator；相关DSH manifest为0.2.2-rc.3（[manifest][P1]）。未与远端tag逐字比对，未认证其它版本。本次仅静态读取及SHA，不是浏览器、打包或native集成通过证据。

[S1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/index.ts#L13-L54>
[S2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/contract/session.ts#L87-L103>
[S3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts#L259-L323>
[S4]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/index.ts#L112-L115>
[S5]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/time-zone.ts#L8-L13>
[G1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L254-L323>
[G2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L499-L546>
[G3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L638-L717>
[G4]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L444-L475>
[T1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-typert-protocol/src/types.ts#L619-L637>
[C1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis/src/utils.ts#L149-L202>
[M1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/client/index.ts#L1-L69>
[M2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/client/system.ts#L166-L179>
[M3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/client/entries.ts#L192-L204>
[U1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-renderer/src/client/registry.ts#L154-L180>
[U2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/src/client/contract/slots.ts#L285-L410>
[U3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-conversation/src/client/service.ts#L204-L311>
[H1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/connection.ts#L6-L18>
[H2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L110-L125>
[H3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-util-time/src/index.ts#L33-L45>
[R1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc.ts#L178-L212>
[R2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc.ts#L152-L175>
[Q1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/editor-timing.ts#L30-L105>
[Q2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/editor-timing.ts#L113-L202>
[Q3]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/TaskEditorFields.tsx#L87-L97>
[Q4]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/index.ts#L170-L239>
[Q5]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/RuleSelectRow.tsx#L44-L74>
[B1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L4>
[B2]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/lib/client.js#L13>
[P1]: </home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/package.json#L1-L55>
