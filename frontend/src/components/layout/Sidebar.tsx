import { FileSearch, Home, LayoutGrid, MessageSquareText, Scale, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutGrid },
  { to: '/consultation', label: 'استشارة قانونية', icon: MessageSquareText },
  { to: '/documents', label: 'تحليل مستند', icon: FileSearch },
  { to: '/search', label: 'البحث القانوني', icon: Search },
]

export default function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-navy-100 bg-white md:flex md:flex-col">
      <Link
        to="/"
        className="flex items-center gap-2 border-b border-navy-100 px-6 py-5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
          <Scale size={18} strokeWidth={2.25} />
        </span>
        <span className="text-lg font-extrabold text-navy-950">عدالة</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-navy-900 text-white'
                  : 'text-navy-600 hover:bg-navy-50 hover:text-navy-950'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-navy-100 p-4">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-navy-900 text-white'
                : 'text-navy-500 hover:bg-navy-50 hover:text-navy-950'
            }`
          }
        >
          <UserRound size={18} strokeWidth={2} />
          الملف الشخصي
        </NavLink>
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-950"
        >
          <Home size={18} strokeWidth={2} />
          العودة للموقع الرئيسي
        </Link>
        <div className="rounded-xl bg-navy-50 p-4 text-xs leading-relaxed text-navy-600">
          المنصة أداة إرشادية ولا تغني عن استشارة محامٍ مرخص.
        </div>
      </div>
    </aside>
  )
}
