import { Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'

export default function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
            <Scale size={18} strokeWidth={2.25} />
          </span>
          <span className="text-lg font-extrabold text-navy-950">عدالة</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-navy-700 md:flex">
          <a href="#features" className="hover:text-navy-950">
            المزايا
          </a>
          <a href="#how-it-works" className="hover:text-navy-950">
            كيف تعمل المنصة
          </a>
          <a href="#trust" className="hover:text-navy-950">
            نطاق التغطية
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm font-semibold text-navy-700 hover:text-navy-950 sm:block"
          >
            تسجيل الدخول
          </Link>
          <Link to="/signup">
            <Button size="md">ابدأ الآن</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
