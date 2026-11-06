# 指定 session 与 goal-wait armed/disarmed 历史研究（2026-11-06）

## 0. 方法与证据边界

本报告仅研究，不实现、不安装、不发布、不提交；本研究者只写本报告。源码核查、固定提交比较、Git 历史与只读文件指纹不是运行测试；下文引用既有测试表示“测试写了什么”，不表示本次执行成功。没有访问 live GUI，没有修改真实 DSH profile 或原始插件仓库。任务合同要求保留原插件行为、隔离环境验证及不夸大 native/browser coverage，见 [贡献合同:5–11](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/AGENTS.md#L5-L11>)。

**核心结论：用户记得的四模式在后续旧分体0.4.23普通row中确实存在；Extras移植来源停在0.3.0，当前没有replacement/off等同等能力，是真实产品缺口。**“早期experimental startup不支持普通row”只解释G0，不能作为否认G1的理由。armed重叠撤权歧义是历史已知限制，不是新发现，也不能只加一个boolean解决（第2、3、5节给固定源码证据）。

必须区分三条时间线，否则会把用户已用过的功能误称为“从来只有实验入口”：

| 代号 | 固定身份 | 本报告用途 |
| --- | --- | --- |
| E | Extras v0.2.1，提交 `6342ebbb1f8a14f546b86d940681417003d06be6` | 当前研究目标；[来源记录:5–13](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/docs/PROVENANCE.md#L5-L13>) 明确选用旧 goal-wait 0.3.0。 |
| G0 | 旧 goal-wait 0.3.0，提交 `62662dc2b92f415f451f1c362535617e23f445d7` | Extras 实际移植基线；此时 root 是普通 activation gate，replacement 是另一个 opt-in startup API。[0.3 startup 契约:5–37](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/startup-driver.md#L5-L37>) |
| G1 | 旧 goal-wait 0.4.23，提交 `cbd86273660893336afaee31794b5fd76487db78` | 后续真实产品能力；[包版本/导出:2–18](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/package.json#L2-L18>)、[四模式配置:121–142](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/config.ts#L121-L142>)。不能因原 main checkout 停在 G0 就忽略它。 |
| H | 本机只读发布包 DSH 0.2.2-alpha.3 | 原生行为补充核查。安装目录不是 Git 仓库，不伪造上游 commit；driver SHA-256 与 G1 [精确 artifact pin:99–108](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/host-version.ts#L99-L108>) 一致，见附录。 |

E、G0、G1 的公开链接均固定到完整提交而非 main/master；宿主证据以已发布版本+实际 bundle 指纹+行号固定，不能声称已取得宿主上游 commit。G0 工作区已有用户文档/未跟踪研究改动，未当作 G0 的提交证据；引用的 tracked 源码/ADR/test 经只读 git diff 核对与固定提交一致。

## 1. 指定 session 到底问了什么

指定私有材料为 session `session-0a5c1afb-e654-4c13-9f50-be734eafaa53`。先读取 projection cache，再按精确 session 目录定位原生压缩持久化记录。原生记录为 concatenated zstd：首个 one-shot 解压只有 header，随后按实际 consumed bytes 循环读齐132帧、280个JSONL行（含header，事件截至seq=278）。只在内存解码，不落地私有dump；以下只保留必要摘要/消息定位。

- 缓存 `rows.titleInput.val.first`（行206–215）只能证明缓存窗口，不能单独推出全会话有多少用户请求。本次进一步核对原生当前持久化代：第10行、seq=8 是唯一 `source.kind=user` 的直接人类消息；其余5条 user/message 是宿主注入的指令/运行时/技能/时间等上下文，不是另5个问题。该消息附图（本次未读取图像内容）和文本，问旧分体的多种“实现方式”、为何新版没有用户认为最完整的“本插件移植驱动”、新版如何处理，明确要求只读研究回复。结论限于本次读到的当前持久化代，不外推未来追加记录。
- 原生第278行、seq=276 的最终 assistant 可见 text（排除 reasoning 块）已识别 0.4.x/cbd8627 四模式与0.3.0移植来源的差别，承认 replacement/off 没有承接、关模块不等于 off，也提到重叠 disarm 的旧有限制。无需把既有答复误说成完全没有发现后续旧版。缓存 `turnOutline`（行84–89）只是该答复的摘要，不再作为完整答复证据。
- 这条直接人类请求可归纳为：**选择器是否消失、replacement 是否仍存在、旧体验如何承接**。原生可见最终答复没有引用其它历史 session id；本次未因此扩读无关私有会话。armed/disarmed 争论是解释差别必需的历史设计背景。
- 既有答复仍需收紧三处：①“范围裁剪”解释不能抹掉相对后续普通row四模式的真实产品缺口；②非native startupOwner 的 fail-closed 仅在宿主实际报告该字段时成立，E runtime接线未证明；③含strategy的0.4.23配置可能先报 schema conflict，不总是 unsupported legacy version。固定源码核对见第5节。

用户描述的中文名称并非臆测：G1 [四个页面选项:26–46](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/client/client.js#L26-L46>) 原文包含“官方原生驱动＋闸门（默认）”“本插件移植驱动”“官方原样”“关闭续行”；页面还区分实际 mounted driver，见 [实际驱动标签:310–315](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/client/client.js#L310-L315>)。E 页面实际只有三个等待参数，没有 strategy，见 [当前 goalWait 编辑项:265–269](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/client/settings-core.ts#L265-L269>)。

## 2. 历史讨论约束与决策：不是 armed 就等于目标存在/有权限

### 2.1 早期 activation 折中保留了什么

G0 的已接受 ADR 明确把 durable goal phase、process-local activation、调度时机分开：普通 gate 只临时令 active+armed 变 active+disarmed，不 pause、不删目标、不取消已有工作；合法 edit 可继续，释放时取最新 revision。模型目标编辑权限与 armed 无关，目标是否被模型看到又是第三层问题。见 [ADR 0001:15–21](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L15-L21>)。

拒绝“在 pre-step 直接 reject 代替等待”，是因为它已在调度后且可能导致 prompt-rejected blocked；长期 await 则占着 running/open turn，不是父 agent 真 idle；删队列会侵入 reservation/cancellation 协议。因此 ADR 选择兼容桥接而非假装有一个安全的公开 scheduling defer seam，见 [替代路线取舍:23–33](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L23-L33>)。

这不是声称“保持 armed 不可能”。后续 running-wait 研究明确能保持 armed，但占住父 turn，延迟 whenIdle/turn end，而且取消、输入、max-tokens、卸载均须释放；见 [running-wait 的边界:28–58](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/research/turn-stopping-wait-gate.md#L28-L58>)。这些是旧研究记录的结果，不是本次重跑。

### 2.2 replacement 为什么成为更完整体验的候选

G0 后续研究优先考虑 version-pinned native adaptation：把等待放到 scheduler 内部，父真正 idle，正常等待仍 active+armed，不长期挂 Stop waiter；但要接管 reservation、准确计数、权限、flush、竞态和 teardown，不能以几行 predicate 宣称完整等价。研究也记录 final pre-step 到 request/admission 的窗口，见 [候选定位:5–16](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/research/goal-driver-replacement.md#L5-L16>)、[最低责任集:37–60](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/research/goal-driver-replacement.md#L37-L60>)、[最终 admission/通知边界:87–97](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/research/goal-driver-replacement.md#L87-L97>)。

G0 ADR 0002 批准的是独立 opt-in startup owner，不推翻普通 root 默认；新 root、空 registry、同 realm、精确宿主 artifact、唯一 owner 是前提。ordinary Loader/profile row 不支持，且该版本没有页面/热切换，见 [ADR 0002:7–31](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0002-opt-in-pinned-driver.md#L7-L31>)。**这个事实仅属于 G0，不能用来否认 G1 已有页面功能。**

### 2.3 到 G1 已发展出普通 row 四模式，不再只有 root bootstrap

G1 的 [row owner 设计:1–28](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L1-L28>) 明确：bundle 关闭宿主 driver row，由插件子 Fiber 挂载 driver，不要求 root-parent、不使用 startup lifetime tombstone；volatile 配置可串行切换。四模式语义如下：

| 模式 | 旧 G1 实际拥有者/等待语义 | E 对应情况 |
| --- | --- | --- |
| activation | 插件挂宿主原生 callback，再配 disarm/resume gate | E 只保留 gate，仍依赖宿主原 driver；不拥有 driver composition。 |
| replacement | 精确 pin 的移植 driver；按资格等待，正常不 disarm | E 没有移植 driver 或 strategy 配置。 |
| native | 插件挂原生 callback，无 gate；页面内回退 | E 关闭 goalWait 可撤销 gate，但不是同一四模式 owner/status 契约。 |
| off | 不挂 driver，且 alwaysHold | E 模块 disabled 是卸载 gate/释放自身 hold，**不等于关闭目标续行**。 |

依据：G1 [配置含四语义:121–142](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/config.ts#L121-L142>)、[bundle driver 所有权:19–28](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/cordis.patch.yml#L19-L28>)；E [仅 activation bridge:6–8](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L6-L8>)、[卸载行为:74–79](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L74-L79>)、[释放 owned holds:70–87](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L70-L87>)。因此“新增几个下拉项”不足以恢复体验；还缺 driver owner、交接、实际生效状态、兼容 pin 与模式切换协议。

## 3. 当前宿主真实 activation/join 行为

以下不是运行实验；固定设计依据参见 G0 ADR/G1 driver pin，另以 H 实码校核，文件指纹见附录。

1. **active 不等于 armed。** H 创建 live Agent 时统一 disarm；runtime activation 初始 disarmed、仅进程内保存。session resume/fork 重建的 goal 不自动恢复续轮授权；E 也不得迁移 transient continuation authority。依据：[固定 ADR 状态区分:17–21](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L17-L21>)、[禁止迁移临时授权:11–13](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/docs/MIGRATION.md#L11-L13>)；H [created/replay disarm:597–607](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L597-L607>)、[runtime activation:781–807](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L781-L807>)。
2. **human enqueue 不自动 rearm。** human message 提供的是工具执行时的 authority，不是直接切 activation；显式 resume 才 armed。模型 create/edit/pause/resume 需要当前 root turn 已接受 source.kind=user；complete/blocked 可以依据 exact admitted goal round。driver 本身不是 root-only，不能把模型工具权限说成底层 driver 不支持 child。依据：[固定权限/driver职责:43–56](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/research/goal-driver-replacement.md#L43-L56>)；H [human/exact round authority:49–79](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tool-goal/lib/index.js#L49-L79>)、[显式 resume:691–704](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L691-L704>)。
3. **原生没有 disarm owner token。** H 只有 activation 值；相同值再次 setActivation 直接 return，无事件、无 revision 变化、无 reason/generation。gate 自己 disarm 后，外部再 disarm，同一个 goal+held 标志不能证明 gate 仍拥有恢复权。旧 ADR 已专门承认重叠撤权歧义，见 [旧有 ownership 限制:35–41](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L35-L41>)；H [disarm 不变 phase/revision:620–631](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L620-L631>)、[同值无事件:781–807](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L781-L807>)。E 的 release/unload 仅查相同 goal、active、disarmed，见 [release 判定:160–169](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L160-L169>)、[unload 判定:70–78](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L70-L78>)。所以“不恢复任何外部 disarm”只能保证**没有已有 owned hold**的那部分，不能无条件宣称成立。
4. **H 原生已 join progressing descendants，刻意跳过 idle parked inbox。** 固定 G1 pin 将该版本标记 joinsProgressingDescendants=true，[H pin:99–108](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/host-version.ts#L99-L108>)；H [先 armed 再 native join:128–134](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L128-L134>)、[progressing join/parked 跳过:1297–1334](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-subagent/lib/index.js#L1297-L1334>)。这不是等待所有 resident Agent，更不是等待所有 durable child records。

## 4. native join 后最重要的状态模型差异

G1 记录了一种真实历史反例：interrupt 且有未领取 inbox 的 child 仍保留 live Agent，native join 会跳过，但旧 any-registered-descendant/epoch 策略会长期阻止父续轮。报告不复制涉及的私有会话，固定公共证据为 [后续 ADR parked 状态复核:55–64](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/docs/adr/0001-retain-activation-gate.md#L55-L64>)。

历史修复提交 `634b8709f8066f2655fa4b69ff94dd3efc468859` 的主题是 defer subagent waiting to native-join hosts。现 G1 [replacement policy:199–206](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/background-work.ts#L199-L206>) 在 nativeSubagentJoin=true 时不再叠加 descendant/epoch hold；Jobs 仍保留自有 policy，[Jobs wake fence:215–238](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/background-work.ts#L215-L238>)。[native join policy 回归测试:299–324](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/test/background-work.test.ts#L299-L324>) 验证 parked child/open epoch 不再阻止 policy、live Job 仍阻止；这是 fake host policy 测试，不是当前研究者跑过的 native 集成。

**分类要精确：**该修复改的是 replacement，G1 ADR:62 明确 activation 仍保持 waitForSubagents=true 的旧语义，用户可显式设 false。因此 E 仍把 idle registered child 算 live（[E 全部注册后代:28–49](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/live-work.ts#L28-L49>)），是**继承旧 activation 的保守限制**；但相对用户原来可选的 corrected replacement，是**实质体验/设计缺口**，不能用“原封不动移植 gate”证明全功能等价。

E 在 turn-stopping 先 disarm（[stop/idle/changed 检查点:48–65](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L48-L65>)），而 H driver 先查 armed 再 join。由源码顺序可推导：处于 held 的父 goal 连 native driver 的 child join 分支也到不了，不是“原生 join 已把一切补齐”。固定 G1 移植 driver 同样保留这项先后次序，[armed→join→cap:159–177](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/native-driver.ts#L159-L177>)。本报告没有动态复现 15 小时停顿，也不作 token/延迟 SLA。

## 5. 当前丢了什么、什么不能算真回归

| 项目 | 结论/分类 | 固定提交证据 |
| --- | --- | --- |
| G0 常规 gate 的 jobs/live descendants、当前 revision release、人类显式 rearm 让步、终态不复活、超时与卸载恢复 | **静态基本保留**，未发现这些核心分支相对 G0 被删；E 改动主要是 volatile policy provider。不是本次执行的通过证明。 | [G0 hold/release:104–168](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/src/gate.ts#L104-L168>)；[E hold/reconcile/release:105–169](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L105-L169>)；[现有 fake 回归:118–195](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/test/modules/goal-wait/plugin.test.ts#L118-L195>)。 |
| replacement 与四模式页面/真实 driver status/模式交接 | **相对 G1 真实产品功能缺口；相对 E 自定 G0 基线属于刻意排除，不是偶然少了一个 UI 字段。**不能宣称全部旧版行为都迁好了。 | [G1 真实选项](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/client/client.js#L26-L46>)；[G1 row owner](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L1-L28>)；[E 仅常规 gate/排除 startup](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/docs/SPEC.md#L19-L23>)；[E 无 strategy](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/config.ts#L7-L20>)。 |
| native-join parked child 行为 | **旧 activation 已有限制 + replacement 改善未纳入。**不是仅缺测试，也不能泛称所有 idle resident 必须阻止续轮。 | [明确两策略分歧](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/docs/adr/0001-retain-activation-gate.md#L59-L62>)；[E idle 仍算 hold](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/live-work.ts#L20-L49>)。 |
| 外部再次 disarm 重叠已有 hold | **旧已知设计/宿主 seam 限制**，非 E 新引入；无 owner generation 无法证明授权仍属 gate。合同绝对禁止与实际 seam 有落差。 | [旧声明](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L37-L41>)；[E 安全承诺](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/docs/SPEC.md#L21-L23>)；[E 仍可 resume](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L164-L168>)。 |
| mount/enable 时已有 idle Agent | **相对后续 G1 的具体遗漏，非 G0 回归。**G1 mountGate 立即 sweep 所有 live agents；E observed 初始为空，只按后续事件填充，没有 initial sweep。可能漏掉在没有新 boundary 时的已有待处理状态，运行影响待验证。 | [G1 mount sweep](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L360-L377>)；[E observed 初始为空](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L40-L43>)、[E 事件注册与无 sweep](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L48-L75>)。 |
| quiet Job settle 后父无新事件 | **静态待证风险/旧 activation 订阅限制**。E 没有 Jobs settle 订阅，只有 stop/idle/changed（及 policy update）；maxHoldMs 默认0，不能保证静默终结后自行评估。不能仅凭 jobs predicate 宣称保证唤醒。 | [G0 相同事件集](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/src/index.ts#L38-L64>)；[E 事件集](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/index.ts#L40-L75>)；[无限等待默认](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/config.ts#L8-L10>)；对照 [replacement Jobs wake](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/background-work.ts#L215-L230>)。 |
| 0.4.23 旧配置迁移 | **显式不支持/fail closed，而非自动恢复该模式**。已知版本只有0.3.0；strategy 是未知字段，planner 可先以 schema conflict 拒绝，有些输入则报 unsupported legacy version。安全拒绝不等于功能迁移完整。 | [discovery 版本表](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/migration/discovery.ts#L15-L19>)；[校验与版本顺序](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/migration/planner.ts#L39-L52>)；[strategy 不在规则](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/migration/validation.ts#L78-L86>)。 |
| active experimental owner 检测 | **有窄接口，无完整 native 接线证明。**显式 package/startup row 可被拒绝；discovery 接受 startupOwner 注入，但 runtime migrationHost 未提供，不能把 fake 注入测试当程序化 root owner 实测。 | [非 root entrypoint conflict](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/migration/discovery.ts#L197-L207>)、[injected startupOwner](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/migration/discovery.ts#L257-L261>)；[实际 migrationHost](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/runtime.ts#L33-L44>)。 |

G0 startup 自有的协作检测机制确实存在：Symbol.for 的 root-lifetime WeakMap、owner-callback marker、已知 callback/name 和 internal/plugin/update guard，见 [旧 ownership 标记:34–65](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/src/driver/ownership.ts#L34-L65>)、[旧 guard:78–93](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/src/driver/ownership.ts#L78-L93>)。它不是任意 scheduler 的全局租约，也没有证据表明 E 原生适配器已经读取这些机制。

## 6. 测试证据究竟覆盖到哪里

- E 的 plugin/live tests 使用真 Cordis+fake DSH services，合同直接写在 [测试 seam 声明:1–7](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/test/modules/goal-wait/harness.ts#L1-L7>)。编辑释放测试直接更改 fake goal.revision/objective，[edit fake 用例:174–195](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/test/modules/goal-wait/plugin.test.ts#L174-L195>)，不是实际模型工具获准 edit 的证明。
- E 现有 host test 确实编写为挂真实 goal/jobs/原生 driver，验证 hold 不调用模型、release 后一轮；但 job settle 之后**手工 emit agent/status idle**（[host test:12–43](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/test/modules/goal-wait/host.test.ts#L12-L43>)）。这不能覆盖真实静默 Job settle 的唤醒闭环，也不覆盖 parked child、策略切换、重叠 disarm 或 native owner 检测。这里仅阅读，没有重新执行。
- Parent 另告知其已做依赖-free fake/纯 planner probes，分别看到重叠撤权后 rearm、idle registered child hold、0.4.23/version/strategy 拒绝；本报告仅以固定源码解释其可能性，不把父方探针称为自己的执行或 native 集成，复现片段由 parent 汇总保留。

## 7. 后续验证建议（均未在本任务执行）

| 优先级 | 最小隔离场景与必须记录的判据 | 为什么需要 |
| --- | --- | --- |
| P0 | 同一 H artifact 下对照 native、E activation、G1 replacement：普通完成 child、interrupt+parked nextStep child、external provider、nested child；记录 exact ownership/Agent registry 与 residency、activation、inbox、admitted rounds、实际模型请求。 | 分离 all-live 与 progressing，而不是只看 running 数；固定动机 [parked 反例/策略决定](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/docs/adr/0001-retain-activation-gate.md#L55-L64>)。 |
| P0 | Gate hold→外部相同 disarm→work settle→evaluate/unload/timeout；分别要求“不重开外部撤权”与现有实现对照，记录是否有可观察 owner generation。 | 不能靠更多同值事件监听修复没有事件的问题；设计选择需单独决定。[当前恢复条件](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/modules/goal-wait/gate.ts#L160-L169>)、[旧安全边界](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L41-L45>)。 |
| P0 | 新 root 程序化 startup owner + E 迁移；另测 G1 普通四模式 bundle 的 driver row suppression；看新模块是否 fail closed、旧 owner 是否完全未触碰。 | 当前 runtime 缺 startupOwner 采集；不能只给 discovery 手填。[接线缺口](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/src/runtime.ts#L36-L44>)。 |
| P1 | 父已经 idle+active+armed+live Job 时 enable/remount；以及 quiet Job settle、无 completion turn、maxHoldMs=0；不能手工制造 idle 事件来替代真实唤醒。 | 对照 G1 sweep 和 wake subscription；[mount sweep](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L371-L377>)、[Job wake](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/background-work.ts#L215-L230>)。 |
| P1 | 真实 goal-tool 下 root human turn vs pure goal round vs notification turn；edit 当前 revision、resume/fork 重建、complete/blocked、已paused goal；记录 authority 错误而非只断言 armed。 | 权限与 activation 分离，[旧权责区分](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/62662dc2b92f415f451f1c362535617e23f445d7/docs/adr/0001-retain-activation-gate.md#L17-L21>)。 |
| 产品决策 | 明确是维持 G0 常规 gate 范围，还是恢复 G1 四模式+driver status/交接+新版 pin。若选择后者，先做 spec amendment，再定义 owner handover、native/off/disabled 的语义；不要直接加 enum 后静默共挂两套 driver。 | 现 E [已定排除/安全契约](<https://github.com/LMGateX/dsh-extras/blob/6342ebbb1f8a14f546b86d940681417003d06be6/docs/SPEC.md#L21-L27>) 与 G1 [真实组合契约](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L1-L28>) 不同。 |

**最终回答用户的合适表述：**“你记得的设置确实存在于后续旧分体插件。Extras 0.2.1 选取了更早 0.3.0 的常规 activation gate，没有把后续 row 四模式及移植 driver 接进来；所以当前不是 UI 隐藏，也不是在后台自动用了 replacement。常规 jobs/descendant 等待仍在，但 normal wait 保持 armed、native-join parked 处理、原生/关闭续行的页面回退和 driver 所有权状态并未完整承接。是否恢复这些能力需要明确产品与宿主兼容决策，不能把所有差别都称为 bug，也不能称其已经全等价。”证据汇总见第2、4、5节固定链接。

## 附录：宿主发布 artifact 固定化与核查记录

H 安装目录只读，无可验证 Git commit。下面指纹为本次 sha256sum（exit 0），不是 profile/会话摘要，也不是集成测试；driver 指纹与 [固定提交中的 H pin](<https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/driver/host-version.ts#L105-L108>) 完全一致。

| H 文件 | SHA-256 |
| --- | --- |
| [goal-round-driver bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal-round-driver/lib/index.js#L128-L134>) | `1a1cb44cd44363965aca4a288c052df50e6adff0ffdafd0a81fed97b4a7589de` |
| [goal bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-goal/lib/index.js#L781-L807>) | `e17dc2886e1bc3c265fa9406ed4a101dd000ed66f8d8cc43f3075346434729cc` |
| [subagent bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-subagent/lib/index.js#L1297-L1334>) | `5aad8aadee1879f1e8a878431630f885adbe6f9ee9cb1832838abbc56bc1fbea` |
| [goal tool bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-tool-goal/lib/index.js#L49-L79>) | `1b2731e616d37e770c2c61ae57af0981f937a7c0f68e2cd6e7d0e43c53d2114f` |
| [agent-loop bundle](</home/dev/.local/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js#L790-L825>) | `a6fa8e0c7c90191caf5f4a3bb5c624a86e9845cf3c79d020b71420d0e20ae4c1` |

核查操作：tools.working_directory 与 pwd 确认专用 worktree；git rev-parse/status/log/worktree list/diff 只读检查；glob/grep/read 阅读必读合同、指定私有 projection 的 offset/limit、三基线源码/测试/ADR、H bundle；原生压缩会话按帧只读内存解码并筛选 human source 与最终可见 text；只读 sha256sum。shell 均核查 exitCode；宿主非 Git 的128由只读子研究确认并解释，不当作成功身份认证。本研究没有后台 shell job、持久 terminal、安装/发布或提交；所有研究子任务已收齐。未引用未固定的未提交研究资料作为已证功能结论。
