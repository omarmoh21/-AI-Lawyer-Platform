import { useEffect, useState } from 'react'
import { Check, ScrollText, SquarePen, Trash2, X } from 'lucide-react'
import { deleteChatSession, listChatSessions } from '../../lib/api'
import type { ChatSessionSummary } from '../../lib/api'

interface ChatHistorySidebarProps {
  activeSessionId: string | null
  refreshKey: number
  onSelect: (sessionId: string) => void
  onNewChat: () => void
  onDelete: (sessionId: string) => void
}

export default function ChatHistorySidebar({
  activeSessionId,
  refreshKey,
  onSelect,
  onNewChat,
  onDelete,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listChatSessions()
      .then((data) => {
        if (!cancelled) setSessions(data)
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const handleDelete = async (id: string) => {
    setConfirmId(null)
    try {
      await deleteChatSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      onDelete(id)
    } catch {
      /* leave the session in the list if the delete failed */
    }
  }

  return (
    <div className="sticky top-6 flex max-h-[calc(100svh-3rem)] flex-col rounded-[5px] border border-field-edge bg-field-deep/60 p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="font-naskh text-sm font-bold text-paper">سِجلّ المسائل</h3>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-paper/60 transition-colors hover:bg-paper/10 hover:text-gold-300"
          aria-label="مسألة جديدة"
        >
          <SquarePen size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && <p className="px-2 py-4 text-center text-xs text-paper/40">جارٍ التحميل...</p>}

        {!isLoading && sessions.length === 0 && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-paper/40">
            لا توجد مسائل سابقة بعد
          </p>
        )}

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          const isConfirming = confirmId === session.id
          return (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-[4px] transition-colors ${
                isActive ? 'bg-gold-400 text-field-deep' : 'text-paper/70 hover:bg-paper/10'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-start text-xs font-semibold"
              >
                <ScrollText size={14} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2 leading-relaxed">
                  {session.title || 'مسألة بدون عنوان'}
                </span>
              </button>

              {isConfirming ? (
                <div className="flex shrink-0 items-center gap-0.5 pe-1.5">
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    aria-label="تأكيد الحذف"
                    className={`flex h-7 w-7 items-center justify-center rounded-[4px] ${
                      isActive ? 'text-field-deep hover:bg-black/10' : 'text-rubric-500 hover:bg-rubric-600/15'
                    }`}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    aria-label="إلغاء"
                    className={`flex h-7 w-7 items-center justify-center rounded-[4px] ${
                      isActive ? 'text-field-deep/70 hover:bg-black/10' : 'text-paper/50 hover:bg-paper/10'
                    }`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(session.id)}
                  aria-label="حذف المسألة"
                  className={`me-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${
                    isActive ? 'text-field-deep/70 hover:text-field-deep' : 'text-paper/50 hover:text-rubric-500'
                  }`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
