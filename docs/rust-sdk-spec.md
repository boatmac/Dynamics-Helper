# Rust SDK 探索 R&D — 占位 Spec

> Status: **PLACEHOLDER. Not started.**
> Author: 2026-05-11, written alongside `sdk-upgrade-2026-05-0.3.0.md`.
> Trigger to actually start: 见 § 6 "Kick-off 条件".
> Owner: TBD.

## 1. 缘起

本 spec **不是**升级工单。这是一个研究面占位 — 当某个具体痛点积累到值得花 2-3 个月迁移成本时，再激活执行。

启动诱因（任一）:

- (T1) **Python PyInstaller 产物被 Defender 拦截率显著上升**（具体阈值见 § 4），影响 DH 推广
- (T2) **DH 用户基数增长**到单次冷启动延迟开始累计成可观成本（个人 dev 机感知很弱；如果未来部署到企业大批量，启动延迟 × 用户数 × 触发频率会非线性增长）
- (T3) **Python SDK 在 Microsoft 内部某条合规审计上失败**，迫使重新评估 binary 形态
- (T4) **Rust SDK 出现 Python SDK 永久不会有的关键能力**（罕见，但 SDK feature parity 可能因团队投入倾斜而漂移）

如果上述都不发生，DH 应继续走 Python 路线 — 重写成本远高于增量优化收益。

## 2. 与 Python 比较的预判（待验证）

> 以下数字是经验估计、**未经实测**。phase R&D 的第一步就是把这些数字补成实测值。

| 维度 | Python (当前) | Rust (预判) |
|---|---|---|
| 冷启动延迟 | ~1.5s | < 200ms |
| 进程内存 RSS | ~80MB | < 20MB |
| 打包产物大小 | `--onedir` ~30MB | 单 binary < 10MB |
| 部署形态 | exe + `_internal/` 目录 + DLL 群 | 单文件 |
| Defender 启发式命中率 | 已知问题 ([升级评估文档 § 5][1]) | **预判显著降低** — 静态编译单 binary 不动态加载、不解压临时目录 |
| 错误处理范式 | exception + traceback | `Result<T, E>` 编译期穷尽性 |
| 上手心智成本 | 已具备 | 新语言 / 新工具链 |
| 重写量 | 0 | **全部 ~1700 行 host 业务逻辑** |

[1]: ./sdk-upgrade-2026-05-0.3.0.md "Phase 0 SDK 升级评估"

## 3. 重写范围 — 不只是 SDK 调用

容易低估的事实: **Rust SDK 切换 ≠ SDK 调用层切换**。`host/dh_native_host.py` 1700 行里 SDK 调用只占约 30%，其余是 DH 独有业务逻辑，全部要 Rust 重写:

| 模块 | Python LOC (估) | Rust 重写难度 |
|---|---|---|
| Native Messaging 协议 (length-prefixed JSON over stdio) | ~40 | 易 |
| 异步事件循环 (asyncio + thread reader) | ~80 | 中 (`tokio`) |
| PII redaction (`pii_scrubber.py`, regex-based) | ~120 | 中 (`regex` crate, 测试用例可直接复用) |
| Self-update (`updater.py`, GitHub Release fetch + zip + locked-file fallback) | ~210 | 中 (`reqwest` + `zip`) |
| Logging + rotation (`_SafeRotatingFileHandler`) | ~30 | 易 (`tracing` + `tracing-appender`) |
| Case ID extraction & session naming (B82) | ~30 | 易 |
| Config / Skill / MCP json 合并 | ~300 | 中 (`serde_json`) |
| Permission handler + PreToolUse hook | ~30 | SDK-binding 决定 |
| SDK calls (CopilotClient / Session / send_and_wait) | ~300 | **取决于 Rust SDK 的 API 设计成熟度** |
| Telemetry (App Insights 协议) | ~80 | 中 (`reqwest`) |
| **总计** | **~1700** | 估 4-8 周全职等价工时 |

**B82 这种 1-2 天就能上线的快速演进能力，Rust 重写期间 DH 会冻结** 2-3 个月。这是 Rust 迁移的**最大隐性成本** — opportunity cost。

## 4. 触发阈值（量化版本）

### T1 — Defender 拦截阈值

每月一次 telemetry 统计 `install.bat` 报告的 AV 命中事件数:
- < 5% 总安装: 维持 Python
- 5-15%: 启动本 spec 的 phase R&D-0（实测对比）
- \> 15%: phase R&D-0 + R&D-1 并行启动

当前 baseline: **未量化**。AGENTS.md § 9.3 把 AV 列为 known issue 但没量化数据。建议在 Python 0.3.0 release 后加一段 telemetry 收集 AV-block 事件，跑 3 个月得 baseline 数。

### T2 — 启动延迟成本阈值

当 **monthly active users (MAU) × 平均每天 native host 启动次数 × 平均启动延迟** 累计 > 50 人/月小时:
- 启动延迟显著影响生产力
- 重写收益开始覆盖工时成本

当前估算: 假设 50 MAU、平均每天启动 10 次、当前延迟 1.5s ≈ 6.25 小时/月 — 远低于阈值。

## 5. 当前研究面缺口（动手前必查）

- **Rust SDK 是否支持 DH 用的所有 API**:
  - `create_session(session_id=...)` (B82 命名契约)
  - `resume_session(name)`
  - `on_permission_request` 回调
  - `on_pre_tool_use` hook
  - `send_and_wait(prompt, timeout)`
  - `mcp_servers` dict 配置
  - `skill_directories` 列表
- **Rust SDK 的 GitHub auth 怎么走** — Python 复用 `copilot.cmd` 自己的 token，Rust 是否需要单独 PAT？
- **Native Messaging 跨语言 ABI** — Chrome / Edge 的 native host 协议跟语言无关 (stdio + length-prefixed JSON)，理论上 Rust 直出毫无问题，但**没有实证**

## 6. Kick-off 条件

激活本 spec 走 phase R&D-0 / -1 / -2 之前，先确认:

- [ ] 触发诱因（§ 1 T1-T4）至少满足一条且量化达阈值（§ 4）
- [ ] DH 主线没在做关键 feature（避免冻结 2-3 个月主开发）
- [ ] 有 owner 接手 — Rust 重写是 4-8 周等价全职工时，需要明确的人力承诺，不是兼职可消化
- [ ] **Python 路径的便宜 mitigation 已穷尽** — 比如 EV 代码签名证书（解决 70%-90% Defender 命中）成本仅 ~$300/年，是远低于重写成本的 plan B

## 7. Phase R&D-0 — 验证可行性（kick-off 后第一步）

不写任何重写代码。只验证三件事:

1. **Rust SDK 装得上、跑得通最小 demo**:
   ```rust
   let client = CopilotClient::new(...);
   let session = client.create_session(...).await?;
   let reply = session.send("ping").await?;
   ```
   — 等价 B82.0 Phase A 探针，但用 Rust。

2. **Native Messaging 用 Rust 跑得通**: 写一个 100 行 Rust 程序，读 Chrome 发的 length-prefixed JSON、echo 回去。注册到 `chrome://extensions` 的 native messaging 路径，从一个测试扩展发消息测连通。

3. **打 release binary 试 Defender**: `cargo build --release`，把出来的 binary 丢到开启 Defender 实时保护的 VM 跑，看 AV 命中率。这是**整个 Rust 探索最关键的数据点** — 如果 Rust binary 在 Defender 下表现和 PyInstaller 产物一样差，T1 的迁移驱动就被证伪了。

R&D-0 输出: 一份 `docs/rust-sdk-rd-0-results.md`，三件事 GO/NO-GO 各一行结论 + 实测数据。

## 8. 与 Python 升级的关系

**完全正交。** Python 0.3.0 升级该做该做。

- 即便最终决定 Rust 重写，Python 0.3.0 升级也至少能延寿 6-12 个月 — Rust 重写不可能这么快上线
- Python 升级期间收集的 telemetry（AV 拦截率、启动延迟、错误率）正好是 § 4 触发阈值判断的 baseline 数据

**所以**: Python 0.3.0 先升、bake 3-6 个月、收集量化数据、再回头看 Rust 探索是否激活。

## 9. 反对意见 / 已考虑过的替代方案

- **"为啥不用 Go?"** Go binary 也是静态编译、AV 友好。但 Copilot SDK Go 版本同样存在，可作为备选。本 spec 选 Rust 是因为 (a) Rust SDK 在上游官方 release notes 里持续被并列提到（说明上游投入相对均衡，不会被边缘化），(b) Rust 的 `Result<T, E>` 错误处理对 DH 这种 prod-critical 代码价值更高。Go 同样值得考虑 — 如果 Rust phase R&D-0 失败，Go 作为 plan B 再开一份并行 spec。

- **"用 PyOxidizer / Nuitka 替代 PyInstaller?"** 比 Rust 重写成本低得多。但仍然带 Python interpreter，AV 启发式问题未必解决。**值得作为 § 6 Kick-off 前的 Python plan B 验证** — 如果 PyOxidizer 打的包 AV 友好，可能根本不需要 Rust 重写。**待 Python 0.3.0 升级后补一份独立 spec 评估。**

## 10. 引用

- DH AGENTS.md § 9 "Troubleshooting & Known Issues"（AV block 的已有 mitigation）
- DH installer_core.ps1 lines 94-212（Defender 处理代码）
- DH updater.py lines 118-215（locked file 处理）
- 升级评估 `sdk-upgrade-2026-05-0.3.0.md` § 5（PyInstaller + AV baseline）
