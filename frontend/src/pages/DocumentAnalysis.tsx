import { useRef, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  RotateCcw,
  ScanText,
  UploadCloud,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { extractDocuments, reviewDocuments, sendChat } from '../lib/api'

type Phase = 'idle' | 'extracting' | 'review' | 'analyzing' | 'done' | 'error'

const methodLabels: Record<string, string> = {
  direct: 'استخراج مباشر من ملف PDF (بدون OCR)',
  ocr: 'استخراج ضوئي (OCR) عبر Gemini',
  mixed: 'مختلط — بعض الصفحات مباشرة وبعضها OCR',
}

export default function DocumentAnalysis() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [threadId, setThreadId] = useState<string | null>(null)
  const [extractedText, setExtractedText] = useState('')
  const [extractionMethod, setExtractionMethod] = useState('')
  const [analysis, setAnalysis] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const fail = (error: unknown) => {
    setErrorMessage(error instanceof Error ? error.message : String(error))
    setPhase('error')
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    setPhase('extracting')
    setAnalysis('')
    setErrorMessage('')

    try {
      const result = await extractDocuments([file])
      setThreadId(result.thread_id)
      if (result.status === 'review') {
        setExtractedText(result.extracted_text ?? '')
        setExtractionMethod(result.extraction_method ?? '')
        setPhase('review')
      } else {
        setExtractedText(result.final_text ?? '')
        setPhase('review')
      }
    } catch (error) {
      fail(error)
    }
  }

  const handleApprove = async () => {
    if (!threadId) return
    setPhase('analyzing')
    try {
      // Confirm the extraction (allows the user's edits to the textarea),
      // then send the verified text to the supervisor for legal analysis.
      const reviewed = await reviewDocuments(threadId, 'edit', {
        text: extractedText,
      })
      const finalText = reviewed.final_text ?? extractedText
      const chat = await sendChat(
        'حلّل هذه الوثيقة القانونية: حدد نوعها وأطرافها والتزاماتها الأساسية وأي بنود تستدعي الانتباه.',
        null,
        finalText,
      )
      setAnalysis(chat.response)
      setPhase('done')
    } catch (error) {
      fail(error)
    }
  }

  const handleRetry = async () => {
    if (!threadId) return
    setPhase('extracting')
    try {
      const result = await reviewDocuments(threadId, 'retry', {
        feedback: 'النص المستخرج غير دقيق — أعد الاستخراج بعناية أكبر.',
      })
      if (result.status === 'review') {
        setExtractedText(result.extracted_text ?? '')
        setExtractionMethod(result.extraction_method ?? '')
        setPhase('review')
      } else {
        setExtractedText(result.final_text ?? '')
        setPhase('review')
      }
    } catch (error) {
      fail(error)
    }
  }

  const reset = () => {
    setFileName(null)
    setPhase('idle')
    setThreadId(null)
    setExtractedText('')
    setExtractionMethod('')
    setAnalysis('')
    setErrorMessage('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <AppShell
      title="تحليل مستند"
      description="ارفع عقدًا أو مستندًا قانونيًا لاستخراج نصه ومراجعته ثم تحليله قانونيًا"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        {fileName && (
          <div className="mb-4 flex justify-end">
            <Button variant="ghost" size="md" icon={<RotateCcw size={16} />} onClick={reset}>
              تحليل مستند جديد
            </Button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Right card: upload + extracted text review ── */}
          <Card className="p-6">
            {!fileName ? (
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
                  يدعم ملفات PDF وصور JPG / PNG
                </p>
                <input
                  ref={inputRef}
                  id="document-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>
            ) : (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 rounded-xl bg-navy-50 p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
                    <FileText size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-navy-900">{fileName}</p>
                    <p className="text-xs text-navy-500">
                      {phase === 'extracting' && 'جارٍ استخراج النص...'}
                      {phase === 'review' &&
                        (methodLabels[extractionMethod] ?? 'تم الاستخراج — راجع النص')}
                      {phase === 'analyzing' && 'جارٍ التحليل القانوني...'}
                      {phase === 'done' && 'اكتمل التحليل'}
                      {phase === 'error' && 'حدث خطأ'}
                    </p>
                  </div>
                </div>

                {(phase === 'review' || phase === 'analyzing' || phase === 'done') && (
                  <>
                    <p className="mt-4 text-xs font-bold text-navy-500">
                      النص المستخرج (يمكنك تعديله قبل التحليل):
                    </p>
                    <textarea
                      value={extractedText}
                      onChange={(event) => setExtractedText(event.target.value)}
                      readOnly={phase !== 'review'}
                      dir="rtl"
                      className="mt-2 min-h-64 flex-1 resize-y rounded-xl border border-navy-100 bg-white p-3 text-xs leading-relaxed text-navy-800 outline-none focus:border-navy-300"
                    />
                    {phase === 'review' && (
                      <div className="mt-3 flex gap-2">
                        <Button size="md" icon={<CheckCircle2 size={16} />} onClick={handleApprove}>
                          اعتماد النص والتحليل
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          icon={<ScanText size={16} />}
                          onClick={handleRetry}
                        >
                          إعادة الاستخراج
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {phase === 'extracting' && (
                  <div className="mt-4 space-y-2">
                    {[...Array(8)].map((_, index) => (
                      <div
                        key={index}
                        className="h-3 animate-pulse rounded bg-navy-100"
                        style={{ width: `${90 - (index % 3) * 15}%` }}
                      />
                    ))}
                  </div>
                )}

                {phase === 'error' && (
                  <p className="mt-4 rounded-xl bg-red-50 p-4 text-xs leading-relaxed text-red-700">
                    ⚠️ {errorMessage}
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* ── Left card: legal analysis ── */}
          <Card className="p-6">
            {phase === 'idle' && (
              <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-navy-400">
                سيظهر التحليل القانوني هنا بعد رفع المستند واعتماد النص المستخرج
              </div>
            )}

            {(phase === 'extracting' || phase === 'review') && (
              <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-navy-400">
                {phase === 'review'
                  ? 'راجع النص المستخرج ثم اضغط "اعتماد النص والتحليل"'
                  : 'بانتظار استخراج النص...'}
              </div>
            )}

            {phase === 'analyzing' && (
              <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-navy-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
                جارٍ تحليل بنود المستند قانونيًا...
              </div>
            )}

            {phase === 'done' && (
              <div>
                <h3 className="text-sm font-bold text-navy-900">التحليل القانوني</h3>
                <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-navy-700">
                  {analysis}
                </p>
              </div>
            )}

            {phase === 'error' && (
              <div className="flex min-h-80 flex-col items-center justify-center text-center text-sm text-red-600">
                تعذر إتمام العملية — جرّب رفع المستند مرة أخرى.
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
