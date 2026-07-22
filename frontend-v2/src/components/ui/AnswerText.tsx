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

function parseSections(md: string): Section[] {
  // Split on **bold** headers; odd indices are the heading captures.
  const parts = md.split(/\*\*(.+?)\*\*/g)
  const sections: Section[] = []
  const preamble = parts[0]?.trim()
  if (preamble) sections.push({ zone: 'body', heading: '', body: preamble })
  for (let i = 1; i < parts.length; i += 2) {
    const heading = (parts[i] ?? '').trim()
    const body = (parts[i + 1] ?? '').trim()
    if (heading || body) sections.push({ zone: classify(heading), heading, body })
  }
  return sections
}

// ── Markdown body renderers ────────────────────────────────────

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
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

function MarginMarkdown({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkBreaks]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-[1.9]">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
        ul: ({ children }) => <ul className="mb-2 me-4 list-disc space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 me-4 list-decimal space-y-1">{children}</ol>,
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
    <div dir="rtl" className="text-[15px] leading-loose text-ink">
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
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

// ── The manuscript layout ──────────────────────────────────────

function ManuscriptAnswer({ sections }: { sections: Section[] }) {
  const summary = sections.find((s) => s.zone === 'summary')
  const mains = sections.filter((s) => s.zone === 'main' || s.zone === 'body')
  const margins = sections.filter((s) => s.zone === 'margin')
  const closing = sections.find((s) => s.zone === 'closing')

  return (
    <div dir="rtl" className="animate-rise">
      {/* Opening rubric (سرلوح) */}
      {summary && (
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="text-rubric-600">
              ❧
            </span>
            <span className="font-naskh text-sm font-bold tracking-wide text-green-700">
              الإجابة المختصرة
            </span>
          </div>
          <p className="font-naskh text-xl leading-[2.1] text-ink">{summary.body}</p>
          <span className="animate-draw mt-4 block h-px origin-right bg-gradient-to-l from-gold-500/60 to-transparent" />
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_15rem] lg:gap-7">
        {/* المتن — main text */}
        <div className="min-w-0">
          {mains.map((section, i) => (
            <section key={i} className="mb-5 last:mb-0">
              {section.heading && (
                <h4 className="mb-2 flex items-center gap-2 font-naskh text-sm font-bold text-green-700">
                  <span aria-hidden className="text-rubric-600">
                    ۞
                  </span>
                  {section.heading}
                </h4>
              )}
              <MainMarkdown text={section.body} />
            </section>
          ))}
        </div>

        {/* الحاشية — marginalia */}
        {margins.length > 0 && (
          <aside className="mt-7 border-t border-paper-edge pt-5 lg:mt-0 lg:border-t-0 lg:border-s lg:border-paper-edge lg:pt-0 lg:ps-6">
            <div className="mb-3 flex items-center gap-2">
              <span aria-hidden className="text-rubric-600">
                ۞
              </span>
              <span className="font-naskh text-xs font-bold tracking-widest text-ink-soft">
                حاشيةٌ وتطبيق
              </span>
            </div>
            <div className="space-y-4 text-[13px] text-ink-soft">
              {margins.map((section, i) => (
                <div key={i} className="animate-rise" style={{ animationDelay: `${120 + i * 90}ms` }}>
                  {section.heading && (
                    <p className="mb-1 font-naskh text-sm font-bold text-ink">{section.heading}</p>
                  )}
                  <MarginMarkdown text={section.body} />
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Closing note */}
      {closing && (
        <div className="mt-6 border-t border-paper-edge pt-4">
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden className="text-rubric-600">
              ❧
            </span>
            <span className="font-naskh text-sm font-bold text-green-700">الخلاصة</span>
          </div>
          <div className="text-sm leading-relaxed text-ink-soft">
            <MarginMarkdown text={closing.body} />
          </div>
        </div>
      )}
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
