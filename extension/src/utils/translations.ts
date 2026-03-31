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
    resetConfirm: { en: "Reset everything to default? This will clear your custom bookmarks.", zh: "重置所有设置为默认值？这将清除您的自定义书签。" },
    
    // --- Options Page ---
    appearance: { en: "Appearance", zh: "外观设置" },
    livePreview: { en: "Live Preview", zh: "实时预览" },
    buttonLabel: { en: "Button Label", zh: "按钮标签" },
    brandColor: { en: "Brand Color", zh: "品牌颜色" },
    offsetBottom: { en: "Bottom Offset (px)", zh: "底部边距 (px)" },
    offsetRight: { en: "Right Offset (px)", zh: "右侧边距 (px)" },
    statusBubble: { en: "Enable Status Bubble", zh: "启用状态气泡" },
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
    userInstructions: { en: "Custom User Instructions", zh: "自定义用户指令" },
    userInstructionsDesc: { 
        en: "These instructions are appended to the core System Prompt. Use this to add your own rules (e.g., \"Always use bullet points\", \"Focus on technical details\").", 
        zh: "这些指令会附加到核心系统提示词中。用于添加您自己的规则（例如，“总是使用项目符号”，“关注技术细节”）。" 
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
    useWorkspaceOnly: { en: "Use repository SKILLS and MCP ONLY", zh: "仅使用仓库的 SKILLS 和 MCP" },
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
    hostVersion: { en: "Host Version", zh: "Host 版本" },
    
    menuEditor: { en: "Menu Editor", zh: "菜单编辑器" },
    addRootItem: { en: "Add Root Item", zh: "添加根项目" },
    addTo: { en: "Add to", zh: "添加到" },
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
    importSuccess: { en: "Imported successfully!", zh: "导入成功！" },
    availableForUpdate: { en: "available for update", zh: "可更新" },
    checkFailed: { en: "Check failed", zh: "检查失败" },
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
