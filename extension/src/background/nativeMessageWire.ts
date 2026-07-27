export interface NativeMessageWireDeps {
    createRequestId(): string
    register(requestId: string): void
    unregister(requestId: string): void
    postMessage(message: Readonly<Record<string, unknown>>): void
}

export function postNativeMessageWire(
    forwarded: Readonly<Record<string, unknown>>,
    deps: NativeMessageWireDeps,
): string {
    let wire: Record<string, unknown>
    let requestId: string | undefined
    try {
        const descriptors = Object.getOwnPropertyDescriptors(forwarded)
        wire = {}
        for (const key of Reflect.ownKeys(descriptors)) {
            if (typeof key !== 'string') throw new Error('Invalid Native message')
            const holder = Reflect.getOwnPropertyDescriptor(descriptors, key)
            if (!holder || !Object.hasOwn(holder, 'value')) {
                throw new Error('Invalid Native message')
            }
            const descriptor = holder.value as PropertyDescriptor
            if (key === 'toJSON') {
                if (
                    descriptor.enumerable
                    || !Object.hasOwn(descriptor, 'value')
                    || descriptor.value !== undefined
                ) throw new Error('Invalid Native message')
                continue
            }
            if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
                throw new Error('Invalid Native message')
            }
            if (key === 'requestId') {
                if (
                    typeof descriptor.value !== 'string'
                    || descriptor.value.length === 0
                ) throw new Error('Invalid Native message request ID')
                requestId = descriptor.value
                continue
            }
            Object.defineProperty(wire, key, {
                value: descriptor.value,
                enumerable: true,
                writable: true,
                configurable: true,
            })
        }
        if (requestId === undefined) requestId = deps.createRequestId()
        if (typeof requestId !== 'string' || requestId.length === 0) {
            throw new Error('Invalid Native message request ID')
        }
        Object.defineProperty(wire, 'requestId', {
            value: requestId,
            enumerable: true,
            writable: true,
            configurable: true,
        })
        Object.defineProperty(wire, 'toJSON', {
            value: undefined,
            enumerable: false,
            writable: false,
            configurable: false,
        })
        Object.freeze(wire)
    } catch (error) {
        if (
            error instanceof Error
            && error.message === 'Invalid Native message request ID'
        ) throw error
        throw new Error('Invalid Native message')
    }
    deps.register(requestId)
    try {
        deps.postMessage(wire)
    } catch (error) {
        try {
            deps.unregister(requestId)
        } catch {
            // Preserve the original posting failure.
        }
        throw error
    }
    return requestId
}
