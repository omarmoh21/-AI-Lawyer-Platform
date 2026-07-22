import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Baby,
  Briefcase,
  Building2,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Coins,
  FileSignature,
  FileWarning,
  Gavel,
  HandCoins,
  HeartCrack,
  Home,
  LandPlot,
  Landmark,
  type LucideIcon,
  MessageSquareWarning,
  MessagesSquare,
  PackageSearch,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stamp,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Illumination from '../components/ui/Illumination'
import { categories, guides, type Guide } from '../data/guides'

// Icons are presentation-only, keyed by the guide's `icon` string.
const ICONS: Record<string, LucideIcon> = {
  Scale,
  Briefcase,
  HeartCrack,
  Building2,
  Gavel,
  FileWarning,
  FileSignature,
  HandCoins,
  Users,
  ShieldCheck,
  Baby,
  Home,
  Car,
  Landmark,
  Unlock,
  Stamp,
  ShieldAlert,
  Wallet,
  Siren,
  MessageSquareWarning,
  BadgeDollarSign,
  LandPlot,
  PackageSearch,
  ClipboardCheck,
}

function iconFor(name: string): LucideIcon {
  return ICONS[name] ?? Scale
}

export default function Guides() {
  const [selected, setSelected] = useState<Guide | null>(null)
  const [category, setCategory] = useState<string>('الكل')
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim()
    return guides.filter((g) => {
      const matchesCat = category === 'الكل' || g.category === category
      const matchesText =
        !q || g.title.includes(q) || g.summary.includes(q) || g.category.includes(q)
      return matchesCat && matchesText
    })
  }, [category, query])

  return (
    <AppShell
      title="دليل الإجراءات"
      description="أدلّة عملية خطوة بخطوة لأكثر الإجراءات القانونية شيوعًا في مصر"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        {!selected ? (
          <>
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {['الكل', ...categories].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-[4px] px-3.5 py-1.5 text-xs font-bold transition-colors ${
                      category === cat
                        ? 'bg-gold-400 text-field-deep'
                        : 'border border-field-edge bg-field-deep/50 text-paper/70 hover:text-paper'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ابحث عن إجراء..."
                className="w-full rounded-[4px] border border-field-edge bg-field-deep/50 px-4 py-2.5 text-sm text-paper outline-none placeholder:text-paper/40 focus:border-gold-400 sm:w-64"
              />
            </div>

            {/* Grid */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((guide) => {
                const Icon = iconFor(guide.icon)
                return (
                  <button key={guide.id} onClick={() => setSelected(guide)} className="group text-start">
                    <Card className="flex h-full flex-col p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_14px_32px_rgba(0,0,0,0.28)]">
                      <div className="flex items-center justify-between">
                        <span className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-gold-500/40 bg-paper-deep text-green-600 transition-colors group-hover:border-gold-500 group-hover:bg-field group-hover:text-paper">
                          <Icon size={20} strokeWidth={1.75} />
                        </span>
                        <span className="rounded-[4px] bg-green-600/10 px-2.5 py-1 text-xs font-semibold text-green-700">
                          {guide.category}
                        </span>
                      </div>
                      <h3 className="mt-4 font-naskh text-lg font-bold text-ink">{guide.title}</h3>
                      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">
                        {guide.summary}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                        {guide.steps.length} خطوات
                        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1" />
                      </span>
                    </Card>
                  </button>
                )
              })}
            </div>

            {filtered.length === 0 && (
              <Card className="mt-6 p-10 text-center text-sm text-ink-faint">
                لا توجد أدلّة مطابقة — جرّب تصنيفًا أو كلمة أخرى.
              </Card>
            )}
          </>
        ) : (
          <GuideDetail guide={selected} onBack={() => setSelected(null)} />
        )}
      </div>
    </AppShell>
  )
}

function MetaItem({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] bg-paper-deep text-green-600">
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-ink-faint">{label}</p>
        <p className="text-sm leading-relaxed text-ink">{value}</p>
      </div>
    </div>
  )
}

function GuideDetail({ guide, onBack }: { guide: Guide; onBack: () => void }) {
  const Icon = iconFor(guide.icon)
  const askHref = `/consultation?q=${encodeURIComponent(`ما هي إجراءات ${guide.title} في القانون المصري؟`)}`

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-paper/75 transition-colors hover:text-gold-300"
      >
        <ArrowRight size={16} />
        اختيار إجراء آخر
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        {/* Main: steps */}
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[5px] border border-gold-500/40 bg-paper-deep text-green-600">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <div>
              <span className="rounded-[4px] bg-green-600/10 px-2.5 py-1 text-xs font-semibold text-green-700">
                {guide.category}
              </span>
              <h2 className="mt-1.5 font-naskh text-2xl font-bold text-ink">{guide.title}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-[1.9] text-ink-soft">{guide.summary}</p>

          <Illumination className="my-6" />

          <h3 className="mb-4 flex items-center gap-2 font-naskh text-base font-bold text-green-700">
            <span aria-hidden className="text-rubric-600">
              ❧
            </span>
            الخطوات
          </h3>
          <ol className="space-y-5">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-400/70 font-naskh text-lg font-bold text-green-700">
                  {toArabic(i + 1)}
                </span>
                <div className="min-w-0 pt-1">
                  <h4 className="font-naskh text-base font-bold text-ink">{step.title}</h4>
                  <p className="mt-1 text-sm leading-[1.95] text-ink-soft">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          {guide.note && (
            <p className="mt-6 rounded-[5px] border-e-2 border-e-gold-400 bg-paper-deep/50 p-4 text-sm leading-relaxed text-ink">
              <span className="font-bold text-green-700">ملاحظة: </span>
              {guide.note}
            </p>
          )}
        </Card>

        {/* Side: documents, meta, refs, CTA */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-3 font-naskh text-sm font-bold text-ink">المستندات المطلوبة</h3>
            <ul className="space-y-2">
              {guide.documents.map((doc, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink-soft">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" />
                  {doc}
                </li>
              ))}
            </ul>
          </Card>

          {(guide.authority || guide.fees || guide.duration) && (
            <Card className="space-y-4 p-6">
              {guide.authority && <MetaItem icon={Landmark} label="الجهة المختصة" value={guide.authority} />}
              {guide.fees && <MetaItem icon={Coins} label="الرسوم التقريبية" value={guide.fees} />}
              {guide.duration && <MetaItem icon={Clock} label="المدة المتوقعة" value={guide.duration} />}
            </Card>
          )}

          {guide.refs && guide.refs.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-3 font-naskh text-sm font-bold text-ink">السند القانوني</h3>
              <ul className="space-y-2">
                {guide.refs.map((ref, i) => (
                  <li key={i}>
                    <Link
                      to={`/search?law=${encodeURIComponent(ref.law)}&article=${ref.article}`}
                      className="group flex items-center justify-between gap-2 rounded-[4px] border border-paper-edge bg-paper-deep/30 px-3 py-2 text-sm transition-colors hover:border-green-300 hover:bg-paper-deep/70"
                    >
                      <span className="font-naskh font-bold text-ink">
                        {ref.law} — المادة {ref.article}
                      </span>
                      <ArrowLeft
                        size={14}
                        className="shrink-0 text-green-700 transition-transform group-hover:-translate-x-1"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Link to={askHref} className="block">
            <Button size="lg" className="w-full" icon={<MessagesSquare size={18} />}>
              اطرح سؤالاً عن هذا الإجراء
            </Button>
          </Link>

          <p className="px-1 text-center text-xs leading-relaxed text-paper/45">
            هذه إرشادات عامة ولا تُغني عن استشارة محامٍ مُرخَّص، وقد تتغيّر الإجراءات
            والرسوم بحسب أحدث القوانين والتعليمات.
          </p>
        </div>
      </div>
    </div>
  )
}

// Render a 1-based index in Arabic-Indic numerals (١، ٢، ٣...).
function toArabic(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}
