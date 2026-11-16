# 时区请求上下文生命周期补查（2026-11-16）

## 范围与证据口径

- 本报告只固定已认可策略并补查源码；不实现、不提交，不修改宿主或其他仓库文件。
- 已认可：请求解释时区可由 browser 自动、fixed 指定、host 服务器覆盖；真实检测值必须独立保留。
- 调查基线：下列已安装的 @deepseek-ai 包均读取清单确认版本 **0.2.2-rc.3**；只查发布包自带源码。
- 未读取个人 profile、会话日志或 credentials；未启动 host、联网、安装或执行运行时测试。
- 下文“已确认”指静态代码事实；“风险/建议”不是已发生故障，也不是已实现接口。
- 协作主线已确认官方 tag，但源码 URL 可达性未成立；本报告不发布猜测的 blob/raw URL。
- 引用链接仅是 npm 精确版本入口；**源码证据由包名、版本、src 相对路径、行号定位**，并非声称网页逐行核对。
- 不把“没有新字段”写成“模型完全不知道时区”：历史 prompt、任务文本、摘要可能仍含旧时区。

## 结论先行

1. 时区不是 AgentOptions 中一路自动继承的全局事实；当前 reader 只收集特定 user-rpc 来源。[S1][S2]
2. 默认十分钟节流在解析时区之前返回；即使换轮、换来源或换区，也不保证有新时区提示。[S1]
3. 当前 config.timeZone 仅是缺失/混合时的**采样时间显示 fallback**，不是覆盖唯一 clientTimeZone 的 host 策略。[S1]
4. 同轮已入历史的区与本步 proposed 消息一起去重；两个不同区得到 mixed，无区来源被忽略。[S1][S2]
5. spawn、模型间消息、goal 自动轮、job 完成通知、SDK、ACP、headless 的已查入口不携带可识别时区。[S4][S6][S7][S8][S9][S10][S11][S12]
6. fork 继承的是已完成轮历史，不是当前请求快照；旧提示与上次注入时间也可能随 seed 被重放。[S1][S5]
7. compaction 辅助调用直接重放选中历史，未经过新的 agent/pre-step 时间注入；摘要无专门时区保真槽。[S13][S14]
8. 覆盖策略需要同时解决“入口快照、来源身份、持久化、跨生命周期传播、提示失效”，不能只改浏览器取值函数。

## 路径矩阵：字段、直接注入与旧 prompt 分开看

“直接注入”均以 time-context 插件已挂载、pre-step 接受、未被节流为前提；不是所有入口无条件执行。

| 路径 | 新消息来源/字段（已确认） | 新时区提示 | 历史继承及边界 | 证据 |
| --- | --- | --- | --- | --- |
| 普通 user-rpc prompt | user + rpcId + 可选 clientTimeZone | reader 可识别；唯一时区用于采样显示及解释指令 | 旧提示仍可能在表面中 | [S2][S15] |
| UI 空 prompt 重试 | retry + rpcId + 可选 clientTimeZone | reader **不识别 retry**；若注入则按本轮其他合法消息或 missing | 可能只留旧提示，不能等同继承本次字段 | [S2][S15] |
| 同轮 steer / next-step | 来源原样进入；可能有多个 user-rpc 区 | 合并已入轮历史与 proposed；可得 mixed | 节流可挡住后到区/冲突的新提示 | [S1][S3] |
| next-turn 队列 | 每步取全部 next-step，再取至多一条 next-turn | 新 turn/start 清空区集合，但不清空全会话节流时间 | 队列接受时与执行时可能相隔很久 | [S1][S3] |
| spawn 初始任务 | source 只有 user | 无 clientTimeZone/rpcId；可新注入 unavailable | provider 无父对话 seed；任务文本仍可能自带时区 | [S4][S6] |
| fork 初始任务 | 新任务仍是普通 user；另有历史 seed | 不自动带当前请求的结构化区 | seed 截至最近 turn/end；包括旧时区提示及投影可重放的历史事件 | [S1][S5][S6] |
| 人工给子代理 prompt | user + rpcId + 可选规范化 clientTimeZone | 可识别；queue/steer 仍受同一时区/节流逻辑 | 不等于父代理自动传播 | [S6] |
| send_message 模型间消息 | agent-message + senderSessionId；无区字段 | 该消息不贡献时区 | 接收者自己的旧提示可能存在；文本可能转述区 | [S7] |
| 子代理结束回父通知 | subagent-settled + senderSessionId；无区字段 | 不贡献时区 | 忙时 steer，闲时 queue；可混入父当前轮 | [S7] |
| goal 自动 round | goal + goalId/revision/round；无区字段 | 新轮无其他合法消息时为 missing，或节流无新注入 | 继续同一 Agent 的历史，不是原人类请求的区快照 | [S8][S1] |
| job 完成通知 | tool-jobs notice；无区字段 | 不贡献时区 | 可 inject 到下一 step；配置允许时闲 Agent followup 唤醒 | [S9] |
| 自动模型请求重试 | 同一 step 的 while 重试；不重走 pre-step | 不重新采样/注入时区 | firstAttempt 后不再次追加 decision.messages；按当前表面重建请求 | [S16] |
| 模型切换 | 路由可触发压力压缩 | 已查切换 hook 不专门刷新时区 | 可因压缩更换表面；不是时区源变化事件 | [S17][S16] |
| compaction 摘要调用 | 选中历史 + 固定压缩指令；purpose=compaction | 不新走 agent/pre-step | 若选中区包含旧提示则带旧文字；摘要不保证逐字保留 | [S13][S14] |
| SDK JSON-RPC prompt | 协议仅 sessionId/contentBlocks；server source=user | 无 rpcId/区；可新注入 unavailable | 恢复会话可能已有旧提示；协议本身未承载区 | [S10] |
| ACP prompt | 已查桥接构造 source=user | 无 rpcId/区；可新注入 unavailable | 不宣称 ACP 标准整体不支持扩展；此桥接未读取区 | [S11] |
| headless task | source=user | 无 rpcId/区；可新注入 unavailable | resume 仍可能重放历史，不是本次检测值 | [S12] |

## 1. agent/pre-step：投影、注入与节流

- 投影 key=timeContext、stateVersion=3；存 lastMessageTime、lastInjectionTime、lastTurnInjectionTime、browserTurn、browserTimeZones。[S1]
- turn/start 只重置本轮注入时间、轮号和区列表；保留跨轮 lastInjectionTime。[S1]
- user/message 会更新最近模型可见时间；只有 kind=time-context 被视为时间插件自身注入。[S1]
- 已提交 user-rpc 区进入本轮列表；assistant/message 与 tool/result 只更新 elapsed 基线。[S1]
- pre-step listener 采用 prepend，先 await next()，再读取投影并决定是否追加时间消息。[S1]
- next() 已拒绝或 signal 已取消时不注入；插件投影注册未完成时先等待注册。[S1]
- 默认 refreshIntervalMs=600000；0 才在每个符合条件的 step 注入。[S1]
- 节流条件仅检查 lastInjectionTime 和当前墙钟差；**未比较时区、来源、策略 revision 或轮号**。[S1]
- 且节流发生在 deriveBrowserTimeZoneContext 之前：已被节流的 step 根本不会执行该 reader 的校验/混合判断。[S1]
- 无节流时，当前轮以 state.browserTimeZones + decision.messages 推导；非最新轮的 typed 调用另向后扫描到 turn/start。[S1]
- reader 只接受 source.kind=user、rpcId 为 string、clientTimeZone 为 string；裸 user 也不够。[S2]
- reported 值需为规范化 UTC/IANA Area/Location；非规范值会在请求准备时 TypeError，不静默吞掉。[S2]
- 集合去重排序后：零区 missing、一区 resolved、多区 mixed；**缺字段消息不制造 mixed**。[S2]
- resolved 指令要求按该区解释无区日期；mixed/missing 要求向用户澄清。[S2]
- resolved 区也覆盖采样时间的显示区；mixed/missing 只回退 config.timeZone 或进程区显示当前时刻。[S1]
- 因而“显示了服务器时间”不表示“已授权用服务器区解释无区日期”；现有文字明确仍要求澄清。[S1][S2]
- 时间提示以 user/message、source=time-context、form=snapshot 持久追加，而非只在传输层暂时附加。[S1][S16]
- 投影 checkpoint 是 {ver,seq,val} detached clone；版本不匹配时 restoreFloor 要求从全日志重折叠。[S18]
- 这里只确认投影/快照契约；未执行任意真实会话的落盘、崩溃恢复或旧版本缓存迁移。

## 2. 排队与同轮异源混合

- Agent.followup → next-turn+wakeup；steer → next-step+wakeup；inject → next-step、不主动唤醒。[S3]
- claim 先取完整 next-step 批次，必要时再取一条 next-turn；**不能假设一次模型请求只有一位来源**。[S3]
- turn/start 在第一批 claim 前记录，故同批 proposed 中的区需与该轮已入历史区合并。[S1][S3]
- 忙时注入的 job/子代理通知没有区，不会污染集合；但也不能证明其应沿用用户请求区。[S7][S9][S2]
- 同轮一个合法区 + 任意数量无区消息仍为 resolved，而非“部分未知”；这是当前算法事实，不代表新策略已认可该语义。[S2]
- 后续 step 换区，投影可收集新区，但若十分钟未过，模型仍可能只看到之前的唯一时区提示。[S1]
- 接受排队消息时若不冻结策略，执行时设置已改变会造成追溯语义漂移；这是设计风险，尚未运行验证。

## 3. subagent：spawn/fork/人工输入/返回唤醒

- spawn provider 返回空 create spec，明确 inheritsParentContext=false；模型路由继承不等于时区继承。[S4]
- manager 把初始 prompt 包为 source={kind:user}；未附 rpcId、clientTimeZone 或父请求时区 snapshot。[S6]
- fork provider 只捕获父会话最近完成轮前缀一次，当前工具调用所在未完成轮排除；冷恢复不重新 fork 更新父历史。[S5]
- **推导**：若 seed 含近期 time-context 注入，投影重放会恢复它的 lastInjectionTime；孩子首轮可能被节流。
- 此推导由 fork seed + timeContext reducer/节流共同支持，不是已执行 fork 测试结果。[S1][S5]
- 即使孩子稍后新注入，初始任务没有合法 user-rpc 区，本轮通常显示 unavailable；旧父区只属于历史证据。[S2][S6]
- 人工对子代理 prompt 是独立例外：Remote prompt 校验并规范化 clientTimeZone，构造 user/rpcId source 后送达。[S6]
- send_message 的 source=agent-message/form=relay，仅记录 senderSessionId；不能从身份反推出发送时的时区。[S7]
- settlement 通知同样只有子身份和结束原因；父忙时 steer、闲时 queue；文字中即便包含区也不是结构化字段。[S7]
- 新策略的传播 seam 在 manager 初始 submit、createAgentMessage、createSettlementMessage、人工 prompt admission；四者不能混为一种继承。[S6][S7]

## 4. goal、job、摘要、模型切换及重试

- goal driver 每次构造新的 goal 消息并 followup；source 不保存原始请求区或其来源。[S8]
- 因而自动续跑没有新的浏览器检测值；旧对话存在与“本轮有请求区”是两个不同事实。[S1][S8]
- job notice 由 tool-jobs 构造；owner、delivery/wakeBudget 决定注入或唤醒，而非时间上下文 resolver。[S9]
- 被其他工具等待直接收集的结算可不再通知；不能据有 job 就断言必有独立唤醒轮。[S9]
- 自动 request-error retry 在 step 内 continue；pre-step 在外层 turn loop，时间提示只在 firstAttempt 入历史一次。[S3][S16]
- buildRequest 依据 session.deriveMessages() 的当前表面构造请求；**不是每次重试重新推导 clientTimeZone**。[S16]
- 模型切换时 compaction-basic 的 agent/request hook 可压缩历史；未看到专门的时区刷新或传播字段。[S17]
- 摘要输入从 shadowedSeqs 派生历史消息，并加 system head；没有读取新的浏览器环境。[S13]
- summarizeWithLlm 直接 ctx.llm.stream，追加固定压缩指令；用途标记 compaction，未调用 Agent.pre-step。[S14]
- 固定摘要格式有 Critical Context，但没有时区字段/来源/策略 revision 必填项；不能承诺旧区文字保真。[S14]
- replacement checkpoint 的 content 是 frameSummary(summary)，source 是 compactCheckpointSource，并非原 user-rpc source。[S13]
- **风险推导**：摘要替换掉唯一时间提示后，投影仍记着最近注入时间；十分钟内可能既不重注入，又只剩摘要的非结构化转述。[S1][S13]
- 该风险不表示审计日志被删除：本报告区分“事件投影可重放”与“当前模型表面仍含原提示”。
- UI 空重试另属入口层 retry source，不是上面的同 step retry；它可保存区字段，但当前 reader 按 kind 排除。[S2][S15]

## 5. 无浏览器入口的准确边界

- SDK 的 SessionPromptParams/SessionQueryParams 未声明 clientTimeZone；server 普通 prompt 固定 source=user。[S10]
- ACP 桥接在 admitAcpPrompt 后固定 source=user；未把协议扩展元数据映射到 rpcId/时区。[S11]
- headless 在已有/新建 Agent 上提交 task，同样固定 source=user；进程区只可能影响采样 fallback。[S12][S1]
- 以上是**已查入口没有可识别字段**，不是“所有 SDK/ACP 生态永远无法携带区”的断言。
- 不建议伪造 rpcId 将自动来源冒充 browser；应给非浏览器来源明确定义的上下文模型与 provenance。

## 6. 新覆盖策略需要的 seam（建议，尚未实施）

| seam | 应固定的契约 | 现有依据/缺口 |
| --- | --- | --- |
| admission 快照 | 分离 detectedClientTimeZone、effectiveRequestTimeZone、mode=browser/fixed/host、policyRevision | 现 source 仅 clientTimeZone，无真实检测/覆盖来源分离。[S6][S15] |
| 排队存储 | 消息接受时冻结快照，保留 messageId/requestId；策略切换不回写已接受输入 | inbox splice 已持久承载原消息，可作为传播载体。[S3] |
| resolver 来源 | 声明 human RPC、人工子 prompt、goal、job、agent relay、SDK/ACP 的区归属；missing/mixed 显式化 | 当前 reader 只有 user+rpcId gate。[S2] |
| 注入失效 | 时间流逝节流与语义变化分离；effective 区/模式/来源/轮身份变化要能失效 | 当前只有 session 墙钟节流。[S1] |
| spawn/fork | 明确创建时快照是否传播；fork seed 不能冒充当前请求检测值 | provider seed 与 initial submit 分层。[S4][S5][S6] |
| 自动唤醒 | goal/job/settlement 选择任务上下文、接收者上下文或 unknown；保存选择理由 | 当前构造器均无区字段。[S7][S8][S9] |
| 压缩/恢复 | 结构化有效区独立于摘要；版本化投影可重建；表面替换后能恢复必要提示 | 当前 checkpoint source 不保留原 RPC attribution。[S13][S18] |
| retry/切换 | 区快照是否随原请求固定；重试不重新检测；手动 retry 不因 kind gate 意外丢失 | 当前自动重试复用，空 RPC retry 被 reader 忽略。[S16][S15][S2] |
| SDK/ACP/headless | 可选显式上下文契约；无浏览器时不得伪称检测到 browser 区 | 当前入口均无此契约。[S10][S11][S12] |

host 的含义以[主契约](../TIMEZONE_POLICY.md#21-请求上报时区)为准：当前连接的宿主进程实际提供并校验的时区，不是另一项服务器固定值配置。仍需补齐宿主事实获取接口、采样时机及连接代次失效规则；这些是实施缺口，不重新开放 host 含义。
来源诊断必须区分真实检测与 fixed/host 覆盖。按用户已认可的[主契约](../TIMEZONE_POLICY.md#22-区分检测事实与上报策略)，实际 wire clientTimeZone 与原生 Browser time zone 行都应使用选定上报值；该行表示本请求选定值，不强制更名。非浏览器自动入口若没有该 RPC 字段，则不能伪造 browser 检测来源，应单独展示其真实策略来源。
以上属于待设计的新增契约；不是建议偷偷改变现有 missing/mixed 的澄清行为。

## 7. 关键风险与验收建议

- P0：新轮、同轮 steer 换区、检测值相同但 mode/revision 变化，均应有明确提示失效测试，不能只测 refreshIntervalMs=0。
- P0：保留独立真实检测值及历史来源；新 fixed/host 请求同时改变 clientTimeZone wire 值与 effective 解释，不能只追加另一条有效区指令。
- P0：队列入列后变更策略；验证消息快照、执行策略与审计展示不追溯漂移。
- P0：同 step 两个 user-rpc 区、同轮后到异区、合法区+无区消息分别验收，明确 mixed 与 partial-unknown 政策。
- P1：spawn 与 fork（无完成轮/有近期注入/已过节流）分别验证；不以 fork “看得到旧区”冒充字段继承。
- P1：人工子 prompt queue/steer、send_message、settlement 忙/闲唤醒分别验证来源与区策略。
- P1：goal 自动 round、job inject/wakeup/wakeBudget 耗尽后，验证不产生虚假的 browser 检测值。
- P1：压缩含唯一时间提示的区域，随后立即请求/换模型/恢复；验证语义上下文仍可重建且没有依赖摘要猜测。
- P1：自动 retry 与 UI 空 retry 分开测试；验证重试期间策略变更不会悄悄重新解释原请求。
- P1：SDK、ACP、headless 新会话/恢复会话各测显式区、缺失区；无字段必须可观察为 unknown，而非假定服务器区。
- P2：投影 version 不匹配、旧缓存、墙钟回拨与插件重载，验证不会长期保留过时来源或跳过必需注入。
- 所有验收须使用隔离 HOME/DSH_HOME 与临时会话；本次未执行，不能声称通过。

## 8. 未验证项与退出边界

- 未执行浏览器/RPC、Agent loop、SDK、ACP、headless 或真实 provider；只据源码得出控制流结论。
- 未逐包比较官方 tag 与安装包内容，不声称字节一致；未确认可用逐行官方源码 URL。
- 未追踪第三方 adapter 内部重试/模型切换、额外插件覆写 source 或自定义 summarizer；不可外推为全生态结论。
- 未读取生产会话验证投影缓存实际落盘；fork/压缩+节流风险均明确标为静态推导。
- scheduled task 的时区、浏览器自动采集、设置 UI 与 Extras 配置传播由主线并行调查；此报告不重复下结论。
- 本文仅新建研究记录；没有新增策略配置、源码修改或提交。

## 证据索引

每项均为 **@deepseek-ai/包名 0.2.2-rc.3** 自带源码；链接为版本入口，不是猜测的源码链接。

- [S1] [dsh-time-context 0.2.2-rc.3 — src/index.ts:35–56,84–95,133–244][S1]：状态、fallback、节流、注入。
- [S2] [dsh-time-context 0.2.2-rc.3 — src/request-zone.ts:18–96][S2]：来源 gate、校验、mixed/missing 文本。
- [S3] [dsh-agent-loop 0.2.2-rc.3 — src/agent.ts:171–189,289–310,332–353,401–406；src/inbox.ts:19–64,102–112,215–228][S3]：排队、claim、持久 splice、pre-step。
- [S4] [dsh-subagent-spawn-in-process 0.2.2-rc.3 — src/index.ts:38–54][S4]：fresh provider。
- [S5] [dsh-subagent-fork-in-process 0.2.2-rc.3 — src/index.ts:38–77][S5]：完成轮 seed。
- [S6] [dsh-subagent 0.2.2-rc.3 — src/manager.ts:406–412,644–656,1295–1312；src/index.ts:450–487][S6]：初始任务、人工 prompt。
- [S7] [dsh-subagent 0.2.2-rc.3 — src/continuation-messages.ts:14–38,49–75,141–175；src/manager.ts:1118–1134][S7]：relay 与 settlement。
- [S8] [dsh-goal-round-driver 0.2.2-rc.3 — src/index.ts:172–208][S8]：自动 goal 消息。
- [S9] [dsh-tool-jobs 0.2.2-rc.3 — src/index.ts:355–429][S9]：结算通知与唤醒分支。
- [S10] [dsh-sdk-protocol 0.2.2-rc.3 — src/types.ts:70–76,98–104][S10]；[dsh-sdk-jsonrpc-server 0.2.2-rc.3 — src/server.ts:262–280][SDK]。
- [S11] [dsh-acp 0.2.2-rc.3 — src/session.ts:251–275][S11]：ACP admission。
- [S12] [dsh-headless 0.2.2-rc.3 — src/index.ts:391–423][S12]：headless 初始/恢复后提交。
- [S13] [dsh-compaction-basic 0.2.2-rc.3 — src/region.ts:365–413,491–509,544–562][S13]：摘要输入和 replacement。
- [S14] [dsh-compaction-basic 0.2.2-rc.3 — src/summarizer.ts:32–67,120–175][S14]：摘要指令与辅助调用。
- [S15] [dsh-api-session-controller 0.2.2-rc.3 — src/index.ts:467–491][S15]：user/retry 来源保留区字段。
- [S16] [dsh-agent-loop 0.2.2-rc.3 — src/agent.ts:441–485,548–569,732–748][S16]：同 step 重试与模型请求构造。
- [S17] [dsh-compaction-basic 0.2.2-rc.3 — src/index.ts:157–201][S17]：压力/模型切换压缩。
- [S18] [dsh-session-projection 0.2.2-rc.3 — src/index.ts:587–647][S18]：checkpoint 与重放边界。

[S1]: https://www.npmjs.com/package/@deepseek-ai/dsh-time-context/v/0.2.2-rc.3
[S2]: https://www.npmjs.com/package/@deepseek-ai/dsh-time-context/v/0.2.2-rc.3
[S3]: https://www.npmjs.com/package/@deepseek-ai/dsh-agent-loop/v/0.2.2-rc.3
[S4]: https://www.npmjs.com/package/@deepseek-ai/dsh-subagent-spawn-in-process/v/0.2.2-rc.3
[S5]: https://www.npmjs.com/package/@deepseek-ai/dsh-subagent-fork-in-process/v/0.2.2-rc.3
[S6]: https://www.npmjs.com/package/@deepseek-ai/dsh-subagent/v/0.2.2-rc.3
[S7]: https://www.npmjs.com/package/@deepseek-ai/dsh-subagent/v/0.2.2-rc.3
[S8]: https://www.npmjs.com/package/@deepseek-ai/dsh-goal-round-driver/v/0.2.2-rc.3
[S9]: https://www.npmjs.com/package/@deepseek-ai/dsh-tool-jobs/v/0.2.2-rc.3
[S10]: https://www.npmjs.com/package/@deepseek-ai/dsh-sdk-protocol/v/0.2.2-rc.3
[SDK]: https://www.npmjs.com/package/@deepseek-ai/dsh-sdk-jsonrpc-server/v/0.2.2-rc.3
[S11]: https://www.npmjs.com/package/@deepseek-ai/dsh-acp/v/0.2.2-rc.3
[S12]: https://www.npmjs.com/package/@deepseek-ai/dsh-headless/v/0.2.2-rc.3
[S13]: https://www.npmjs.com/package/@deepseek-ai/dsh-compaction-basic/v/0.2.2-rc.3
[S14]: https://www.npmjs.com/package/@deepseek-ai/dsh-compaction-basic/v/0.2.2-rc.3
[S15]: https://www.npmjs.com/package/@deepseek-ai/dsh-api-session-controller/v/0.2.2-rc.3
[S16]: https://www.npmjs.com/package/@deepseek-ai/dsh-agent-loop/v/0.2.2-rc.3
[S17]: https://www.npmjs.com/package/@deepseek-ai/dsh-compaction-basic/v/0.2.2-rc.3
[S18]: https://www.npmjs.com/package/@deepseek-ai/dsh-session-projection/v/0.2.2-rc.3
