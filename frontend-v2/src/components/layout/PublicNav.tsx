import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Scale } from 'lucide-react'

const navLinks = [
  { href: '#how-it-works', label: 'كيف تعمل' },
  { href: '#chapters', label: 'أبواب المنصّة' },
]

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-30 backdrop-blur transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? 'border-b border-field-edge bg-field/95 shadow-[0_8px_28px_rgba(0,0,0,0.28)]'
          : 'border-b border-field-edge/30 bg-field/80'
      }`}
    >
      {/* Illuminated top hairline — the codex's opening edge */}
      <div aria-hidden className="h-[3px] bg-gradient-to-l from-transparent via-gold-400/70 to-transparent" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link to="/" className="group flex shrink-0 items-center gap-3">
          {/* Seal mark — two concentric diamonds, like a notary's stamp */}
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <span className="absolute inset-0 rotate-45 border border-gold-500/50 transition-transform duration-300 group-hover:rotate-[55deg]" />
            <span className="absolute inset-[5px] rotate-45 border border-gold-400 bg-paper/5" />
            <Scale size={16} className="relative text-gold-300" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-naskh text-xl font-bold text-paper">المستشار</span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-[0.22em] text-paper/55">
              دليلُك في القانون المصري
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold text-paper/70 transition-colors hover:text-gold-300"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Link
            to="/login"
            className="rounded-[4px] px-4 py-2 text-sm font-semibold text-paper/85 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            تسجيل الدخول
          </Link>
          <span aria-hidden className="mx-1 hidden h-5 w-px bg-field-edge sm:block" />
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
