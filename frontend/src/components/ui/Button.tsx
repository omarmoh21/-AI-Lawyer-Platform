import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-navy-900 text-white hover:bg-navy-800 focus-visible:outline-navy-900',
  secondary:
    'bg-white text-navy-900 border border-navy-200 hover:border-navy-400 hover:bg-navy-50 focus-visible:outline-navy-500',
  ghost: 'text-navy-700 hover:bg-navy-100 focus-visible:outline-navy-500',
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
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
