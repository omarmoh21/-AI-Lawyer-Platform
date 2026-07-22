import type { HTMLAttributes } from 'react'

// A leaf of paper: subtle edge, minimal radius, faint shadow — reads as a
// sheet rather than a floating card.
export default function Card({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[5px] border border-paper-edge bg-paper shadow-[0_1px_2px_rgba(31,25,19,0.04)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
