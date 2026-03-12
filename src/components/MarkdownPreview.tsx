import type { ReactNode } from 'react'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function renderInlineMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-cyan-200">$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="text-cyan-300 underline decoration-cyan-300/40 underline-offset-4" href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
  }

export function renderMarkdown(content: string) {
  const codeBlocks: string[] = []

  let html = escapeHtml(content).replace(/```([\s\S]*?)```/g, (_, block: string) => {
    const index = codeBlocks.length
    codeBlocks.push(
      `<pre class="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-4 text-sm text-slate-200"><code>${block.trim()}</code></pre>`,
    )
    return `__CODE_BLOCK_${index}__`
  })

  const lines = html.split('\n')
  const chunks: string[] = []
  let listItems: string[] = []
  let paragraphLines: string[] = []

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return
    }

    chunks.push(`<p class="text-base leading-8 text-slate-200">${renderInlineMarkdown(paragraphLines.join(' '))}</p>`)
    paragraphLines = []
  }

  const flushList = () => {
    if (!listItems.length) {
      return
    }

    chunks.push(`<ul class="ml-6 list-disc space-y-2 text-slate-200">${listItems.join('')}</ul>`)
    listItems = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    if (/^__CODE_BLOCK_\d+__$/.test(trimmed)) {
      flushParagraph()
      flushList()
      chunks.push(trimmed)
      return
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      const className =
        level === 1
          ? 'mt-6 font-serif text-4xl text-white'
          : level === 2
            ? 'mt-6 font-serif text-3xl text-white'
            : 'mt-5 text-xl font-semibold text-white'

      chunks.push(`<${tag} class="${className}">${renderInlineMarkdown(headingMatch[2])}</${tag}>`)
      return
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      listItems.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`)
      return
    }

    paragraphLines.push(trimmed)
  })

  flushParagraph()
  flushList()

  html = chunks.join('').replace(/__CODE_BLOCK_(\d+)__/g, (_, index: string) => codeBlocks[Number(index)] ?? '')

  return html
}

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{
        __html: renderMarkdown(content),
      }}
    />
  )
}

export function PreviewModal({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-surface-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview</p>
            <h3 className="mt-1 font-serif text-2xl text-white">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
