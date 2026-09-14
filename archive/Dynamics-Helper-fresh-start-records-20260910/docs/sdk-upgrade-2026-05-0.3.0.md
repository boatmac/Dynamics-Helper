# Copilot SDK 0.2.0 → 0.3.0 历史迁移记录

> **Historical migration record，2026-05-11。不是当前操作指南。**
> 本文仅保留当时的版本事实、兼容性变化和有限验证结果，不保留待执行计划，
> 也不授权安装、测试、构建、安全设置变更或发布。
> 当前契约见 [SDK 1.0.13 记录](sdk-upgrade-1.0.13.md)，无版本流程见
> [SDK upgrade workflow](sdk-upgrade-workflow.md)。后续迁移见
> [SDK 1.0.5 历史记录](sdk-upgrade-2026-07-1.0.5.md)。

## 1. 摘要

本次历史迁移从 SDK 0.2.0 直接升级到 0.3.0（上游发布日期 2026-04-24），
并将宽松依赖改为精确版本。追踪提交为 `8d069a5`（评估）、`e2582c5`
（源码迁移）及 `7f438a5`（构建解释器修正）。这些不是当前依赖或发布状态。

## 2. DH 实际触到的 SDK API surface

### 2.1 Imports

当时的 0.2.0 源码从 `copilot` 导入 `CopilotClient`，从 `copilot.types`
导入连接配置、权限结果及 hook 类型。0.3.0 的实际导入迁移见 § 7.1。

### 2.2 Calls

当时涉及客户端构造及启动、`create_session`、`resume_session`、
`send_and_wait` 和权限处理器。保留这些范围是为了说明探针覆盖面，
不是供当前 SDK 使用的调用示例。

### 2.3 `create_session` kwargs

当时使用权限回调、hooks、system message、MCP servers、working directory、
skill directories 和 session ID。旧记录中的 `co-<case>` 是历史前缀，
不是当前 UUIDv5 会话标识。

### 2.4 DH 没有触到的 SDK 表面（重要）

当时没有直接事件订阅、`session.rpc.*` 调用或生成式 `*Params` / `*Result`
类型导入，因此大量上游类型重命名没有直接命中 DH。内部执行链仍需另行验证。

## 3. 0.3.0 breaking changes 逐条影响评估

#### B-1. `PermissionRequestResult(kind="approved")` 旧值失效

0.3.0 将权限结果词汇从 `approved` 改为 `approve-once`，并将两个旧拒绝值
分别改为 `reject` 和 `user-not-available`。当时的合法 kind 集合是
`approve-once`、`reject`、`user-not-available`、`no-result`。
Python TypedDict 构造不执行 Literal 校验，因此旧值仍能构造不代表契约接受它。
后续 1.0.5 又将该结果改成不可调用的 union，不能沿用这里的旧构造形式。

#### B-2. `PreToolUseHookOutput(permissionDecision="allow")` 字段值是否仍有效

当时检查到 hook 字段仍为 `Literal['allow', 'deny', 'ask']`。
这只是旧版本类型事实，不证明无条件 pre-tool approval 安全，
也不是保留或恢复该行为的建议。当前 managed-approval 决策及禁止绕过规则见
[SDK 1.0.13 记录](sdk-upgrade-1.0.13.md#product-adapter)和[项目规则](../AGENTS.md)。

#### B-3. Python session event 类型 "完全重构"

上游说明 Python event types 被重构。当时 DH 不直接订阅事件；§ 7 记录了一次
`send_and_wait` 往返成功，不代表所有事件、工具或完整 Analyze 流程均已验证。

#### B-4. MCP server config 字段值 `"local"` / `"remote"` → `"stdio"` / `"http"`

0.3.0 更改了 MCP transport type。探针发现 `create_session` 未拒绝旧 `local`，
但没有验证服务器启动或工具发现。DH 因已有用户配置而引入内存映射：
`local` → `stdio`、`remote` → `http`，不回写用户的 `mcp.json`。
这解释了源码指向 § 7（B-4）的引用，不是静默接受就等于兼容的结论。

## 4. 升级前置依赖与隔离

### 4.1 Python 环境

升级前开发 venv 和系统 Python 均记录为 SDK 0.2.0。开发环境随后升级，
系统环境保留旧版本，由此暴露了 PATH 上构建工具可能打包错误依赖的问题。
这里不描述当前安装状态，也不提供旧版本安装命令。

### 4.2 备份

原计划使用 venv 副本作回退准备；未记录可推广的恢复验证结果。
旧目录删除、重命名命令已退役，不作为当前恢复程序。

### 4.3 requirements.txt

历史依赖从 `github-copilot-sdk>=0.2.0` 改为 `github-copilot-sdk==0.3.0`，
以绑定当时验证过的版本。这不是当前应使用的 pin。

## 5. PyInstaller 与 Defender / antivirus 风险

原评估涉及冻结依赖、运行时布局及开发机扫描。旧安全排除路径、样本上传、
安全策略变更和对检测性质的推测均不作为现行建议保留。
文件数减少不能证明检测风险下降，本机扫描无发现也不能证明生产环境安全。
当前执行边界见 [test safety](test-safety.md) 和[升级流程](sdk-upgrade-workflow.md)。

<a id="6-4-阶段计划"></a>
## 6. 历史阶段摘要

原记录包含调研、探针、源码迁移及本地构建四阶段。已记录的结果保留在 § 7
和 § 8；重复交接提示、旧发布命令及过期待办已退役，不转成新产品要求。

## 7. Phase 1 结果（COMPLETED 2026-05-11）

以下是原探针报告的有限结果，本次文档整理未重新运行或验证其环境：

| 项目 | 当时记录的结果与限制 |
|---|---|
| 旧 round-trip 探针 | 在 `copilot.types` 导入处失败，未进入往返 |
| B-1 权限 kind | Literal 集合已更改；TypedDict 不做运行时字面值校验 |
| B-2 hook 字段 | 类型注解仍包含 `allow` / `deny` / `ask`；不是权限安全验证 |
| B-3 `send_and_wait` | 创建 session 后，一次合成 PONG 往返成功 |
| B-4 旧 `local` | `create_session` 未抛错；服务器启动和工具发现未测 |
| B-4 新 `stdio` | 创建调用接受该值；不外推为所有 MCP 集成通过 |

### 7.1 Additional Phase 1 findings (not in original § 3 plan)

<a id="s-1-copilottypes-is-gone--import-paths-must-move"></a>
#### S-1. `copilot.types` removal and import migration

| Symbol | 0.2.0 location | 0.3.0 location |
|---|---|---|
| `CopilotClient` | `copilot` | `copilot` |
| `SubprocessConfig` | `copilot.types` | `copilot` |
| `PermissionRequestResult` | `copilot.types` | `copilot.session` |
| `PreToolUseHookOutput` | `copilot.types` | `copilot.session` |

当时 `copilot.generated.rpc.PermissionRequestResult` 是带 `success` 的内部
RPC 响应，不是带 `kind` 的 session 权限结果。相同名称不能替代正确的公开类型。

#### S-2 / S-3. Handler signatures already match

当时 DH 的权限及 pre-tool handler 已匹配两参数回调形状，无需签名改动。
此结论只涉及签名，不授权旧 hook 行为。

#### S-4. `system_message` as plain dict still accepted

探针记录 0.3.0 接受当时的 plain-dict system message；不代表当前消息契约。

<a id="72-phase-2-change-list-locked"></a>
### 7.2 Phase 2 migration summary

源码迁移记录了导入路径调整、权限 kind 更新、MCP 内存映射和精确 SDK pin。
兼容性测试检查导入及 Literal 集合，而不是用 TypedDict 构造成功来证明值合法。
这里不保留旧探针维护清单或广泛测试发现命令。

## 8. Phase 3 结果（STEPS 1-3 COMPLETED 2026-05-11）

### 8.1 Step 1 — PyInstaller --onedir build

原报告使用开发 venv 内 PyInstaller 6.18.0 构建 SDK 0.3.0。
PATH 上系统构建工具曾打包旧 SDK，造成 `PreToolUseHookOutput` 导入失败；
`7f438a5` 记录了构建解释器绑定修正及随后启动成功。这是历史缺陷及修复，
不是当前 PyInstaller 版本或构建入口。

### 8.2 Step 2 — Package size & layout comparison

| 当时指标 | 0.2.0 baseline | 0.3.0 build |
|---|---:|---:|
| 文件夹大小 | 27.12 MB | 26.22 MB |
| 文件数 | 648 | 40 |
| exe 大小 | 5.52 MB | 5.45 MB |

原报告观察到 SDK wheel 内的 CLI binary 未被静态导入分析打入该产物；
当时 DH 显式使用已安装 CLI。此布局观察不保证以后版本的冻结依赖完整性。

### 8.3 Step 2.5 — Smoke test (clean location)

原报告将产物复制到开发机临时位置，观察到 SDK 导入、client start、session
create 和 stdin 关闭后退出。它不是干净 VM，也不是完整 Analyze、安装器、
权限决策或真实工具链验证；不保留旧日志内容或通用冷启动时限推断。

### 8.4 Step 3 — Defender local scan

当时记录实时、行为及脚本扫描开启，服务运行，定向扫描报告无威胁，
过去 24 小时检测查询为零。结果仅覆盖该开发机、该产物和当时扫描窗口；
没有干净 VM 资格证明，不能判定其他检测为误报或保证后续运行安全。

<a id="85-steps-4-7--deferred-to-human-driven-release-flow"></a>
### 8.5 Release evidence boundary

本记录没有发布、用户完整 e2e、一周观察或 stable 放行的完成证据。
这些是历史证据缺口，不是等待当前执行的清单。

<a id="86-phase-3-sop-extraction-deferred"></a>
### 8.6 Workflow reference

旧 SOP 提取待办已退役；当前流程统一见 [SDK upgrade workflow](sdk-upgrade-workflow.md)。

## 附录 A：DH 0.2.0 → 0.3.0 跳版本 0.2.1 / 0.2.2 的理由

当时未对 0.2.1（2026-04-03）和 0.2.2（2026-04-10）单独迁移，直接评估
目标 0.3.0 的 DH API surface。版本号及当时未使用某些生成类型，不等于
对被跳过版本所有行为作出兼容性保证。

## References

- [Official SDK v0.3.0 release](https://github.com/github/copilot-sdk/releases/tag/v0.3.0)
- [Versioned Python reference](https://github.com/github/copilot-sdk/blob/v0.3.0/python/README.md)
- [Versioned session source](https://github.com/github/copilot-sdk/blob/v0.3.0/python/copilot/session.py)
- [Current SDK record](sdk-upgrade-1.0.13.md)
- [Version-independent upgrade workflow](sdk-upgrade-workflow.md)
