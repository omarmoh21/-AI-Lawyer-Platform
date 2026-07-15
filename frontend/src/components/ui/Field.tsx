import type { InputHTMLAttributes, ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
}

export default function Field({ label, icon, id, className = '', ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-navy-800">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-navy-400">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`w-full rounded-xl border py-2.5 text-sm outline-none transition-colors placeholder:text-navy-400 ${
            icon ? 'pr-10 pl-3.5' : 'px-3.5'
          } ${
            rest.disabled
              ? 'border-transparent bg-navy-50 text-navy-600'
              : 'border-navy-200 bg-white text-navy-900 focus:border-navy-400'
          } ${className}`}
          {...rest}
        />
      </div>
    </div>
  )
}
