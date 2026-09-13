import { readAttachmentPortal, type AttachmentPortalAction, type AttachmentPortalDetail } from '../utils/attachmentPortal'
import { captureAttachmentSource, matchAttachmentDownload, type AttachmentSource } from '../utils/attachmentDownload'
import { ownDataProperty } from '../utils/ownData'

export interface AttachmentPreparationInput {
    requestId: string
    caseNumber: string
    sourceTarget: { tabId: number; documentId: string; frameId: 0 }
    language: 'en' | 'zh'
}

/** Private SW-to-Host output. Never persist or expose paths in progress events. */
export interface AttachmentPreparationResult {
    files: { path: string; size: number }[]
    inventory: 'known' | 'unknown'
    skipped: number
    reason: 'none' | 'auth_timeout' | 'folder_unavailable' | 'unavailable' | 'download_failed' | 'stale'
    language: 'en' | 'zh'
}

export interface AttachmentPreparationDependencies {
    // Pass chrome here in production; there is no ambient browser dependency.
    browser: {
        tabs: Pick<typeof chrome.tabs, 'create' | 'get' | 'remove'>
        scripting: Pick<typeof chrome.scripting, 'executeScript'>
        downloads: Pick<typeof chrome.downloads, 'onCreated' | 'search'>
    }
    /** Must check the SW's durable latest-started owner, not just an in-memory flag. */
    isCurrent(input: Readonly<AttachmentPreparationInput>): Promise<boolean>
    notify?(stage: 'auth_wait'): void | Promise<void>
}

const PORTAL = 'https://client.dtmnebula.microsoft.com'
const API = 'https://api.dtmnebula.microsoft.com'
const RECORD = /^\d{16}(?:\d{3})?$/
const EXTENSION = /\.(?:png|jpg|jpeg|txt|log|json|xml|csv|md)$/i
const MIB = 1024 * 1024

class PreparationTimeoutError extends Error {
    constructor() { super('Attachment preparation timed out'); this.name = 'PreparationTimeoutError' }
}
class StalePreparationError extends Error {}
class SourceUnavailableError extends Error {}

function value(object: unknown, key: string): unknown {
    const field = ownDataProperty(object, key)
    return field.kind === 'value' ? field.value : undefined
}

function exactOwnObject(object: unknown, keys: string[]): Record<string, unknown> | null {
    try {
        if (!object || typeof object !== 'object' || Object.getPrototypeOf(object) !== Object.prototype) return null
        const names = Reflect.ownKeys(object)
        if (names.length !== keys.length || names.some(key => typeof key !== 'string' || !keys.includes(key))) return null
        const result: Record<string, unknown> = {}
        for (const key of keys) {
            const field = ownDataProperty(object, key)
            if (field.kind !== 'value') return null
            result[key] = field.value
        }
        return result
    } catch { return null }
}

async function bounded<T>(operation: () => Promise<T>, deadline: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        if (Date.now() >= deadline) throw new PreparationTimeoutError()
        return await Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new PreparationTimeoutError()), Math.max(0, deadline - Date.now()))
            }),
        ])
    } finally { clearTimeout(timer) }
}

/** Serialized MAIN read: only the canonical header traversal from createdOnModel,
 * plus one fixed visible DTM count label. No model/API calls or field expansion.
 * matches=null is unavailable/ambiguous evidence; false is a confirmed other identity.
 */
export function readAttachmentSource(expected: string): { matches: boolean | null; visibleAttachmentCount: number | null } {
    const unavailable = { matches: null, visibleAttachmentCount: null }
    try {
        if (window.top !== window || location.origin !== 'https://onesupport.crm.dynamics.com'
            || typeof expected !== 'string' || !/^\d{16}(?:\d{3})?$/.test(expected)) return unavailable
        const visible = (element: Element): boolean => {
            if (!element.isConnected || !element.getClientRects().length) return false
            const style = getComputedStyle(element)
            if (style.visibility !== 'visible' || style.display === 'none' || style.opacity === '0') return false
            let ancestor: Element | null = element
            while (ancestor) {
                const parentStyle = getComputedStyle(ancestor)
                if (parentStyle.display === 'none' || parentStyle.opacity === '0') return false
                const root = ancestor.getRootNode()
                ancestor = ancestor.assignedSlot || ancestor.parentElement || (root instanceof ShadowRoot ? root.host : null)
            }
            return true
        }
        const text = (element: Element): string | null => {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_ALL)
            let output = ''
            let count = 0
            let node: Node | null
            while ((node = walker.nextNode())) {
                if (++count > 128) return null
                if (node.nodeType === Node.TEXT_NODE) output += node.nodeValue || ''
                if (output.length > 1024) return null
            }
            return output.replace(/\s+/g, ' ').trim()
        }
        const headers = document.querySelectorAll('uci-header-control-list')
        if (headers.length > 20) return unavailable
        const roots: Node[] = Array.from(headers)
        const seen = new Set<Node>()
        const lists = new Set<Element>(headers)
        const items: Element[] = []
        let nodes = 0
        const deadline = Date.now() + 100
        while (roots.length) {
            const root = roots.pop()!
            if (root instanceof Element && root.shadowRoot) roots.push(root.shadowRoot)
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
            let node: Element | null
            while ((node = walker.nextNode() as Element | null)) {
                if (seen.has(node)) continue
                seen.add(node)
                if (++nodes > 2000 || Date.now() > deadline) return unavailable
                if (node.shadowRoot) roots.push(node.shadowRoot)
                if (node.localName === 'uci-header-control-list') {
                    lists.add(node)
                    if (lists.size > 20) return unavailable
                }
                if (node.localName === 'uci-header-control-list-item') items.push(node)
            }
        }
        const numbers = new Set<string>()
        for (const item of items) {
            const children = Array.from(item.children)
            const label = children.find(child => child.getAttribute('slot') === 'label')
            if (item.getAttribute('data-name') !== 'header_msdfm_casenumberservicelevel'
                && (!label || text(label)?.toLowerCase() !== 'case number / service name')) continue
            for (const child of children.filter(child => child.getAttribute('slot') === 'value')) {
                if (!visible(child)) continue
                const content = text(child)
                if (content === null) return unavailable
                for (const number of content.match(/\b\d{16}(?:\d{3})?\b/g) || []) numbers.add(number)
            }
        }
        if (numbers.size === 0 || (numbers.size > 1 && numbers.has(expected))) return unavailable
        if (!numbers.has(expected)) return { matches: false, visibleAttachmentCount: null }
        // Deliberately no generic attachment-grid scrape or inferred zero count.
        const labels = document.querySelectorAll('[aria-label^="DTM Attachments ("]')
        const counts: number[] = []
        if (labels.length <= 20) {
            for (const label of labels) {
                const match = label.getAttribute('aria-label')?.match(/^DTM Attachments \((\d{1,6})\)$/)
                if (match && visible(label)) counts.push(Number(match[1]))
            }
        }
        return { matches: true, visibleAttachmentCount: counts.length === 1 ? counts[0] : null }
    } catch { return unavailable }
}

type Candidate = Readonly<{ baseUrl: string; filename: string; source: AttachmentSource }>

function inventory(data: unknown): { files: Candidate[]; skipped: number; complete: boolean } | null {
    const ready = exactOwnObject(data, ['status', 'files', 'skipped', 'inventoryComplete'])
    if (!ready || ready.status !== 'ready' || !Array.isArray(ready.files) || ready.files.length > 4
        || typeof ready.skipped !== 'number' || !Number.isSafeInteger(ready.skipped) || ready.skipped < 0
        || ready.skipped > 1_000_000 || typeof ready.inventoryComplete !== 'boolean') return null
    const files: Candidate[] = []
    try {
        if (Object.getPrototypeOf(ready.files) !== Array.prototype
            || Reflect.ownKeys(ready.files).length !== ready.files.length + 1) return null
        for (let index = 0; index < ready.files.length; index++) {
            const descriptor = Object.getOwnPropertyDescriptor(ready.files, String(index))
            if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null
            const raw: unknown = descriptor.value
            const row = exactOwnObject(raw, ['baseUrl', 'filename', 'workspace'])
            if (!row || typeof row.baseUrl !== 'string' || typeof row.filename !== 'string'
                || typeof row.workspace !== 'string' || !row.filename || row.filename.length > 255
                || row.filename !== row.filename.trim() || /[\x00-\x1f\x7f/\\]/.test(row.filename)
                || !EXTENSION.test(row.filename)
                || /(?:\bBearer\s|eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|(?:access_token|sig|token|secret|password)\s*=)/i.test(row.filename)
                || !row.baseUrl.startsWith(`${API}/`)) return null
            const source = captureAttachmentSource(row.baseUrl, row.workspace, API)
            if (!source) return null
            const url = new URL(row.baseUrl)
            const rawSegments = url.pathname.split('/')
            const segments = rawSegments.map(segment => decodeURIComponent(segment))
            const markers = segments.flatMap((segment, index) => segment === 'workspaces' ? [index] : [])
            const query = Array.from(url.searchParams.entries())
            if (url.pathname !== row.baseUrl.slice(API.length).split('?', 1)[0]
                || segments.some(segment => segment === '.' || segment === '..' || /[\x00-\x20\x7f/\\]/.test(segment))
                || markers.length !== 1 || rawSegments[markers[0]] !== 'workspaces'
                || rawSegments[markers[0] + 1] !== row.workspace
                || query.length !== 1 || !['filename', 'fileName'].includes(query[0][0]) || query[0][1] !== row.filename
                || files.some(file => file.source.baseUrl === source.baseUrl || file.filename === row.filename)) return null
            files.push(Object.freeze({ baseUrl: row.baseUrl, filename: row.filename, source }))
        }
        return { files, skipped: ready.skipped, complete: ready.inventoryComplete }
    } catch { return null }
}

/** Effects: one inactive owned tab, MAIN reads/guarded clicks, onCreated and ID-only
 * searches. No fetch, history scan, file read, cancel, permission, focus, or Host RPC.
 * Budgets: 30s create-to-ready; four sequential full 10s observation windows;
 * 2s per API/ownership await; source reads retry within a clipped 3s check window;
 * 89s work + up to 1s cleanup (90s total).
 * URI correlation is not exclusive provenance against concurrent identical requests.
 * Chrome cannot recall an already dispatched script; timeout never authorizes retrying a click.
 */
export async function prepareAttachments(
    input: AttachmentPreparationInput,
    deps: AttachmentPreparationDependencies,
): Promise<AttachmentPreparationResult> {
    const started = Date.now()
    const workDeadline = started + 89_000
    const request = exactOwnObject(input, ['requestId', 'caseNumber', 'sourceTarget', 'language'])
    const result: AttachmentPreparationResult = {
        files: [], inventory: 'unknown', skipped: 0, reason: 'unavailable', language: request?.language === 'zh' ? 'zh' : 'en',
    }
    type Stage = 'input_validation' | 'source_initial' | 'portal_create' | 'portal_wait' | 'portal_inventory'
        | 'external_selection' | 'source_before_action' | 'download_dispatch' | 'download_completion'
        | 'source_post_download' | 'source_final'
    let stage: Stage = 'input_validation'
    let failedStage: Stage | undefined
    type WaitOutcome = 'none' | 'url_unavailable' | 'outside_portal' | 'portal' | 'tab_read_failed'
        | 'injection_failed' | 'injection_timeout' | 'invalid_response' | 'portal_unavailable' | 'ready' | 'external_selectable'
    const wait = {
        urlUnavailable: 0, tabReadFailed: 0, injectionFailed: 0, portalUnavailable: 0,
        lastOutcome: 'none' as WaitOutcome, portalDetail: 'none' as AttachmentPortalDetail | 'none',
    }
    const target = exactOwnObject(request?.sourceTarget, ['tabId', 'documentId', 'frameId'])
    if (!request || typeof request.requestId !== 'string' || !request.requestId.trim() || request.requestId.length > 512
        || typeof request.caseNumber !== 'string' || !RECORD.test(request.caseNumber)
        || !['en', 'zh'].includes(request.language as string) || !target || target.frameId !== 0
        || typeof target.tabId !== 'number' || !Number.isSafeInteger(target.tabId) || target.tabId < 0
        || typeof target.documentId !== 'string' || !target.documentId.trim() || target.documentId.length > 512) return result
    const snapshot = Object.freeze({ requestId: request.requestId, caseNumber: request.caseNumber,
        sourceTarget: Object.freeze({ tabId: target.tabId, documentId: target.documentId, frameId: 0 as const }), language: result.language })
    const browser = deps.browser
    let ownedTab: number | undefined
    let stopped = false
    let sourceCount = 0
    let portalDocument: string | undefined
    let authNotified = false
    let authPending = false
    let workspaceMissing = false
    let remaining = 0
    let sourceValidationFailed = false
    let phaseDeadline = workDeadline
    const apiDeadline = () => Math.min(workDeadline, phaseDeadline, Date.now() + 2000)
    const current = async (deadline = workDeadline) => {
        if (Date.now() >= deadline) throw new PreparationTimeoutError()
        let owned = false
        try { owned = !stopped && await bounded(() => deps.isCurrent(snapshot), Math.min(workDeadline, deadline, Date.now() + 2000)) === true } catch { /* Unknown ownership is stale. */ }
        if (!owned) throw new StalePreparationError()
        if (Date.now() >= Math.min(workDeadline, phaseDeadline, deadline)) throw new PreparationTimeoutError()
    }
    const checked = async <T>(operation: () => Promise<T>): Promise<T> => {
        try { return await bounded(operation, apiDeadline()) } finally { await current() }
    }
    const removeOwned = async (id: number) => {
        try { await bounded(() => browser.tabs.remove(id), Date.now() + 1000) } catch { /* Best effort; never remove another tab. */ }
    }
    const envelope = (responses: unknown, expectedDocument?: string) => {
        if (!Array.isArray(responses) || responses.length !== 1 || value(responses[0], 'frameId') !== 0) return null
        const documentId = value(responses[0], 'documentId')
        if (typeof documentId !== 'string' || !documentId.trim() || documentId.length > 512
            || (expectedDocument !== undefined && documentId !== expectedDocument)) return null
        return { documentId, data: value(responses[0], 'result') }
    }
    const sourceCheck = async () => {
        const deadline = Math.min(workDeadline, phaseDeadline, Date.now() + 3000)
        const readOnce = async () => {
            let replies: unknown
            try {
                replies = await bounded(() => browser.scripting.executeScript({
                    target: { tabId: snapshot.sourceTarget.tabId, documentIds: [snapshot.sourceTarget.documentId] },
                    world: 'MAIN', func: readAttachmentSource, args: [snapshot.caseNumber],
                }), Math.min(deadline, Date.now() + 2000))
            } catch {
                return false // Only injection rejection/timeout is retryable here.
            } finally { await current(deadline) }
            const response = envelope(replies)
            if (!response) throw new SourceUnavailableError()
            if (response.documentId !== snapshot.sourceTarget.documentId) throw new StalePreparationError()
            const data = exactOwnObject(response.data, ['matches', 'visibleAttachmentCount'])
            if (!data) throw new SourceUnavailableError()
            if (data.matches === false) throw new StalePreparationError()
            const count = data.visibleAttachmentCount
            if (count !== null && (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0 || count > 999999)) throw new SourceUnavailableError()
            if (data.matches === null) return false
            if (data.matches !== true) throw new SourceUnavailableError()
            sourceCount = typeof count === 'number' ? count : sourceCount
            return true
        }
        try {
            while (Date.now() < deadline) {
                await current(deadline)
                if (await readOnce()) return
                await new Promise<void>(resolve => setTimeout(resolve, Math.min(200, Math.max(0, deadline - Date.now()))))
            }
            throw new SourceUnavailableError()
        } catch (error) {
            if (error instanceof StalePreparationError) throw error
            sourceValidationFailed = true
            throw new SourceUnavailableError()
        }
    }
    const tabOrigin = async (diagnostics = false) => {
        if (diagnostics) wait.portalDetail = 'none'
        let tab: chrome.tabs.Tab
        try { tab = await bounded(() => browser.tabs.get(ownedTab!), apiDeadline()) }
        catch (error) {
            if (diagnostics) {
                wait.tabReadFailed = Math.min(256, wait.tabReadFailed + 1)
                wait.lastOutcome = 'tab_read_failed'
            }
            throw error
        } finally { await current() }
        // Count URL-read observations, including the second read before inspection.
        const raw = value(tab, 'url')
        let origin = ''
        if (value(tab, 'id') === ownedTab && typeof raw === 'string' && raw.length <= 16384 && !/[\x00-\x20\x7f\\]/.test(raw)) {
            try {
                const url = new URL(raw)
                origin = url.username || url.password ? '' : url.origin
            } catch { /* Unavailable URL; never retain its text in diagnostics. */ }
        }
        // A committed URL supersedes historical login evidence, including an
        // unavailable URL. A failed read above retains the last observed state.
        authPending = origin === 'https://login.microsoftonline.com'
        if (diagnostics) {
            if (!origin) wait.urlUnavailable = Math.min(256, wait.urlUnavailable + 1)
            wait.lastOutcome = !origin ? 'url_unavailable' : origin === PORTAL ? 'portal' : 'outside_portal'
        }
        return origin
    }
    const portalRead = async (action: AttachmentPortalAction, arm?: () => void) => {
        const diagnostics = action.kind === 'inspect'
        if (await tabOrigin(diagnostics) !== PORTAL) return null
        if (action.kind !== 'inspect') {
            const actionStage = stage
            stage = 'source_before_action'
            await sourceCheck()
            await current()
            stage = actionStage
        }
        arm?.()
        let responses: unknown
        try {
            responses = await bounded(() => browser.scripting.executeScript({
                target: portalDocument ? { tabId: ownedTab!, documentIds: [portalDocument] } : { tabId: ownedTab!, frameIds: [0] },
                world: 'MAIN', func: readAttachmentPortal,
                args: diagnostics ? [snapshot.caseNumber, action, true] : [snapshot.caseNumber, action],
            }), apiDeadline())
        } catch (error) {
            if (diagnostics) {
                wait.injectionFailed = Math.min(256, wait.injectionFailed + 1)
                wait.lastOutcome = error instanceof PreparationTimeoutError ? 'injection_timeout' : 'injection_failed'
            }
            throw error
        } finally { await current() }
        const response = envelope(responses, portalDocument)
        if (diagnostics) {
            wait.lastOutcome = 'invalid_response'
            const status = value(response?.data, 'status')
            if (status === 'unavailable') {
                wait.portalUnavailable = Math.min(256, wait.portalUnavailable + 1)
                wait.lastOutcome = 'portal_unavailable'
                const detail = value(response?.data, 'detail')
                // Never coerce or log page-controlled diagnostic values.
                const details: readonly AttachmentPortalDetail[] = ['context', 'document_limit', 'dialog', 'case_identity',
                    'external_control', 'inventory', 'file_metadata', 'page_changed', 'exception']
                if (typeof detail === 'string' && details.includes(detail as AttachmentPortalDetail)) wait.portalDetail = detail as AttachmentPortalDetail
            } else if (status === 'ready') wait.lastOutcome = 'ready'
            else if (exactOwnObject(response?.data, ['status'])?.status === 'external_selectable') wait.lastOutcome = 'external_selectable'
        }
        if (!response) return null
        portalDocument = response.documentId
        return response.data
    }
    try {
        stage = 'source_initial'
        await current()
        await sourceCheck()
        await current()
        // Observed internal Home template, not a documented network API or D365 button click.
        phaseDeadline = Math.min(workDeadline, Date.now() + 30_000)
        stage = 'portal_create'
        const creating = browser.tabs.create({ url: `${PORTAL}/Home?srNumber=${encodeURIComponent(snapshot.caseNumber)}`, active: false })
        void creating.then(tab => {
            const id = value(tab, 'id')
            if (typeof id !== 'number' || !Number.isSafeInteger(id) || id < 0 || id === snapshot.sourceTarget.tabId) return
            if (stopped) void removeOwned(id)
            else ownedTab = id
        }, () => {})
        await checked(() => creating)
        if (ownedTab === undefined) return result
        let selected = false
        let prepared: ReturnType<typeof inventory> = null
        stage = 'portal_wait'
        while (Date.now() < phaseDeadline) {
            await current()
            let data: unknown = null
            try {
                const origin = await tabOrigin(true)
                if (origin === 'https://login.microsoftonline.com') {
                    // No injection into login pages, popup clicks, or automatic focus.
                    portalDocument = undefined
                    if (!authNotified) {
                        authNotified = true
                        try { await bounded(() => Promise.resolve(deps.notify?.('auth_wait')), apiDeadline()) } catch { /* Attention delivery cannot authorize or block a click. */ }
                        await current()
                    }
                } else if (origin === PORTAL) {
                    data = await portalRead({ kind: 'inspect' })
                    if (data === null) portalDocument = undefined
                } else { portalDocument = undefined }
            } catch (error) {
                if (error instanceof StalePreparationError) throw error
                // Only read-only attempts retry, including a bounded step timeout.
                // Keep the original create-to-ready deadline and reacquire the document.
                portalDocument = undefined
                if (Date.now() >= phaseDeadline) break
            }
            stage = 'portal_inventory'
            // The portal cannot distinguish an empty folder from denied access.
            // Keep inventory unknown; finally still revalidates source/ownership.
            if (exactOwnObject(data, ['status'])?.status === 'folder_unavailable') {
                result.reason = 'folder_unavailable'
                return result
            }
            if (exactOwnObject(data, ['status'])?.status === 'workspace_missing') {
                workspaceMissing = true
                prepared = { files: [], skipped: 0, complete: true }
                break
            }
            prepared = inventory(data)
            if (prepared) break
            if (value(data, 'status') === 'ready') {
                wait.lastOutcome = 'invalid_response'
                return result // Malformed/duplicate inventory is not retryable.
            }
            stage = 'portal_wait'
            if (!selected && exactOwnObject(data, ['status'])?.status === 'external_selectable') {
                selected = true
                // Outside the retry block: uncertain action dispatch is terminal.
                stage = 'external_selection'
                const selection = await portalRead({ kind: 'select_external' })
                if (exactOwnObject(selection, ['status'])?.status !== 'clicked') return result
                stage = 'portal_wait'
            }
            await new Promise<void>(resolve => setTimeout(resolve, Math.min(250, Math.max(0, phaseDeadline - Date.now()))))
            if (Date.now() < phaseDeadline) await current()
        }
        if (!prepared) {
            result.reason = authPending ? 'auth_timeout' : 'unavailable'
            return result
        }
        phaseDeadline = workDeadline
        // D365 may include rows outside External; a shortfall disproves completeness,
        // but does not identify additional files or justify discarding safe selections.
        const sourceCountExceedsInventory = sourceCount > prepared.files.length + prepared.skipped
        result.inventory = prepared.complete && !sourceCountExceedsInventory ? 'known' : 'unknown'
        result.skipped = prepared.skipped
        result.reason = sourceCountExceedsInventory ? 'unavailable' : 'none'
        if (sourceCountExceedsInventory) failedStage = stage
        remaining = prepared.files.length
        for (const candidate of prepared.files) {
            stage = 'download_dispatch'
            await current()
            // Reserve a complete observation window and terminal metadata/ownership checks.
            if (Date.now() + 14_000 >= workDeadline) throw new PreparationTimeoutError()
            const ids = new Set<number>()
            let armed = false
            let gate = 0
            let deadline = 0
            let listening = true
            const onCreated = (item: chrome.downloads.DownloadItem) => {
                if (!listening || !armed || stopped || Date.now() >= deadline) return
                const id = matchAttachmentDownload(candidate.source, item)
                const start = value(item, 'startTime')
                const time = typeof start === 'string' ? Date.parse(start) : NaN
                if (id === null || !Number.isFinite(time) || time < gate || time > Date.now() || time >= deadline) return
                if (ids.size < 2) ids.add(id) // Two distinct IDs are sufficient to reject ambiguity.
            }
            let file: { path: string; size: number } | null = null
            try {
                browser.downloads.onCreated.addListener(onCreated)
                const clicked = await portalRead({ kind: 'download', baseUrl: candidate.baseUrl, filename: candidate.filename }, () => {
                    if (Date.now() + 14_000 >= workDeadline) throw new PreparationTimeoutError()
                    gate = Date.now()
                    deadline = gate + 10_000
                    armed = true
                })
                if (exactOwnObject(clicked, ['status'])?.status === 'clicked' && armed) {
                    stage = 'download_completion'
                    await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, deadline - Date.now())))
                    armed = false
                    await current()
                    if (ids.size === 1) {
                        const id = [...ids][0]
                        const items = await checked(() => browser.downloads.search({ id }))
                        const item = Array.isArray(items) && items.length === 1 ? items[0] : undefined
                        const path = value(item, 'filename')
                        const size = value(item, 'fileSize')
                        const start = value(item, 'startTime')
                        const time = typeof start === 'string' ? Date.parse(start) : NaN
                        const leaf = typeof path === 'string' ? path.split(/[\\/]/).pop()! : ''
                        const dot = candidate.filename.lastIndexOf('.')
                        const stem = candidate.filename.slice(0, dot)
                        const extension = candidate.filename.slice(dot)
                        const renamed = leaf.startsWith(`${stem} (`) && leaf.endsWith(`)${extension}`)
                            && /^[1-9]\d{0,5}$/.test(leaf.slice(stem.length + 2, -extension.length - 1))
                        if (matchAttachmentDownload(candidate.source, item) === id && time >= gate && time < deadline
                            && value(item, 'state') === 'complete' && value(item, 'danger') === 'safe' && value(item, 'exists') === true
                            && typeof size === 'number' && Number.isSafeInteger(size) && size >= 0 && size <= 2 * MIB
                            && result.files.reduce((total, entry) => total + entry.size, size) <= 8 * MIB
                            && typeof path === 'string' && path.length < 512 && !/[\x00-\x1f\x7f]/.test(path)
                            && (/^[a-z]:[\\/]/i.test(path) || path.startsWith('/')) && !path.startsWith('//')
                            && !path.split(/[\\/]/).some(part => part === '.' || part === '..')
                            && EXTENSION.test(leaf) && (leaf === candidate.filename || renamed)
                            && !result.files.some(entry => entry.path.toLowerCase() === path.toLowerCase())) file = { path, size }
                    }
                }
            } finally {
                listening = false
                armed = false
                browser.downloads.onCreated.removeListener(onCreated)
            }
            if (!file) failedStage = stage
            stage = 'source_post_download'
            await sourceCheck()
            remaining--
            if (file) result.files.push(file)
            else { result.skipped++; result.reason = 'download_failed' }
        }
        stage = 'source_final'
        await sourceCheck()
        await current()
    } catch (error) {
        failedStage = stage
        if (error instanceof StalePreparationError || error instanceof SourceUnavailableError) {
            result.skipped += result.files.length
            result.files = []
            result.inventory = 'unknown'
            result.skipped = Math.max(sourceCount, result.skipped + remaining)
            result.reason = error instanceof StalePreparationError ? 'stale' : 'unavailable'
        } else {
            result.skipped += remaining
            result.reason = result.reason === 'none' || result.reason === 'download_failed' ? 'download_failed'
                : authPending && Date.now() >= phaseDeadline ? 'auth_timeout' : 'unavailable'
        }
    } finally {
        phaseDeadline = workDeadline
        if (!sourceValidationFailed && result.reason !== 'stale' && Date.now() < workDeadline) {
            try { await sourceCheck() } catch (error) {
                failedStage = 'source_final'
                result.skipped += result.files.length
                result.files = []
                result.inventory = 'unknown'
                result.reason = error instanceof StalePreparationError ? 'stale' : 'unavailable'
            }
        }
        if (workspaceMissing && sourceCount > 0 && result.reason === 'none') {
            result.inventory = 'unknown'
            result.reason = 'unavailable'
        }
        stopped = true
        if (result.inventory === 'unknown') result.skipped = Math.max(sourceCount - result.files.length, result.skipped)
        if (ownedTab !== undefined) await removeOwned(ownedTab)
        if (result.reason !== 'none') {
            const diagnosticStage = failedStage ?? stage
            try { console.warn('[DH] Attachment preparation incomplete', {
                stage: diagnosticStage, reason: result.reason,
                ...(diagnosticStage === 'portal_wait' ? { wait: { ...wait } } : {}),
            }) }
            catch { /* Diagnostics must not reject Analyze. */ }
        }
    }
    return result
}
