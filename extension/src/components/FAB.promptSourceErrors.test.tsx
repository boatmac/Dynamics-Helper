import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
    installChromeMock,
    resetChromeMock,
    seedStorage,
} from '../test/chromeMock'
import { PrefsLanguageProvider } from '../utils/i18n'

vi.mock('../utils/telemetry', () => ({
    trackEvent: vi.fn(),
    trackException: vi.fn(),
    hashCaseId: vi.fn().mockResolvedValue('hash'),
}))

vi.mock('../utils/prefs', () => {
    const prefs = {
        buttonText: 'DH',
        primaryColor: '#0D9488',
        offsetBottom: 24,
        offsetRight: 24,
        userPrompt: '',
        rootPath: '',
        autoAnalyzeMode: 'disabled',
        enableStatusBubble: true,
        language: 'en',
        analyzeTimeoutSeconds: 1200,
    }
    return {
        usePrefs: () => ({ prefs }),
        mergeRootPathOverride: (value: typeof prefs, override: string | null) =>
            override === null ? value : { ...value, rootPath: override },
    }
})

vi.mock('../utils/pageReader', () => ({
    PageReader: {
        scanForErrors: vi.fn().mockResolvedValue({
            caseNumber: '1234567890123456',
            ticketTitle: 'fixture',
        }),
    },
}))

const hydrationDismiss = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../hooks/useAnalysisHydration', () => {
    const hydration = {
        popover: {
            isOpen: true as const,
            status: 'error' as const,
            title: 'Analysis Failed',
            content: 'HYDRATED HOST FALLBACK',
            errorCode: 'repository_instructions_missing',
            identity: {
                requestId: 'req-hydrated',
                caseNumber: '1234567890123456',
                timestamp: 123,
            },
        },
        isAnalyzing: false,
        dismissPopover: hydrationDismiss,
    }
    return { useAnalysisHydration: () => hydration }
})

vi.mock('./MenuLogic', () => ({
    useMenuLogic: () => ({
        currentItems: [],
        canGoBack: false,
        navigateTo: vi.fn(),
        navigateBack: vi.fn(),
    }),
    resolveDynamicUrl: (value: string) => value,
}))

import FAB, { ResultPopover } from './FAB'

describe('FAB prompt-source error display', () => {
    beforeEach(() => {
        resetChromeMock()
        installChromeMock()
        seedStorage({ dh_prefs: { language: 'en' } })
        hydrationDismiss.mockClear()
    })

    it('UI-I6: known code localizes immediate fallback in the current language', () => {
        const props = {
            isOpen: true,
            onClose: () => undefined,
            title: 'Analysis Failed',
            content: 'HOST FALLBACK',
            errorCode: 'repository_instructions_missing',
        }
        const { rerender } = render(
            <PrefsLanguageProvider language="en">
                <ResultPopover {...props} />
            </PrefsLanguageProvider>,
        )

        expect(screen.queryByText('HOST FALLBACK')).toBeNull()
        expect(screen.getByText(/Repository Instructions are missing/i)).toBeTruthy()

        rerender(
            <PrefsLanguageProvider language="zh">
                <ResultPopover {...props} />
            </PrefsLanguageProvider>,
        )
        expect(screen.queryByText(/Repository Instructions are missing/i)).toBeNull()
        expect(screen.getByText(/仓库指令缺失/)).toBeTruthy()
    })

    it('UI-I6: unknown code displays the raw safe fallback', () => {
        render(
            <PrefsLanguageProvider language="en">
                <ResultPopover
                    isOpen
                    onClose={() => undefined}
                    title="Analysis Failed"
                    content="HOST FALLBACK"
                    errorCode="future_code"
                />
            </PrefsLanguageProvider>,
        )

        expect(screen.getByText('HOST FALLBACK')).toBeTruthy()
    })

    it('UI-I6: full FAB copies hydrated errorCode into localized popover state', async () => {
        render(
            <PrefsLanguageProvider language="en">
                <FAB />
            </PrefsLanguageProvider>,
        )

        expect(await screen.findByText(
            /Repository Instructions are missing/i,
        )).toBeTruthy()
        expect(screen.queryByText('HYDRATED HOST FALLBACK')).toBeNull()
        expect(hydrationDismiss).toHaveBeenCalledWith({
            requestId: 'req-hydrated',
            caseNumber: '1234567890123456',
            timestamp: 123,
        })
    })
})
