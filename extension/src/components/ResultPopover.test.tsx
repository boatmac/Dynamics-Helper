import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PrefsLanguageProvider } from '../utils/i18n'
import { getStorageSnapshot, installChromeMock, resetChromeMock } from '../test/chromeMock'
import { handleAnalyzeForward } from '../background/analyzeBridge'
import { useAnalysisHydration } from '../hooks/useAnalysisHydration'
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
        { status: 'success', prefix: '> **Attachment status:** ', displayPrefix: 'Attachment status: ' },
        { status: 'error', prefix: '> **Attachment status:** ', displayPrefix: 'Attachment status: ' },
        { status: 'success', prefix: '> **附件状态：** ', displayPrefix: '附件状态： ' },
        { status: 'error', prefix: '> **附件状态：** ', displayPrefix: '附件状态： ' },
    ] as const)('attachment notice formats the fixed $displayPrefix heading after persisted $status hydration', async ({ status, prefix, displayPrefix }) => {
        const caseNumber = '1234567890123456'
        const bodyText = 'Included: 1; skipped: 0. **literal** <b>safe product text</b> [link](https://example.test) ![image](https://example.test/image.png)'
        const notice = prefix + bodyText
        const displayNotice = displayPrefix + bodyText
        await handleAnalyzeForward({
            action: 'analyze_error', requestId: 'notice-request',
            payload: { text: 'fixture', context: 'fixture', timestamp: 'fixture', rootPath: '' },
        }, { caseNumber, requestId: 'notice-request', successTitle: 'Result', errorTitle: 'Failed' }, {
            send: async () => ({ status: 'success', data: status === 'success'
                ? { status, data: { markdown: '# Report', attachment_notice: notice } }
                : { status, error: 'SAFE HOST FALLBACK', error_code: 'repository_instructions_missing', attachment_notice: notice },
            }),
        })
        expect(getStorageSnapshot().dh_last_analysis).toMatchObject({ attachmentNotice: notice })
        function HydratedResult() {
            const { popover } = useAnalysisHydration(caseNumber)
            return popover ? <ResultPopover {...popover} isAnalyze onClose={() => undefined} /> : null
        }
        const view = render(<PrefsLanguageProvider language="en"><HydratedResult /></PrefsLanguageProvider>)
        const alert = await screen.findByRole('alert')
        expect(alert.textContent).toBe(displayNotice)
        expect(alert.querySelector('strong, b, a, img, blockquote')).toBeNull()
        const body = status === 'success'
            ? screen.getByRole('heading', { name: 'Report' })
            : screen.getByText(/Repository Instructions are missing/i)
        expect(alert.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
        expect(screen.queryByText('SAFE HOST FALLBACK')).toBeNull()
        view.rerender(<PrefsLanguageProvider language="zh"><HydratedResult /></PrefsLanguageProvider>)
        expect(screen.getByRole('alert').textContent).toBe(displayNotice)
        if (status === 'error') expect(screen.getByText(/仓库指令缺失/)).toBeInTheDocument()
        expect(getStorageSnapshot().dh_last_analysis).toMatchObject({ attachmentNotice: notice })
    })

    it.each([
        '**Attachments omitted** <b>safe product text</b>',
        '> **Attachment Status:** Unchanged capitalization.',
        ' > **Attachment status:** Leading whitespace stays.',
        '> **Attachment status:**No separator.',
        'Prefix\n> **Attachment status:** Not at the start.',
        '> **Unknown heading:** Keep **body** and > characters.',
    ])('attachment notice leaves unknown or near-match formatting inert %#', notice => {
        renderPopover({ attachmentNotice: notice })
        const alert = screen.getByRole('alert')
        expect(alert.textContent).toBe(notice)
        expect(alert.querySelector('strong, b, a, img, blockquote')).toBeNull()
    })

    it.each([undefined, '', ' \n ', [], {}, 'x'.repeat(2049)])('attachment notice ignores malformed display value %#', attachmentNotice => {
        renderPopover({ attachmentNotice: attachmentNotice as string })
        expect(screen.queryByRole('alert')).toBeNull()
        expect(screen.getByText('SAFE HOST FALLBACK')).toBeInTheDocument()
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
