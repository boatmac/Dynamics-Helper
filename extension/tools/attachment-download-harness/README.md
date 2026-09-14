# DTM 附件下载单次诊断

这是独立的中文诊断扩展，不是 Dynamics Helper 的构建或发布入口。控制器、门户适配器和下载观察器均已实现；离线测试、构建和真实浏览器结果分别记录，不能互相替代。

## 范围

- 仅针对已登录、已就绪且显示目标记录 External 附件列表的门户。不登录、不处理身份验证、不实现“30 秒身份验证”。30 秒仅为下载观察窗口。
- 没有 DH 扩展 key、Native Messaging、遥测、content scripts、后台 Service Worker、action 或 popup。诊断页作为独立标签页打开，监听依赖该页存活。
- 权限固定为 `downloads`、`scripting`、`storage`、`activeTab`；唯一 host permission 是 `https://client.dtmnebula.microsoft.com/*`。匹配站点的 host permission 足以支持相应标签页 URL 查询，不需要 `tabs` 权限。此入口不依赖 `activeTab` 临时授权。
- 不授予 API 域名访问权限，不由扩展直接请求附件 URL。门户自己的下载点击负责实际请求；观察器只接收浏览器下载元数据。
- 三个身份字段初始为空，用户手动填写，不提供真实客户数据、凭据或客户附件 fixture。输入、源 URI 和下载元数据仅在调用内存中使用；不得写入日志、结果或 storage。

## 控制器契约

`page.ts` 编译为 `page.js`。HTML 提供身份输入、目标页面选择、只读检查、单次运行及安全结果区域。控制器阻止表单默认提交，避免导航及查询串泄漏，并显式校验输入。

- 用户选择一个已打开的门户；仅注入这个页面，再按输入校验工单、workspace、External 和唯一附件。其他门户不被操作，也不用于回退。选择不能绕过身份校验；不显示标签标题、URL 或真实身份值。
- Inspect 不点击、不消耗下载次数。输入变更、门户刷新或目标文档变化使之前的 ready 状态失效。调用必须绑定已确认的顶层 `documentId`，并独立验证 MAIN-world 返回值。
- Run 必须在实际点击前持久化并确认 `chrome.storage.local` spent 标记；每次安装总共最多点击一次，包括失败或超时。存储错误时禁止点击；没有重置 UI，刷新或重开页面也不得恢复次数。标记不存储案例编号、Workspace、文件名或 URL。
- 单个页面内禁用按钮不足以保证每次安装只有一次。控制器必须在多个诊断页之间互斥保护 spent 读取、提交及点击；`storage.local` 的独立 get/set 不是原子锁。未实现此保证时不得开放 Run。
- 先注册下载监听，再进行一次门户点击。不得重试点击，不扫描历史下载，不放行危险下载，不读取下载文件字节。窗口内持续观察，超时后结束监听。
- `status` 与 `result` 仅使用固定状态、有限计数等非敏感输出，通过 `textContent` 等安全文本赋值，不使用 `innerHTML`，不输出原始异常、模型对象、完整 URL、令牌、文件名、本地路径或下载 ID。

观察器结果状态为 `complete`、`unmatched`、`incomplete`、`ambiguous`、`blocked`、`trigger_failed`、`observer_failed`，附带上限为 8 的 `matchedCount`。浏览器报告完成不等于文件内容校验。

## 独立构建

仅在另行允许构建、`page.ts` 已完成且本地工具链已存在时执行。不要安装依赖，不使用 Vite、DH 的 npm build/test gate 或发布脚本。从仓库根目录运行：

```powershell
node extension/tools/attachment-download-harness/build.mjs
```

源码根通过 `import.meta.url` 定位，不依赖调用者 cwd。脚本仅使用现有 `extension/node_modules/esbuild/lib/main.js` 和匹配架构的 `@esbuild/win32-*/esbuild.exe`，核对包、JS API 与可执行文件版本；环境中存在 `ESBUILD_BINARY_PATH` 时拒绝执行，不删除或覆盖该变量。

固定输出目录：

```text
C:/Users/zhaobo/AppData/Local/Temp/opencode/dh-attachment-download-harness-v3
```

父目录必须已经存在。脚本检查路径祖先的 `lstat`、符号链接/目录联接及 `realpath` 一致性，不接受重定向路径；这些检查不是对抗并发文件系统篡改的 OS 沙箱。输出目录必须全新：已有目录、文件或链接均拒绝，不覆盖、不删除、不自动换名。第二次构建同样拒绝；失败后保留可能存在的不完整目录，不加载它，也不要为绕过边界而删除后重跑。

打包设置固定为 `bundle: true`、`write: false`、`minify: false`、`sourcemap: false`、`format: 'esm'`、`target: 'chrome120'`、`keepNames: false`；内联 `tsconfigRaw` 使用 ES2022 和 `useDefineForClassFields: true`，不读取项目 tsconfig，不安装依赖。禁用 keepNames 是为了避免为序列化门户函数引入 `__name` 依赖；函数本身仍必须保持自包含。

九个源码文件以及 Extension 的 `package.json`、`package-lock.json` 参与构建前后 SHA-256 快照。源码为 `build.mjs`、manifest、HTML、CSS、三个控制模块及两个共享 URI helper。README、测试、Vite 配置和 tsconfig 不参与打包。现有 esbuild 必须为 `0.27.2`；metafile 必须恰好包含五个 TS 模块，禁止额外输入、外部导入或额外打包输出；检查通过前不写产物。

输出包含 `manifest.json`、`page.html`、`page.css`、`page.js`、`source-hashes.json`、`build-info.json`。来源记录包括上述九个文件以及 esbuild 包清单、原始 JS API、原生包清单和 exe 的完整字节哈希、工具版本与 Node 版本。构建前后复核源码和工具链快照，写入后复核输出。`build-info.json` 仅以 basename 记录其他五个输出的 SHA-256，不包含自身哈希、绝对源码路径或客户数据。哈希是字节身份记录，不是签名或运行正确性证明。

构建入口打印 PID、开始时间及成功路径，捕获到的异常使用固定错误。原生 esbuild 子进程的 stderr 可能包含诊断，因此运行监督器须捕获 stdout/stderr 到本地证据文件，不直接回显原生输出。失败产物始终不可加载。

## 在 Edge 中打开

1. 当前 1.0.2 已完成独立构建；三个文件共 161/161 和类型检查通过，真实下载待验证。打开 `edge://extensions`，按组织策略允许的方式启用开发人员模式。
2. 选择“加载解压缩的扩展”，选择上面的完整固定输出目录，不选择 DH 的 `extension/dist`。
3. 确认扩展名称为“DTM 附件下载单次诊断”，权限仅包含上文列出的四项以及唯一 DTM 门户站点。不要扩大站点范围或绕过组织策略；禁止加载时停止。
4. 打开此扩展的“详细信息”，选择“扩展选项”。没有工具栏 action 或 popup；选项将在独立标签页打开。
5. 用户自行在门户完成登录并准备 External 列表，手动输入三项身份信息，刷新门户并执行 Inspect。仅唯一匹配且 ready、spent 未消耗时允许 Download once。
6. 点击一次后保持诊断页和目标门户打开，不刷新、不导航、不启动并发的同文件下载；最多观察 30 秒。失败、超时或关闭诊断页均不授权重试，不通过重装或清除 storage 绕过 spent 标记。

## 结果边界

MATCH 仅表示源请求 URI 相关性，**不证明下载字节属于所选附件**。`complete` 表示观察到浏览器报告安全且完成、具有非负文件大小的唯一匹配下载，不验证内容、来源真实性或文件可用性。相同 URI 的并发请求可能无法区分，因此用户必须避免同时下载同一文件。重复匹配会报告 `ambiguous`，但没有重复匹配也不构成独占触发证明。

关闭或刷新诊断页会丢失内存监听；本工具没有后台恢复、持久化结果或重放能力。spent 标记保留，但不表示观察成功。只有控制器、构建和经授权的浏览器验证分别完成后，才能声称运行流程经过验证。
