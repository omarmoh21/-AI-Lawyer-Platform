import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  BookText,
  FilePenLine,
  MessagesSquare,
  Scale,
} from 'lucide-react'
import Illumination from '../components/ui/Illumination'
import Reveal from '../components/ui/Reveal'
import DemoLeaf from '../components/landing/DemoLeaf'
import QuoteLeaf from '../components/landing/QuoteLeaf'

const steps = [
  { n: '١', title: 'اطرح مسألتك', body: 'اكتب سؤالك أو أملِهِ صوتًا بالعامية أو الفصحى، وأرفِق مستندًا إن شئت.' },
  { n: '٢', title: 'نرجع إلى النص', body: 'نبحث في قاعدة نصوص القانون المصري ونستخرج المواد ذات الصلة حرفيًّا.' },
  { n: '٣', title: 'إجابة مسنودة', body: 'إجابة مختصرة أولًا، يليها السند القانوني الحرفي ثم الشرح والتطبيق كحاشية.' },
]

const chapters = [
  { icon: MessagesSquare, ord: '١', to: '/consultation', title: 'الاستشارة', body: 'سؤال وجواب قانوني مسنود إلى نصوص التشريع، مع إمكانية إرفاق مستند لتحليله.' },
  { icon: BookText, ord: '٢', to: '/search', title: 'مواد القانون', body: 'عرض النص الحرفي لأي مادة باسم القانون ورقمها، أو البحث بموضوعك.' },
  { icon: FilePenLine, ord: '٣', to: '/contracts', title: 'تحرير عقد', body: 'صياغة العقود الشائعة بنماذج موثّقة قابلة للتنزيل.' },
]

function PublicNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-field-edge/60 bg-field/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 rotate-45 items-center justify-center border border-gold-400 bg-paper/10">
            <Scale size={16} className="-rotate-45 text-gold-300" />
          </span>
          <span className="font-naskh text-xl font-bold text-paper">المستشار</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-[4px] px-4 py-2 text-sm font-semibold text-paper/85 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            تسجيل الدخول
          </Link>
          <Link
            to="/signup"
            className="rounded-[4px] bg-gold-400 px-4 py-2 text-sm font-semibold text-field-deep transition-colors hover:bg-gold-300"
          >
            إنشاء حساب
          </Link>
        </div>
      </div>
    </header>
  )
}

export default function Landing() {
  return (
    <div className="field-bg min-h-svh text-paper">
      <PublicNav />

      {/* Hero — light manuscript leaf on the deep green field */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1fr_1.05fr] lg:py-24">
        <div>
          <p className="animate-rise font-naskh text-sm tracking-widest text-gold-300" style={{ animationDelay: '60ms' }}>
            مستشارك في القانون المصري
          </p>
          <h1
            className="animate-rise mt-4 font-naskh text-4xl leading-[1.5] font-bold text-paper sm:text-5xl sm:leading-[1.4]"
            style={{ animationDelay: '140ms' }}
          >
            إجابةٌ قانونيةٌ، مسنودةٌ إلى نصِّ التشريع لا إلى الظنّ.
          </h1>
          <p className="animate-rise mt-5 max-w-md text-base leading-relaxed text-paper/75" style={{ animationDelay: '220ms' }}>
            اسأل بالعامية أو الفصحى، فنبحث في نصوص القانون المصري ونردّ عليك بالنص الحرفي
            للمادة، ثم شرحٍ مبسّطٍ لحالتك — كحاشيةٍ على المتن.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: '300ms' }}>
            <Link
              to="/signup"
              className="inline-flex h-14 items-center gap-2.5 rounded-[4px] bg-gold-400 px-7 text-base font-semibold text-field-deep transition-colors hover:bg-gold-300"
            >
              ابدأ استشارتك
              <ArrowLeft size={18} />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-14 items-center rounded-[4px] border border-paper/30 px-7 text-base font-semibold text-paper transition-colors hover:bg-paper/10"
            >
              لديّ حساب
            </Link>
          </div>
        </div>

        <div className="animate-rise" style={{ animationDelay: '380ms' }}>
          <QuoteLeaf />
        </div>
      </section>

      {/* How it works — the 3-step sequence + live demo */}
      <section className="border-y border-field-edge/50 bg-field-deep/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <Reveal>
            <h2 className="font-naskh text-2xl font-bold text-paper">كيف تسير الاستشارة</h2>
            <Illumination className="mt-4 max-w-xs" />
          </Reveal>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 110}>
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-400/70 font-naskh text-xl font-bold text-gold-300">
                    {step.n}
                  </span>
                  <div>
                    <h3 className="font-naskh text-lg font-bold text-paper">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-paper/70">{step.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-16" delay={80}>
            <div className="mb-6 text-center">
              <h3 className="font-naskh text-xl font-bold text-paper">شاهد الإجابة وهي تُكتَب</h3>
              <p className="mt-2 text-sm text-paper/70">
                اختر مسألةً من الأسفل، وتابِع كيف تُبنى الإجابة من نصِّ المادة.
              </p>
            </div>
            <div className="relative mx-auto max-w-2xl">
              <DemoLeaf />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Capabilities — each service as an illuminated chapter (باب) */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="font-naskh text-2xl font-bold text-paper">أبواب المنصّة</h2>
          <Illumination className="mt-4 max-w-xs" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-paper/70">
            أربعةُ أبوابٍ تدخل منها إلى خدمات المستشار — كأبواب كتابٍ في الفقه والقانون.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {chapters.map(({ icon: Icon, ord, to, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <Link
                to={to}
                className="group flex h-full overflow-hidden rounded-[6px] border border-paper-edge bg-paper text-ink shadow-[0_2px_10px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(0,0,0,0.28)]"
              >
                {/* Book spine — the green collar, with a gold ordinal */}
                <div className="relative flex w-16 shrink-0 flex-col items-center justify-center gap-2 bg-field py-6 text-paper transition-colors group-hover:bg-field-deep">
                  <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold-300" />
                  <span className="font-naskh text-3xl font-bold text-gold-300">{ord}</span>
                  <span className="font-naskh text-[11px] tracking-widest text-paper/70">باب</span>
                  <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold-300" />
                </div>

                {/* Chapter page */}
                <div className="rule-line flex flex-1 flex-col p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-gold-500/40 bg-paper-deep text-green-600 transition-colors group-hover:border-gold-500 group-hover:bg-field group-hover:text-paper">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 font-naskh text-xl font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700">
                    ادخل الباب
                    <ArrowLeft size={15} className="transition-transform duration-200 group-hover:-translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Closing band — deeper green, gold call to action */}
      <section className="border-t border-field-edge/50 bg-field-deep">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-20 text-center">
          <Reveal>
            <Illumination className="mx-auto mb-6 w-40" />
            <h2 className="max-w-lg font-naskh text-3xl leading-[1.6] font-bold text-paper">
              مسألتُك القانونية تستحقّ إجابةً من النصّ.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <Link
              to="/signup"
              className="inline-flex h-14 items-center gap-2.5 rounded-[4px] bg-gold-400 px-7 text-base font-semibold text-field-deep transition-colors hover:bg-gold-300"
            >
              ابدأ الآن مجانًا
              <ArrowLeft size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-field-edge/50 bg-field">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs leading-relaxed text-paper/55">
          المستشار أداةٌ إرشاديةٌ تعتمد على الذكاء الاصطناعي، ولا تُغني عن استشارة محامٍ
          مُرخَّص. النصوص القانونية معروضة كما وردت في قاعدة البيانات.
        </div>
      </footer>
    </div>
  )
}
