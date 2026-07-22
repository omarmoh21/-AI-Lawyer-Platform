import { useEffect, useMemo, useState } from 'react'
import Illumination from '../ui/Illumination'

// An interactive illuminated leaf: a single constitutional maxim where hovering
// a word magnifies it (a reading lens), and the key legal terms reveal their
// meaning in a margin gloss (حاشية) strip below — like examining a real
// annotated manuscript.
interface Token {
  w: string
  lead?: boolean // part of the rubricated opening
  gloss?: string // marginal explanation for a key legal term
}

const source = 'دستور جمهورية مصر العربية'
const cite = 'المادة (٩٦) — أصلٌ من أصول العدالة الجنائية'

const tokens: Token[] = [
  { w: 'المتهمُ', lead: true },
  { w: 'بريءٌ', lead: true, gloss: 'الأصل أنّ الإنسان غير مذنبٍ حتى يُقضى بإدانته.' },
  { w: 'حتى' },
  { w: 'تثبتَ' },
  { w: 'إدانتُه', gloss: 'لا تثبت الإدانة إلا بحكمٍ قضائيٍّ باتٍّ.' },
  { w: 'في' },
  { w: 'محاكمةٍ' },
  { w: 'قانونيةٍ' },
  { w: 'عادلةٍ،', gloss: 'محاكمةٌ تكفل الحياد وتكافؤ الفرص بين الخصوم.' },
  { w: 'تُكفَل' },
  { w: 'له' },
  { w: 'فيها' },
  { w: 'ضماناتُ', gloss: 'كالعلم بالتهمة، والاستعانة بمحامٍ، ومناقشة الأدلة.' },
  { w: 'الدفاع' },
  { w: 'عن' },
  { w: 'نفسه.' },
]

function CornerMark({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute h-2.5 w-2.5 rotate-45 border border-gold-500/70 ${className}`} />
  )
}

export default function QuoteLeaf() {
  const [gloss, setGloss] = useState<string | null>(null)
  const [typed, setTyped] = useState(0)

  // Character offset of each token + total length, for letter-by-letter typing.
  const { offsets, totalChars } = useMemo(() => {
    let acc = 0
    const offs = tokens.map((t) => {
      const o = acc
      acc += t.w.length
      return o
    })
    return { offsets: offs, totalChars: acc }
  }, [])

  // Write the quote letter by letter on load, like a scribe penning it.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTyped(totalChars)
      return
    }
    const id = window.setInterval(() => {
      setTyped((n) => {
        if (n >= totalChars) {
          window.clearInterval(id)
          return n
        }
        return n + 1
      })
    }, 40)
    return () => window.clearInterval(id)
  }, [totalChars])

  const done = typed >= totalChars

  return (
    <div className="relative">
      <div className="absolute -inset-2 -z-10 rotate-1 rounded-[6px] border border-paper-edge bg-paper-deep/50" />
      <div className="relative overflow-hidden rounded-[6px] border border-paper-edge bg-paper shadow-[0_4px_20px_rgba(31,25,19,0.08)]">
        <CornerMark className="right-2 top-2" />
        <CornerMark className="left-2 top-2" />
        <CornerMark className="right-2 bottom-2" />
        <CornerMark className="left-2 bottom-2" />

        <div className="border-b border-paper-edge bg-paper-deep/40 px-8 py-3">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-gradient-to-l from-gold-500/60 to-transparent" />
            <span className="font-naskh text-xs tracking-widest text-green-700">{source}</span>
            <span className="h-px w-8 bg-gradient-to-r from-gold-500/60 to-transparent" />
          </div>
        </div>

        <div className="rule-line px-8 py-9">
          <blockquote className="flex flex-wrap gap-x-2.5 gap-y-1 font-naskh text-3xl leading-[2] text-ink">
            {tokens.map((t, i) => {
              const shown = Math.max(0, Math.min(typed - offsets[i], t.w.length))
              if (shown === 0) return null // this word hasn't started typing yet
              const typing = typed < offsets[i] + t.w.length
              return (
                <span
                  key={i}
                  tabIndex={done && t.gloss ? 0 : undefined}
                  onMouseEnter={() => done && t.gloss && setGloss(t.gloss)}
                  onMouseLeave={() => t.gloss && setGloss(null)}
                  onFocus={() => done && t.gloss && setGloss(t.gloss)}
                  onBlur={() => t.gloss && setGloss(null)}
                  className={`inline-block origin-center cursor-default outline-none transition-transform duration-150 ease-out hover:z-10 hover:scale-[1.28] focus-visible:scale-[1.28] ${
                    t.lead ? 'text-rubric-600' : 'hover:text-green-700'
                  } ${
                    done && t.gloss
                      ? 'underline decoration-gold-500/50 decoration-dotted underline-offset-8'
                      : ''
                  } ${typing ? 'caret' : ''}`}
                >
                  {t.w.slice(0, shown)}
                </span>
              )
            })}
          </blockquote>

          <div className={`transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0'}`}>
            <Illumination className="mt-7" />
          </div>

          {/* Margin gloss (حاشية) — reveals the meaning of the hovered term */}
          <div
            className={`mt-4 flex min-h-[2.75rem] items-start gap-2 border-t border-paper-edge pt-3 transition-opacity duration-700 ${
              done ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span aria-hidden className={`mt-0.5 text-sm ${gloss ? 'text-rubric-600' : 'text-ink-faint'}`}>
              ۞
            </span>
            <p className="text-xs leading-relaxed text-ink-soft">
              {gloss ?? (
                <span className="text-ink-faint">
                  مرِّر المؤشر على الكلمات المُعلَّمة بالذهبي لتقرأ حاشيتها ومعناها.
                </span>
              )}
            </p>
          </div>
        </div>

        <figcaption className="border-t border-paper-edge bg-paper-deep/20 py-2.5 text-center text-xs text-ink-faint">
          {cite}
        </figcaption>
      </div>
    </div>
  )
}
