import type { ReactNode } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  BookText,
  FilePenLine,
  Home,
  ListChecks,
  LogOut,
  MessagesSquare,
  ScrollText,
  UserRound,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useAuth } from '../../lib/auth'

interface AppShellProps {
  title: string
  description?: string
  children: ReactNode
}

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number; strokeWidth?: number }>
  end?: boolean
}

const navItems: NavItem[] = [
  { to: '/', label: 'الرئيسية', icon: Home, end: true },
  { to: '/consultation', label: 'الاستشارة', icon: MessagesSquare },
  { to: '/search', label: 'مواد القانون', icon: BookText },
  { to: '/guides', label: 'دليل الإجراءات', icon: ListChecks },
  { to: '/contracts', label: 'تحرير عقد', icon: FilePenLine },
]

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 rotate-45 items-center justify-center border border-gold-500 bg-gold-400">
        <ScrollText size={16} className="-rotate-45 text-field-deep" />
      </span>
      <span className="font-naskh text-xl font-bold text-paper">المستشار</span>
    </Link>
  )
}

export default function AppShell({ title, description, children }: AppShellProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-semibold transition-colors ${
      isActive
        ? 'bg-gold-400 text-field-deep'
        : 'text-paper/70 hover:bg-paper/10 hover:text-paper'
    }`

  return (
    <div className="field-bg flex min-h-svh">
      {/* Margin column — the manuscript's ruled margin holds navigation */}
      <aside className="hidden w-60 shrink-0 flex-col border-s border-field-edge bg-field-deep/60 md:flex">
        <div className="border-b border-field-edge px-5 py-5">
          <BrandMark />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navClass}>
              <Icon size={17} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-field-edge p-3">
          <NavLink to="/profile" className={navClass}>
            <UserRound size={17} strokeWidth={1.75} />
            الملف الشخصي
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-sm font-semibold text-paper/70 transition-colors hover:bg-rubric-600/20 hover:text-rubric-500"
          >
            <LogOut size={17} strokeWidth={1.75} />
            تسجيل الخروج
          </button>
          <p className="px-3 pt-2 text-[11px] leading-relaxed text-paper/40">
            هذه المنصّة أداة إرشادية ولا تُغني عن استشارة محامٍ مُرخَّص.
          </p>
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col">
        <header className="border-b border-field-edge px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-naskh text-2xl font-bold text-paper">{title}</h1>
              {description && (
                <p className="mt-1 text-sm leading-relaxed text-paper/65">{description}</p>
              )}
            </div>
            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-field-edge bg-paper/5 text-paper/70 transition-colors hover:text-paper md:hidden"
              aria-label="الملف الشخصي"
            >
              <UserRound size={18} />
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-2" aria-hidden>
            <span className="h-px w-10 bg-gold-400/60" />
            <span className="h-1 w-1 rotate-45 bg-gold-400" />
            <span className="h-px flex-1 bg-field-edge" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-field-edge bg-field-deep py-2 md:hidden">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1 text-[11px] font-semibold ${
                  isActive ? 'text-gold-300' : 'text-paper/45'
                }`
              }
            >
              <Icon size={19} strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
