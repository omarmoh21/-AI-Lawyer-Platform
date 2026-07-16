import { useState } from 'react'
import { BookText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { lookupArticle, type ArticleResponse } from '../lib/api'

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
  const [lawName, setLawName] = useState('')
  const [articleNumber, setArticleNumber] = useState('')
  const [result, setResult] = useState<ArticleResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const canSearch = lawName.trim().length >= 2 && Number(articleNumber) >= 1

  const runLookup = async () => {
    if (!canSearch || isSearching) return
    setIsSearching(true)
    setResult(null)
    setErrorMessage(null)
    try {
      const article = await lookupArticle(lawName.trim(), Number(articleNumber))
      setResult(article)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <AppShell
      title="البحث في مواد القانون"
      description="اعرض النص الحرفي لأي مادة قانونية باسم القانون ورقم المادة"
    >
      <div className="mx-auto max-w-4xl px-6 py-8">
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
            <Card className="p-6 text-center text-sm text-navy-500">
              {errorMessage}
            </Card>
          )}

          {!result && !errorMessage && !isSearching && (
            <Card className="p-10 text-center text-sm text-navy-400">
              اختر القانون واكتب رقم المادة لعرض نصها الحرفي — مرجع مباشر دون تحليل.
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
