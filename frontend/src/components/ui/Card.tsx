import type { HTMLAttributes } from 'react'

export default function Card({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-navy-100 bg-white shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
