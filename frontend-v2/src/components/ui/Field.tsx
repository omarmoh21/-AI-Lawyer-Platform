import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
}

export default function Field({ label, icon, id, className = '', ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-faint">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`w-full rounded-[4px] border py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint ${
            icon ? 'pr-10 pl-3.5' : 'px-3.5'
          } ${
            rest.disabled
              ? 'border-transparent bg-paper-deep text-ink-soft'
              : 'border-paper-edge bg-white/60 text-ink focus:border-green-600'
          } ${className}`}
          {...rest}
        />
      </div>
    </div>
  )
}
