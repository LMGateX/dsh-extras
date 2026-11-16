# Host timezone：Cordis 最窄 seam 调查（rc.3）

日期：2026-11-16。状态：**研究设计，未实现、未启动宿主、未执行浏览器/原生集成测试**。

## 结论先行

1. **没有发现可直接注册的通用 host 请求 middleware，也没有原生 runtime sampler override 或 bundle transform hook。**不能把 `connection.rpc.intercept` 叫作链式 middleware：原生 gateway 已独占 `/api`，第二 owner 会抛错。
2. **存在足以构建独立、精确 rc.3 限定 adapter 的公开资源 seam：**`ctx.webServer.register({kind:'exact',path,resource})`、`ctx.clientModules.fetchBundle(Request): Promise<Response>`，加 `webServer.tapIndex(html => html)` / `webserver/index-inject`。可以只在服务响应时替换两个内置 bundle 中自动来源函数，不写原生磁盘、不更改全局 Intl/Date、不改请求业务 owner。
3. 推荐先实现/验证 **“自有资源 URL + host 生成 zone provider + 两个 hash-pinned 函数替换”的单一 adapter**。替换 session 的 sampler，以及 schedule 新建草稿的默认来源；不在任务提交后猜测哪个 TZID 是自动值。不是独立重复注册同名模块，不是只加提示。
4. 这不是已认证兼容性。**缓存 URL、旧页面、HMR、失联/换 host 的失败关闭是交付门槛，不可先略过再宣称启用。**若这些门槛不能在不扩大改动面下通过，应报告 rc.3 无满足完整要求的公开高层 seam，向上游申请专用自动来源接口，不进入 reader/时间注入治理。

## 调查边界与执行情况

遵守 [AGENTS](<../../AGENTS.md>)、[功能范围](<../TIMEZONE_POLICY.md>)、[架构](<../ARCHITECTURE.md>)、[规格](<../SPEC.md>)、[迁移](<../MIGRATION.md>)、[验收](<../ACCEPTANCE.md>)。此次授权仅新增本报告，不改其他文件、不提交；父任务新的开发/安装/发版授权不代表本研究分支已执行这些操作。已加载 research/codebase-design skill，并收集一个只读子 agent 的独立 client seam 核查。

只读安装根 `/home/dev/.local/lib/node_modules/@deepseek-ai/dsh` 的包与源码；未联网、未读生产 profile/session/credentials、未启动 host、未访问生产 GUI。根安装 [package.json](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/package.json#L1-L4>) 为 `0.2.2-rc.3`。以下“可行”指源码给出的组合空间，不是已运行证明。

## 1. 真正的自动来源及持久化入口

| 路径 | 源码事实 | 对设计的约束 |
| --- | --- | --- |
| 普通 prompt / queue / steer / 空 content retry | [dsh-api-session-controller/src/client/sessions/session.ts:270–310](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/sessions/session.ts#L270-L310>) 在 remote 调用前采样；同一个 prompt 方法传递 mode。[dsh-api-session-controller/src/client/time-zone.ts:8–14](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/client/time-zone.ts#L8-L14>) 是无参 `new Intl.DateTimeFormat().resolvedOptions().timeZone` | 替换此局部函数，所有这些分支自然使用宿主值；不改 retry source 身份 |
| 人工子 agent prompt | 同上 session 方法另一分支，309 行再次调用同一 sampler | 不需要建立 spawn/fork 传播协议 |
| host session source | [dsh-api-session-controller/src/index.ts:467–491](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/src/index.ts#L467-L491>) 验证 request.clientTimeZone 后写 `{kind, rpcId, clientTimeZone, principal}` | 替换字段来源即可沿用现有 source/reader；host 到此才清洗已晚于网络上报 |
| host subagent source | [dsh-subagent/src/index.ts:450–469](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-subagent/src/index.ts#L450-L469>) 独立验证并写 browser prompt source | 同样不改业务逻辑 |
| 新建 schedule 默认草稿 | [dsh-client-ui-schedule/src/client/editor-timing.ts:46–61](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/editor-timing.ts#L46-L61>) 的 defaultTiming() 自动取 browser zone，同时以 getTimezoneOffset() 生成默认 start | 这是另一个自动来源；仅 prompt wrapper 不能覆盖它；只改 zone 不改对应默认 start 会改变默认 instant |
| schedule 创建 | [dsh-schedule/src/index.ts:356–367](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-schedule/src/index.ts#L356-L367>) 接收 ScheduleCreateRequest；没有 clientTimeZone 特殊槽 | 任务的 timing/RRULE/TZID 是业务语义，不是可以普遍改写的同名 metadata |

schedule 最窄替换应仅作用于 **defaultTiming() 的初始默认值**：从宿主 provider 取 zone，以既有局部 startInZone(zone, Date.now()+1h) 的语义生成默认墙钟，仍保留原生“一小时后/分钟精度”默认含义；后续用户编辑、advanced RRULE、已有任务和显式 TZID 均原样。[dsh-client-ui-schedule/src/client/editor-timing.ts:30–44](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/editor-timing.ts#L30-L44>) 已有显式 zone formatter；[dsh-client-ui-schedule/src/client/editor-timing.ts:63–90](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/src/client/editor-timing.ts#L63-L90>) 保留 advanced 文本并基于 draft zone 构建规则。这里不重写调度执行或 UTC occurrence。

## 2. Host 请求 middleware：为什么不是首选

公开接口 [dsh-client-connection/src/rpc.ts:178–202](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc.ts#L178-L202>)：

- `rpc.handle(channel, handler): () => Promise<void>`：注册自有逻辑 channel。
- `rpc.intercept('/api', matches, handler): () => Promise<void>`：**占有**共享 channel 的 interceptor，不提供 next。
- handler 接收 `(endpoint, payload, signal, peer)`，见 [dsh-client-connection/src/rpc.ts:132–144](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc.ts#L132-L144>)。

原生 [dsh-api-gateway/src/index.ts:248–253](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/index.ts#L248-L253>) 已占 `/api`；[dsh-client-connection/src/rpc-host.ts:279–300](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc-host.ts#L279-L300>) Map 单槽、重复即抛错。抢先占用会破坏 gateway 组合；不能卸掉原生 owner 后冒充透明 middleware。普通 gateway unary 经 [dsh-api-gateway/src/index.ts:424–445](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/index.ts#L424-L445>) 与动态 method resolution（[dsh-api-gateway/src/index.ts:827–871](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/index.ts#L827-L871>)）进入业务方法；没有可注册的 request rewrite waterfall。

`connection.fetch.register` 是另一公开自有 exact Fetch route 接口（[dsh-client-connection/src/rpc.ts:152–175](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc.ts#L152-L175>)），不是既有 route 的过滤器；重复路由也抛错（[dsh-client-connection/src/rpc-host.ts:235–250](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/rpc-host.ts#L235-L250>)）。它可安全提供自己的宿主时区事实，**不能据此宣称已拦截 session/subagents/schedule 请求**。

可对 sessionController.prompt / subagents.prompt 做版本限定实例装饰，但这是私有所有权 adapter 而非注册式 middleware；且真实浏览器值已经发往 host，无法达成“阻止进入新增请求”，故不推荐。

## 3. 资源服务：可组合的真正 seam

### 3.1 精确接口

| 接口 | 证据 / 保证 |
| --- | --- |
| `WebResource = (request: Request, peer?: PeerScope) => Promise<Response>` | [dsh-host-webserver/src/index.ts:60–74](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L60-L74>)；HTTP GET/HEAD 与进程内读取复用 |
| `webServer.register(WebRoute \| WebResourceRoute): () => void` | [dsh-host-webserver/src/index.ts:439–452](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L439-L452>)；返回自己的 disposer；同 kind/path 重复抛错 |
| exact 优先，随后最长 prefix | [dsh-host-webserver/src/index.ts:654–664](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L654-L664>)；不是“最后注册覆盖” |
| `clientModules.fetchBundle(Request): Promise<Response>` | [dsh-client-modules/src/index.ts:733–752](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L733-L752>)；公开读取 advertised combo/map/chunk/asset；不得修改返回 body 的共享原始 bytes |
| `clientModules.graph(): WebBootGraph`、`clientPath(id)` | [dsh-client-modules/src/index.ts:715–730](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L715-L730>)；读取/定位，不是替换注册接口 |
| `webServer.tapIndex((html: string) => string): () => void` | [dsh-host-webserver/src/index.ts:512–524](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L512-L524>)；公开 raw HTML escape hatch，按注册顺序、在结构化 injection render 之后运行 |
| `ctx.on('webserver/index-inject', (table, peer) => ...)` | [dsh-host-webserver/src/index.ts:30–44](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L30-L44>)；新鲜采集 global/script 等结构化行；[dsh-host-webserver/src/injections.ts:14–31](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/injections.ts#L14-L31>) |

原生只注册 `prefix /plugins`，resource 闭包调用 `this.fetchBundle(request)`（[dsh-client-modules/src/index.ts:703–712](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L703-L712>)）。因此有两个选择：

- **推荐：自有 exact 或 prefix 资源路径**，资源 handler 调用原生 fetchBundle 获取原始响应并复制/变换。自己的 URL 包含 adapter revision + artifact hash + 宿主进程/zone epoch，并返回 no-store。首选在确认 clientModules 已注入后注册 index-inject listener，针对本次 table 中已知 native boot 行，用 clone 的 graph/batch/entry URL 与对应 preload/script URL作替换；不改原 registry graph。此方式需要验证 listener 顺序，且“修改前面贡献的行”虽类型上可行，原注释只承诺 append，不是原生专用 override 契约。正常 served-web 也可用明确公开的 tapIndex escape hatch，在结构化注入后作等价精确重写。无需改原生实例方法，也不抢 /plugins owner。
- 备用：注册 `exact /plugins/`，因为 combo URL 为 `/plugins/??a/client.js,b/client.js&rev=...`（[dsh-client-modules/src/index.ts:271–289](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L271-L289>)），query 不参与 pathname match。此 exact 在源码上优先于原生 prefix，但 **WebRoute 文档写 path 不以斜线结尾，而 rc.3 register 实现未校验**，依赖这一组合不如自有正常路径稳妥；并且必须接管所有 combo，不只是目标包，缓存更易出错。

不能通过注册同名 Loader 包/浏览器 factory 替换：多 source 同 packageName 抛错（[dsh-client-modules/src/index.ts:1083–1097](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L1083-L1097>)），重复 factory 也抛错（[dsh-client-modules/src/client/system.ts:165–179](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/client/system.ts#L165-L179>)）。不应手改 registry 的 private table/responses/composed（[dsh-client-modules/src/index.ts:653–664](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L653-L664>)）。

### 3.2 缓存、graph 与 HMR 是硬门槛

原生 code 是 `public, max-age=31536000, immutable`（[dsh-client-modules/src/index.ts:189–190](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L189-L190>)）；advertised URL 精确查表，不认识多余 query 会 404（[dsh-client-modules/src/index.ts:1263–1292](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/index.ts#L1263-L1292>)）。**不能同一个原生 rev URL 一会儿返回原始、一会儿返回 transformed bytes**；只改 cache-control 也不能撤回浏览器已缓存的 immutable 资源。

自有资源 handler 应从自己持有的 URL→原生 URL 映射调用 fetchBundle，而不是随意把用户任意 URL 当代理；先验证组合确为当前公开 graph，pin 两个目标 artifact，再复制返回体做精确变换。不能原地改 held Buffer。必须同时处理 GET/HEAD、MIME、错误、长度、source map trailer；原始 map 不再准确时至少移除错误 trailer，不能声称 map 仍匹配。

Boot graph 的 entry.url、batch.url 都是公开 wire 字段（[dsh-client-modules/src/client/manifest.ts:52–82](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/src/client/manifest.ts#L52-L82>)）。tapIndex 在结构化行之后（[dsh-host-webserver/src/index.ts:706–739](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L706-L739>)）能改本页序列化 graph / preload / script；应基于 exact 已知 URL 表，验证替换数量与 HTML/JSON escaping，不能全局正则模糊替换任意字符串。保持 package id/dependency/factory 数量；不得给原 registry 的稳定 graph 对象原地赋值。

tapIndex **不自动覆盖 HMR graph/rebuilt 通知或 worker boot payload**；index-inject 同时用于 worker boot-payload 采集，但自有 route 是否被对应 worker carrier 消费，仍须实测，不能由 listener 已运行推定覆盖。首版可明确只认证正常 served-web、要求页面重载；HMR 若仍能引入 untransformed 原始 sampler，就必须使该能力 unavailable/阻止相关资源，或增补同一 adapter 的 HMR URL映射验证，不可把它当无关例外。旧已打开页面没有执行新资源，也不能报告已保护。标准 exact route 与 readResource 可以做无监听测试（[dsh-host-webserver/src/index.ts:488–510](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-host-webserver/src/index.ts#L488-L510>)），但本次没有执行。

## 4. 推荐单一 adapter 的职责（设计，非实现代码）

一个 feature Module 隐藏这些实现，只暴露 enabled/unavailable 状态；首版没有 fixed 参数、无每会话策略或浏览器检测值审计。

1. **Admission**：确认 native version、资源接口形状、唯一 owner、两包实际 clientPath 和 SHA-256；预先验证目标函数唯一命中。未知 artifact 即 unavailable，不做 best-effort regex。
2. **可信 host provider**：宿主进程执行 `Intl.DateTimeFormat().resolvedOptions().timeZone`，使用现有 canonicalClientTimeZone 验证（[dsh-util-time/src/index.ts:33–45](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-util-time/src/index.ts#L33-L45>)）；不设置 TZ、不修改 Intl/Date。通过独立自有 RPC namespace/channel 或 owner-only exact Fetch route 交给客户端。后者有原生 trust/auth，但须沿用载体且不扩展生产权限。不要读取 OS 私密文件或生产 profile 来“猜 zone”。
3. **函数级变换**：session sampler 改为读受控 provider；schedule 仅 defaultTiming() 自动默认用相同 provider。函数不可取 provider 时抛出“保护不可用”，而非执行原 browser 分支。显式输入的时区一律原样。
4. **连接失效**：provider 绑定活跃 connection 实例/generation；失联、换代、卸载先同步撤销 readiness，再接受新 zone。公开 generation.getSnapshot/subscribe 见 [dsh-client-connection/src/client/index.ts:58–72](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/index.ts#L58-L72>)；其 host facts 目前仅 home，没有 zone 或宿主进程身份（[dsh-client-connection/src/client/connection.ts:6–18](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/connection.ts#L6-L18>)）。不得把 generation.id 当服务端进程 nonce。新的事实响应需自有非敏感 process epoch，并在状态中只保留当前 generation 的结果。
5. **一致性限制**：宿主切换可能在 HTTP 请求与推送断线检测之间竞态；只把 boot 中一个 zone 字符串永久缓存无法满足 HTZ-03。发布前须证明对应失败关闭测试。若无法在当前窄 seam 保证，应限定为检测到换代即 reload/unavailable，并明确尚未达到完整验收，不能虚称所有潜在 TOCTOU 已解决。
6. **资源与生命周期**：Cordis effect 持有每个 route/tap/listener disposer；禁用先撤 readiness，不再提供保护成功状态。卸载移除自己的 route/tap，不移除原生 prefix 或改其他 owner。已下载 closure 不能远程撤销，必须页面重载；旧 transformed URL 禁止落入原生 fallback 并静默获得 browser sampler。失败关闭意味着相关自动发送不被放行，而不是关闭 unrelated 模块/工具/宿主。

### 不推荐的替代

- **客户端 rpc.call 实例 wrapper**：真正序列化前集中点，[dsh-api-gateway/src/client/index.ts:444–458](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-gateway/src/client/index.ts#L444-L458>) → [dsh-client-connection/src/client/rpc.ts:34–57](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/rpc.ts#L34-L57>)。它不是 native middleware，需自建 descriptor/CAS 所有权；sampler 在此之前已执行。尤其 schedule 的 RRULE 无“默认/explicit”来源标记，不能事后安全覆盖 TZID，故不足作完整方案。
- **安装期 transport replacement**：公开 `ClientTransportHooks.rpc/fetch`（[dsh-client-connection/src/client/index.ts:78–94](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/index.ts#L78-L94>)）在 installConnection 时捕获（[dsh-client-connection/src/client/index.ts:228–233](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-connection/src/client/index.ts#L228-L233>)），适用于自有页面组合，不是普通已运行插件的运行时 setter。不能为此替换整个 native connection owner。
- **clientResources**：host apply 为空（[dsh-client-resources/src/index.ts:1–4](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-resources/src/index.ts#L1-L4>)）；浏览器 `ctx.resources` 是 UI resource provider（[dsh-client-resources/src/client/index.ts:1–19](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-resources/src/client/index.ts#L1-L19>)），不是 JS bundle transform。
- **全局 fetch/Intl/Date、提示文字替换、额外时间 hook、host source reader/注入逻辑修改**：面过宽或不消除真实字段来源，排除。

## 5. Exact artifact pins（本次实际 sha256sum，只读）

| rc.3 安装 artifact | SHA-256 |
| --- | --- |
| [dsh-api-session-controller/lib/client.js:1–5](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js#L1-L5>) | `e9af25a01168a8405730c107471cbd6befccfab3294e793b10e1467c57255852` |
| [schedule client bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-ui-schedule/lib/client.js>) | `b8dda300c8f835d825c8cbc23e56d66ffb4167d9c072f30468897611a9f34379` |
| [client-modules host bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js>) | `a1056961926b9524a3940db3fb1cd84b5880eed54f06b8efaafa7c120b0d7602` |

这些是本机安装 artifact 的身份，不是 rc.3 任意重打包都保证相同。安装路径只能用于测试定位，不得硬编码到发版运行时代码。发布前还须 pin/验证 host-webserver adapter 所依赖接口 artifact。未做文本变换、未运行替换后产物。

## 6. 可测试方式与完成判据（均待执行）

- **无 host listener 的接口测试**：用 disposable Context、公开 register + readResource 与 fetchBundle fake，验证 exact/prefix 顺序、查询不参与 match、GET/HEAD、非目标组合透明、未知 URL拒绝、错误/MIME/长度/source-map 行为；与真实 rc.3 包对照。不能只测字符串替换 helper。
- **Artifact 测试**：使用 packed 插件 + 原生两个 bundle，验证 SHA pin、函数唯一命中、原包其余字节保留、重复注册为零；改一字节/改包版本/出现第三自动入口都要 unavailable。
- **浏览器证据**：独立浏览器 zone 为 Asia/Shanghai、宿主 TZ=Asia/Singapore；实际 JSON请求、schedule 默认 RRULE、source metadata均仅有宿主自动值，且不新增别名日志。普通/queue/steer/retry/人工子 agent逐分支。断言原 sampler不再被调用；不要用修改全局 Intl 作为实现。
- **schedule provenance**：默认草稿的默认 instant仍是一小时后/原生分钟精度；explicit 同值/异值 TZID、advanced RRULE及已有任务完全不变；不要从字符串等于浏览器 zone推断自动值。
- **缓存/生命周期**：预热未保护 immutable缓存→启用→新URL加载；启用→禁用→reload；HMR/包更新/hash不匹配；多插件owner冲突；已有页面只能显示reload-required，不能active。卸载不修改native资源、不删除其他owner。
- **失败关闭**：host Intl空/抛错/非法值、连接替换/失联/旧异步结果、页面未加载provider、跨host同URL，相关自动发送必须阻断且显示unavailable；无browser fallback、无旧host值成功上报。以此决定当前设计是否真正可发布。
- **不介入禁区**：无时间注入hook/renderer/reader/十分钟节流/续跑/压缩改动；无TZ/工具参数变化；干净会话证明新增来源，旧历史限制如实说明。
- **隔离原生集成**：只在显式 disposable HOME/DSH_HOME/profile、临时端口和 packed artifacts执行；本报告不等于 HTZ-01～06 已通过，也不等于允许针对生产 GUI直接试验。

## 最终裁定

**公开的“请求时区来源插件接口”不存在；公开的“资源读取 + 自有资源注册 + index 变换”存在。**最窄可推进方案是精确 artifact 限定的两函数资源 adapter，独立 Cordis 包、零原生磁盘修改。它优于服务端重写/提示注入，也优于丢失 schedule provenance 的请求后处理。是否达到完整 enabled 语义，必须由缓存、HMR与连接失败关闭测试证明；证明不了就报告不可用，不能以扩大时间系统改造来掩盖缺口。
