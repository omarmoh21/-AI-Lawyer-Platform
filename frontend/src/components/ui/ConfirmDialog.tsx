import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={20} />
        </span>
        <h3 className="mt-4 text-lg font-bold text-navy-950">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-navy-600">{description}</p>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            size="md"
            className="flex-1 !bg-red-600 hover:!bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
