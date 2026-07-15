import { useState } from 'react'
import { BookText, Mic, Scale, Send, ShieldCheck } from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { sampleConsultation } from '../data/content'
import type { ConsultationTurn } from '../types'

export default function Consultation() {
  const [turns, setTurns] = useState<ConsultationTurn[]>([sampleConsultation])
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const latestTurn = turns[turns.length - 1]

  const handleMic = () => {
    if (isRecording) return
    setIsRecording(true)
    window.setTimeout(() => {
      setQuestion('ما هي حقوق العامل في حالة الفصل التعسفي؟')
      setIsRecording(false)
    }, 1800)
  }

  const handleSubmit = () => {
    const trimmed = question.trim()
    if (!trimmed || isThinking) return

    setIsThinking(true)
    setQuestion('')

    window.setTimeout(() => {
      setTurns((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          question: trimmed,
          answer: sampleConsultation.answer,
          sources: sampleConsultation.sources,
        },
      ])
      setIsThinking(false)
    }, 1100)
  }

  return (
    <AppShell
      title="استشارة قانونية"
      description="اطرح سؤالك وسنجيب بالاستناد إلى مصادر القانون المصري"
    >
      <div className="mx-auto flex max-w-6xl gap-6 px-6 py-8">
        <div className="flex-1 space-y-6">
          {turns.map((turn) => (
            <div key={turn.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="max-w-xl rounded-2xl rounded-tl-sm bg-navy-900 px-5 py-3 text-white">
                  <p className="text-sm leading-relaxed">{turn.question}</p>
                </div>
              </div>

              <Card className="p-6">
                <div className="mb-3 flex items-center gap-2 text-gold-600">
                  <Scale size={16} />
                  <span className="text-xs font-bold">الإجابة القانونية</span>
                </div>
                <p className="text-sm leading-relaxed text-navy-800">
                  {turn.answer}
                </p>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
                  {turn.sources.map((source) => (
                    <span
                      key={source.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-3 py-1.5 text-xs font-semibold text-navy-700"
                    >
                      <BookText size={13} />
                      {source.title} — {source.article}
                    </span>
                  ))}
                </div>
              </Card>
            </div>
          ))}

          {isThinking && (
            <Card className="flex items-center gap-2 p-6 text-sm text-navy-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold-500" />
              جارٍ البحث في المصادر القانونية...
            </Card>
          )}

          <div className="sticky bottom-0 flex items-end gap-3 rounded-2xl border border-navy-100 bg-white p-3 shadow-sm">
            <button
              type="button"
              onClick={handleMic}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                isRecording
                  ? 'animate-pulse bg-red-500 text-white'
                  : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
              }`}
              aria-label="التحدث بدلاً من الكتابة"
            >
              <Mic size={18} />
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
              placeholder="اكتب سؤالك القانوني هنا..."
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-400"
            />
            <Button
              size="md"
              onClick={handleSubmit}
              disabled={!question.trim() || isThinking}
              icon={<Send size={16} />}
            >
              إرسال
            </Button>
          </div>
        </div>

        <aside className="hidden w-80 shrink-0 lg:block">
          <Card className="sticky top-24 p-6">
            <div className="flex items-center gap-2 text-navy-900">
              <ShieldCheck size={18} className="text-gold-600" />
              <h3 className="text-sm font-bold">المصادر المستخدمة</h3>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-navy-500">
              المواد القانونية التي استندت إليها آخر إجابة.
            </p>

            <div className="mt-4 space-y-3">
              {latestTurn.sources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-xl border border-navy-100 p-3"
                >
                  <p className="text-xs font-bold text-navy-900">
                    {source.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gold-600">
                    {source.article}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-navy-500">
                    {source.snippet}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </AppShell>
  )
}
