import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-green-600 text-paper hover:bg-green-700',
  secondary:
    'bg-transparent text-ink border border-ink-soft/40 hover:border-ink-soft hover:bg-paper-deep',
  ghost: 'text-ink-soft hover:bg-paper-deep hover:text-ink',
}

const sizeClasses: Record<Size, string> = {
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-14 px-7 text-base gap-2.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-[4px] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
