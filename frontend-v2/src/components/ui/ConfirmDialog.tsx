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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-field-deep/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[6px] border border-paper-edge bg-paper p-6 shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rubric-600/12 text-rubric-600">
          <AlertTriangle size={20} />
        </span>
        <h3 className="mt-4 font-naskh text-lg font-bold text-ink">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>

        <div className="mt-6 flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            size="md"
            className="flex-1 !bg-rubric-600 hover:!bg-rubric-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
