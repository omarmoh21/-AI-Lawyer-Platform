import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  tone?: 'gold' | 'navy'
}

const toneClasses: Record<string, string> = {
  gold: 'bg-gold-100 text-gold-800',
  navy: 'bg-navy-100 text-navy-800',
}

export default function Badge({ children, tone = 'navy' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClasses[tone]}`}
    >
      {children}
    </span>
  )
}
