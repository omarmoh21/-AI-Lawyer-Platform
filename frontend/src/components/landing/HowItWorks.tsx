import { howItWorks } from '../../data/content'
import SectionHeading from '../ui/SectionHeading'

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="آلية العمل"
          title="كيف تعمل المنصة؟"
          description="ثلاث خطوات بسيطة تفصلك عن إجابة قانونية موثوقة."
        />

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {howItWorks.map((item, index) => (
            <div key={item.step} className="relative">
              <div className="flex items-center gap-4">
                <span className="text-4xl font-extrabold text-navy-100">
                  {item.step}
                </span>
                {index < howItWorks.length - 1 && (
                  <span className="hidden h-px flex-1 bg-navy-100 md:block" />
                )}
              </div>
              <h3 className="mt-4 text-lg font-bold text-navy-950">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
