import { useEffect, useState } from 'react'
import { BookText, Plus } from 'lucide-react'
import Card from '../ui/Card'
import { listSearchHistory } from '../../lib/api'
import type { SearchHistoryItem } from '../../lib/api'

interface SearchHistorySidebarProps {
  activeHistoryId: number | null
  refreshKey: number
  onSelect: (item: SearchHistoryItem) => void
  onNewSearch: () => void
}

export default function SearchHistorySidebar({
  activeHistoryId,
  refreshKey,
  onSelect,
  onNewSearch,
}: SearchHistorySidebarProps) {
  const [items, setItems] = useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listSearchHistory()
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch(() => {
        if (!cancelled) setItems([])
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
        <h3 className="text-sm font-bold text-navy-900">عمليات البحث السابقة</h3>
        <button
          type="button"
          onClick={onNewSearch}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
          aria-label="بحث جديد"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && <p className="px-2 py-4 text-center text-xs text-navy-400">جارٍ التحميل...</p>}

        {!isLoading && items.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-navy-400">لا توجد عمليات بحث سابقة بعد</p>
        )}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-start text-xs font-semibold transition-colors ${
              item.id === activeHistoryId
                ? 'bg-navy-900 text-white'
                : item.found
                  ? 'text-navy-600 hover:bg-navy-50 hover:text-navy-950'
                  : 'text-navy-400 hover:bg-navy-50 hover:text-navy-600'
            }`}
          >
            <BookText size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2 leading-relaxed">
              {item.law_name} — المادة {item.article_number}
              {!item.found && ' (غير موجودة)'}
            </span>
          </button>
        ))}
      </div>
    </Card>
  )
}
