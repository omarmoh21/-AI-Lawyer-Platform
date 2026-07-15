import type { ReactNode } from 'react'
import { FileSearch, LayoutGrid, MessageSquareText, Scale, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import Sidebar from './Sidebar'

const mobileNavItems = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutGrid },
  { to: '/consultation', label: 'استشارة', icon: MessageSquareText },
  { to: '/documents', label: 'مستندات', icon: FileSearch },
  { to: '/search', label: 'بحث', icon: Search },
]

interface AppShellProps {
  title: string
  description?: string
  children: ReactNode
}

export default function AppShell({ title, description, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh bg-navy-50">
      <Sidebar />

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-navy-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-900 text-gold-300 md:hidden"
              aria-label="العودة للموقع الرئيسي"
            >
              <Scale size={16} strokeWidth={2.25} />
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-navy-950">{title}</h1>
              {description && (
                <p className="mt-0.5 text-sm text-navy-500">{description}</p>
              )}
            </div>
          </div>
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-navy-600 transition-colors hover:bg-navy-200"
            aria-label="الملف الشخصي"
          >
            <UserRound size={18} />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-navy-100 bg-white py-2 md:hidden">
          {mobileNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 text-xs font-semibold ${
                  isActive ? 'text-navy-900' : 'text-navy-400'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
