import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

const mdComponents = {
    h1: ({ node, ...props }: any) => (
        <h1 style={{ fontSize: '1.5em', fontWeight: '700', margin: '0.67em 0', color: '#0F172A' }} {...props} />
    ),
    h2: ({ node, ...props }: any) => (
        <h2 style={{ fontSize: '1.25em', fontWeight: '600', margin: '0.5em 0', color: '#1E293B' }} {...props} />
    ),
    h3: ({ node, ...props }: any) => (
        <h3 style={{ fontSize: '1.1em', fontWeight: '600', margin: '0.5em 0', color: '#334155' }} {...props} />
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
        return !inline ? (
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', overflowX: 'auto', margin: '12px 0' }}>
                <code style={{ fontFamily: 'monospace', fontSize: '13px' }} {...props}>
                    {children}
                </code>
            </div>
        ) : (
            <code style={{ background: '#F1F5F9', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }} {...props}>
                {children}
            </code>
        );
    },
    a: ({ node, ...props }: any) => (
        <a style={{ color: '#0D9488', textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer" {...props} />
    ),
    ul: ({ node, ...props }: any) => (
        <ul style={{ paddingLeft: '1.5em', margin: '1em 0' }} {...props} />
    ),
    ol: ({ node, ...props }: any) => (
        <ol style={{ paddingLeft: '1.5em', margin: '1em 0' }} {...props} />
    ),
    li: ({ node, ...props }: any) => (
        <li style={{ marginBottom: '0.5em' }} {...props} />
    ),
    blockquote: ({ node, ...props }: any) => (
        <blockquote style={{ borderLeft: '4px solid #E2E8F0', paddingLeft: '1em', margin: '1em 0', color: '#64748B' }} {...props} />
    ),
    table: ({ node, ...props }: any) => (
        <table style={{ borderCollapse: 'collapse', width: '100%', margin: '1em 0', fontSize: '13px' }} {...props} />
    ),
    th: ({ node, ...props }: any) => (
        <th style={{ border: '1px solid #E2E8F0', padding: '6px 10px', background: '#F8FAFC', fontWeight: '600', textAlign: 'left' }} {...props} />
    ),
    td: ({ node, ...props }: any) => (
        <td style={{ border: '1px solid #E2E8F0', padding: '6px 10px' }} {...props} />
    ),
    p: ({ node, ...props }: any) => (
        <p style={{ margin: '0.75em 0', lineHeight: '1.6' }} {...props} />
    ),
};

export default function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
    if (!content?.trim()) {
        return (
            <div className={className} style={{ color: '#94A3B8', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No content to preview
            </div>
        );
    }

    return (
        <div className={className}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
