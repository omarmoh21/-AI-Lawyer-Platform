import { useEffect, useState } from 'react'
import { Check, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import Card from '../ui/Card'
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
    <Card className="sticky top-24 flex max-h-[calc(100svh-7rem)] flex-col p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-sm font-bold text-navy-900">المحادثات السابقة</h3>
        <button
          type="button"
          onClick={onNewChat}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
          aria-label="محادثة جديدة"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && <p className="px-2 py-4 text-center text-xs text-navy-400">جارٍ التحميل...</p>}

        {!isLoading && sessions.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-navy-400">لا توجد محادثات سابقة بعد</p>
        )}

        {sessions.map((session) => {
          const isActive = session.id === activeSessionId
          const isConfirming = confirmId === session.id
          return (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-xl transition-colors ${
                isActive ? 'bg-navy-900 text-white' : 'text-navy-600 hover:bg-navy-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(session.id)}
                className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-start text-xs font-semibold"
              >
                <MessageSquare size={14} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2 leading-relaxed">
                  {session.title || 'محادثة بدون عنوان'}
                </span>
              </button>

              {isConfirming ? (
                <div className="flex shrink-0 items-center gap-0.5 pe-1.5">
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    aria-label="تأكيد الحذف"
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isActive ? 'text-red-300 hover:bg-white/10' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    aria-label="إلغاء"
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      isActive ? 'text-white/70 hover:bg-white/10' : 'text-navy-400 hover:bg-navy-100'
                    }`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(session.id)}
                  aria-label="حذف المحادثة"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg pe-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${
                    isActive
                      ? 'me-1.5 text-white/60 hover:text-red-300'
                      : 'me-1.5 text-navy-300 hover:text-red-600'
                  }`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
