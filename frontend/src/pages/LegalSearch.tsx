import { useMemo, useState } from 'react'
import { BookText, CalendarDays, Search } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { searchFilters, searchResults } from '../data/content'

export default function LegalSearch() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const results = useMemo(() => {
    return searchResults.filter((result) => {
      const matchesQuery =
        query.trim().length === 0 ||
        result.title.includes(query) ||
        result.snippet.includes(query)
      const matchesCategory = !activeCategory || result.category === activeCategory
      return matchesQuery && matchesCategory
    })
  }, [query, activeCategory])

  return (
    <AppShell
      title="البحث القانوني"
      description="ابحث في القوانين والمواد المصرية بلغتك الطبيعية"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-navy-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="مثال: حقوق المستأجر عند تجديد العقد"
            className="w-full rounded-xl border border-navy-200 bg-white py-3.5 pr-12 pl-4 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-navy-400"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-navy-500">نوع القانون</h3>
              <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`rounded-lg px-3 py-2 text-start text-xs font-semibold transition-colors ${
                    !activeCategory
                      ? 'bg-navy-900 text-white'
                      : 'bg-white text-navy-600 hover:bg-navy-100'
                  }`}
                >
                  الكل
                </button>
                {searchFilters.categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-lg px-3 py-2 text-start text-xs font-semibold transition-colors ${
                      activeCategory === category
                        ? 'bg-navy-900 text-white'
                        : 'bg-white text-navy-600 hover:bg-navy-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-navy-500">الجهة المصدرة</h3>
              <div className="mt-3 flex flex-wrap gap-2 lg:flex-col">
                {searchFilters.authorities.map((authority) => (
                  <span
                    key={authority}
                    className="rounded-lg bg-white px-3 py-2 text-start text-xs font-semibold text-navy-500"
                  >
                    {authority}
                  </span>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <p className="text-xs font-semibold text-navy-400">
              {results.length} نتيجة
            </p>
            {results.map((result) => (
              <Card key={result.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-navy-950">{result.title}</h3>
                  <Badge tone="gold">{result.category}</Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  {result.snippet}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-navy-400">
                  <span className="flex items-center gap-1.5">
                    <BookText size={13} />
                    {result.article}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} />
                    {result.date}
                  </span>
                </div>
              </Card>
            ))}

            {results.length === 0 && (
              <Card className="p-8 text-center text-sm text-navy-400">
                لا توجد نتائج مطابقة لبحثك
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
