# Copilot SDK 0.2.0 → 0.3.0 升级评估与计划

> Status: **PHASE 0 DONE — awaiting phase 1 kickoff in a fresh session.**
> Author: this session, 2026-05-11.
> Tracking commit base: `3f0079e` (B82.1) — this work starts on top of that.

## 1. 摘要

- 当前 DH 跑 SDK **0.2.0**（venv 和 system Python 都是 0.2.0，一致）。
- 上游已发 **0.3.0**（2026-04-24），中间还有 **0.2.1**、**0.2.2** 两个 patch。
- 目标：直接升到 **0.3.0**（跳过 0.2.x patch）。
- 主要驱动：解锁 0.3.0 新功能 + 修复 `PermissionRequestResult` 的 **breaking change**（旧值 `"approved"` 在 0.3.0 不再有效）。
- SDK status 在 0.3.0 升到 **public preview**——意味着 GA 之前 churn 应当显著减少，是好的升级窗口。

## 2. DH 实际触到的 SDK API surface

来自 `host/dh_native_host.py` 的精确 grep（2026-05-11）。

### 2.1 Imports

```python
from copilot import CopilotClient
from copilot.types import (
    SubprocessConfig,
    PermissionRequestResult,
    PreToolUseHookOutput,
)
```

### 2.2 Calls

| Symbol | 用法 | 位置 |
|---|---|---|
| `CopilotClient(config)` | 客户端构造 | 534, 944, 1064 |
| `client.start()` | 启动 | 537 |
| `client.create_session(**sdk_kwargs)` | 创建 session | 1028, 1068 |
| `client.resume_session(name, **sdk_kwargs)` | 恢复 session | 994 |
| `session.send_and_wait(prompt, timeout)` | 发送 prompt 等响应 | 1400 |
| `SubprocessConfig(cli_path=...)` | 子进程配置 | 531, 940, 1060 |
| `PermissionRequestResult(kind="approved")` | 权限处理器返回值 | 870 |
| `PreToolUseHookOutput(permissionDecision="allow")` | PreToolUse hook 返回 | 881 |

### 2.3 `create_session` kwargs

```python
{
    "on_permission_request": self._permission_handler,
    "hooks": {"on_pre_tool_use": self._pre_tool_use_hook},
    "system_message": {"role": ..., "content": ...},   # dict
    "mcp_servers": ...,                                 # snake_case dict
    "working_directory": ...,
    "skill_directories": [...],
    "session_id": "co-<case>",                          # B82.1 加
}
```

### 2.4 DH 没有触到的 SDK 表面（重要）

- 无 `session.onEvent` / `session.on_event` 订阅
- 无 `session.rpc.*` 直接调用
- 无 `*Params` / `*Result` / `*ListResult` 类型 import
- 无 streaming delta 处理
- 无 sub-agent / custom agent 配置
- 无显式 `gitHubToken` / `githubToken` 设置

→ 0.3.0 changelog 里大部分 type rename（39 个 Params→Request、27 个 Result rename）**DH 不踩**。

## 3. 0.3.0 breaking changes 逐条影响评估

完整 changelog 见 GitHub Release notes (`github/copilot-sdk` v0.3.0)，下表只列与 DH 表面有交集的项。

### 🔴 高风险 / 必改

#### B-1. `PermissionRequestResult(kind="approved")` 旧值失效

**Changelog 原文**:
> The existing approval vocabulary has also been clarified:
> - `"approved"` → `"approve-once"`
> - `"denied-interactively-by-user"` → `"reject"`
> - `"denied-no-approval-rule-and-could-not-request-from-user"` → `"user-not-available"`
>
> The built-in `approveAll` handler ... now returns `{ kind: "approve-once" }`.

**DH 命中点**: `host/dh_native_host.py:870`
```python
return PermissionRequestResult(kind="approved")
```

**影响**: DH 在 0.3.0 下 headless 模式所有 permission request 都会失败 — `"approved"` 不再是有效 kind 值。具体行为待 phase 1 探针确认（"silent reject" 还是"raise validation error"），但**两种都让 DH 不可用**。

**修复**: `kind="approved"` → `kind="approve-once"`。一行改动。

**回归测试**: 在 `host/test_sdk_compat.py`（待新建）里写一条 mock 测试 lock 住 `"approve-once"`，未来 SDK 再改字面值时 fail loudly。

---

### 🟡 中风险 / 可能要改 / 必须探针验

#### B-2. `PreToolUseHookOutput(permissionDecision="allow")` 字段值是否仍有效

**Changelog**: 权限词汇全面 cleanup，但 PreToolUseHook 的 `permissionDecision` 字段值是否一起改了 — changelog **未明示**。

**DH 命中点**: `host/dh_native_host.py:881`
```python
return PreToolUseHookOutput(permissionDecision="allow")
```

**影响**: 如果 0.3.0 把 `"allow"` 也并入新词汇体系（变成 `"approve-once"`），DH 的 hook 会失效。

**资料缺口**: Phase 1 探针**必须**单独验证此点。建议探针逻辑：
1. 用 `"allow"` 跑一遍 — 看是否触发 validation error 或 silent skip
2. 看 0.3.0 的 `PreToolUseHookOutput` Python 类型定义 (`copilot.types.PreToolUseHookOutput.__annotations__`)，看 `permissionDecision` 字段是 Literal 还是 str
3. 如有 Literal，列举其值

#### B-3. Python session event 类型 "完全重构"

**Changelog 原文**:
> Python's event types were completely restructured rather than renamed.

**DH 命中点**: 表面上无 — DH 不 subscribe events。

**潜在影响**: `session.send_and_wait()` 内部可能 wait 某些 event 类（assistant.message / assistant.message_delta）。这些类被重构如果不向后兼容，`send_and_wait` 可能内部抛错。

**资料缺口**: Phase 1 探针的 B82.0 等价跑通即可证明 `send_and_wait` 这条链路活着。如果 phase 1 的 `session.prompt("ping")` 能拿到 reply，B-3 就不命中 DH。

#### B-4. MCP server config 字段值 `"local"` / `"remote"` → `"stdio"` / `"http"`

**Changelog 原文**:
> The `type` field value correspondingly changes from `"local"`/`"remote"` to `"stdio"`/`"http"`.

**DH 命中点**: DH 自己不构造 `MCPServerConfig` 对象（`host/dh_native_host.py:687-740` 从用户 `mcp.json` 读、原样转发给 `mcp_servers` kwarg）。

**潜在影响**: **用户的 `mcp.json` 兼容性**。如果用户写了 `"type": "local"`，0.3.0 SDK 可能拒绝、或 silent skip。

**资料缺口**: 待 phase 1 探针验证 SDK 在收到 `"type": "local"` 时的行为（是 throw、warn、还是 silent ignore？）。

**修复方案**（视探针结果）:
- **方案 A — host 启动时做迁移**: 读 `mcp.json` 时把 `"local"` → `"stdio"`、`"remote"` → `"http"`，并把改动写回原文件（或 in-memory 转换不写回）
- **方案 B — 直接拒绝旧 schema 并打日志**: 让用户手动改 `mcp.json`，DH 不替用户改文件
- 建议 A（用户体验优先），实现时只做 in-memory 转换不写回，避免 DH 替用户改配置文件的副作用

---

### 🟢 低风险 / 不命中 / 利好

#### N-1. `*Params` → `*Request` rename（39 个）+ `*Result` 域名 rename（27 个）

DH 不 import 这些类型 — 全部不命中。

#### N-2. `MCPLocalServerConfig` → `MCPStdioServerConfig` 类名 rename

DH 不直接 import 这个类 — 不命中。但见 **B-4** 的字段值变化命中。

#### N-3. Session idle timeout 默认从 30 分钟 → 无限

**利好** — 解决了 DH 历史上"长时间空闲后 session 凭空消失"的潜在 bug（如果存在过）。无需改动。

#### N-4. SDK status → public preview

元信息。意味着 0.3 → GA churn 应该收窄。**升级时机合适**。

#### N-5. 大量新功能（per-session auth、per-agent skills、scoped permissions 等）

DH 暂不需要。**先升级 surface 兼容**，新功能未来视需求引入。

## 4. 升级前置依赖与隔离

### 4.1 Python 环境

- DH 实际跑 **`host/venv/Scripts/python.exe`**（`host/launch_host.bat` 明示）
- venv 和 system Python 当前**都装 0.2.0**，状态一致
- **升级动作必须在 venv 内执行**，不要碰 system pip:
  ```powershell
  & "host/venv/Scripts/python.exe" -m pip install --upgrade github-copilot-sdk==0.3.0
  ```

### 4.2 备份

Phase 1 装 0.3.0 前**必须备份**:
```powershell
Copy-Item -Recurse host/venv host/venv.0.2.0.bak
```

回滚一行:
```powershell
Remove-Item -Recurse host/venv ; Rename-Item host/venv.0.2.0.bak host/venv
```

`.gitignore` 已 ignore `host/venv` — `.0.2.0.bak` 后缀沿用 ignore 模式（需要时单独加一行）。

### 4.3 requirements.txt

升级完成后：
```diff
- github-copilot-sdk>=0.2.0
+ github-copilot-sdk==0.3.0
```

把 `>=` 改成 `==` 是关键 — 历史上 `>=0.2.0` 没有约束 pin 到我们测过的版本，下次 SDK 出 0.4 会自动飘上去。0.3.0 之后明确锁定。

## 5. PyInstaller 与 Defender / antivirus 风险

### 5.1 现状（pre-upgrade baseline）

DH 已知问题（grep `Defender|antivirus` 命中 49 处）:
- `installer_core.ps1:148-212` 已有 Defender quarantine 检测 + 自动加 exclusion 的 mitigation 路径
- `updater.py:118-215` 已有 `.exe.old/.old2/.old3` 锁文件 fallback
- AGENTS.md § 9.3 把 "Self-update fails silently — antivirus locks .exe" 列为已知 issue
- 即便如此，**仍是 prod 用户痛点**（用户原话："之前的 Python 打包有遇到用户环境被 Defender 拦截的问题"）

### 5.2 升级可能放大或缩小这个问题？

**未知** — 0.3.0 引入的新依赖（pydantic、python-dateutil 已经在用了，0.3.0 changelog 未明示新增依赖）可能让 PyInstaller 打包出的 exe 在 AV 启发式扫描下表现不同。可能更好（如果新代码更 idiomatic），也可能更差（如果引入了 dynamic import、code generation、reflection 等 AV 敏感模式）。

### 5.3 Phase 3 验证要求

升级后 release 前**必须**:
1. `pyinstaller --onedir --clean -y --name dh_native_host host/dh_native_host.py` 成功
2. 打包产物丢进一台**开启 Defender 实时保护**的干净 Windows VM（或本机 Defender 全开），跑 `install.bat`
3. 看 Defender 是否 quarantine — 命中就要在 release notes 明示并提供 mitigation 步骤
4. 包大小对比 0.2.0 baseline，记录在 release notes
5. **若 Defender 命中显著恶化**，考虑暂缓 release，先开 issue：

   - 选项 A: 提交 PyInstaller 产物到 Microsoft False Positive 报告通道
   - 选项 B: 探查 Rust SDK（见 `rust-sdk-spec.md`）—— Rust 静态编译单 binary 在 AV 启发式下显著友好
   - 选项 C: 给 exe 加代码签名（commercial cert）—— 治标，根本解药仍是 binary 形态

## 6. 4 阶段计划

> **每一阶段独立 session 完成**，避免上下文 compact。证据落到本文档对应节。

### Phase 0 — 信息收集 ✅ DONE

- [x] 拉 0.3.0 changelog
- [x] grep DH SDK 表面
- [x] 逐条对照评估
- [x] 列阶段计划
- [x] 探查 Defender 风险面
- [x] 文档落地（本文）

### Phase 1 — 隔离 venv + 探针  [PENDING]

**前置**: 新会话 `Read docs/sdk-upgrade-2026-05-0.3.0.md` 续起。

**步骤**:

1. 备份 venv: `Copy-Item -Recurse host/venv host/venv.0.2.0.bak`
2. 升级: `& "host/venv/Scripts/python.exe" -m pip install --upgrade github-copilot-sdk==0.3.0`
3. 确认装到位: `& "host/venv/Scripts/pip.exe" show github-copilot-sdk` → Version: 0.3.0
4. 重跑 B82.0 探针确认 round-trip 仍 PASS（CLI 路径必须用 venv python，更新一行 shebang 或 explicitly invoke venv python）
5. 写新探针 `.scratch/b82-1-sdk03-surface-probe.py` 覆盖 DH 实际表面:
   - **B-1 验证**: `PermissionRequestResult(kind="approve-once")` create_session 端到端
   - **B-1 反向验证**: `PermissionRequestResult(kind="approved")` 触发什么错误（确认旧值真的 breaking）
   - **B-2 验证**: `PreToolUseHookOutput(permissionDecision="allow")` 是否仍 OK；同时 `inspect` 出 0.3.0 的 `PreToolUseHookOutput.__annotations__` 看 Literal 字面值集合
   - **B-3 验证**: `session.send_and_wait` 完整链路一轮
   - **B-4 验证**: `create_session(mcp_servers={"foo": {"type": "local", "command": "echo"}})` 看 SDK 反应（throw / silent ignore / accept）；再用 `"stdio"` 跑一遍对照
6. 把探针结果填进本文档 § 7 "Phase 1 结果"

**Exit criteria**: 探针全 PASS（或所有 FAIL 都解释清楚），代码修改清单确认锁死。

### Phase 2 — 代码改动 + 单元测试  [PENDING]

**前置**: Phase 1 done + 修改清单 locked。

**最小改动集（按当前评估、可能在 Phase 1 后扩展）**:

| 文件:行 | 改动 |
|---|---|
| `host/dh_native_host.py:870` | `kind="approved"` → `kind="approve-once"` |
| `host/dh_native_host.py:881` | 视 B-2 探针结果决定 |
| `host/dh_native_host.py:687-740` | 视 B-4 探针结果决定是否加 in-memory mcp.json 迁移 |
| `host/requirements.txt` | `github-copilot-sdk>=0.2.0` → `github-copilot-sdk==0.3.0` |
| `host/test_sdk_compat.py` (新) | mock-based 测试 lock 住 SDK API 字面值 |
| `AGENTS.md` § "Type Hinting" | 移除"0.2.0 移除了 X、Y、Z"这条历史注释，替换为指向本文档 |
| `AGENTS.md` § 9 | 必要时加 0.3.0 troubleshooting 条目 |

**测试**:
- `python -m unittest discover host` — 0.3.0 venv 下全绿
- B82.0 探针 + B82.1 (本次新写的) 探针都 PASS

**Exit criteria**: Tests green + 同 commit `feat(sdk): upgrade github-copilot-sdk 0.2.0 → 0.3.0`。

### Phase 3 — PyInstaller + Defender 验证 + beta release  [PENDING]

**前置**: Phase 2 done + 用户在 dev mode 跑过 e2e。

**步骤**:

1. `pyinstaller --onedir --clean -y --name dh_native_host host/dh_native_host.py`
2. 包大小对比记录（与 0.2.0 baseline diff）
3. Defender 测试（见 § 5.3）
4. 走 `release_helper.py 2.0.70-beta --publish --prerelease`（按 AGENTS.md § 8）
5. 用户 e2e 全套
6. 一周观察期（看 Defender 投诉、telemetry 错误率）
7. Beta → stable: `release_helper.py 2.0.70 --publish`
8. 把"升级 SOP"提取到 `docs/sdk-upgrade-playbook.md` 作为复用模板

**Exit criteria**: stable release 落地 + playbook 文档。

## 7. Phase 1 结果（PENDING — 下一会话填）

| 探针 | 期望 | 实际 | 决策 |
|---|---|---|---|
| B82.0 round-trip on 0.3.0 | PASS | — | — |
| B-1: kind="approve-once" | accept | — | — |
| B-1: kind="approved" (regression check) | reject/error | — | — |
| B-2: permissionDecision="allow" | accept | — | — |
| B-2: PreToolUseHookOutput annotations | (literal set) | — | — |
| B-3: send_and_wait one round | PASS | — | — |
| B-4: mcp_servers type="local" | (observed behavior) | — | — |
| B-4: mcp_servers type="stdio" | accept | — | — |

## 8. Hand-off — 下一会话开工 prompt 建议

```
读 docs/sdk-upgrade-2026-05-0.3.0.md，从 Phase 1 开始执行。

不要重做 phase 0 — 它已 done。
按 § 6 phase 1 步骤列表逐项跑，结果填进 § 7 表格。
Phase 1 不动 host/dh_native_host.py 源代码、不改 requirements.txt —
那是 phase 2 的事。
```

---

## 附录 A：DH 0.2.0 → 0.3.0 跳版本 0.2.1 / 0.2.2 的理由

中间两个 patch:
- `v0.2.1` (2026-04-03)
- `v0.2.2` (2026-04-10)

均为 patch 级；0.2.x 内部 by semver 无 breaking change。即便有局部 type rename（如 `PermissionCompletedResult` 这类），DH 不踩 — DH 只 import 高层 `PermissionRequestResult`，未 import 任何 `PermissionCompleted*`。

**结论**：直接 0.2.0 → 0.3.0，0.2.1/0.2.2 不单独验。
