import { useEffect, useState } from 'react'
import { MessageSquare, Plus } from 'lucide-react'
import Card from '../ui/Card'
import { listChatSessions } from '../../lib/api'
import type { ChatSessionSummary } from '../../lib/api'

interface ChatHistorySidebarProps {
  activeSessionId: string | null
  refreshKey: number
  onSelect: (sessionId: string) => void
  onNewChat: () => void
}

export default function ChatHistorySidebar({
  activeSessionId,
  refreshKey,
  onSelect,
  onNewChat,
}: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session.id)}
            className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-start text-xs font-semibold transition-colors ${
              session.id === activeSessionId
                ? 'bg-navy-900 text-white'
                : 'text-navy-600 hover:bg-navy-50 hover:text-navy-950'
            }`}
          >
            <MessageSquare size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2 leading-relaxed">
              {session.title || 'محادثة بدون عنوان'}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
