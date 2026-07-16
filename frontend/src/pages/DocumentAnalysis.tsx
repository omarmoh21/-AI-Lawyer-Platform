import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  RefreshCw,
  RotateCcw,
  UploadCloud,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { ocrPages } from '../data/content'
import type { OcrPage } from '../types'

type Stage = 'idle' | 'extracting' | 'reviewing' | 'analyzing' | 'analyzed'

const keyClauses = [
  { title: 'مدة العقد', detail: 'العقد ساري لمدة سنة واحدة قابلة للتجديد التلقائي.' },
  { title: 'الإخطار بالإنهاء', detail: 'يتطلب إخطارًا كتابيًا قبل الإنهاء بستين يومًا.' },
  { title: 'الشرط الجزائي', detail: 'غرامة تأخير تعادل 1% من قيمة العقد عن كل أسبوع تأخير.' },
]

const risks = [
  'لا يوجد بند صريح لتسوية النزاعات أو تحديد جهة التقاضي المختصة.',
  'الشرط الجزائي قد يُعتبر مبالغًا فيه ويجوز للقاضي تعديله وفق المادة 224 مدني.',
]

export default function DocumentAnalysis() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [pages, setPages] = useState<OcrPage[]>([])
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [retryingPageId, setRetryingPageId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activePage = pages.find((page) => page.id === activePageId) ?? null

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setStage('extracting')
    window.setTimeout(() => {
      setPages(ocrPages.map((page) => ({ ...page })))
      setActivePageId(ocrPages[0]?.id ?? null)
      setStage('reviewing')
    }, 1400)
  }

  const updatePageText = (pageId: string, text: string) => {
    setPages((prev) => prev.map((page) => (page.id === pageId ? { ...page, extractedText: text } : page)))
  }

  const retryPage = (pageId: string) => {
    setRetryingPageId(pageId)
    window.setTimeout(() => {
      const original = ocrPages.find((page) => page.id === pageId)
      if (original) updatePageText(pageId, original.extractedText)
      setRetryingPageId(null)
    }, 1100)
  }

  const approveAndAnalyze = () => {
    setStage('analyzing')
    window.setTimeout(() => {
      setStage('analyzed')
    }, 1300)
  }

  const reset = () => {
    setFileName(null)
    setStage('idle')
    setPages([])
    setActivePageId(null)
    setRetryingPageId(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <AppShell
      title="تحليل مستند"
      description="ارفع عقدًا أو مستندًا قانونيًا لمراجعة النص المستخرج ثم تحليل بنوده الأساسية"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        {fileName && (
          <div className="mb-4 flex justify-end">
            <Button variant="ghost" size="md" icon={<RotateCcw size={16} />} onClick={reset}>
              تحليل مستند جديد
            </Button>
          </div>
        )}

        {stage !== 'reviewing' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              {stage === 'idle' ? (
                <label
                  htmlFor="document-upload"
                  className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-navy-200 px-6 py-16 text-center transition-colors hover:border-navy-400 hover:bg-navy-50"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-navy-600">
                    <UploadCloud size={24} />
                  </span>
                  <p className="mt-4 text-sm font-bold text-navy-900">
                    اسحب المستند هنا أو اضغط للرفع
                  </p>
                  <p className="mt-1 text-xs text-navy-500">
                    يدعم صيغ المستندات الشائعة وصور المستندات الممسوحة ضوئيًا
                  </p>
                  <input
                    ref={inputRef}
                    id="document-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                </label>
              ) : (
                <div>
                  <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy-900">{fileName}</p>
                      <p className="text-xs text-navy-500">
                        {stage === 'extracting' && 'جارٍ استخراج النص من المستند...'}
                        {stage === 'analyzing' && 'جارٍ تحليل بنود المستند...'}
                        {stage === 'analyzed' && 'تم التحليل بنجاح'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {[...Array(8)].map((_, index) => (
                      <div
                        key={index}
                        className="h-3 animate-pulse rounded bg-navy-100"
                        style={{
                          width: `${90 - (index % 3) * 15}%`,
                          opacity: stage === 'extracting' || stage === 'analyzing' ? 1 : 0.4,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              {stage === 'idle' && (
                <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-navy-400">
                  سيظهر التحليل والملخص هنا بعد رفع المستند
                </div>
              )}

              {(stage === 'extracting' || stage === 'analyzing') && (
                <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-navy-500">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                  {stage === 'extracting' ? 'جارٍ استخراج النص...' : 'جارٍ تحليل بنود المستند...'}
                </div>
              )}

              {stage === 'analyzed' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">الملخص</h3>
                    <p className="mt-2 text-sm leading-relaxed text-navy-600">
                      عقد عمل غير محدد المدة بين طرفين، يتضمن شرطًا جزائيًا عند التأخير
                      وبندًا لمدة الإخطار القانونية عند الإنهاء.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-navy-900">البنود الأساسية</h3>
                    <div className="mt-3 space-y-3">
                      {keyClauses.map((clause) => (
                        <div key={clause.title} className="flex gap-3 rounded-xl border border-navy-100 p-3">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-600" />
                          <div>
                            <p className="text-xs font-bold text-navy-900">{clause.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-navy-500">{clause.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-navy-900">نقاط تستدعي الانتباه</h3>
                    <div className="mt-3 space-y-3">
                      {risks.map((risk) => (
                        <div key={risk} className="flex gap-3 rounded-xl bg-gold-50 p-3">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold-700" />
                          <p className="text-xs leading-relaxed text-navy-700">{risk}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {stage === 'reviewing' && activePage && (
          <div>
            <div className="mb-4 rounded-xl bg-gold-50 px-4 py-3 text-xs font-semibold text-gold-800">
              راجع النص المستخرج من كل صفحة وعدّله عند الحاجة قبل المتابعة إلى التحليل.
            </div>

            <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePageId(page.id)}
                    className={`flex shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-colors lg:shrink ${
                      page.id === activePageId
                        ? 'border-navy-900 bg-navy-900 text-white'
                        : 'border-navy-100 bg-white text-navy-600 hover:border-navy-300'
                    }`}
                  >
                    <span
                      className={`flex h-16 w-12 items-center justify-center rounded-lg border-2 border-dashed text-[10px] ${
                        page.id === activePageId ? 'border-gold-300 text-gold-200' : 'border-navy-200 text-navy-400'
                      }`}
                    >
                      <FileText size={18} />
                    </span>
                    {page.thumbnailLabel}
                  </button>
                ))}
              </div>

              <Card className="p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-navy-900">
                    النص المستخرج — {activePage.thumbnailLabel}
                  </h3>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<RefreshCw size={15} className={retryingPageId === activePage.id ? 'animate-spin' : ''} />}
                    disabled={retryingPageId === activePage.id}
                    onClick={() => retryPage(activePage.id)}
                  >
                    إعادة الاستخراج
                  </Button>
                </div>

                <textarea
                  value={activePage.extractedText}
                  onChange={(event) => updatePageText(activePage.id, event.target.value)}
                  disabled={retryingPageId === activePage.id}
                  rows={10}
                  className="mt-4 w-full resize-none rounded-xl border border-navy-200 bg-navy-50/40 p-4 text-sm leading-relaxed text-navy-800 outline-none transition-colors focus:border-navy-400 disabled:opacity-50"
                />

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-navy-100 pt-4">
                  <p className="text-xs text-navy-500">
                    صفحة {pages.findIndex((p) => p.id === activePage.id) + 1} من {pages.length}
                  </p>
                  <Button size="md" icon={<ClipboardCheck size={16} />} onClick={approveAndAnalyze}>
                    اعتماد النص والمتابعة للتحليل
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
