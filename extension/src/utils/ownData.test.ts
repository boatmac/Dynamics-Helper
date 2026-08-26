import { describe, expect, it, vi } from 'vitest'
import { ownDataProperty } from './ownData'

describe('ownDataProperty', () => {
    it('reads only an own data property', () => {
        const inherited = { inherited: 'drop' }
        const value = Object.create(inherited) as Record<string, unknown>
        value.own = 'keep'

        expect(ownDataProperty(value, 'own')).toEqual({
            kind: 'value',
            value: 'keep',
        })
        expect(ownDataProperty(value, 'inherited')).toEqual({ kind: 'absent' })
        expect(ownDataProperty(value, 'missing')).toEqual({ kind: 'absent' })
    })

    it('rejects accessors without invoking them', () => {
        const getter = vi.fn(() => 'SECRET')
        const value = {}
        Object.defineProperty(value, 'enumerable', {
            enumerable: true,
            get: getter,
        })
        Object.defineProperty(value, 'hidden', {
            enumerable: false,
            get: getter,
        })

        expect(ownDataProperty(value, 'enumerable')).toEqual({ kind: 'invalid' })
        expect(ownDataProperty(value, 'hidden')).toEqual({ kind: 'invalid' })
        expect(getter).not.toHaveBeenCalled()
    })

    it('contains throwing and revoked property sources', () => {
        const convert = vi.fn(() => 'SECRET')
        const throwing = new Proxy({ toString: convert }, {
            getOwnPropertyDescriptor: () => {
                throw new Error('SECRET')
            },
        })
        const revocable = Proxy.revocable({ value: 'SECRET' }, {})
        revocable.revoke()

        expect(() => ownDataProperty(throwing, 'value')).not.toThrow()
        expect(ownDataProperty(throwing, 'value')).toEqual({ kind: 'invalid' })
        expect(() => ownDataProperty(revocable.proxy, 'value')).not.toThrow()
        expect(ownDataProperty(revocable.proxy, 'value')).toEqual({ kind: 'invalid' })
        expect(convert).not.toHaveBeenCalled()
    })

    it('rejects arrays and scalars without conversion', () => {
        const convert = vi.fn(() => {
            throw new Error('SECRET')
        })
        const values: unknown[] = [
            Object.assign([], { toString: convert }),
            null,
            'value',
            1,
            Object.assign(() => undefined, { toString: convert }),
            Symbol('value'),
        ]

        for (const value of values) {
            expect(ownDataProperty(value, 'value')).toEqual({ kind: 'invalid' })
        }
        expect(convert).not.toHaveBeenCalled()
    })

    it('accepts PropertyKey symbols without reading values', () => {
        const dataKey = Symbol('data')
        const accessorKey = Symbol('accessor')
        const getter = vi.fn(() => 'SECRET')
        const value = {}
        Object.defineProperty(value, dataKey, {
            value: 'keep',
            enumerable: true,
        })
        Object.defineProperty(value, accessorKey, {
            get: getter,
            enumerable: true,
        })

        expect(ownDataProperty(value, dataKey)).toEqual({
            kind: 'value',
            value: 'keep',
        })
        expect(ownDataProperty(value, accessorKey)).toEqual({ kind: 'invalid' })
        expect(getter).not.toHaveBeenCalled()
    })
})
