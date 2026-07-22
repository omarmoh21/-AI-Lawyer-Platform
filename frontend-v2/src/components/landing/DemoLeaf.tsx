import { useEffect, useRef, useState } from 'react'
import Illumination from '../ui/Illumination'

// A live, interactive illuminated leaf for the hero: pick a legal question and
// the manuscript composes itself — short answer, then the verbatim article as
// the main text (المتن), then the commentary as marginalia (الحاشية). The
// article texts are real, verified passages so the demo doubles as proof.
interface Sample {
  q: string
  law: string
  summary: string
  text: string
  notes: string[]
}

const samples: Sample[] = [
  {
    q: 'عقوبة السرقة البسيطة؟',
    law: 'قانون العقوبات — المادة (٣١٨)',
    summary:
      'السرقة البسيطة عقوبتها الحبس حتى سنتين، وتتصاعد إلى السجن مع الظروف المشددة كالإكراه أو حمل السلاح.',
    text:
      'يعاقب بالحبس مع الشغل مدة لا تتجاوز سنتين على السرقات التي لم يتوفر فيها شيء من الظروف المشددة السابق ذكرها.',
    notes: ['العقوبة المقررة: الحبس مدة لا تجاوز سنتين.', 'ظروف مشددة: الإكراه، حمل السلاح، الليل، التعدد.'],
  },
  {
    q: 'عقوبة القتل العمد مع سبق الإصرار؟',
    law: 'قانون العقوبات — المادة (٢٣٠)',
    summary: 'القتل العمد المقترن بسبق الإصرار أو الترصد عقوبته الإعدام.',
    text: 'كل من قتل نفساً عمداً مع سبق الإصرار على ذلك أو الترصد يعاقب بالإعدام.',
    notes: ['العقوبة المقررة: الإعدام.', 'الركن المشدِّد: سبق الإصرار أو الترصد.'],
  },
  {
    q: 'هل يُعامَل المتهم مذنبًا قبل الحكم؟',
    law: 'الدستور المصري — المادة (٩٦)',
    summary: 'لا؛ الأصل براءة المتهم حتى تثبت إدانته في محاكمة عادلة تُكفل فيها ضمانات الدفاع.',
    text:
      'المتهم بريء حتى تثبت إدانته في محاكمة قانونية عادلة، تكفل له فيها ضمانات الدفاع عن نفسه.',
    notes: ['الأصل: البراءة.', 'الضمانة: محاكمة عادلة وحق الدفاع.'],
  },
]

const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function CornerMark({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute h-2.5 w-2.5 rotate-45 border border-gold-500/70 ${className}`} />
  )
}

export default function DemoLeaf() {
  const [selected, setSelected] = useState(0)
  const [typed, setTyped] = useState('')
  const [step, setStep] = useState(0) // 0 typing · 1 summary · 2 article · 3 notes
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const [autoplay, setAutoplay] = useState(true)
  const timers = useRef<number[]>([])

  const sample = samples[selected]

  useEffect(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setStep(0)
    setTyped('')

    if (prefersReduced()) {
      setTyped(sample.q)
      setStep(3)
      if (autoplay) {
        const cyc = window.setTimeout(() => setSelected((s) => (s + 1) % samples.length), 7000)
        timers.current.push(cyc)
      }
      return () => timers.current.forEach(clearTimeout)
    }

    let i = 0
    const typer = window.setInterval(() => {
      i += 1
      setTyped(sample.q.slice(0, i))
      if (i >= sample.q.length) {
        window.clearInterval(typer)
        timers.current.push(
          window.setTimeout(() => setStep(1), 350),
          window.setTimeout(() => setStep(2), 950),
          window.setTimeout(() => setStep(3), 1650),
        )
        if (autoplay) {
          timers.current.push(
            window.setTimeout(() => setSelected((s) => (s + 1) % samples.length), 6800),
          )
        }
      }
    }, 45)
    timers.current.push(typer)

    return () => {
      window.clearInterval(typer)
      timers.current.forEach(clearTimeout)
    }
  }, [selected, autoplay, sample.q])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced()) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    setTilt({ rx: -py * 4.5, ry: px * 4.5 })
  }

  const pick = (index: number) => {
    setAutoplay(false)
    setSelected(index)
  }

  return (
    <div style={{ perspective: '1200px' }} onMouseMove={onMove} onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}>
      <div className="absolute -inset-2 -z-10 rotate-1 rounded-[6px] border border-paper-edge bg-paper-deep/50" />
      <div
        className="relative overflow-hidden rounded-[6px] border border-paper-edge bg-paper shadow-[0_6px_26px_rgba(31,25,19,0.10)]"
        style={{
          transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 0.2s ease-out',
        }}
      >
        <CornerMark className="right-2 top-2" />
        <CornerMark className="left-2 top-2" />
        <CornerMark className="right-2 bottom-2" />
        <CornerMark className="left-2 bottom-2" />

        {/* Headpiece — the source, changes with the answer */}
        <div className="border-b border-paper-edge bg-paper-deep/40 px-7 py-2.5">
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-6 bg-gradient-to-l from-gold-500/60 to-transparent" />
            <span className="font-naskh text-xs tracking-widest text-green-700">{sample.law}</span>
            <span className="h-px w-6 bg-gradient-to-r from-gold-500/60 to-transparent" />
          </div>
        </div>

        <div className="rule-line min-h-[22rem] px-7 py-6">
          {/* The question being asked */}
          <div className="mb-4 flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-rubric-600">
              ▸
            </span>
            <p className={`font-naskh text-lg leading-relaxed text-ink ${step === 0 ? 'caret' : ''}`}>
              {typed}
            </p>
          </div>

          {/* Short answer */}
          {step >= 1 && (
            <p className="animate-compose font-naskh text-base leading-[2] text-ink-soft">
              {sample.summary}
            </p>
          )}

          {/* Verbatim article — main text */}
          {step >= 2 && (
            <div className="animate-compose mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 font-naskh text-xs font-bold text-green-700">
                <span aria-hidden className="text-rubric-600">
                  ۞
                </span>
                السند القانوني
              </div>
              <p className="border-e-2 border-green-600 bg-paper-deep/40 py-3 pe-4 ps-3 font-naskh text-lg leading-[2.05] text-ink">
                «{sample.text}»
              </p>
            </div>
          )}

          {/* Marginalia */}
          {step >= 3 && (
            <div className="animate-compose mt-4 border-t border-paper-edge pt-3">
              <div className="mb-1.5 font-naskh text-[11px] font-bold tracking-widest text-ink-soft">
                حاشيةٌ وتطبيق
              </div>
              <ul className="space-y-1 text-[13px] text-ink-soft">
                {sample.notes.map((note) => (
                  <li key={note} className="flex gap-1.5">
                    <span aria-hidden className="text-gold-500">
                      ◆
                    </span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step >= 3 && <Illumination className="mt-5" />}
        </div>

        {/* Question chips */}
        <div className="flex flex-wrap gap-2 border-t border-paper-edge bg-paper-deep/20 px-7 py-3">
          {samples.map((s, i) => (
            <button
              key={s.q}
              type="button"
              onClick={() => pick(i)}
              className={`rounded-[4px] border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                i === selected
                  ? 'border-green-600 bg-green-600 text-paper'
                  : 'border-paper-edge bg-paper text-ink-soft hover:border-green-300 hover:text-green-700'
              }`}
            >
              {s.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
