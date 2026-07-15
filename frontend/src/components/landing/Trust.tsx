import { CheckCircle2, Info } from 'lucide-react'
import { legalCoverage } from '../../data/content'
import SectionHeading from '../ui/SectionHeading'

export default function Trust() {
  return (
    <section id="trust" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="نطاق التغطية"
          title="مبنية على القانون المصري"
          description="تغطي المنصة أبرز فروع القانون المصري بالاستناد إلى مصادر رسمية موثوقة."
        />

        <div className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
          {legalCoverage.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-navy-100 bg-navy-50 px-4 py-3"
            >
              <CheckCircle2 size={18} className="shrink-0 text-gold-600" />
              <span className="text-sm font-semibold text-navy-800">{item}</span>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl items-start gap-3 rounded-xl bg-navy-950 px-5 py-4 text-navy-200">
          <Info size={18} className="mt-0.5 shrink-0 text-gold-300" />
          <p className="text-sm leading-relaxed">
            عدالة أداة إرشادية تهدف لتسهيل الوصول للمعلومة القانونية، ولا تُغني عن
            استشارة محامٍ مرخص في القضايا الفعلية.
          </p>
        </div>
      </div>
    </section>
  )
}
