import { ScrollText } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Illumination from '../components/ui/Illumination'

// Placeholder for routes not yet ported to the new identity.
export default function Stub({ title, description }: { title: string; description?: string }) {
  return (
    <AppShell title={title} description={description}>
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <span className="mx-auto flex h-14 w-14 rotate-45 items-center justify-center border border-gold-500 bg-paper/5">
          <ScrollText size={22} className="-rotate-45 text-gold-300" />
        </span>
        <h2 className="mt-6 font-naskh text-xl font-bold text-paper">قيد الإنشاء</h2>
        <p className="mt-2 text-sm leading-relaxed text-paper/65">
          هذه الصفحة قيد التحرير ضمن الهوية الجديدة. الاستشارة القانونية متاحة الآن بالكامل.
        </p>
        <Illumination className="mt-8" />
      </div>
    </AppShell>
  )
}
