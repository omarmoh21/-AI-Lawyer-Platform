import {
  BookMarked,
  FileText,
  Mic,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
} from 'lucide-react'
import { features } from '../../data/content'
import SectionHeading from '../ui/SectionHeading'
import Card from '../ui/Card'

const icons: Record<string, typeof Mic> = {
  consultation: MessageSquareText,
  documents: FileText,
  search: SearchCheck,
  voice: Mic,
  summary: BookMarked,
  sources: ShieldCheck,
}

export default function Features() {
  return (
    <section id="features" className="bg-navy-50 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading
          eyebrow="المزايا"
          title="كل ما تحتاجه في منصة واحدة"
          description="أدوات متخصصة للتعامل مع الاستفسارات والمستندات القانونية بدقة وسرعة."
        />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = icons[feature.id]
            return (
              <Card key={feature.id} className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-base font-bold text-navy-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  {feature.description}
                </p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
