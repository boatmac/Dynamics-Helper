export interface MenuItem {
    type: 'folder' | 'link' | 'markdown' | 'back' | 'unknown'
    label: string
    url?: string
    content?: string
    children?: MenuItem[]
    target?: string
    icon?: string
    collapsed?: boolean
    tags?: string[]
    source?: 'team' | 'personal'
}

export type StoredItemsResult =
    | { kind: 'saved'; items: MenuItem[] }
    | { kind: 'absent' }
    | { kind: 'invalid'; code: 'bookmark_storage_invalid' }
    | { kind: 'failed'; code: 'bookmark_storage_read_failed' }

export type DefaultItemsResult =
    | { kind: 'loaded'; items: MenuItem[] }
    | { kind: 'failed'; code: 'bookmark_defaults_unreadable' }

export type BookmarkLoadResult =
    | { kind: 'loaded'; source: 'saved' | 'defaults'; items: MenuItem[] }
    | { kind: 'invalid'; code: 'bookmark_storage_invalid' }
    | {
          kind: 'failed'
          code: 'bookmark_storage_read_failed' | 'bookmark_defaults_unreadable'
      }

const ITEM_TYPES = new Set(['folder', 'link', 'markdown', 'back', 'unknown'])
const STRING_FIELDS = ['url', 'content', 'target', 'icon'] as const
const MAX_FOLDER_DEPTH = 64
const INVALID = Symbol('invalid-bookmark-data')

type DescribedOwnObject =
    | { kind: 'object'; descriptors: PropertyDescriptorMap }
    | { kind: 'array'; descriptors: PropertyDescriptorMap; length: number }

function descriptorFromMap(
    descriptors: PropertyDescriptorMap,
    key: PropertyKey,
): PropertyDescriptor | null {
    try {
        const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
        if (!holder || !descriptorHasData(holder)) return null
        const descriptor = holder.value
        return typeof descriptor === 'object' && descriptor !== null
            ? descriptor as PropertyDescriptor
            : null
    } catch {
        return null
    }
}

function descriptorHasData(descriptor: PropertyDescriptor): boolean {
    try {
        return Object.hasOwn(descriptor, 'value')
    } catch {
        return false
    }
}

function ownDescriptorKeys(
    descriptors: PropertyDescriptorMap,
): readonly PropertyKey[] | null {
    try {
        return Reflect.ownKeys(descriptors)
    } catch {
        return null
    }
}

function safeIsArray(value: unknown): boolean | null {
    try {
        return Array.isArray(value)
    } catch {
        return null
    }
}

function describeOwnObject(value: unknown): DescribedOwnObject | null {
    try {
        if (typeof value !== 'object' || value === null) return null
        const isArray = safeIsArray(value)
        if (isArray === null) return null
        const descriptors = Object.getOwnPropertyDescriptors(value)
        if (!isArray) return { kind: 'object', descriptors }
        const lengthDescriptor = descriptorFromMap(descriptors, 'length')
        if (
            !lengthDescriptor
            || !descriptorHasData(lengthDescriptor)
            || typeof lengthDescriptor.value !== 'number'
            || !Number.isSafeInteger(lengthDescriptor.value)
            || lengthDescriptor.value < 0
        ) return null
        return {
            kind: 'array',
            descriptors,
            length: lengthDescriptor.value,
        }
    } catch {
        return null
    }
}

function defineOwnData(
    target: object,
    key: PropertyKey,
    value: unknown,
): boolean {
    try {
        Object.defineProperty(target, key, {
            value,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        return true
    } catch {
        return false
    }
}

function snapshotUnknown(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): unknown | typeof INVALID {
    if (depth > MAX_FOLDER_DEPTH) return INVALID
    if (
        value === null
        || typeof value === 'string'
        || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value))
    ) return value
    if (typeof value !== 'object' || ancestors.has(value)) return INVALID
    const described = describeOwnObject(value)
    if (!described) return INVALID
    const { descriptors } = described
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value)
    if (described.kind === 'array') {
        const output: unknown[] = []
        for (let index = 0; index < described.length; index += 1) {
            const descriptor = descriptorFromMap(descriptors, index)
            if (!descriptor || !descriptorHasData(descriptor)) return INVALID
            const child = snapshotUnknown(
                descriptor.value,
                depth + 1,
                nextAncestors,
            )
            if (child === INVALID) return INVALID
            if (!defineOwnData(output, index, child)) return INVALID
        }
        return output
    }
    const output: Record<string, unknown> = {}
    const keys = ownDescriptorKeys(descriptors)
    if (!keys) return INVALID
    for (const key of keys) {
        if (typeof key !== 'string') continue
        const descriptor = descriptorFromMap(descriptors, key)
        if (!descriptor) return INVALID
        if (!descriptor.enumerable) continue
        if (!descriptorHasData(descriptor)) return INVALID
        const child = snapshotUnknown(descriptor.value, depth + 1, nextAncestors)
        if (child === INVALID) return INVALID
        if (!defineOwnData(output, key, child)) return INVALID
    }
    return output
}

function containsReference(
    value: unknown,
    target: object,
    seen: Set<object> = new Set(),
    depth = 0,
): boolean {
    if (value === target) return true
    if (depth > MAX_FOLDER_DEPTH) return true
    if (typeof value !== 'object' || value === null || seen.has(value)) return false
    seen.add(value)
    const described = describeOwnObject(value)
    if (!described) return true
    const keys = ownDescriptorKeys(described.descriptors)
    if (!keys) return true
    return keys.some(key => {
        const descriptor = descriptorFromMap(described.descriptors, key)
        return !descriptor || (
            descriptor.enumerable
            && (
                !descriptorHasData(descriptor)
                || containsReference(descriptor.value, target, seen, depth + 1)
            )
        )
    })
}

function dataValue(
    descriptors: PropertyDescriptorMap,
    key: string,
): { present: boolean; valid: boolean; value?: unknown } {
    const descriptor = descriptorFromMap(descriptors, key)
    if (!descriptor) return { present: false, valid: true }
    return descriptorHasData(descriptor)
        ? { present: true, valid: true, value: descriptor.value }
        : { present: true, valid: false }
}

function parseItemsArray(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): MenuItem[] | null {
    const described = describeOwnObject(value)
    if (
        !described
        || described.kind !== 'array'
        || depth > MAX_FOLDER_DEPTH
        || ancestors.has(value as object)
    ) {
        return null
    }
    const { descriptors } = described
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value as object)
    const output: MenuItem[] = []
    for (let index = 0; index < described.length; index += 1) {
        const descriptor = descriptorFromMap(descriptors, index)
        if (!descriptor || !descriptorHasData(descriptor)) return null
        const item = parseItem(descriptor.value, depth, nextAncestors)
        if (!item) return null
        if (!defineOwnData(output, index, item)) return null
    }
    return output
}

function parseItem(
    value: unknown,
    depth: number,
    ancestors: ReadonlySet<object>,
): MenuItem | null {
    if (
        typeof value !== 'object'
        || value === null
        || depth > MAX_FOLDER_DEPTH
    ) return null
    const described = describeOwnObject(value)
    if (
        !described
        || described.kind !== 'object'
        || ancestors.has(value)
    ) return null
    const { descriptors } = described
    const type = dataValue(descriptors, 'type')
    const label = dataValue(descriptors, 'label')
    if (
        !type.present || !type.valid || typeof type.value !== 'string'
        || !ITEM_TYPES.has(type.value)
        || !label.present || !label.valid || typeof label.value !== 'string'
    ) return null
    const nextAncestors = new Set(ancestors)
    nextAncestors.add(value)
    const output: Record<string, unknown> = {
        type: type.value,
        label: label.value,
    }
    for (const field of STRING_FIELDS) {
        const candidate = dataValue(descriptors, field)
        if (!candidate.valid) return null
        if (candidate.present) {
            if (typeof candidate.value !== 'string') return null
            if (!defineOwnData(output, field, candidate.value)) return null
        }
    }
    const collapsed = dataValue(descriptors, 'collapsed')
    if (!collapsed.valid) return null
    if (collapsed.present) {
        if (typeof collapsed.value !== 'boolean') return null
        if (!defineOwnData(output, 'collapsed', collapsed.value)) return null
    }
    const tags = dataValue(descriptors, 'tags')
    if (!tags.valid) return null
    if (tags.present) {
        const parsedTags = snapshotUnknown(tags.value, depth + 1, nextAncestors)
        if (
            parsedTags === INVALID
            || safeIsArray(parsedTags) !== true
        ) return null
        const parsedTagValues: string[] = []
        const describedTags = describeOwnObject(parsedTags)
        if (!describedTags || describedTags.kind !== 'array') return null
        for (let index = 0; index < describedTags.length; index += 1) {
            const descriptor = descriptorFromMap(describedTags.descriptors, index)
            if (
                !descriptor
                || !descriptorHasData(descriptor)
                || typeof descriptor.value !== 'string'
            ) return null
            parsedTagValues.push(descriptor.value)
        }
        if (!defineOwnData(output, 'tags', parsedTagValues)) return null
    }
    const source = dataValue(descriptors, 'source')
    if (!source.valid) return null
    if (source.present) {
        if (source.value !== 'team' && source.value !== 'personal') return null
        if (!defineOwnData(output, 'source', source.value)) return null
    }
    const children = dataValue(descriptors, 'children')
    if (!children.valid) return null
    if (children.present) {
        const parsedChildren = parseItemsArray(
            children.value,
            depth + 1,
            nextAncestors,
        )
        if (!parsedChildren) return null
        if (!defineOwnData(output, 'children', parsedChildren)) return null
    }
    const known = new Set([
        'type', 'label', ...STRING_FIELDS, 'collapsed', 'tags', 'source', 'children',
    ])
    const keys = ownDescriptorKeys(descriptors)
    if (!keys) return null
    for (const key of keys) {
        if (typeof key !== 'string') continue
        const descriptor = descriptorFromMap(descriptors, key)
        if (!descriptor) return null
        if (!descriptor.enumerable || known.has(key)) continue
        if (!descriptorHasData(descriptor)) return null
        if (containsReference(descriptor.value, value)) return null
        const extra = snapshotUnknown(descriptor.value, depth + 1, nextAncestors)
        if (extra === INVALID) return null
        if (!defineOwnData(output, key, extra)) return null
    }
    return output as unknown as MenuItem
}

export function parseBookmarkItems(value: unknown): MenuItem[] | null {
    return parseItemsArray(value, 1, new Set())
}

export function parseBookmarkDocument(value: unknown): MenuItem[] | null {
    const described = describeOwnObject(value)
    if (!described) return null
    if (described.kind === 'array') return parseBookmarkItems(value)
    const descriptor = descriptorFromMap(described.descriptors, 'items')
    return descriptor && descriptorHasData(descriptor)
        ? parseBookmarkItems(descriptor.value)
        : null
}

export function parseOwnBookmarkItems(
    value: unknown,
    key: string,
): MenuItem[] | null {
    try {
        if (
            typeof value !== 'object'
            || value === null
            || Array.isArray(value)
        ) return null
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        return descriptor && Object.hasOwn(descriptor, 'value')
            ? parseBookmarkItems(descriptor.value)
            : null
    } catch {
        return null
    }
}

export function collapseBookmarkFolders(
    items: MenuItem[],
    isCurrent: () => boolean = () => true,
): MenuItem[] | null {
    const parsed = parseBookmarkItems(items)
    if (!parsed) return null
    const output = parsed
    const stack = [...output]
    while (stack.length > 0) {
        if (!isCurrent()) return null
        const item = stack.pop()!
        if (item.type === 'folder') {
            item.collapsed = item.collapsed ?? true
            item.children = item.children ?? []
        }
        if (item.children) stack.push(...item.children)
    }
    return output
}

export function readStoredItems(): Promise<StoredItemsResult> {
    return new Promise(resolve => {
        try {
            chrome.storage.local.get('dh_items', value => {
                try {
                    if (chrome.runtime.lastError) {
                        resolve({ kind: 'failed', code: 'bookmark_storage_read_failed' })
                        return
                    }
                    if (
                        typeof value !== 'object'
                        || value === null
                        || safeIsArray(value) !== false
                    ) {
                        resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                        return
                    }
                    const descriptor = Object.getOwnPropertyDescriptor(
                        value,
                        'dh_items',
                    )
                    if (!descriptor) {
                        resolve({ kind: 'absent' })
                        return
                    }
                    if (!descriptorHasData(descriptor)) {
                        resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                        return
                    }
                    const items = parseBookmarkItems(descriptor.value)
                    resolve(items
                        ? { kind: 'saved', items }
                        : { kind: 'invalid', code: 'bookmark_storage_invalid' })
                } catch {
                    resolve({ kind: 'invalid', code: 'bookmark_storage_invalid' })
                }
            })
        } catch {
            resolve({ kind: 'failed', code: 'bookmark_storage_read_failed' })
        }
    })
}

export async function readDefaultItems(
    fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<DefaultItemsResult> {
    try {
        const response = await fetcher(chrome.runtime.getURL('items.json'))
        let ok: unknown
        let readText: unknown
        try {
            ok = response.ok
            readText = response.text
        } catch {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        if (ok !== true || typeof readText !== 'function') {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        const text = await readText.call(response)
        if (typeof text !== 'string') {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        if (text.trimStart().startsWith('<')) {
            return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
        }
        const items = parseBookmarkDocument(JSON.parse(text))
        return items
            ? { kind: 'loaded', items }
            : { kind: 'failed', code: 'bookmark_defaults_unreadable' }
    } catch {
        return { kind: 'failed', code: 'bookmark_defaults_unreadable' }
    }
}

export async function loadBookmarkItems(
    fetcher: typeof globalThis.fetch = globalThis.fetch,
): Promise<BookmarkLoadResult> {
    const stored = await readStoredItems()
    if (stored.kind === 'saved') {
        return { kind: 'loaded', source: 'saved', items: stored.items }
    }
    if (stored.kind === 'invalid') return stored
    if (stored.kind === 'failed') return stored
    const defaults = await readDefaultItems(fetcher)
    return defaults.kind === 'loaded'
        ? { kind: 'loaded', source: 'defaults', items: defaults.items }
        : defaults
}

export function writeStoredItems(
    items: MenuItem[],
    isCurrent: () => boolean = () => true,
): Promise<'committed' | 'stale'> {
    return new Promise((resolve, reject) => {
        let current = false
        try {
            current = isCurrent()
        } catch {
            reject(new Error('Bookmark storage ownership check failed'))
            return
        }
        if (!current) {
            resolve('stale')
            return
        }
        try {
            chrome.storage.local.set({ dh_items: items }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error('Bookmark storage mutation failed'))
                    return
                }
                resolve('committed')
            })
        } catch {
            reject(new Error('Bookmark storage mutation failed'))
        }
    })
}
