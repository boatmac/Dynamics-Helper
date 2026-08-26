import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrefsLanguageProvider } from '../utils/i18n'
import { installChromeMock, resetChromeMock } from '../test/chromeMock'
import { ResultPopover } from './ResultPopover'

installChromeMock()

function renderPopover(
    props: Partial<React.ComponentProps<typeof ResultPopover>> = {},
    language: 'en' | 'zh' = 'en',
) {
    return render(
        <PrefsLanguageProvider language={language}>
            <ResultPopover
                isOpen
                onClose={() => undefined}
                title="Analysis Failed"
                content="SAFE HOST FALLBACK"
                {...props}
            />
        </PrefsLanguageProvider>,
    )
}

describe('ResultPopover', () => {
    beforeEach(() => {
        resetChromeMock()
    })

    it.each([
        [
            'malformed_native_response',
            'The Native Host returned a malformed Analyze response.',
            '本机宿主返回了格式错误的分析响应。',
        ],
        [
            'invalid_analyze_persistence_context',
            'Analyze could not start because its persistence context was invalid.',
            '由于分析持久化上下文无效，无法开始分析。',
        ],
        [
            'analysis_persistence_start_failed',
            'Analyze could not start because local recovery state could not be saved.',
            '由于无法保存本地恢复状态，无法开始分析。',
        ],
    ])('localizes Analyze boundary code %s in English and Chinese', (
        errorCode,
        english,
        chinese,
    ) => {
        const props = { errorCode, isAnalyze: true }
        const { rerender } = render(
            <PrefsLanguageProvider language="en">
                <ResultPopover
                    isOpen
                    onClose={() => undefined}
                    content="SAFE HOST FALLBACK"
                    {...props}
                />
            </PrefsLanguageProvider>,
        )
        expect(screen.getByText(english)).toBeInTheDocument()
        expect(screen.queryByText('SAFE HOST FALLBACK')).toBeNull()

        rerender(
            <PrefsLanguageProvider language="zh">
                <ResultPopover
                    isOpen
                    onClose={() => undefined}
                    content="SAFE HOST FALLBACK"
                    {...props}
                />
            </PrefsLanguageProvider>,
        )
        expect(screen.getByText(chinese)).toBeInTheDocument()
        expect(screen.queryByText(english)).toBeNull()
    })

    it('keeps an unknown Analyze code on its safe fallback', () => {
        renderPopover({ errorCode: 'future_code', isAnalyze: true })
        expect(screen.getByText('SAFE HOST FALLBACK')).toBeInTheDocument()
    })

    it('renders a durability warning separately from the Host outcome', () => {
        renderPopover({
            title: 'Analyze result',
            content: '# Report',
            isAnalyze: true,
            durabilityWarning: 'Analysis completed, but result recovery is unavailable.',
        })
        expect(screen.getByText('Report')).toBeInTheDocument()
        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent(
            'Analysis completed, but result recovery is unavailable.',
        )
        expect(alert).not.toHaveTextContent('# Report')
    })

    it('renders duration zero and a saved path', () => {
        renderPopover({
            content: 'Report',
            duration: '0.0s',
            filePath: 'report.md',
        })
        expect(screen.getByText('0.0s')).toBeInTheDocument()
        expect(screen.getByText('report.md')).toBeInTheDocument()
    })

    it('renders a bookmark note without Analyze localization', () => {
        renderPopover({
            title: 'Runbook note',
            content: 'Bookmark **body**',
            errorCode: 'malformed_native_response',
            isAnalyze: false,
        })
        expect(screen.getByText('Runbook note')).toBeInTheDocument()
        expect(screen.getByText('body')).toBeInTheDocument()
        expect(screen.queryByText(
            'The Native Host returned a malformed Analyze response.',
        )).toBeNull()
    })
})
