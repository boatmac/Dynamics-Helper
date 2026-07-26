export type OwnDataProperty =
    | { kind: 'absent' }
    | { kind: 'value'; value: unknown }
    | { kind: 'invalid' }

export function ownDataProperty(
    value: unknown,
    key: PropertyKey,
): OwnDataProperty {
    try {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return { kind: 'invalid' }
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, key)
        if (!descriptor) return { kind: 'absent' }
        return Object.hasOwn(descriptor, 'value')
            ? { kind: 'value', value: descriptor.value }
            : { kind: 'invalid' }
    } catch {
        return { kind: 'invalid' }
    }
}
