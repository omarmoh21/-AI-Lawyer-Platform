import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  BookText,
  Briefcase,
  CheckCircle2,
  FileText,
  Home,
  Loader2,
  Mic,
  Paperclip,
  Scale,
  ScanText,
  Send,
  SquarePen,
  X,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Button from '../components/ui/Button'
import Illumination from '../components/ui/Illumination'
import AnswerText from '../components/ui/AnswerText'
import ChatHistorySidebar from '../components/consultation/ChatHistorySidebar'
import {
  extractDocuments,
  getSessionMessages,
  reviewDocuments,
  streamChat,
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

const suggestions = [
  { icon: Scale, tag: 'جنائي', q: 'ما عقوبة السرقة في القانون المصري؟' },
  { icon: Home, tag: 'إيجارات', q: 'ما حقوق المستأجر عند انتهاء عقد الإيجار؟' },
  { icon: Briefcase, tag: 'عمل', q: 'ما إجراءات الفصل التعسفي في قانون العمل؟' },
  { icon: BookText, tag: 'مواد', q: 'اشرح لي المادة 234 من قانون العقوبات.' },
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

// A rubricated section label — gold diamond + red-brown caption, the way a
// scribe marks a new section of the page.
function Rubric({ label }: { label: string }) {
  return (
    <div className="mb-2.5 flex items-center gap-2">
      <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-rubric-500" />
      <span className="font-naskh text-xs font-bold tracking-[0.15em] text-rubric-600">
        {label}
      </span>
    </div>
  )
}

// Illuminated divider between exchanges — a gold lozenge on a hairline rule.
function TurnDivider() {
  return (
    <div className="my-8 flex items-center gap-3" aria-hidden>
      <span className="h-px flex-1 bg-paper-edge" />
      <span className="h-2 w-2 rotate-45 border border-gold-500/70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-gold-400/60" />
      <span className="h-2 w-2 rotate-45 border border-gold-500/70" />
      <span className="h-px flex-1 bg-paper-edge" />
    </div>
  )
}

// A single question→answer exchange, set as a page of legal responsa.
function Exchange({
  question,
  answer,
  streaming,
  pending,
}: {
  question: string
  answer?: string
  streaming?: boolean
  pending?: boolean
}) {
  return (
    <article className="animate-rise">
      <div className="border-e-2 border-e-gold-400/50 pe-4">
        <Rubric label="المسألة" />
        <p className="font-naskh text-lg leading-[1.95] whitespace-pre-wrap text-ink">
          {question}
        </p>
      </div>

      <div className="mt-6">
        <Rubric label="الجواب" />
        {pending ? (
          <Consulting label="جارٍ الرجوع إلى نصوص القانون..." />
        ) : (
          <AnswerText streaming={streaming}>{answer ?? ''}</AnswerText>
        )}
      </div>
    </article>
  )
}

// Three staggered pen-strokes — "consulting the texts".
function Consulting({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-sm text-ink-soft">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600"
            style={{ animationDelay: `${i * 180}ms` }}
          />
        ))}
      </span>
      {label}
    </span>
  )
}

// A faint scales-of-justice watermark pressed into the page.
function PageWatermark() {
  return (
    <div aria-hidden className="pointer-events-none sticky top-0 z-0 h-0 overflow-visible">
      <div className="flex h-[74vh] items-center justify-center">
        <svg
          viewBox="0 0 200 220"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[340px] max-w-[62%] text-ink opacity-[0.035]"
        >
          <circle cx="100" cy="32" r="5.5" />
          <line x1="100" y1="37" x2="100" y2="190" />
          <line x1="36" y1="56" x2="164" y2="56" />
          <path d="M80 190 Q100 176 120 190" />
          <line x1="70" y1="194" x2="130" y2="194" />
          <line x1="36" y1="56" x2="22" y2="96" />
          <line x1="36" y1="56" x2="50" y2="96" />
          <path d="M16 96 A26 26 0 0 0 56 96" />
          <line x1="164" y1="56" x2="150" y2="96" />
          <line x1="164" y1="56" x2="178" y2="96" />
          <path d="M144 96 A26 26 0 0 0 184 96" />
        </svg>
      </div>
    </div>
  )
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
  const [streamingTurn, setStreamingTurn] = useState<{ question: string; answer: string } | null>(
    null,
  )
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [fileInputKey, setFileInputKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeQuestionRef = useRef<HTMLDivElement>(null)
  const liveRef = useRef<LiveSession | null>(null)
  const questionBaseRef = useRef('')
  const finalizedRef = useRef('')

  const busy = isThinking || streamingTurn !== null || pendingReview !== null

  // Grow the composer with its content, up to a ceiling.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [question])

  // When a new answer starts, bring its question to the top so the reader
  // follows the answer as it's written — like turning to a fresh page.
  useEffect(() => {
    if (streamingTurn) {
      activeQuestionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [streamingTurn?.question])

  const pushTurn = (q: string, answer: string) => {
    setTurns((prev) => [...prev, { id: crypto.randomUUID(), question: q, answer, sources: [] }])
  }

  const failTurn = (q: string, error: unknown) => {
    pushTurn(
      q,
      `⚠️ تعذر الاتصال بالخادم: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const handlePrompt = (q: string) => {
    setQuestion(q)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleNewChat = () => {
    setSessionId(null)
    setTurns([])
    setQuestion('')
    setAttachments([])
    setPendingReview(null)
    setIsThinking(false)
    setStreamingTurn(null)
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
      failTurn('استرجاع المسألة', error)
    } finally {
      setIsThinking(false)
    }
  }

  // Resume a session when arrived at via /consultation?session=<id> (from الديوان).
  const sessionParam = searchParams.get('session')
  useEffect(() => {
    if (sessionParam) void handleSelectSession(sessionParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam])

  const stopLive = async () => {
    const live = liveRef.current
    liveRef.current = null
    setIsRecording(false)
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
    setFileInputKey((key) => key + 1)
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const askSupervisor = async (q: string, extractedText = '', label?: string) => {
    const displayQuestion = label ?? q
    setIsThinking(true)
    setStreamingTurn({ question: displayQuestion, answer: '' })
    try {
      for await (const event of streamChat(q, sessionId, extractedText)) {
        if (event.type === 'session') {
          setSessionId(event.session_id)
        } else if (event.type === 'chunk') {
          setIsThinking(false)
          setStreamingTurn((prev) => (prev ? { ...prev, answer: prev.answer + event.text } : prev))
        } else if (event.type === 'error') {
          throw new Error(event.message)
        } else if (event.type === 'done') {
          pushTurn(displayQuestion, event.response)
          setHistoryRefreshKey((key) => key + 1)
        }
      }
    } catch (error) {
      failTurn(displayQuestion, error)
    } finally {
      setStreamingTurn(null)
      setIsThinking(false)
    }
  }

  const handleSubmit = async () => {
    const trimmed = question.trim()
    if (!trimmed || busy) return

    setQuestion('')

    if (attachments.length === 0) {
      await askSupervisor(trimmed)
      return
    }

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
          result.status === 'review' ? (result.extracted_text ?? '') : (result.final_text ?? ''),
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
      const reviewed = await reviewDocuments(threadId, 'edit', { text: extractedText })
      await askSupervisor(q, reviewed.final_text ?? extractedText, `${q}\n📎 ${fileNames.join('، ')}`)
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
          result.status === 'review' ? (result.extracted_text ?? '') : (result.final_text ?? ''),
        extractionMethod: result.extraction_method ?? current.extractionMethod,
      })
    } catch (error) {
      failTurn(current.question, error)
    } finally {
      setIsThinking(false)
    }
  }

  const isEmpty = turns.length === 0 && !busy
  const hasConversation = turns.length > 0 || busy

  return (
    <AppShell
      title="الاستشارة القانونية"
      description="اطرح مسألتك — ويمكنك إرفاق مستند (PDF أو صورة) ليُحلَّل ضمن الإجابة"
    >
      <div className="mx-auto flex h-full max-w-7xl gap-5 px-4 py-6 sm:px-6">
        {/* The codex — a paper page framed by the dark margins */}
        <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[8px] border border-paper-edge bg-paper shadow-[0_16px_50px_rgba(0,0,0,0.4)]">
          {/* Ruled gutter along the start (right) edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 z-0 w-8 border-s border-rubric-500/10 bg-paper-deep/25 sm:w-11"
          />

          {/* Page header strip */}
          <div className="relative z-20 flex shrink-0 items-center justify-between border-b border-paper-edge/80 bg-paper/80 px-5 py-2.5 backdrop-blur-sm sm:px-8">
            <span className="font-naskh text-sm font-bold text-ink-soft">
              {hasConversation ? 'صحيفة الاستشارة' : 'صحيفة جديدة'}
            </span>
            {hasConversation && (
              <button
                type="button"
                onClick={handleNewChat}
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-paper-edge px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-green-300 hover:text-green-700"
              >
                <SquarePen size={14} />
                مسألة جديدة
              </button>
            )}
          </div>

          {/* Scroll surface */}
          <div className="relative min-h-0 flex-1 overflow-y-auto">
            <PageWatermark />

            <div className="rule-line relative z-10 px-5 py-8 sm:px-10">
              {isEmpty && (
                <div className="mx-auto max-w-xl py-8 text-center">
                  <Illumination className="mx-auto w-44" />
                  <h2 className="mt-6 font-naskh text-2xl font-bold text-ink">
                    اكتب مسألتك في هذه الصحيفة
                  </h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
                    اطرح سؤالك بالعامية أو الفصحى، أو أملِهِ صوتًا، أو أرفِق مستندًا —
                    وتُبنى الإجابة على نصِّ القانون المصري، سؤالًا وجوابًا.
                  </p>
                  <div className="mt-9 grid gap-3 text-start sm:grid-cols-2">
                    {suggestions.map(({ icon: Icon, tag, q }) => (
                      <button
                        key={q}
                        onClick={() => handlePrompt(q)}
                        className="group flex items-start gap-3 rounded-[5px] border border-paper-edge bg-paper-deep/30 p-4 text-start transition-colors hover:border-green-300 hover:bg-paper-deep/70"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-gold-500/40 bg-paper text-green-600 transition-colors group-hover:border-gold-500">
                          <Icon size={16} strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-bold tracking-wide text-gold-600">
                            {tag}
                          </span>
                          <span className="mt-0.5 block font-naskh text-sm leading-relaxed text-ink">
                            {q}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {turns.map((turn, index) => (
                <div key={turn.id}>
                  {index > 0 && <TurnDivider />}
                  <Exchange question={turn.question} answer={turn.answer} />
                </div>
              ))}

              {streamingTurn && (
                <div>
                  {turns.length > 0 && <TurnDivider />}
                  <div ref={activeQuestionRef} className="scroll-mt-16">
                    <Exchange
                      question={streamingTurn.question}
                      answer={streamingTurn.answer}
                      streaming={streamingTurn.answer !== ''}
                      pending={streamingTurn.answer === ''}
                    />
                  </div>
                </div>
              )}

              {pendingReview && (
                <div className="mt-8 rounded-[6px] border border-gold-500/30 bg-paper-deep/40 p-5">
                  <div className="mb-3 flex items-center gap-2 text-green-700">
                    <ScanText size={16} />
                    <span className="font-naskh text-sm font-bold">
                      مراجعة النص المستخرج — {methodLabels[pendingReview.extractionMethod] ?? 'تم الاستخراج'}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-ink-soft">
                    راجع النص المستخرج من ({pendingReview.fileNames.join('، ')}) وعدّله إن لزم، ثم اعتمِدهُ للمتابعة.
                  </p>
                  <textarea
                    value={pendingReview.extractedText}
                    onChange={(event) =>
                      setPendingReview({ ...pendingReview, extractedText: event.target.value })
                    }
                    dir="rtl"
                    className="min-h-48 w-full resize-y rounded-[4px] border border-paper-edge bg-white/70 p-3 font-naskh text-sm leading-relaxed text-ink outline-none focus:border-green-600"
                  />
                  <div className="mt-3 flex gap-2">
                    <Button size="md" icon={<CheckCircle2 size={16} />} onClick={handleApproveReview}>
                      اعتماد ومتابعة
                    </Button>
                    <Button variant="secondary" size="md" icon={<ScanText size={16} />} onClick={handleRetryReview}>
                      إعادة الاستخراج
                    </Button>
                  </div>
                </div>
              )}

              {isThinking && !streamingTurn && !pendingReview && (
                <div className="mt-8">
                  <Consulting label="جارٍ المعالجة..." />
                </div>
              )}
            </div>
          </div>

          {/* Composer — the foot of the page */}
          <div className="z-20 shrink-0 border-t border-paper-edge bg-paper/95 px-4 py-3 sm:px-6">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 px-1">
                {attachments.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-[4px] bg-paper-deep px-3 py-1.5 text-xs font-semibold text-ink-soft"
                  >
                    <FileText size={13} />
                    {file.name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-ink-faint hover:text-rubric-600"
                      aria-label="إزالة الملف"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 rounded-[6px] border border-paper-edge bg-paper-deep/30 p-1.5 focus-within:border-green-400">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] text-ink-soft transition-colors hover:bg-paper hover:text-green-700"
                aria-label="إرفاق مستند"
                title="إرفاق مستند"
              >
                <Paperclip size={18} />
              </button>
              <input
                key={fileInputKey}
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
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] transition-colors ${
                  isRecording
                    ? 'animate-pulse bg-rubric-600 text-paper'
                    : isTranscribing
                      ? 'text-ink-faint'
                      : 'text-ink-soft hover:bg-paper hover:text-green-700'
                }`}
                aria-label={
                  isRecording ? 'إيقاف التسجيل' : isTranscribing ? 'جارٍ التفريغ' : 'التحدث بدلاً من الكتابة'
                }
                title={isRecording ? 'اضغط لإيقاف التسجيل' : 'التحدث بدلاً من الكتابة'}
              >
                {isTranscribing ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
              </button>
              <textarea
                ref={textareaRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
                rows={1}
                placeholder="اكتب مسألتك القانونية هنا..."
                className="max-h-40 flex-1 resize-none self-center bg-transparent px-2 py-2 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-faint"
              />
              <Button size="md" onClick={handleSubmit} disabled={!question.trim() || busy} icon={<Send size={16} />}>
                إرسال
              </Button>
            </div>

            {(isRecording || isTranscribing || micError) && (
              <p
                className={`mt-2 px-1 text-xs font-semibold ${micError ? 'text-rubric-600' : 'text-ink-soft'}`}
              >
                {isRecording
                  ? '● جارٍ التسجيل والتفريغ المباشر... اضغط على الميكروفون للإيقاف'
                  : isTranscribing
                    ? 'جارٍ الاتصال بخدمة التفريغ...'
                    : micError}
              </p>
            )}
          </div>
        </section>

        <aside className="hidden w-64 shrink-0 lg:block">
          <ChatHistorySidebar
            activeSessionId={sessionId}
            refreshKey={historyRefreshKey}
            onSelect={handleSelectSession}
            onNewChat={handleNewChat}
            onDelete={(id) => {
              if (id === sessionId) handleNewChat()
            }}
          />
        </aside>
      </div>
    </AppShell>
  )
}
