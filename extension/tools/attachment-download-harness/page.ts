import { inspectPortal } from './portal'
import { observeDownload, type DownloadObservation } from './observer'
import { captureAttachmentSource, type AttachmentSource } from '../../src/utils/attachmentDownload'

const PORTAL_ORIGIN = 'https://client.dtmnebula.microsoft.com'
const API_ORIGIN = 'https://api.dtmnebula.microsoft.com'
const SPENT_KEY = 'dh_attachment_harness_spent'
const LOCK_NAME = 'dh-attachment-harness-once'
const messages: Record<DownloadObservation['status'], string> = {
    complete: '浏览器报告唯一匹配下载已完成（非文件内容校验）',
    unmatched: '观察期内未找到匹配下载；不会重复点击。',
    incomplete: '观察期结束时唯一匹配下载尚未完成；不会重复点击。',
    ambiguous: '发现多个匹配下载，无法确定唯一结果；不会重复点击。',
    blocked: '浏览器未将匹配下载标记为安全；不会接受危险下载或重复点击。',
    trigger_failed: '未能确认下载触发；已发出的页面操作无法取消，可能稍后执行。本次机会已消耗，不会重试。',
    observer_failed: '无法可靠观察下载结果；本次机会已消耗，不会重试。',
}

type Selection = Readonly<{ tabId: number; case: string; workspace: string; filename: string }>
type Prepared = Readonly<Selection & { documentId: string; rawBase: string; source: AttachmentSource }>

// Preserve the standalone page's warnings and prevent Enter from reloading it.
document.getElementById('form')?.addEventListener('submit', event => event.preventDefault())

const caseNumber = document.getElementById('caseNumber') as HTMLInputElement
const workspace = document.getElementById('workspace') as HTMLInputElement
const filename = document.getElementById('filename') as HTMLInputElement
const portal = document.getElementById('portal') as HTMLSelectElement
const refresh = document.getElementById('refresh') as HTMLButtonElement
const inspect = document.getElementById('inspect') as HTMLButtonElement
const run = document.getElementById('run') as HTMLButtonElement
const status = document.getElementById('status') as HTMLOutputElement
const result = document.getElementById('result') as HTMLPreElement
const fields = [caseNumber, workspace, filename, portal]
let tabs: number[] = []
let prepared: Prepared | null = null
let generation = 0
let busy = true
let spent = false
let storageKnown = false

function updateControls() {
    for (const field of fields) field.disabled = busy
    refresh.disabled = busy
    inspect.disabled = busy
    run.disabled = busy || spent || !storageKnown || !prepared || !navigator.locks
}

function invalidate() {
    generation++
    prepared = null
    result.textContent = ''
    status.textContent = spent ? '本安装的单次机会已消耗；仍可进行只读检查。' : '输入或选择已更改，请重新检查。'
    updateControls()
}

for (const field of fields) {
    field.addEventListener('input', invalidate)
    field.addEventListener('change', invalidate)
}

async function bounded<T>(operation: Promise<T>, token: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            operation,
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => {
                    if (generation === token) {
                        generation++
                        prepared = null
                        status.textContent = '操作超时，检查结果已失效；已发出的操作无法取消，不会自动重试。'
                        updateControls()
                    }
                    reject(new Error('Operation timed out'))
                }, 10_000)
            }),
        ])
    } finally {
        clearTimeout(timer)
    }
}

function validTab(tab: chrome.tabs.Tab, tabId?: number): boolean {
    try {
        if (!Number.isSafeInteger(tab.id) || tab.id! < 0 || (tabId !== undefined && tab.id !== tabId)
            || typeof tab.url !== 'string' || /[\x00-\x20\x7f\\]/.test(tab.url)) return false
        const url = new URL(tab.url)
        const authority = tab.url.split('/')[2]
        return url.origin === PORTAL_ORIGIN && !url.username && !url.password
            && typeof authority === 'string' && !authority.includes('@')
    } catch {
        return false
    }
}

function selection(): Selection | null {
    const tabId = tabs[portal.selectedIndex]
    if (tabId === undefined || !/^\d{16}(?:\d{3})?$/.test(caseNumber.value)
        || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(workspace.value)
        || !filename.value || filename.value.length > 255 || filename.value !== filename.value.trim()
        || /[\x00-\x1f\x7f/\\]/.test(filename.value)) return null
    return Object.freeze({ tabId, case: caseNumber.value, workspace: workspace.value, filename: filename.value })
}

function current(snapshot: Selection, token: number): boolean {
    return token === generation && tabs[portal.selectedIndex] === snapshot.tabId
        && caseNumber.value === snapshot.case && workspace.value === snapshot.workspace
        && filename.value === snapshot.filename
}

refresh.addEventListener('click', async () => {
    if (busy) return
    busy = true
    invalidate()
    const token = generation
    tabs = []
    portal.replaceChildren()
    status.textContent = '正在枚举允许的页面。'
    try {
        const found = await bounded(chrome.tabs.query({ url: 'https://client.dtmnebula.microsoft.com/*' }), token)
        if (token !== generation) return
        for (const tab of found.filter(tab => validTab(tab))) {
            tabs.push(tab.id!)
            const option = document.createElement('option')
            option.textContent = `DTM 页面 ${tabs.length}（活动：${tab.active === true ? '是' : '否'}）`
            option.value = String(tabs.length - 1)
            portal.append(option)
        }
        status.textContent = tabs.length ? '请选择页面并填写预期信息，然后进行只读检查。' : '未找到允许的页面。'
    } catch {
        if (token === generation) status.textContent = '无法读取页面列表。'
    } finally {
        busy = false
        updateControls()
    }
})

inspect.addEventListener('click', async () => {
    if (busy) return
    invalidate()
    const snapshot = selection()
    if (!snapshot) {
        status.textContent = '请选择页面，并填写完整的十六位或十九位记录编号、小写规范工作区标识及有效文件名。'
        return
    }
    busy = true
    updateControls()
    const token = generation
    status.textContent = '正在进行只读检查。'
    try {
        const tab = await bounded(chrome.tabs.get(snapshot.tabId), token)
        if (!current(snapshot, token)) return
        if (!validTab(tab, snapshot.tabId)) throw new Error('Invalid tab')
        const replies = await bounded(chrome.scripting.executeScript({
            target: { tabId: snapshot.tabId, frameIds: [0] },
            world: 'MAIN',
            func: inspectPortal,
            args: [snapshot.case, snapshot.workspace, snapshot.filename],
        }), token)
        if (!current(snapshot, token)) return
        const reply = replies[0]
        if (replies.length !== 1 || reply.frameId !== 0
            || typeof reply.documentId !== 'string' || !reply.documentId.trim()
            || reply.result?.status !== 'ready' || typeof reply.result.baseUrl !== 'string') {
            throw new Error('Invalid inspection')
        }
        const rawBase = reply.result.baseUrl
        const source = captureAttachmentSource(rawBase, snapshot.workspace, API_ORIGIN)
        if (!source || !rawBase.startsWith(`${API_ORIGIN}/`)) throw new Error('Invalid source')
        const url = new URL(rawBase)
        const query = Array.from(url.searchParams.entries())
        if (url.pathname !== rawBase.slice(API_ORIGIN.length).split('?', 1)[0]
            || url.pathname.split('/').map(segment => decodeURIComponent(segment)).some(segment =>
                segment === '.' || segment === '..' || /[\x00-\x20\x7f/\\]/.test(segment))
            || query.length !== 1 || !['fileName', 'filename'].includes(query[0][0]) || query[0][1] !== snapshot.filename
            || /(?:\bBearer\s|eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|sig|token|secret|password)\s*=)/i.test(query[0][1])) {
            throw new Error('Invalid source')
        }
        prepared = Object.freeze({ ...snapshot, documentId: reply.documentId, rawBase, source })
        status.textContent = spent ? '只读检查通过；本安装的单次机会已消耗，不能运行。'
            : !storageKnown || !navigator.locks ? '只读检查通过；单次运行保护不可用，不能运行。'
                : '只读检查通过；可执行唯一一次下载。'
    } catch {
        if (current(snapshot, token)) {
            prepared = null
            status.textContent = '只读检查未通过，未准备任何下载。'
        }
    } finally {
        busy = false
        updateControls()
    }
})

run.addEventListener('click', async () => {
    if (busy || spent || !storageKnown || !prepared || !navigator.locks) return
    const snapshot = prepared
    const token = generation
    if (!current(snapshot, token)) return invalidate()
    busy = true
    updateControls()
    result.textContent = ''
    status.textContent = '正在获取单次运行保护。'
    try {
        let admitted!: () => void
        const admission = new Promise<void>(resolve => { admitted = resolve })
        const invocation = navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async lock => {
            admitted()
            if (!current(snapshot, token)) return
            if (!lock) {
                status.textContent = '另一个诊断页面正在运行；本页未触发下载。'
                return
            }
            const stored = await bounded(chrome.storage.local.get(SPENT_KEY), token)
            if (!current(snapshot, token)) return
            if (stored[SPENT_KEY] === true) {
                spent = true
                status.textContent = '本安装的单次机会已消耗；仍可进行只读检查。'
                return
            }
            if (stored[SPENT_KEY] !== undefined && stored[SPENT_KEY] !== false) {
                storageKnown = false
                throw new Error('Invalid spent marker')
            }
            const tab = await bounded(chrome.tabs.get(snapshot.tabId), token)
            if (!current(snapshot, token)) return
            if (!validTab(tab, snapshot.tabId)) throw new Error('Invalid tab')
            // Latch locally even if persistence times out: an uncertain write is not retry authority.
            spent = true
            await bounded(chrome.storage.local.set({ [SPENT_KEY]: true }), token)
            if (!current(snapshot, token)) return
            status.textContent = '单次机会已消耗，正在观察下载；请保持页面打开。'
            const observation = await observeDownload(snapshot.source, chrome.downloads, async () => {
                if (!current(snapshot, token)) return false
                const liveTab = await bounded(chrome.tabs.get(snapshot.tabId), token)
                if (!current(snapshot, token) || !validTab(liveTab, snapshot.tabId)) return false
                // Once dispatched, Chrome cannot cancel this click on a controller timeout.
                const replies = await bounded(chrome.scripting.executeScript({
                    target: { tabId: snapshot.tabId, documentIds: [snapshot.documentId] },
                    world: 'MAIN',
                    func: inspectPortal,
                    args: [snapshot.case, snapshot.workspace, snapshot.filename, snapshot.rawBase],
                }), token)
                return current(snapshot, token) && replies.length === 1 && replies[0].frameId === 0
                    && replies[0].documentId === snapshot.documentId && replies[0].result?.status === 'clicked'
            }, 30_000)
            status.textContent = messages[observation.status]
            result.textContent = `${messages[observation.status]}\n匹配数量：${observation.matchedCount}`
        }).catch(() => {
            admitted()
            if (token === generation) status.textContent = spent
                ? '运行未能确认完成；本次机会已消耗，不会重试。'
                : '单次运行保护或页面校验失败，未触发下载。'
        })
        // Bound lock admission, not the observer's explicit thirty-second window.
        await bounded(admission, token)
        await invocation
    } catch {
        if (token === generation) status.textContent = '单次运行保护不可用，未触发下载。'
    } finally {
        generation++
        prepared = null
        busy = false
        updateControls()
    }
})

async function initialize() {
    const token = generation
    updateControls()
    try {
        const stored = await bounded(chrome.storage.local.get(SPENT_KEY), token)
        if (token !== generation) return
        if (stored[SPENT_KEY] !== undefined && typeof stored[SPENT_KEY] !== 'boolean') {
            throw new Error('Invalid spent marker')
        }
        spent = stored[SPENT_KEY] === true
        storageKnown = true
        status.textContent = spent ? '本安装的单次机会已消耗；仍可进行只读检查。'
            : navigator.locks ? '请刷新页面列表并手动填写已获批准的预期信息。'
                : '单次运行保护不可用；仅允许只读检查。'
    } catch {
        if (token === generation) status.textContent = '无法确认单次运行状态；仅允许只读检查。'
    } finally {
        busy = false
        updateControls()
    }
}

void initialize()
