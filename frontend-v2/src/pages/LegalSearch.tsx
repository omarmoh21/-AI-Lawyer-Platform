import { useEffect, useState } from 'react'
import { BookText, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
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

const inputClass =
  'mt-2 w-full rounded-[4px] border border-paper-edge bg-white/70 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-green-600'

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

  const [searchParams] = useSearchParams()

  const canSearch = lawName.trim().length >= 2 && Number(articleNumber) >= 1
  const canTopicSearch = topicQuery.trim().length >= 3

  const runLookupWith = async (law: string, num: number) => {
    if (isSearching) return
    setIsSearching(true)
    setResult(null)
    setErrorMessage(null)
    try {
      const article = await lookupArticle(law, num)
      setResult(article)
      setActiveHistoryId(article.history_id)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSearching(false)
      setHistoryRefreshKey((key) => key + 1)
    }
  }

  const runLookup = () => {
    if (!canSearch) return
    void runLookupWith(lawName.trim(), Number(articleNumber))
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

  // Deep link from الديوان: /search?law=<name>&article=<n> re-runs the lookup.
  useEffect(() => {
    const law = searchParams.get('law')
    const article = searchParams.get('article')
    if (law && article && Number(article) >= 1) {
      setLawName(law)
      setArticleNumber(article)
      void runLookupWith(law.trim(), Number(article))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <AppShell
      title="البحث في مواد القانون"
      description="اعرض النص الحرفي لمادة بالاسم والرقم، أو ابحث عن أقرب المواد بوصف موضوعك"
    >
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <div className="max-w-4xl flex-1">
          {/* Mode toggle — exact article vs. plain-language topic search */}
          <div className="mb-4 inline-flex rounded-[5px] border border-field-edge bg-field-deep/50 p-1">
            <button
              onClick={() => setMode('number')}
              className={`rounded-[4px] px-4 py-2 text-xs font-bold transition-colors ${
                mode === 'number'
                  ? 'bg-gold-400 text-field-deep'
                  : 'text-paper/70 hover:text-paper'
              }`}
            >
              عندي رقم المادة
            </button>
            <button
              onClick={() => setMode('topic')}
              className={`rounded-[4px] px-4 py-2 text-xs font-bold transition-colors ${
                mode === 'topic'
                  ? 'bg-gold-400 text-field-deep'
                  : 'text-paper/70 hover:text-paper'
              }`}
            >
              مش عارف رقم المادة؟ دوّر بموضوعك
            </button>
          </div>

          {mode === 'topic' && (
            <>
              <Card className="p-6">
                <label className="text-xs font-bold text-ink-soft">اكتب موضوعك بكلامك العادي</label>
                <div className="mt-2 flex gap-3">
                  <input
                    value={topicQuery}
                    onChange={(event) => setTopicQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') runTopicSearch()
                    }}
                    placeholder="مثال: عقوبة السرقة، إجراءات الطلاق..."
                    className="w-full rounded-[4px] border border-paper-edge bg-white/70 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-green-600"
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
                  <Card className="flex items-center gap-2 p-6 text-sm text-ink-soft">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                    جارٍ البحث عن أقرب المواد لموضوعك...
                  </Card>
                )}

                {topicError && !isTopicSearching && (
                  <Card className="p-6 text-center text-sm text-ink-soft">{topicError}</Card>
                )}

                {topicResults && !isTopicSearching && topicResults.length === 0 && (
                  <Card className="p-10 text-center text-sm text-ink-faint">
                    لم نجد مواد قريبة من موضوعك، جرّب تفاصيل أكثر.
                  </Card>
                )}

                {topicResults?.map((item, index) => (
                  <Card key={index} className="border-e-2 border-e-green-600 p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <BookText size={16} />
                        <span className="font-naskh text-sm font-bold">
                          {item.article_id ?? 'مادة قانونية'}
                        </span>
                      </div>
                      <span className="rounded-[4px] bg-green-600/10 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {item.law_name}
                      </span>
                    </div>
                    <p className="mt-4 rounded-[4px] bg-paper-deep/60 p-4 font-naskh text-[17px] leading-[2.1] whitespace-pre-wrap text-ink">
                      {item.text}
                    </p>
                  </Card>
                ))}

                {!topicResults && !topicError && !isTopicSearching && (
                  <Card className="p-10 text-center text-sm text-ink-faint">
                    اكتب مشكلتك أو موضوعك بكلامك، وسنعرض لك أقرب المواد القانونية إليه.
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
                <label className="text-xs font-bold text-ink-soft">اسم القانون</label>
                <input
                  value={lawName}
                  onChange={(event) => setLawName(event.target.value)}
                  list="common-laws"
                  placeholder="مثال: قانون العقوبات"
                  className={inputClass}
                />
                <datalist id="common-laws">
                  {commonLaws.map((law) => (
                    <option key={law} value={law} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-bold text-ink-soft">رقم المادة</label>
                <input
                  value={articleNumber}
                  onChange={(event) => setArticleNumber(event.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') runLookup()
                  }}
                  inputMode="numeric"
                  placeholder="مثال: 234"
                  className={inputClass}
                />
              </div>
              <div className="flex items-end">
                <Button size="md" onClick={runLookup} disabled={!canSearch || isSearching} icon={<Search size={16} />}>
                  عرض المادة
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {commonLaws.slice(0, 5).map((law) => (
                <button
                  key={law}
                  onClick={() => setLawName(law)}
                  className={`rounded-[4px] px-3 py-1.5 text-xs font-semibold transition-colors ${
                    lawName === law
                      ? 'bg-green-600 text-paper'
                      : 'bg-paper-deep text-ink-soft hover:text-green-700'
                  }`}
                >
                  {law}
                </button>
              ))}
            </div>
          </Card>

          <div className="mt-6">
            {isSearching && (
              <Card className="flex items-center gap-2 p-6 text-sm text-ink-soft">
                <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                جارٍ جلب نص المادة...
              </Card>
            )}

            {result && !isSearching && (
              <Card className="border-e-2 border-e-green-600 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <BookText size={16} />
                    <span className="font-naskh text-sm font-bold">
                      {result.article_name ?? `المادة ${result.article_number}`}
                    </span>
                  </div>
                  <span className="rounded-[4px] bg-green-600/10 px-2.5 py-1 text-xs font-semibold text-green-700">
                    {result.law_name}
                  </span>
                </div>
                <p className="mt-4 rounded-[4px] bg-paper-deep/60 p-4 font-naskh text-[17px] leading-[2.1] whitespace-pre-wrap text-ink">
                  {result.text}
                </p>
                <p className="mt-3 text-xs text-ink-faint">
                  النص معروض حرفيًا كما ورد في قاعدة بيانات القوانين. لفهم تطبيقه على حالتك،{' '}
                  <Link to="/consultation" className="font-semibold text-green-700 underline">
                    اطرح سؤالك في الاستشارة القانونية
                  </Link>
                  .
                </p>
              </Card>
            )}

            {errorMessage && !isSearching && (
              <Card className="p-6 text-center text-sm text-ink-soft">{errorMessage}</Card>
            )}

            {!result && !errorMessage && !isSearching && (
              <Card className="p-10 text-center text-sm text-ink-faint">
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
