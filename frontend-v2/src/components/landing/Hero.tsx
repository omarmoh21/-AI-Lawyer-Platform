import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'
import Badge from '../ui/Badge'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-navy-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(218,182,97,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(60,100,156,0.4), transparent 45%)',
        }}
      />
      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
        <div className="mb-6 flex justify-center">
          <Badge tone="gold">منصة قانونية مصرية مدعومة بالذكاء الاصطناعي</Badge>
        </div>

        <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl md:text-6xl">
          العدالة أصبحت
          <span className="text-gold-300"> أقرب</span> إليك
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-200">
          منصة ذكاء اصطناعي متخصصة في القانون المصري، تجمع بين الاستشارات الذكية،
          تحليل المستندات، والبحث القانوني الفوري — بإجابات موثقة بالمصادر الرسمية.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/signup">
            <Button size="lg" icon={<ArrowLeft size={18} />}>
              ابدأ استشارتك الآن
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary" className="!bg-transparent !text-white !border-white/20 hover:!bg-white/10">
              تعرف على المنصة
            </Button>
          </a>
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-navy-300">
          <ShieldCheck size={16} className="text-gold-300" />
          إجابات مبنية على القانون المصري ومصادره الرسمية
        </div>
      </div>
    </section>
  )
}
