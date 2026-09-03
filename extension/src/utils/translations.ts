export type LanguageCode = 'auto' | 'en' | 'zh';

export interface TranslationDictionary {
    [key: string]: {
        en: string;
        zh: string;
    };
}

export const translations: TranslationDictionary = {
    // --- Common ---
    appName: { en: "Dynamics Helper", zh: "Dynamics 助手" },
    saveChanges: { en: "Save Changes", zh: "保存更改" },
    reset: { en: "Reset", zh: "重置" },
    cancel: { en: "Cancel", zh: "取消" },
    savedSuccess: { en: "Settings saved successfully!", zh: "设置已保存！" },
    resetConfirm: { en: "Reset everything to default?\n\nThis will permanently clear:\n  • All custom bookmarks (returns to default menu)\n  • Team Catalog config (URL, selected team, cached items)\n  • All preferences (colors, button position, language, log level, paths)\n  • DH-specific Instructions (copilot-instructions.md will be wiped)\n  • Custom User Prompt (user_prompt.md will be wiped)\n\nThis action cannot be undone.", zh: "重置所有设置为默认值？\n\n以下内容将被永久清除：\n  • 全部自定义书签（恢复为默认菜单）\n  • 团队目录配置（URL、所选团队、缓存）\n  • 所有偏好设置（颜色、按钮位置、语言、日志级别、路径）\n  • DH 专用指令（copilot-instructions.md 将被清空）\n  • 自定义用户提示词（user_prompt.md 将被清空）\n\n此操作不可撤销。" },
    
    // --- Options Page ---
    appearance: { en: "Appearance", zh: "外观设置" },
    livePreview: { en: "Live Preview", zh: "实时预览" },
    buttonLabel: { en: "Button Label", zh: "按钮标签" },
    brandColor: { en: "Brand Color", zh: "品牌颜色" },
    offsetBottom: { en: "Bottom Offset (px)", zh: "底部边距 (px)" },
    offsetRight: { en: "Right Offset (px)", zh: "右侧边距 (px)" },
    statusBubble: { en: "Enable Status Bubble", zh: "启用状态气泡" },
    enableTeamCatalog: { en: "Enable Team Catalog", zh: "启用团队目录" },
    enableTeamCatalogHint: {
        en: "Subscribe to a shared list of bookmarks from a manifest URL hosted by your team admin. Off by default - no network requests are made to fetch team data when disabled.",
        zh: "订阅团队管理员托管的共享书签列表（通过 manifest URL）。默认关闭——关闭时不会发出任何团队相关的网络请求。",
    },
    manifestUrl: { en: "Manifest URL", zh: "Manifest URL" },
    manifestUrlPlaceholder: {
        en: "https://example.com/team-manifest.json",
        zh: "https://example.com/team-manifest.json",
    },
    manifestFetchFailed: {
        en: "Could not fetch manifest. Check the URL and try Refresh.",
        zh: "无法获取 manifest。请检查 URL 并尝试刷新。",
    },
    manifestFetchAuth: {
        en: "Manifest URL rejected authentication — the SAS token may have expired or been revoked. Regenerate the URL and paste it here.",
        zh: "Manifest URL 认证失败——SAS 令牌可能已过期或被吊销。请重新生成 URL 并粘贴到此处。",
    },
    manifestFetchAuthToast: {
        en: "Manifest auth failed — check SAS token expiry",
        zh: "Manifest 认证失败——请检查 SAS 令牌是否过期",
    },
    manifestFetchNotFound: {
        en: "Manifest URL not found. Double-check the URL — the blob may have been deleted or renamed.",
        zh: "Manifest URL 未找到。请核对 URL——blob 可能已被删除或改名。",
    },
    manifestFetchNetwork: {
        en: "Network error fetching manifest. Check connectivity, DNS, or CORS/TLS configuration.",
        zh: "获取 manifest 时出现网络错误。请检查网络连接、DNS 或 CORS/TLS 配置。",
    },
    manifestFetchParse: {
        en: "Manifest response was not valid JSON. Verify the URL returns a manifest file.",
        zh: "Manifest 响应不是合法 JSON。请确认 URL 指向的是 manifest 文件。",
    },
    manifestFetchHttp: {
        en: "Manifest server returned an error. Try again later or contact the manifest owner.",
        zh: "Manifest 服务器返回错误。请稍后重试或联系 manifest 所有者。",
    },
    manifestUrlInvalid: {
        en: "Invalid URL format — not saved.",
        zh: "URL 格式不正确，未保存。",
    },
    betaChannelLabel: { en: "Receive beta updates", zh: "接收 Beta 更新" },
    betaChannelHint: {
        en: "Beta versions include new features and fixes before they ship to stable. They may also be less tested. Toggling off does not downgrade you from a beta you are already on.",
        zh: "Beta 版本会先于 Stable 版本提供新功能和修复，但测试可能不充分。关闭此项不会将你从已安装的 Beta 版本降级。",
    },
    language: { en: "Language", zh: "语言" },
    auto: { en: "Auto (System)", zh: "自动 (跟随系统)" },
    
    // --- Auto Analyze ---
    autoAnalyze: { en: "Auto Analyze", zh: "自动分析" },
    autoAnalyzeDesc: { 
        en: "Automatically send page content to Copilot when opening a case.", 
        zh: "打开案例页面时自动将内容发送给 Copilot 进行分析。" 
    },
    modeDisabled: { en: "Disabled", zh: "禁用" },
    modeCritical: { en: "Critical Only (Severity A)", zh: "仅严重案例 (Severity A)" },
    modeNew: { en: "New Cases Only", zh: "仅新案例" },
    modeAlways: { en: "Always", zh: "总是启用" },
    
    behavior: { en: "General", zh: "通用设置" },
    copilotConfig: { en: "Copilot Configuration", zh: "Copilot 配置" },
    userPrompt: { en: "Custom User Prompt", zh: "自定义用户提示词" },
    userPromptDesc: { 
        en: "This text is automatically appended to the \"Case Context\" description when scanning a page. Use this to add standard questions or instructions for every analysis (e.g., \"Please provide a root cause analysis and mitigation steps.\").", 
        zh: "此文本会自动附加到页面扫描的“案例上下文”描述中。用于为每次分析添加标准问题或指令（例如，“请提供根本原因分析和缓解措施”）。" 
    },
    userPromptPlaceholder: { en: "Add extra context for the AI...", zh: "为 AI 添加额外的上下文..." },
    userInstructions: { en: "DH-specific Instructions", zh: "DH 专用指令" },
    userInstructionsDesc: { 
        en: "These DH-wide system instructions are appended to the DH Core System Prompt when Repository ONLY is not active.",
        zh: "未启用仅仓库模式时，这些 DH 范围的系统指令会附加到 DH 核心系统提示词中。"
    },
    rootPath: { en: "Root Path (Local Repository)", zh: "根路径 (本地仓库)" },
    rootPathDesc: { 
        en: "Local directory for case files (e.g., C:\\MyCases).", 
        zh: "案例文件的本地目录 (例如 C:\\MyCases)。" 
    },
    skillDirectories: { en: "Skill Directories", zh: "技能目录" },
    skillDirectoriesDesc: { 
        en: "Comma-separated list of directories containing custom skills (e.g., ~/.copilot/skills).", 
        zh: "包含自定义技能的目录列表，以逗号分隔 (例如 ~/.copilot/skills)。" 
    },
    useWorkspaceOnly: { en: "Use repository SKILLS, MCP, and instructions ONLY", zh: "仅使用仓库的 SKILLS、MCP 和指令" },
    useWorkspaceOnlyDesc: {
        en: "Uses repository SKILLS and MCP, with <Root>/.github/copilot-instructions.md as the only editable system instructions. DH Core System Prompt and Custom User Prompt remain active.",
        zh: "使用仓库的 SKILLS 和 MCP，并将 <Root>/.github/copilot-instructions.md 作为唯一的可编辑系统指令。DH 核心系统提示词和自定义用户提示词仍然生效。"
    },
    dhSpecificInstructionsInactive: {
        en: "This content is retained but inactive while Repository ONLY uses <Root>/.github/copilot-instructions.md.",
        zh: "此内容会保留，但仅仓库模式使用 <Root>/.github/copilot-instructions.md 时不会生效。"
    },
    mcpConfigPath: { en: "MCP Configuration", zh: "MCP 配置" },
    mcpConfigPathDesc: {
        en: "Path to the global MCP configuration JSON file (Default: ~/.copilot/mcp-config.json).",
        zh: "全局 MCP 配置 JSON 文件的路径 (默认: ~/.copilot/mcp-config.json)。"
    },
    logLevel: { en: "Log Level", zh: "日志级别" },
    logLevelDesc: {
        en: "Controls verbosity of the native host log file. DEBUG logs everything, INFO is recommended for normal use.",
        zh: "控制 Native Host 日志文件的详细程度。DEBUG 记录所有内容，INFO 建议日常使用。"
    },
    analyzeTimeout: { en: "Analyze Timeout (seconds)", zh: "分析超时 (秒)" },
    analyzeTimeoutDesc: {
        en: "Max seconds the host waits for Copilot to finish a single analyze. Range 60-3600 (default 1200 = 20 min). Raise this if you see 'Copilot did not finish' errors on complex cases.",
        zh: "Host 等待 Copilot 完成单次分析的最大秒数。范围 60-3600（默认 1200，即 20 分钟）。复杂 Case 出现「Copilot 未在时限内完成」错误时可调大。"
    },
    hostVersion: { en: "Host Version", zh: "Host 版本" },
    modelPerformance: { en: "Model & Performance", zh: "模型与性能" },
    modelPerformanceDesc: {
        en: "Model / reasoning effort / context tier for DH analyze sessions. Leave any field on 'Use CLI default' to inherit your Copilot CLI settings; pick a lighter model to speed up analysis.",
        zh: "DH 分析会话使用的模型 / 推理强度 / 上下文层级。任一项保持「使用 CLI 默认」即沿用你的 Copilot CLI 设置；选更轻的模型可加快分析。"
    },
    modelLabel: { en: "Model", zh: "模型" },
    reasoningEffortLabel: { en: "Reasoning effort", zh: "推理强度" },
    effortUnsupported: {
        en: "This model has no reasoning-effort setting.",
        zh: "此模型不支持推理强度设置。"
    },
    contextTierLabel: { en: "Context tier", zh: "上下文层级" },
    useCliDefault: { en: "Use CLI default", zh: "使用 CLI 默认" },
    modelFetchAuth: {
        en: "Could not fetch models — GitHub login may have expired. Run `copilot` in a terminal to re-auth, then click Refresh.",
        zh: "无法获取模型列表——GitHub 登录可能已过期。请在终端运行 `copilot` 重新登录后点刷新。"
    },
    modelFetchFailed: {
        en: "Could not fetch models. Showing cached list; click Refresh to retry.",
        zh: "无法获取模型列表。显示缓存列表；点刷新重试。"
    },
    
    menuEditor: { en: "Bookmark Manager", zh: "书签管理器" },
    // About & Help tab (spec 2026-07-08-options-about-help-tab)
    aboutHelp: { en: "About & Help", zh: "关于与帮助" },
    aboutTagline: { en: "AI-assisted case analysis for Dynamics 365 support.", zh: "面向 Dynamics 365 支持的 AI 辅助案例分析。" },
    checkForUpdates: { en: "Check for Updates", zh: "检查更新" },
    openUserGuide: { en: "User Guide", zh: "用户指南" },
    viewOnGitHub: { en: "GitHub & Releases", zh: "GitHub 与发布" },
    reportABug: { en: "Report a Bug", zh: "报告问题" },
    helpTroubleshooting: { en: "Help & Troubleshooting", zh: "帮助与排查" },
    issueTimeout: { en: "Analysis timed out? Increase the budget under General → Analyze Timeout.", zh: "分析超时？到 通用 → 分析超时 调大预算。" },
    issueDisconnected: { en: "\"Native host disconnected\"? Restart the browser, or reinstall if it persists.", zh: "出现「本机宿主已断开」？重启浏览器，若仍然如此请重新安装。" },
    collectLogs: { en: "Collect logs for support", zh: "为支持收集日志" },
    collectLogsDesc: { en: "Open this folder and attach native_host.log to your report:", zh: "打开此文件夹，将 native_host.log 附到你的反馈：" },
    copyPath: { en: "Copy path", zh: "复制路径" },
    copied: { en: "Copied!", zh: "已复制！" },
    privacyNote: { en: "Your data is PII-scrubbed locally before it is analyzed.", zh: "你的数据在本地经 PII 脱敏后才会被分析。" },
    securityPrivacy: { en: "Security & Privacy", zh: "安全与隐私" },
    // Bookmark manager + tree (i18n audit)
    typeLink: { en: "Link", zh: "链接" },
    typeFolder: { en: "Folder", zh: "文件夹" },
    typeMarkdownNote: { en: "Markdown Note", zh: "Markdown 笔记" },
    markdownContentPlaceholder: { en: "# Markdown content here...", zh: "# 在此输入 Markdown 内容…" },
    addChild: { en: "Add Child", zh: "添加子项" },
    deleteTooltip: { en: "Delete", zh: "删除" },
    teamManagedTooltip: { en: "Team managed", zh: "团队管理" },
    userInstructionsPlaceholder: { en: "Enter DH-specific instructions here...", zh: "在此输入 DH 专用指令…" },
    // FAB (i18n audit)
    settings: { en: "Settings", zh: "设置" },
    refreshContext: { en: "Refresh Context (Re-scan page)", zh: "刷新上下文（重新扫描页面）" },
    contextPlaceholder: { en: "Context will appear here...", zh: "上下文将显示在这里…" },
    // Preview + errors (i18n audit)
    noContentToPreview: { en: "No content to preview", zh: "暂无可预览的内容" },
    teamSyncFailed: { en: "Team sync failed", zh: "团队同步失败" },
    errorLabel: { en: "Error", zh: "错误" },
    hostErrorLabel: { en: "Host Error", zh: "宿主错误" },
    unknownError: { en: "Unknown error", zh: "未知错误" },
    unknownAnalysisError: { en: "Unknown analysis error", zh: "未知分析错误" },
    unknownNativeHostError: { en: "Unknown native host error", zh: "未知的本机宿主错误" },
    analysisMalformedResponse: {
        en: "The Native Host returned a malformed Analyze response.",
        zh: "本机宿主返回了格式错误的分析响应。",
    },
    analysisPersistenceContextInvalid: {
        en: "Analyze could not start because its persistence context was invalid.",
        zh: "由于分析持久化上下文无效，无法开始分析。",
    },
    analysisPersistenceStartFailed: {
        en: "Analyze could not start because local recovery state could not be saved.",
        zh: "由于无法保存本地恢复状态，无法开始分析。",
    },
    analysisDurabilityWarning: {
        en: "Analysis completed, but the result could not be saved for navigation recovery.",
        zh: "分析已完成，但结果无法保存以供页面导航后恢复。",
    },
    analysisDurabilityAndCleanupWarning: {
        en: "Analysis completed, but result recovery and analyzing-state cleanup may be unavailable until retry or expiry.",
        zh: "分析已完成，但在重试或状态过期前，结果恢复和分析状态清理可能不可用。",
    },
    promptErrorDhCoreMissing: {
        en: "DH Core System Prompt is missing. Repair or reinstall Dynamics Helper.",
        zh: "DH 核心系统提示词缺失。请修复或重新安装 Dynamics Helper。",
    },
    promptErrorDhCoreUnreadable: {
        en: "DH Core System Prompt cannot be read. Repair the installation or file permissions.",
        zh: "无法读取 DH 核心系统提示词。请修复安装或文件权限。",
    },
    promptErrorDhSpecificUnreadable: {
        en: "DH-specific Instructions cannot be read. Repair or replace them in Options.",
        zh: "无法读取 DH 专用指令。请在选项中修复或替换该文件。",
    },
    promptErrorRepositoryMissing: {
        en: "Repository Instructions are missing. Add .github/copilot-instructions.md under Root Path or disable Repository ONLY.",
        zh: "仓库指令缺失。请在根路径下添加 .github/copilot-instructions.md，或禁用仅仓库模式。",
    },
    promptErrorRepositoryUnreadable: {
        en: "Repository Instructions cannot be read. Repair the file or disable Repository ONLY.",
        zh: "无法读取仓库指令。请修复该文件，或禁用仅仓库模式。",
    },
    promptErrorUserPromptUnreadable: {
        en: "Custom User Prompt cannot be read. Repair or replace it in Options.",
        zh: "无法读取自定义用户提示词。请在选项中修复或替换该文件。",
    },
    configSavedRefreshFailed: {
        en: "Settings were saved, but the active prompt could not be refreshed.",
        zh: "设置已保存，但无法刷新当前提示源。",
    },
    configNotSaved: {
        en: "Settings were not saved.",
        zh: "设置未保存。",
    },
    newItemLabel: { en: "New Item", zh: "新建项目" },
    newLinkLabel: { en: "New Link", zh: "新建链接" },
    // Native confirm()/alert() dialog strings (must go through t() per i18n rule)
    updateConfirm: { en: "Update to version {version}? This will restart the extension.", zh: "更新到版本 {version}？这将重启扩展。" },
    deleteItemConfirm: { en: "Delete this item?", zh: "删除此项？" },
    parseJsonFailed: { en: "Failed to parse JSON", zh: "JSON 解析失败" },
    addRootItem: { en: "Add Root Item", zh: "添加根项目" },
    addTo: { en: "Add to", zh: "添加到" },
    teamFolderReadOnly: { en: "Team folder (read-only)", zh: "团队文件夹（只读）" },
    clearSelection: { en: "(Clear Selection)", zh: "(清除选择)" },
    collapseAll: { en: "Collapse All", zh: "折叠所有" },
    expandAll: { en: "Expand All", zh: "展开所有" },
    noBookmarks: { en: "No bookmarks yet", zh: "暂无书签" },
    startBuilding: { en: "Click \"Add Item\" to start building your menu.", zh: "点击“添加项目”开始构建您的菜单。" },
    editItem: { en: "Edit Item", zh: "编辑项目" },
    label: { en: "Label", zh: "标签" },
    type: { en: "Type", zh: "类型" },
    url: { en: "URL", zh: "链接" },
    content: { en: "Content", zh: "内容" },
    dropToMove: { en: "Drop to move to root end", zh: "拖放到此处移动到根目录末尾" },
    import: { en: "Import JSON", zh: "导入 JSON" },
    export: { en: "Export JSON", zh: "导出 JSON" },

    // --- Team Catalog ---
    teamCatalog: { en: "Team Catalog", zh: "团队目录" },
    selectTeam: { en: "Team", zh: "团队" },
    selectTeamDesc: { en: "Select your team to load shared bookmarks.", zh: "选择您的团队以加载共享书签。" },
    noTeam: { en: "None (Personal only)", zh: "无 (仅个人)" },
    lastSynced: { en: "Last synced", zh: "上次同步" },
    neverSynced: { en: "Never synced", zh: "从未同步" },
    items: { en: "items", zh: "个项目" },
    syncing: { en: "Syncing...", zh: "同步中..." },
    refresh: { en: "Refresh", zh: "刷新" },
    teamManaged: { en: "Team", zh: "团队" },

    // --- FAB ---
    analyze: { en: "Analyze", zh: "分析" },
    ping: { en: "Ping", zh: "测试连接" },
    caseContext: { en: "Case Context", zh: "案例上下文" },
    analyzing: { en: "Analyzing...", zh: "正在分析..." },
    analysisComplete: { en: "Analysis Complete", zh: "分析完成" },
    analysisFailed: { en: "Analysis Failed", zh: "分析失败" },
    updateAvailable: { en: "Update Available", zh: "有可用更新" },
    updateNow: { en: "Update Now", zh: "立即更新" },
    updating: { en: "Updating...", zh: "正在更新..." },
    retryUpdate: { en: "Retry Update", zh: "重试更新" },
    updateRequiresAttention: { en: "Update requires attention.", zh: "更新需要处理。" },
    invalidUpdateRequest: { en: "The update request is invalid.", zh: "更新请求无效。" },
    updateInstallerRequired: {
        en: "The installed Host and Extension do not match. Run the matching full installer.",
        zh: "已安装的主机与扩展不匹配。请运行匹配版本的完整安装程序。",
    },
    updateAlreadyInProgress: { en: "Another update is already in progress.", zh: "另一个更新正在进行中。" },
    updatePrepareFailed: {
        en: "The update could not be prepared. Retry or run the matching full installer.",
        zh: "无法准备更新。请重试或运行匹配版本的完整安装程序。",
    },
    updateActivationFailed: {
        en: "The prepared update could not be started. Retry or run the matching full installer.",
        zh: "无法启动已准备的更新。请重试或运行匹配版本的完整安装程序。",
    },
    updateNotTerminal: { en: "The update has not finished yet.", zh: "更新尚未完成。" },
    updateCleanupFailed: {
        en: "The update finished but cleanup is incomplete. Retry cleanup.",
        zh: "更新已完成，但清理尚未完成。请重试清理。",
    },
    sourceUpdateDisabled: {
        en: "Automatic update is disabled while the source Host is registered.",
        zh: "注册源代码主机时，自动更新已禁用。",
    },
    manualRecoveryRequired: {
        en: "Automatic recovery could not finish. Run the matching full installer.",
        zh: "自动恢复无法完成。请运行匹配版本的完整安装程序。",
    },
    updateRequestFailed: { en: "Could not send the update request. Retry.", zh: "无法发送更新请求。请重试。" },
    updateComplete: { en: "Update completed successfully.", zh: "更新已成功完成。" },
    updateRolledBack: {
        en: "The update could not be completed and the previous version was restored.",
        zh: "更新未能完成，已恢复上一版本。",
    },
    noItems: { en: "No items found", zh: "未找到项目" },
    back: { en: "Back", zh: "返回" },
    pingResult: { en: "Ping Result", zh: "测试结果" },
    pingError: { en: "Ping Error", zh: "测试错误" },
    close: { en: "Close", zh: "关闭" },
    noContent: { en: "No analysis content received.", zh: "未收到分析内容。" },
    analysisTook: { en: "Analysis took", zh: "分析耗时" },
    savedReport: { en: "Saved report", zh: "已保存报告" },
    version: { en: "Version", zh: "版本" },
    checkingForUpdates: { en: "Checking for updates...", zh: "正在检查更新..." },
    upToDate: { en: "You are up to date!", zh: "已是最新版本！" },
    checkTimedOut: { en: "Check timed out.", zh: "检查超时。" },
    downloadingUpdate: { en: "Downloading update...", zh: "正在下载更新..." },
    downloadingVersion: { en: "Downloading", zh: "正在下载" },
    updateSuccess: { en: "Update success! Restarting...", zh: "更新成功！正在重启..." },
    updateInstalled: { en: "Update installed! Reloading extension...", zh: "更新已安装！正在重新加载扩展..." },
    updateFailed: { en: "Update failed", zh: "更新失败" },
    resetComplete: { en: "Reset complete.", zh: "重置完成。" },
    resetIncomplete: {
        en: "Reset did not complete. Some state may already be cleared; current values were kept.",
        zh: "重置未完成。部分状态可能已清除；当前值已保留。",
    },
    retryResetCleanup: { en: "Retry cleanup", zh: "重试清理" },
    resetCleanupComplete: {
        en: "Reset cleanup complete. Current preferences were kept.",
        zh: "重置清理已完成。当前偏好设置已保留。",
    },
    bookmarkPersistenceWarning: {
        en: "Bookmark changes are not saved. Make another bookmark change to retry.",
        zh: "书签更改尚未保存。请再次更改书签以重试。",
    },
    bookmarkStorageReadFailed: {
        en: "Bookmarks could not be read. Your saved data was not changed; retry.",
        zh: "无法读取书签。已保存的数据未被更改；请重试。",
    },
    bookmarkStorageInvalid: {
        en: "Saved bookmarks are invalid. Import a valid backup or Reset to repair them.",
        zh: "已保存的书签无效。请导入有效备份或重置以修复。",
    },
    bookmarkDefaultsUnreadable: {
        en: "Default bookmarks could not be loaded. Repair or reinstall the extension, then retry.",
        zh: "无法加载默认书签。请修复或重新安装扩展，然后重试。",
    },
    importSuccess: { en: "Imported successfully!", zh: "导入成功！" },
    availableForUpdate: { en: "available for update", zh: "可更新" },
    checkFailed: { en: "Check failed", zh: "检查失败" },
    updateCheckFailed: { en: "Update check failed.", zh: "更新检查失败。" },
    edit: { en: "Edit", zh: "编辑" },
    preview: { en: "Preview", zh: "预览" },
    
    // --- Context Menu ---
    analyzeError: { en: "Analyze Error", zh: "分析报错" },

    // --- Legacy Features ---
    azureResourceDetected: { en: "Azure Resource Detected", zh: "检测到 Azure 资源" },
    subscription: { en: "Subscription", zh: "订阅" },
    resourceGroup: { en: "Resource Group", zh: "资源组" },
    provider: { en: "Provider", zh: "提供商" },
    name: { en: "Name", zh: "名称" },
    clipboardToast: { en: "Azure Resource detected in clipboard", zh: "剪贴板中检测到 Azure 资源" },
    escalationDetected: { en: "Azure/Mooncake Support Escalation Detected!", zh: "检测到 Azure/Mooncake 支持升级！" },
    escalationToast: { en: "Detected", zh: "已检测到" }
};

/**
 * Resolves the effective language ('en' or 'zh') based on preference or system locale.
 */
export function resolveLanguage(prefLanguage: LanguageCode = 'auto'): 'en' | 'zh' {
    if (prefLanguage === 'auto') {
        const browserLang = navigator.language.toLowerCase();
        return browserLang.startsWith('zh') ? 'zh' : 'en';
    }
    return prefLanguage;
}

/**
 * Plain JS translation helper (non-React).
 */
export function getTranslation(key: string, lang: 'en' | 'zh'): string {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'];
}
