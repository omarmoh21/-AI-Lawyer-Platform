import { useState } from 'react'
import { BookText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import SearchHistorySidebar from '../components/search/SearchHistorySidebar'
import {
  lookupArticle,
  searchArticlesByTopic,
  type ArticleResponse,
  type SearchHistoryItem,
  type TopicSearchResult,
} from '../lib/api'

const commonLaws = [
  'قانون العقوبات',
  'القانون المدني المصري',
  'قانون العمل',
  'قانون الإجراءات الجنائية',
  'قانون الأحوال الشخصية',
  'قانون الطفل',
  'قانون المرافعات المدنية والتجارية',
  'قانون الشركات',
  'قانون الاستثمار',
  'قانون المواريث',
]

export default function LegalSearch() {
  const [mode, setMode] = useState<'number' | 'topic'>('number')

  const [lawName, setLawName] = useState('')
  const [articleNumber, setArticleNumber] = useState('')
  const [result, setResult] = useState<ArticleResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const [topicQuery, setTopicQuery] = useState('')
  const [topicResults, setTopicResults] = useState<TopicSearchResult[] | null>(null)
  const [topicError, setTopicError] = useState<string | null>(null)
  const [isTopicSearching, setIsTopicSearching] = useState(false)

  const canSearch = lawName.trim().length >= 2 && Number(articleNumber) >= 1
  const canTopicSearch = topicQuery.trim().length >= 3

  const runLookup = async () => {
    if (!canSearch || isSearching) return
    setIsSearching(true)
    setResult(null)
    setErrorMessage(null)
    try {
      const article = await lookupArticle(lawName.trim(), Number(articleNumber))
      setResult(article)
      setActiveHistoryId(article.history_id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSearching(false)
      setHistoryRefreshKey((key) => key + 1)
    }
  }

  const handleSelectHistory = (item: SearchHistoryItem) => {
    setLawName(item.law_name)
    setArticleNumber(String(item.article_number))
    setActiveHistoryId(item.id)
    if (item.found) {
      setResult({
        law_name: item.law_name,
        article_name: item.article_name,
        article_number: item.article_number,
        text: item.text ?? '',
        history_id: item.id,
      })
      setErrorMessage(null)
    } else {
      setResult(null)
      setErrorMessage(
        `لم يتم العثور على المادة ${item.article_number} من ${item.law_name} في قاعدة البيانات.`,
      )
    }
  }

  const handleNewSearch = () => {
    setLawName('')
    setArticleNumber('')
    setResult(null)
    setErrorMessage(null)
    setActiveHistoryId(null)
  }

  const runTopicSearch = async () => {
    if (!canTopicSearch || isTopicSearching) return
    setIsTopicSearching(true)
    setTopicResults(null)
    setTopicError(null)
    try {
      const results = await searchArticlesByTopic(topicQuery.trim())
      setTopicResults(results)
    } catch (error) {
      setTopicError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsTopicSearching(false)
    }
  }

  return (
    <AppShell
      title="البحث في مواد القانون"
      description="اعرض النص الحرفي لأي مادة قانونية باسم القانون ورقم المادة"
    >
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <div className="max-w-4xl flex-1">
          <div className="mb-4 inline-flex rounded-xl bg-navy-50 p-1">
            <button
              onClick={() => setMode('number')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                mode === 'number' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500'
              }`}
            >
              عندي رقم المادة
            </button>
            <button
              onClick={() => setMode('topic')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                mode === 'topic' ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500'
              }`}
            >
              مش عارف رقم المادة؟ دور بموضوعك
            </button>
          </div>

          {mode === 'topic' && (
            <>
              <Card className="p-6">
                <label className="text-xs font-bold text-navy-500">اكتب موضوعك بكلامك العادي</label>
                <div className="mt-2 flex gap-3">
                  <input
                    value={topicQuery}
                    onChange={(event) => setTopicQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runTopicSearch()
                    }}
                    placeholder="مثال: عقوبة السرقة، إجراءات الطلاق..."
                    className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-navy-400"
                  />
                  <Button
                    size="md"
                    onClick={runTopicSearch}
                    disabled={!canTopicSearch || isTopicSearching}
                    icon={<Search size={16} />}
                  >
                    بحث
                  </Button>
                </div>
              </Card>

              <div className="mt-6 space-y-4">
                {isTopicSearching && (
                  <Card className="flex items-center gap-2 p-6 text-sm text-navy-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                    جارٍ البحث عن أقرب المواد لموضوعك...
                  </Card>
                )}

                {topicError && !isTopicSearching && (
                  <Card className="p-6 text-center text-sm text-navy-500">{topicError}</Card>
                )}

                {topicResults && !isTopicSearching && topicResults.length === 0 && (
                  <Card className="p-10 text-center text-sm text-navy-400">
                    لم نجد مواد قريبة من موضوعك، جرب تفاصيل أكتر.
                  </Card>
                )}

                {topicResults?.map((item, index) => (
                  <Card key={index} className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-gold-600">
                        <BookText size={16} />
                        <span className="text-xs font-bold">{item.article_id ?? 'مادة قانونية'}</span>
                      </div>
                      <Badge tone="gold">{item.law_name}</Badge>
                    </div>
                    <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm leading-loose whitespace-pre-wrap text-navy-800">
                      {item.text}
                    </p>
                  </Card>
                ))}

                {!topicResults && !topicError && !isTopicSearching && (
                  <Card className="p-10 text-center text-sm text-navy-400">
                    اكتب مشكلتك أو موضوعك بكلامك، وهنطلعلك أقرب مواد قانونية ليه.
                  </Card>
                )}
              </div>
            </>
          )}

          {mode === 'number' && (
          <>
          <Card className="p-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto]">
              <div>
                <label className="text-xs font-bold text-navy-500">اسم القانون</label>
                <input
                  value={lawName}
                  onChange={(event) => setLawName(event.target.value)}
                  list="common-laws"
                  placeholder="مثال: قانون العقوبات"
                  className="mt-2 w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-navy-400"
                />
                <datalist id="common-laws">
                  {commonLaws.map((law) => (
                    <option key={law} value={law} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-bold text-navy-500">رقم المادة</label>
                <input
                  value={articleNumber}
                  onChange={(event) =>
                    setArticleNumber(event.target.value.replace(/[^0-9]/g, ''))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') runLookup()
                  }}
                  inputMode="numeric"
                  placeholder="مثال: 234"
                  className="mt-2 w-full rounded-xl border border-navy-200 bg-white px-4 py-3 text-sm text-navy-900 outline-none placeholder:text-navy-400 focus:border-navy-400"
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="md"
                  onClick={runLookup}
                  disabled={!canSearch || isSearching}
                  icon={<Search size={16} />}
                >
                  عرض المادة
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {commonLaws.slice(0, 5).map((law) => (
                <button
                  key={law}
                  onClick={() => setLawName(law)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    lawName === law
                      ? 'bg-navy-900 text-white'
                      : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                  }`}
                >
                  {law}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-6">
            {isSearching && (
              <Card className="flex items-center gap-2 p-6 text-sm text-navy-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                جارٍ جلب نص المادة...
              </Card>
            )}

            {result && !isSearching && (
              <Card className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-gold-600">
                    <BookText size={16} />
                    <span className="text-xs font-bold">
                      {result.article_name ?? `المادة ${result.article_number}`}
                    </span>
                  </div>
                  <Badge tone="gold">{result.law_name}</Badge>
                </div>
                <p className="mt-4 rounded-xl bg-navy-50 p-4 text-sm leading-loose whitespace-pre-wrap text-navy-800">
                  {result.text}
                </p>
                <p className="mt-3 text-xs text-navy-400">
                  النص معروض حرفيًا كما ورد في قاعدة بيانات القوانين. لفهم تطبيقه على
                  حالتك،{' '}
                  <Link to="/consultation" className="font-semibold text-navy-700 underline">
                    اطرح سؤالك في الاستشارة القانونية
                  </Link>
                  .
                </p>
              </Card>
            )}

            {errorMessage && !isSearching && (
              <Card className="p-6 text-center text-sm text-navy-500">{errorMessage}</Card>
            )}

            {!result && !errorMessage && !isSearching && (
              <Card className="p-10 text-center text-sm text-navy-400">
                اختر القانون واكتب رقم المادة لعرض نصها الحرفي — مرجع مباشر دون تحليل.
              </Card>
            )}
          </div>
          </>
          )}
        </div>

        <aside className="hidden w-64 shrink-0 lg:block">
          <SearchHistorySidebar
            activeHistoryId={activeHistoryId}
            refreshKey={historyRefreshKey}
            onSelect={handleSelectHistory}
            onNewSearch={handleNewSearch}
          />
        </aside>
      </div>
    </AppShell>
  )
}
