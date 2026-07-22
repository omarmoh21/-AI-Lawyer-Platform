import type { ReactNode } from 'react'
import { ScrollText } from 'lucide-react'
import { Link } from 'react-router-dom'
import Illumination from '../ui/Illumination'

const maxim = 'البيّنة على من ادّعى، واليمين على من أنكر'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer: ReactNode
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 rotate-45 items-center justify-center border ${
          dark ? 'border-gold-400 bg-paper/10' : 'border-gold-500 bg-green-600'
        }`}
      >
        <ScrollText size={16} className={`-rotate-45 ${dark ? 'text-gold-400' : 'text-paper'}`} />
      </span>
      <span className={`font-naskh text-xl font-bold ${dark ? 'text-paper' : 'text-ink'}`}>
        المستشار
      </span>
    </Link>
  )
}

export default function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Illuminated leaf — a legal maxim set like a manuscript opening */}
      <div className="field-bg relative hidden flex-col justify-between overflow-hidden px-14 py-12 lg:flex">
        <Brand dark />

        <div className="relative">
          <p className="font-naskh text-xs tracking-widest text-gold-400">قاعدة فقهية</p>
          <h2 className="mt-4 font-naskh text-4xl leading-[1.7] text-paper">{maxim}</h2>
          <div className="mt-6 flex items-center gap-2" aria-hidden>
            <span className="h-px w-12 bg-gold-500/60" />
            <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" />
          </div>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/60">
            مستشارك في القانون المصري — إجاباتٌ مسنودةٌ إلى نصوص التشريع، وتحريرُ
            العقود، وتحليلُ الوثائق.
          </p>
        </div>

        <p className="relative text-xs leading-relaxed text-paper/40">
          أداة إرشادية ولا تُغني عن استشارة محامٍ مُرخَّص.
        </p>
      </div>

      {/* The form leaf */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <h1 className="font-naskh text-3xl font-bold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
          <Illumination className="mt-5" />

          <div className="mt-8">{children}</div>

          <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>
        </div>
      </div>
    </div>
  )
}
