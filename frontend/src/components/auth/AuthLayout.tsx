import type { ReactNode } from 'react'
import { CheckCircle2, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'

const highlights = [
  'إجابات قانونية موثقة بمصادر القانون المصري',
  'تحليل العقود والمستندات في دقائق',
  'استشارة صوتية أو نصية في أي وقت',
]

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 px-12 py-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(218,182,97,0.35), transparent 40%), radial-gradient(circle at 80% 0%, rgba(60,100,156,0.4), transparent 45%)',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gold-300">
            <Scale size={18} strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold text-white">عدالة</span>
        </Link>

        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-snug text-white">
            مستشارك القانوني الذكي، بجانبك في كل خطوة
          </h2>
          <ul className="mt-8 space-y-4">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-navy-200">
                <CheckCircle2 size={18} className="shrink-0 text-gold-300" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs leading-relaxed text-navy-400">
          عدالة أداة إرشادية ولا تُغني عن استشارة محامٍ مرخص.
        </p>
      </div>

      <div className="flex items-center justify-center bg-navy-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
              <Scale size={18} strokeWidth={2.25} />
            </span>
            <span className="text-lg font-extrabold text-navy-950">عدالة</span>
          </Link>

          <h1 className="text-2xl font-extrabold text-navy-950">{title}</h1>
          <p className="mt-2 text-sm text-navy-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-center text-sm text-navy-500">{footer}</p>
        </div>
      </div>
    </div>
  )
}
