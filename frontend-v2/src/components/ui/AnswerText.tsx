import { useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

/*
  Renders a legal answer as an annotated manuscript.

  Our answers follow the BLUF structure (bold section headers):
    **الإجابة المختصرة**  → opening rubric
    **السند القانوني**    → the main text (المتن): verbatim statute
    **الشرح والتطبيق**    → the commentary, set as marginalia (الحاشية)
    **الخلاصة**           → closing note

  We parse those sections and lay the السند out as the authoritative main
  column with الشرح as margin notes tied by a rubric mark. While an answer is
  still streaming (or if it doesn't parse into sections), we fall back to a
  clean flowing render so text never jumps around mid-arrival.
*/

type Zone = 'summary' | 'main' | 'margin' | 'closing' | 'body'

interface Section {
  zone: Zone
  heading: string
  body: string
}

function classify(heading: string): Zone {
  const h = heading
  if (h.includes('المختصر')) return 'summary'
  if (h.includes('الخلاص')) return 'closing'
  if (h.includes('السند') || h.includes('النص القانوني') || h.includes('المادة')) return 'main'
  if (
    h.includes('الشرح') ||
    h.includes('التطبيق') ||
    h.includes('ما يحق') ||
    h.includes('الخطوات') ||
    h.includes('الوضع القانوني')
  )
    return 'margin'
  return 'body'
}

// A line counts as a section header only when the **entire** line (after
// trimming, and an optional trailing colon) is the bold span — e.g.
// "**الشرح والتطبيق**". A numbered/bulleted list item that merely *starts*
// with a bold sub-label, like "1. **العقوبة المقررة:** نص هنا...", must NOT
// split here — that bold text is inline emphasis inside one list item, not a
// new top-level section. Splitting on it would shred a single numbered list
// into many fake sections, scattering its items across different zones with
// inconsistent styling (the bug this line-based check fixes).
const HEADING_LINE = /^\s*\*\*(.+?)\*\*:?\s*$/

function parseSections(md: string): Section[] {
  const lines = md.split(/\r?\n/)
  const sections: Section[] = []
  let heading = ''
  let body: string[] = []

  const flush = () => {
    const text = body.join('\n').trim()
    if (heading || text) sections.push({ zone: classify(heading), heading, body: text })
    body = []
  }

  for (const line of lines) {
    const match = line.match(HEADING_LINE)
    if (match) {
      flush()
      heading = match[1].trim().replace(/:$/, '')
    } else {
      body.push(line)
    }
  }
  flush()

  return sections
}

// ── Markdown body renderers ────────────────────────────────────

// react-markdown renders bare <table>/<th>/<td> with no color of their own,
// so they'd otherwise inherit the page's default body color (the ivory tone
// meant for the dark field) — invisible on these light paper leaves. Every
// renderer below spreads this in so any answer with a table stays legible.
const tableComponents = {
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-[4px] border border-paper-edge">
      <table className="w-full border-collapse text-start">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => (
    <thead className="bg-paper-deep/70">{children}</thead>
  ),
  tr: ({ children }: { children?: ReactNode }) => (
    <tr className="border-b border-paper-edge last:border-0">{children}</tr>
  ),
  th: ({ children }: { children?: ReactNode }) => (
    <th className="p-2.5 text-start font-naskh text-sm font-bold text-ink">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="p-2.5 align-top font-naskh text-sm text-ink">{children}</td>
  ),
}

function MainMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks]}
      components={{
        p: ({ children }) => {
          const t = flatten(children).trim()
          if (/^\s*["«“”]/.test(t)) {
            // Verbatim statute — the manuscript's main text.
            return (
              <p className="my-3 border-e-2 border-green-600 bg-paper-deep/40 py-3 pe-4 ps-4 font-naskh text-[19px] leading-[2.15] text-ink">
                {children}
              </p>
            )
          }
          return <p className="mb-2 font-naskh text-[17px] leading-[2] text-ink">{children}</p>
        },
        strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-e-2 border-green-600 bg-paper-deep/40 py-3 pe-4 ps-4 font-naskh text-[19px] leading-[2.15] text-ink">
            {children}
          </blockquote>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 me-5 list-disc space-y-1 font-naskh text-[17px] leading-[2] text-ink">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 me-5 list-decimal space-y-1 font-naskh text-[17px] leading-[2] text-ink">{children}</ol>
        ),
        ...tableComponents,
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

function flatten(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(flatten).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return flatten((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

// ── Flowing fallback (used while streaming, or for unstructured answers) ──

function FlowingAnswer({ text }: { text: string }) {
  return (
    <div dir="rtl" className="font-naskh text-[15px] leading-loose text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          strong: ({ children }) => (
            <strong className="mt-5 mb-1 flex items-center gap-2 font-naskh text-base font-bold text-green-700 first:mt-0">
              <span aria-hidden className="text-sm text-rubric-600">
                ❧
              </span>
              {children}
            </strong>
          ),
          p: ({ children }) => {
            const t = flatten(children).trim()
            if (/^\s*["«“”]/.test(t)) {
              return (
                <p className="my-3 border-e-2 border-green-600 bg-paper-deep/40 py-3 pe-4 ps-4 font-naskh text-[17px] leading-[2.1] text-ink">
                  {children}
                </p>
              )
            }
            return <p className="mb-3 last:mb-0">{children}</p>
          },
          ul: ({ children }) => <ul className="mb-3 me-4 list-disc space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 me-4 list-decimal space-y-1">{children}</ol>,
          ...tableComponents,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

// ── The manuscript layout ──────────────────────────────────────

// Every section — الإجابة المختصرة, السند القانوني, الشرح والتطبيق, الخلاصة —
// renders through one identical treatment (rubric heading mark + green Naskh
// title + the same body renderer), in document order. No section gets a
// distinct "marginalia" look, so the whole answer reads as one uniform piece.
function ManuscriptAnswer({ sections }: { sections: Section[] }) {
  return (
    <div dir="rtl" className="animate-rise text-ink">
      {sections.map((section, i) => (
        <section key={i} className="mb-6 last:mb-0">
          {section.heading && (
            <h4 className="mb-2.5 flex items-center gap-2 font-naskh text-base font-bold text-green-700">
              <span aria-hidden className="text-rubric-600">
                ❧
              </span>
              {section.heading}
            </h4>
          )}
          <MainMarkdown text={section.body} />
        </section>
      ))}
    </div>
  )
}

export default function AnswerText({
  children,
  streaming = false,
}: {
  children: string
  streaming?: boolean
}) {
  const sections = useMemo(() => parseSections(children), [children])
  const worthy =
    !streaming &&
    sections.length >= 2 &&
    sections.some((s) => s.zone === 'summary' || s.zone === 'main')

  if (!worthy) return <FlowingAnswer text={children} />
  return <ManuscriptAnswer sections={sections} />
}
