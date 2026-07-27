import React, { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Activity, Folder, X } from 'lucide-react'
import { useTranslation } from '../utils/i18n'
import {
    localizeAnalyzeError,
    localizePromptSourceError,
} from '../utils/promptSourceErrors'

export interface ResultPopoverProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    content: string
    errorCode?: string
    filePath?: string
    duration?: string
    isAnalyze?: boolean
    durabilityWarning?: string
}

export const ResultPopover: React.FC<ResultPopoverProps> = ({
    isOpen,
    onClose,
    title,
    content,
    errorCode,
    filePath,
    duration,
    isAnalyze = false,
    durabilityWarning,
}) => {
    const { t } = useTranslation()
    const displayContent = isAnalyze
        ? localizeAnalyzeError(errorCode, content, t)
        : localizePromptSourceError(errorCode, content, t)
    const [position, setPosition] = useState({
        x: Math.max(0, window.innerWidth - 550),
        y: 100,
    })
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return
            setPosition({
                x: event.clientX - dragOffset.x,
                y: event.clientY - dragOffset.y,
            })
        }
        const handleMouseUp = () => setIsDragging(false)
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    const handleMouseDown = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement
        if (target.tagName === 'BUTTON' || target.closest('button')) return
        setIsDragging(true)
        setDragOffset({
            x: event.clientX - position.x,
            y: event.clientY - position.y,
        })
    }

    if (!isOpen) return null

    return (
        <div style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '450px',
            height: '600px',
            minWidth: '320px',
            minHeight: '200px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2147483647,
            pointerEvents: 'auto',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            resize: 'both',
            overflow: 'hidden',
        }}>
            <div
                onMouseDown={handleMouseDown}
                style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#F8FAFC',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none',
                }}
            >
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {title || `🤖 Copilot ${t('analyze')}`}
                </h3>
                <button
                    onClick={onClose}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#64748B',
                        padding: '4px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title={t('close')}
                    onMouseEnter={event => {
                        event.currentTarget.style.backgroundColor = '#E2E8F0'
                    }}
                    onMouseLeave={event => {
                        event.currentTarget.style.backgroundColor = 'transparent'
                    }}
                >
                    <X size={18} />
                </button>
            </div>
            <div style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#334155',
            }}>
                {displayContent ? (
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            h1: ({ node, ...props }) => <h1 style={{ fontSize: '1.5em', fontWeight: '700', margin: '0.67em 0', color: '#0F172A' }} {...props} />,
                            h2: ({ node, ...props }) => <h2 style={{ fontSize: '1.25em', fontWeight: '600', margin: '0.5em 0', color: '#1E293B' }} {...props} />,
                            h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1em', fontWeight: '600', margin: '0.5em 0', color: '#334155' }} {...props} />,
                            code: ({ node, inline, className, children, ...props }: any) => {
                                const match = /language-(\w+)/.exec(className || '')
                                void match
                                return !inline ? (
                                    <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', overflowX: 'auto', margin: '12px 0' }}>
                                        <code style={{ fontFamily: 'monospace', fontSize: '13px' }} {...props}>{children}</code>
                                    </div>
                                ) : (
                                    <code style={{ background: '#F1F5F9', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }} {...props}>{children}</code>
                                )
                            },
                            a: ({ node, ...props }) => <a style={{ color: '#0D9488', textDecoration: 'underline' }} {...props} />,
                            ul: ({ node, ...props }) => <ul style={{ paddingLeft: '1.5em', margin: '1em 0' }} {...props} />,
                            li: ({ node, ...props }) => <li style={{ marginBottom: '0.5em' }} {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote style={{ borderLeft: '4px solid #E2E8F0', paddingLeft: '1em', margin: '1em 0', color: '#64748B' }} {...props} />,
                        }}
                    >
                        {displayContent}
                    </ReactMarkdown>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94A3B8' }}>
                        <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p>{t('noContent')}</p>
                    </div>
                )}
                {durabilityWarning && (
                    <div
                        role="alert"
                        style={{
                            marginTop: '16px',
                            padding: '12px',
                            color: '#92400E',
                            backgroundColor: '#FFFBEB',
                            border: '1px solid #FDE68A',
                            borderRadius: '8px',
                        }}
                    >
                        {durabilityWarning}
                    </div>
                )}
            </div>
            {(filePath || duration) && (
                <div style={{
                    padding: '12px 20px',
                    background: '#F8FAFC',
                    borderTop: '1px solid #F1F5F9',
                    fontSize: '12px',
                    color: '#64748B',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                }}>
                    {duration && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Activity size={12} />
                            <span>{t('analysisTook')}: <b>{duration}</b></span>
                        </div>
                    )}
                    {filePath && (
                        <div>
                            <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Folder size={12} /> {t('savedReport')}:
                            </div>
                            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', background: '#FFFFFF', padding: '6px 8px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                {filePath}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
