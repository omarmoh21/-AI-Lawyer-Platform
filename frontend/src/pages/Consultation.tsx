import { useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  FileText,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Scale,
  ScanText,
  Send,
  X,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import AnswerText from '../components/ui/AnswerText'
import ChatHistorySidebar from '../components/consultation/ChatHistorySidebar'
import {
  extractDocuments,
  getSessionMessages,
  reviewDocuments,
  sendChat,
} from '../lib/api'
import { startLiveTranscription, type LiveSession } from '../lib/liveTranscribe'
import type { ChatMessageOut } from '../lib/api'
import type { ConsultationTurn } from '../types'

function messagesToTurns(messages: ChatMessageOut[]): ConsultationTurn[] {
  const turns: ConsultationTurn[] = []
  for (let i = 0; i + 1 < messages.length; i += 2) {
    turns.push({
      id: crypto.randomUUID(),
      question: messages[i].content,
      answer: messages[i + 1].content,
      sources: [],
    })
  }
  return turns
}

const quickPrompts = [
  'عقوبة السرقة في القانون المصري',
  'حقوق المستأجر عند انتهاء العقد',
  'ما هي المادة 234 من قانون العقوبات؟',
  'إجراءات الفصل التعسفي في قانون العمل',
]

const methodLabels: Record<string, string> = {
  direct: 'استخراج مباشر (بدون OCR)',
  ocr: 'استخراج ضوئي (OCR)',
  mixed: 'استخراج مختلط (مباشر + OCR)',
}

interface PendingReview {
  threadId: string
  question: string
  fileNames: string[]
  extractedText: string
  extractionMethod: string
}

export default function Consultation() {
  const [searchParams] = useSearchParams()
  const [turns, setTurns] = useState<ConsultationTurn[]>([])
  const [question, setQuestion] = useState(searchParams.get('q') ?? '')
  const [attachments, setAttachments] = useState<File[]>([])
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const liveRef = useRef<LiveSession | null>(null)
  const questionBaseRef = useRef('')
  const finalizedRef = useRef('')

  const busy = isThinking || pendingReview !== null

  const pushTurn = (q: string, answer: string) => {
    setTurns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: q, answer, sources: [] },
    ])
  }

  const failTurn = (q: string, error: unknown) => {
    pushTurn(
      q,
      `⚠️ تعذر الاتصال بالخادم: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const handleNewChat = () => {
    // Clear the session id so the backend starts a fresh conversation.
    setSessionId(null)
    setTurns([])
    setQuestion('')
    setAttachments([])
    setPendingReview(null)
    setIsThinking(false)
  }

  const handleSelectSession = async (id: string) => {
    if (id === sessionId || busy) return
    setIsThinking(true)
    try {
      const messages = await getSessionMessages(id)
      setTurns(messagesToTurns(messages))
      setSessionId(id)
      setQuestion('')
      setAttachments([])
      setPendingReview(null)
    } catch (error) {
      failTurn('استرجاع المحادثة', error)
    } finally {
      setIsThinking(false)
    }
  }

  const stopLive = async () => {
    const live = liveRef.current
    liveRef.current = null
    setIsRecording(false)
    // Drop any dangling interim text; keep only what was committed.
    setQuestion(questionBaseRef.current + finalizedRef.current)
    if (live) {
      try {
        await live.stop()
      } catch {
        /* already stopped */
      }
    }
  }

  const handleMic = async () => {
    if (isTranscribing) return
    if (isRecording) {
      await stopLive()
      return
    }
    setMicError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('التسجيل الصوتي غير مدعوم في هذا المتصفح')
      return
    }

    setIsTranscribing(true)
    questionBaseRef.current = question.trim() ? `${question.trim()} ` : ''
    finalizedRef.current = ''
    try {
      const live = await startLiveTranscription({
        onPartial: (text) => {
          const sep = finalizedRef.current && text ? ' ' : ''
          setQuestion(questionBaseRef.current + finalizedRef.current + sep + text)
        },
        onFinal: (text) => {
          if (text) finalizedRef.current += (finalizedRef.current ? ' ' : '') + text
          setQuestion(questionBaseRef.current + finalizedRef.current)
        },
        onError: (message) => {
          setMicError(message)
          void stopLive()
        },
      })
      liveRef.current = live
      setIsTranscribing(false)
      setIsRecording(true)
    } catch (error) {
      setMicError(
        error instanceof Error
          ? error.message
          : 'تعذّر الوصول إلى الميكروفون — تأكد من منح الإذن',
      )
      setIsTranscribing(false)
    }
  }

  const handleAttach = (files: FileList | null) => {
    if (!files) return
    setAttachments((prev) => [...prev, ...Array.from(files)])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const askSupervisor = async (q: string, extractedText = '', label?: string) => {
    setIsThinking(true)
    try {
      const result = await sendChat(q, sessionId, extractedText)
      setSessionId(result.session_id)
      pushTurn(label ?? q, result.response)
      setHistoryRefreshKey((key) => key + 1)
    } catch (error) {
      failTurn(label ?? q, error)
    } finally {
      setIsThinking(false)
    }
  }

  const handleSubmit = async () => {
    const trimmed = question.trim()
    if (!trimmed || busy) return

    setQuestion('')

    // No attachments → straight to the supervisor.
    if (attachments.length === 0) {
      await askSupervisor(trimmed)
      return
    }

    // Attachments → extract first, then pause for inline human review.
    const files = attachments
    setAttachments([])
    setIsThinking(true)
    try {
      const result = await extractDocuments(files, trimmed)
      setPendingReview({
        threadId: result.thread_id,
        question: trimmed,
        fileNames: files.map((f) => f.name),
        extractedText:
          result.status === 'review'
            ? (result.extracted_text ?? '')
            : (result.final_text ?? ''),
        extractionMethod: result.extraction_method ?? '',
      })
    } catch (error) {
      failTurn(trimmed, error)
    } finally {
      setIsThinking(false)
    }
  }

  const handleApproveReview = async () => {
    if (!pendingReview) return
    const { threadId, question: q, fileNames, extractedText } = pendingReview
    setPendingReview(null)
    setIsThinking(true)
    try {
      const reviewed = await reviewDocuments(threadId, 'edit', {
        text: extractedText,
      })
      await askSupervisor(
        q,
        reviewed.final_text ?? extractedText,
        `${q}\n📎 ${fileNames.join('، ')}`,
      )
    } catch (error) {
      failTurn(q, error)
      setIsThinking(false)
    }
  }

  const handleRetryReview = async () => {
    if (!pendingReview) return
    const current = pendingReview
    setPendingReview(null)
    setIsThinking(true)
    try {
      const result = await reviewDocuments(current.threadId, 'retry', {
        feedback: 'النص المستخرج غير دقيق — أعد الاستخراج بعناية أكبر.',
      })
      setPendingReview({
        ...current,
        extractedText:
          result.status === 'review'
            ? (result.extracted_text ?? '')
            : (result.final_text ?? ''),
        extractionMethod: result.extraction_method ?? current.extractionMethod,
      })
    } catch (error) {
      failTurn(current.question, error)
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <AppShell
      title="استشارة قانونية"
      description="اطرح سؤالك — ويمكنك إرفاق مستند (PDF أو صورة) ليُحلَّل ضمن الإجابة"
    >
      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-8">
        <div className="flex-1 space-y-6">
          {(turns.length > 0 || busy) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-xs font-semibold text-navy-600 transition-colors hover:border-navy-400 hover:text-navy-900"
              >
                <Plus size={14} />
                محادثة جديدة
              </button>
            </div>
          )}

          {turns.length === 0 && !busy && (
            <Card className="p-8 text-center">
              <p className="text-sm text-navy-400">
                ابدأ بطرح سؤالك القانوني — تستند الإجابات إلى قاعدة بيانات القوانين المصرية.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuestion(prompt)}
                    className="rounded-lg bg-navy-50 px-3 py-2 text-xs font-semibold text-navy-600 transition-colors hover:bg-navy-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-xl rounded-2xl rounded-tl-sm bg-navy-900 px-5 py-3 text-white">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.question}</p>
                </div>
              </div>

              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2 text-gold-600">
                  <Scale size={16} />
                  <span className="text-xs font-bold">الإجابة القانونية</span>
                </div>
                <AnswerText>{turn.answer}</AnswerText>
              </Card>
            </div>
          ))}

          {pendingReview && (
            <Card className="border-gold-200 p-6">
              <div className="mb-3 flex items-center gap-2 text-gold-700">
                <ScanText size={16} />
                <span className="text-xs font-bold">
                  مراجعة النص المستخرج —{' '}
                  {methodLabels[pendingReview.extractionMethod] ?? 'تم الاستخراج'}
                </span>
              </div>
              <p className="mb-2 text-xs text-navy-500">
                راجع النص المستخرج من ({pendingReview.fileNames.join('، ')}) وعدّله إن لزم،
                ثم اضغط "اعتماد ومتابعة".
              </p>
              <textarea
                value={pendingReview.extractedText}
                onChange={(event) =>
                  setPendingReview({ ...pendingReview, extractedText: event.target.value })
                }
                dir="rtl"
                className="min-h-48 w-full resize-y rounded-xl border border-navy-100 bg-white p-3 text-xs leading-relaxed text-navy-800 outline-none focus:border-navy-300"
              />
              <div className="mt-3 flex gap-2">
                <Button size="md" icon={<CheckCircle2 size={16} />} onClick={handleApproveReview}>
                  اعتماد ومتابعة
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  icon={<ScanText size={16} />}
                  onClick={handleRetryReview}
                >
                  إعادة الاستخراج
                </Button>
              </div>
            </Card>
          )}

          {isThinking && (
            <Card className="flex items-center gap-2 p-6 text-sm text-navy-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
              {attachments.length > 0 || pendingReview
                ? 'جارٍ المعالجة...'
                : 'جارٍ البحث في المصادر القانونية...'}
            </Card>
          )}

          <div className="sticky bottom-0 rounded-2xl border border-navy-100 bg-white p-3 shadow-sm">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-1">
                {attachments.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700"
                  >
                    <FileText size={13} />
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-navy-400 hover:text-red-500"
                      aria-label="إزالة الملف"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-600 transition-colors hover:bg-navy-100"
                aria-label="إرفاق مستند"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(event) => handleAttach(event.target.files)}
              />
              <button
                type="button"
                onClick={handleMic}
                disabled={isTranscribing}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isRecording
                    ? 'animate-pulse bg-red-500 text-white'
                    : isTranscribing
                      ? 'bg-navy-100 text-navy-400'
                      : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                }`}
                aria-label={
                  isRecording
                    ? 'إيقاف التسجيل'
                    : isTranscribing
                      ? 'جارٍ التفريغ'
                      : 'التحدث بدلاً من الكتابة'
                }
                title={isRecording ? 'اضغط لإيقاف التسجيل' : 'التحدث بدلاً من الكتابة'}
              >
                {isTranscribing ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Mic size={18} />
                )}
              </button>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                rows={1}
                placeholder="اكتب سؤالك القانوني هنا... (يمكنك إرفاق PDF أو صورة)"
                className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-400"
              />
              <Button
                size="md"
                onClick={handleSubmit}
                disabled={!question.trim() || busy}
                icon={<Send size={16} />}
              >
                إرسال
              </Button>
            </div>

            {(isRecording || isTranscribing || micError) && (
              <p
                className={`mt-2 px-1 text-xs font-semibold ${
                  micError ? 'text-red-600' : 'text-navy-500'
                }`}
              >
                {isRecording
                  ? '● جارٍ التسجيل والتفريغ المباشر... اضغط على الميكروفون للإيقاف'
                  : isTranscribing
                    ? 'جارٍ الاتصال بخدمة التفريغ...'
                    : micError}
              </p>
            )}
          </div>
        </div>

        <aside className="hidden w-64 shrink-0 lg:block">
          <ChatHistorySidebar
            activeSessionId={sessionId}
            refreshKey={historyRefreshKey}
            onSelect={handleSelectSession}
            onNewChat={handleNewChat}
          />
        </aside>
      </div>
    </AppShell>
  )
}
