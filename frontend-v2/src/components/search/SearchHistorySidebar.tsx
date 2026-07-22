import { useEffect, useState } from 'react'
import { BookText, SquarePen } from 'lucide-react'
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
    <div className="sticky top-6 flex max-h-[calc(100svh-3rem)] flex-col rounded-[5px] border border-field-edge bg-field-deep/60 p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="font-naskh text-sm font-bold text-paper">عمليات البحث السابقة</h3>
        <button
          type="button"
          onClick={onNewSearch}
          className="flex h-8 w-8 items-center justify-center rounded-[4px] text-paper/60 transition-colors hover:bg-paper/10 hover:text-gold-300"
          aria-label="بحث جديد"
        >
          <SquarePen size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {isLoading && <p className="px-2 py-4 text-center text-xs text-paper/40">جارٍ التحميل...</p>}

        {!isLoading && items.length === 0 && (
          <p className="px-2 py-6 text-center text-xs leading-relaxed text-paper/40">
            لا توجد عمليات بحث سابقة بعد
          </p>
        )}

        {items.map((item) => {
          const isActive = item.id === activeHistoryId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full items-start gap-2 rounded-[4px] px-3 py-2.5 text-start text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-gold-400 text-field-deep'
                  : item.found
                    ? 'text-paper/70 hover:bg-paper/10'
                    : 'text-paper/40 hover:bg-paper/10'
              }`}
            >
              <BookText size={14} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2 leading-relaxed">
                {item.law_name} — المادة {item.article_number}
                {!item.found && ' (غير موجودة)'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
