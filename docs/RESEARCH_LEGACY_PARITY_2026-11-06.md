# 旧插件补充研究：功能完整性与 armed/disarmed 历史

日期：2026-11-06（Asia/Shanghai）。研究对象：Extras v0.2.1，固定源码提交 `6342ebbb1f8a14f546b86d940681417003d06be6`。范围仅研究与隔离诊断；没有实现功能、安装本机插件、修改真实 profile、访问生产 GUI、push 或发布。

## 1. 结论先行

**不能把当前 Extras 说成“四个旧插件最新版本的完整功能合并”。** compact、retry、chime 的主要后端能力与所选旧来源基本一致；最重要的遗漏集中在 goal-wait 的来源版本与实现策略，以及统一设置页丢失的部分配置编辑能力。

1. [既有来源记录](<PROVENANCE.md#L5-L11>) 将 goal-wait 固定在 0.3.0 的 62662dc，而用户指定 session 所指的“本插件移植驱动”已是后续旧插件产品能力。公开最新 [v0.4.23](https://github.com/LMGateX/dsh-goal-wait-gate/releases/tag/v0.4.23) 在 Extras 开发前已发布，不能只拿旧仓库当前检出的 master/HEAD 当作最新版本。
2. v0.4.23 的普通插件行已经支持 activation / replacement / native / off、原生驱动槽位协调、在线策略切换与实际驱动诊断；不是只能用 0.3.0 的实验 startup 启动方式实现。当前 [规范](<SPEC.md#L19-L23>) 有意只选常规 activation gate，但其选源和范围不足以覆盖用户所说的新版旧分体插件。此报告指出范围差异，**不自行改写规范或授权默认切换**。
3. armed/disarmed 歧义是旧 activation 设计的已知边界，不是 Extras 独有回归。已经持有 hold 时再次外部 disarm，若没有可区分的 authority token/generation，gate 无法知道撤权发生过；当前 [释放逻辑](<../src/modules/goal-wait/gate.ts#L149-L168>) 仍会重新武装该 active/disarmed goal。规范“从不重新武装外部撤权 goal”的绝对保证不能由已有用例推出。
4. retry 分类/取消逻辑并未重写，但 UI 由旧的组级草稿/一次 mutation 改为逐字段保存，布尔项即时保存且没有 unset/reset。属于真实用户交互能力回退，而非只有测试空白。

指定 session 的原生持久化记录已补充核对（不仅是 projection cache）：既有答复本来已指出 0.4.x 四模式与 0.3.0 选源差异、replacement/off 缺失及重叠 disarm 边界。因此本轮不是把这些历史结论包装成新发现，而是补全最新公开版本证据、native-join/owner 接线边界，以及跨插件 UI 与功能遗漏清单。会话只保留必要摘要与 seq 定位，不提交原文或 dump；见 [原生会话核查摘要](<RESEARCH_SESSION_ARMED_2026-11-06.md#L20-L27>)。

专题证据见：
- [指定 session、历史设计与版本时间线](<RESEARCH_SESSION_ARMED_2026-11-06.md>)。
- [Chime / Goal-wait 源码与测试逐项对比](<RESEARCH_PARITY_CHIME_GOAL_2026-11-06.md>)。
- [Compact / Retry 源码与配置交互逐项对比](<RESEARCH_PARITY_COMPACT_RETRY_2026-11-06.md>)。

## 2. 比较基线必须分两层

| 模块 | Extras 记录的来源 | 本次核实的公开最新旧插件 | 判断 |
| --- | --- | --- | --- |
| compact-context | 0.4.7 / 22173d1 | [v0.4.7](https://github.com/LMGateX/dsh-tool-compact-context/releases/tag/v0.4.7)，2026-11-04 11:17:30 +08:00 | 来源与公开最新一致 |
| retry | 0.1.9 / c100ff3 | [v0.1.9](https://github.com/LMGateX/dsh-stream-retry/releases/tag/v0.1.9)，2026-11-04 11:16:58 +08:00 | 来源与公开最新一致 |
| chime | 0.6.0 / 88f17e3 | [v0.6.0](https://github.com/LMGateX/dsh-session-chime/releases/tag/v0.6.0)，2026-11-05 20:55:45 +08:00 | 来源与公开最新一致 |
| goal-wait | 0.3.0 / 62662dc | [v0.4.23](https://github.com/LMGateX/dsh-goal-wait-gate/releases/tag/v0.4.23)，2026-11-04 11:33:02 +08:00；源码 cbd86273660893336afaee31794b5fd76487db78 | **来源落后于已发布产品** |

以上四个 release 的 GitHub CLI 查询均返回 draft=false、prerelease=false。后续分支/标签只读检查，没有 fetch/reset/checkout 或修改旧仓库。goal 仓当前检出点落后并已有用户修改，保持原样。

## 3. 重要遗漏与边界（优先级是后续建议，不是已批准实现）

| 建议优先级 | 发现 | 性质、影响与证据 |
| --- | --- | --- |
| P1 | goal-wait 四策略及“本插件移植驱动”缺席 | 相对 0.4.23 是实质产品能力缺口；当前只提供常规 gate。[旧策略 schema](https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/config.ts#L25-L46)、[普通行接入](https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/index.ts#L1-L20)。不能用旧 startup 的 root-only 限制解释后来的普通行实现。 |
| P1 | activation authority 歧义与新宿主等待语义 | 属于继承限制与模型边界。当前把所有 registered descendants（包括 idle）视为工作，可能一直 hold；[当前定义](<../src/modules/goal-wait/live-work.ts#L20-L49>)。旧 replacement 后来增加 native-join 分工，**不代表简单把 activation 判定改成 running-only 就等价**。 |
| P1 | 最新旧版 goal-wait 无迁移支持 | [发现器版本白名单](<../src/migration/discovery.ts#L15-L22>) 与 [planner](<../src/migration/planner.ts#L41-L55>) 只接受 0.3.0。0.4.23（尤其 strategy 字段）会 conflict，保留旧 owner；这是正确 fail-closed，但不是“最新旧插件无缝迁移已实现”。 |
| P2 | 实际驱动/fallback 诊断缺失 | 旧版区分 requested 与 mounted、host pin、fallback；[旧状态合同](https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/status.ts#L18-L33)。Extras 主要是模块 fiber active/disabled；无法把 active 解读为某个 continuation driver 已被验证接管。 |
| P2 | 已有 idle agent 的首次挂载 sweep、热路径索引未跟进 | 旧版 [mountGate](https://github.com/LMGateX/dsh-goal-wait-gate/blob/cbd86273660893336afaee31794b5fd76487db78/src/mode.ts#L360-L378) 立即扫已有 agent。当前 [observed 集合](<../src/modules/goal-wait/index.ts#L32-L43>) 从空开始，等待后续事件；每次 [descendant 查询](<../src/modules/goal-wait/live-work.ts#L28-L49>) 重建索引，[job 查询](<../src/modules/goal-wait/live-work.ts#L53-L58>) 扫列表。是相对后续版本遗漏，未在本轮做性能压测。 |
| P2 | 实验 startup ownership 检测 seam 未接线 | [发现器](<../src/migration/discovery.ts#L261-L275>) 依赖可注入 startupOwner；实际 [runtime adapter](<../src/runtime.ts#L33-L44>) 和 [CLI host](<../src/migration/cli.ts#L17-L19>) 未提供此字段。显式 startup 子路径会被阻止，但程序化/root callback 的检查闭环未获证明。**不据此声称现网一定双驱动**；需补 native 冲突检测测试。 |
| P2 | retry 组级保存/恢复继承值回退 | [旧编辑器](https://github.com/LMGateX/dsh-stream-retry/blob/c100ff32b6228a81a69778f10e9a3d1f172160d6/client/client.ts#L167-L213) 为三字段共同草稿、一次 mutation、unset/reset/discard。新 [字段编辑器](<../client/settings-core.ts#L110-L148>) 单字段保存，[Switch](<../client/settings-core.ts#L211-L232>) 直接 set；retryEmptyResponse 没有 UI unset，点击与继承相同值也不等于恢复继承。 |
| P2 | compact 重试/PTC 组级原子保存回退 | 旧版可同时提交四项；新每项保存会改变 revision，其余 dirty 草稿因此冲突。revision fencing 本身是正确保护，但缺失的组级事务/草稿 UX 不能用“安全冲突正常”掩盖。见 [Compact / Retry 专题](<RESEARCH_PARITY_COMPACT_RETRY_2026-11-06.md>)。 |
| P3 | 水位编辑合同与包级兼容边界 | notifyAtRatio/pressureStep 仍显示 YAML-only，但新 [schema 克隆](<../src/config.ts#L12-L25>) 全设 volatile，与“所有设置可编辑”的 [UI-1](<ACCEPTANCE.md#L21>) 不一致；旧版本也已 YAML-only，非本次新功能回归。旧类型声明/部分子路径 export 不保留，Node/DSH 支持范围收窄，应独立记录而非声称 drop-in 全兼容。 |

### 3.1 哪些并没有发现重要后端遗漏

- Compact 的 canonical tools、native retention/policy、guidance/pressure、PTC timeout/retry 行为基本保留；新 scoped backend 与可选 reasoning 另有明确 amendment，不属于偷偷替换压缩引擎。
- Retry 的 stream/empty-response 分类、官方 retry 执行、取消/unload 逻辑保留，没有发现额外自建重试循环。
- Chime 的 done/blocked/question/error、DND/rest、去抖、banner/sidebar、声音资产和浏览器生命周期未发现重要功能删除。不能从此推导任意未来宿主都兼容；具体证据及少量差异见专题报告。

### 3.2 还需专项验证，但不能报成已证故障

- native PTC runtime 晚挂载/替换与 scoped preset：现实现仅在构建时尝试包装 ptcRuntime，缺失时不生效；原插件也有同样限制。本轮没有实际 native PTC 执行证据，不能用“设置保存成功”证明目标 agent 的 timeout 已被应用。见 [专项证据与边界](<RESEARCH_PARITY_COMPACT_RETRY_2026-11-06.md#L139-L150>)。
- 静默 Job settle 没有触发新 turn/idle/goal change 的场景：当前 gate 不订阅 settle；已有 host 用例在 settle 后人工 emit idle，因此唤醒闭环仍需独立验证。见 [会话研究中的测试边界](<RESEARCH_SESSION_ARMED_2026-11-06.md#L94-L108>)。
- PTC map 的 UI 接受域比旧版本更严；这对正常路由多为改善，但对可迁移的奇异 key 不能直接宣称完全可编辑。见 [UI 接受域差异](<RESEARCH_PARITY_COMPACT_RETRY_2026-11-06.md#L118-L120>)。

## 4. armed/disarmed 的补充判断

应保留四个概念，不把它们混成一个状态：

1. durable goal phase（active/paused/complete/blocked）；
2. process-local continuation activation（armed/disarmed，且某些宿主存在 parked 的运行时语义）；
3. gate 自己记录的 hold；
4. native driver 是否认为 descendants 仍在取得进展/需要 join。

当前 gate 不修改 durable phase 是正确的；但只凭“相同 goal id + active + disarmed”不能证明仍有独占续跑权限。外部在 hold 期间再次 disarm、恢复会话重新 disarm，与 gate 自己 disarm 后的可见布尔态可能相同。旧 replacement 的价值在于在 driver 入队边界判断背景工作，避免为了等待而占用同一 activation bit；同时它必须保留真正的外部撤权、宿主 pin、队列/中止/卸载和单 owner 规则，不是无条件强制 rearm。

新宿主 native-join 修复属于旧 replacement 策略：不应在 native 已按 progressing descendants 做 join 时，再叠加“任何 registered child/epoch 都算未完成”的阻塞。当前 activation 仍保持旧语义，故这是需要重新选定设计的能力差异，不能把后续 replacement 的修复直接套成现有 activation 的一行补丁。

## 5. 本轮真实执行的验证

### 已执行

- 三条独立研究线并行：指定 session/armed 历史、Chime/Goal、Compact/Retry；各自有只读二次核查。主要结论由协调者再读对应源码交叉确认。
- 四个旧仓库 HEAD/status/全部 refs/tags；公开 latest release 元数据；不修改旧仓库。
- Node 24.17.0 下运行以下已有用例，**93 passed / 0 failed / 0 skipped / 0 cancelled**，约 1.71 秒：

~~~sh
node --test --test-concurrency=1 \
  test/modules/goal-wait/plugin.test.ts \
  test/modules/goal-wait/live.test.ts \
  test/modules/goal-wait/host.test.ts \
  test/migration/planner.test.ts \
  test/migration/discovery.test.ts \
  test/migration/validation.test.ts
~~~

- 另外执行配置表单/页面发布事务测试，**20 passed / 0 failed / 0 skipped / 0 cancelled**，约 0.32 秒；合计 **113 项已有回归通过**。其中 [sibling draft 冲突用例](<../test/client/forms.test.ts#L144-L161>) 固化的是冲突保护，不是恢复了旧组级保存能力：

~~~sh
node --test --test-concurrency=1 test/client/forms.test.ts test/client/page-publication.test.ts
~~~

- 三个额外小探针全部断言成立：
  1. gate hold 后重复外部 disarm，工作结束后仍会 resume；
  2. 无 running job 但仍 registered 的 idle child 会 hold 常规 gate；
  3. pure planner 拒绝 0.4.23 与 strategy 字段，不授权旧 owner handover。

前两项用 fake goal service/registry，第三项用纯 planner；不是完整 native host/GUI 验收。它们是**确认已有限制的诊断成功**，不是“已修复 bug”。当前用例中“gate 从未 hold 的 disarmed goal 不会被恢复”只覆盖较窄场景，并不能覆盖 hold 期间重复外部撤权。

### 本轮没有做、也不声称做过

- 没有重新执行 CLI 安装、stock Web profile、Playwright、打包/清洁 consumer、driver 切换/native-join 端到端、性能压测或 provider 网络调用。
- 既有 v0.2.1 发布验收不能代替对旧 0.4.23 行为的 parity 验收。
- 没有读取无关真实 profile、恢复用户旧设置、安装本机版本或重启生产服务。

## 6. 后续顺序建议

1. **先纠正比较基线与范围**：以公开 0.4.23 而非仅 0.3.0 重新列 goal-wait 能力表；实施前按贡献合同记录有证据的 amendment，不事后改口说“旧功能本来不需要”。
2. **策略与迁移一起设计**：若补回四模式，保持一个模块接口/同一源码供组合与拆分；明确普通模块 disabled（恢复官方 owner）与 strategy off（不运行自动 continuation）不是同一功能。保留已保存 strategy，不静默降级成 activation；新旧驱动槽位必须单 owner，可验证 requested/mounted/fallback。
3. **armed 权限与 native-join 优先验收**：hold 中外部再次撤权、pause/blocked/complete、会话重新激活、parked idle child、有未消费通知、child 再获输入、late foreign driver、切换/卸载与队列取消。无 authority token 时不要承诺绝对识别外部重复 disarm。
4. **补回 UI 真正丢失的能力**：retry 的三字段原子保存/Discard/Reset（包括布尔 unset），compact 相关参数组级提交；水位可编辑性与 volatile 提示另行核实。
5. **所有以上改动都要重新跑实际 packed/native/browser 验收**。本报告不实施、不安装、不自动发版，也不把建议视为用户已经批准的产品合同。

## 附录：最小无依赖复现实验

从仓库根目录以 Node >=24.9 执行下面片段即可重现两个 gate 边界及最新旧版本拒绝路径；只在内存中构造测试数据，不写 profile：

~~~sh
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { GoalWaitGate } from './src/modules/goal-wait/gate.ts';
import { planMigration } from './src/migration/planner.ts';
const agent = { id:'p', session:{ id:'p', header:{} } };
const child = { id:'c', status:'idle', session:{ id:'c', header:{ parentSession:'p', origin:'subagent' } } };
let liveJob = true, activation = 'armed', resumes = 0, agents = [agent];
const goal = () => ({ id:'g', revision:1, phase:'active', activation });
const ctx = {
  agents:{ list:()=>agents },
  get:()=>({ list:()=>liveJob ? [{owner:'p',status:'running'}] : [] }),
  goals:{get:goal,disarm:()=>{activation='disarmed'},resume:()=>{activation='armed';resumes++}},
  logger:{info(){},warn(message){throw Error(message)}}
};
const gate = new GoalWaitGate(ctx,{waitForJobs:true,waitForSubagents:true,maxHoldMs:0});
gate.evaluate(agent);             // owned hold
ctx.goals.disarm(agent);          // external repeated disarm is indistinguishable
liveJob = false;
gate.evaluate(agent);
assert.equal(activation,'armed'); assert.equal(resumes,1);
agents = [agent,child];
gate.evaluate(agent);
assert.equal(activation,'disarmed'); // idle registered child still holds
gate.dispose();
const input = { profileId:'probe',profile:{},revision:'one',manifest:{},patchText:'',manifestText:'',rows:[],
  target:{rowId:'dsh-extras',moduleIds:['goalWait']},explicit:{},peers:{},problems:[],legacyMode:true,
  sources:[{moduleId:'goalWait',packageName:'dsh-goal-wait-gate',version:'0.4.23',raw:{},effective:{},disabled:false,active:false,bundleSelected:true}] };
assert.match(planMigration(input).decisions[0].reason,/unsupported legacy version/);
input.sources[0].effective={strategy:'replacement'};
assert.match(planMigration(input).decisions[0].reason,/schema validation/);
console.log('three research probes confirmed; no profile touched');
NODE
~~~
