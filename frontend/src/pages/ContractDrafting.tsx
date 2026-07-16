import { useState } from 'react'
import {
  ArrowRight,
  Download,
  FileEdit,
  Globe2,
  Landmark,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Field from '../components/ui/Field'
import { contractTemplates } from '../data/content'
import type { ContractTemplate } from '../types'

type Step = 'pick' | 'fill' | 'preview'

function generateContractText(template: ContractTemplate, values: Record<string, string>) {
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
  const body = template.fields
    .map((field) => `${field.label}: ${values[field.id]?.trim() || '—'}`)
    .join('\n')

  return `${template.title}\nمُحرَّر بتاريخ ${today}\n\n${body}\n\nيقر الطرفان بالاطلاع على بنود هذا العقد والموافقة عليها، وبأن هذه المسودة أُعدت آليًا وتستوجب مراجعة محامٍ مرخص قبل التوقيع.`
}

export default function ContractDrafting() {
  const [step, setStep] = useState<Step>('pick')
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)

  const localTemplates = contractTemplates.filter((template) => template.source === 'local')
  const lawhubTemplates = contractTemplates.filter((template) => template.source === 'lawhub')

  const pickTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template)
    setValues(Object.fromEntries(template.fields.map((field) => [field.id, ''])))
    setStep('fill')
  }

  const generateContract = () => {
    if (!selectedTemplate) return
    setGenerating(true)
    window.setTimeout(() => {
      setGenerating(false)
      setStep('preview')
    }, 1200)
  }

  const downloadContract = () => {
    if (!selectedTemplate) return
    const text = generateContractText(selectedTemplate, values)
    const blob = new Blob([text], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${selectedTemplate.title}.doc`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const reset = () => {
    setStep('pick')
    setSelectedTemplate(null)
    setValues({})
    setGenerating(false)
  }

  const allFieldsFilled =
    !!selectedTemplate && selectedTemplate.fields.every((field) => values[field.id]?.trim())

  return (
    <AppShell
      title="صياغة عقد"
      description="اختر قالبًا وامْلأ بياناته لإنشاء مسودة عقد جاهزة للتنزيل"
    >
      <div className="mx-auto max-w-5xl px-6 py-8">
        {step !== 'pick' && (
          <div className="mb-4 flex justify-end">
            <Button variant="ghost" size="md" icon={<RotateCcw size={16} />} onClick={reset}>
              قالب جديد
            </Button>
          </div>
        )}

        {step === 'pick' && (
          <div className="space-y-8">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <Landmark size={16} className="text-gold-600" />
                قوالب محلية
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {localTemplates.map((template) => (
                  <button key={template.id} type="button" onClick={() => pickTemplate(template)} className="text-right">
                    <Card className="h-full p-5 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                          <FileEdit size={18} />
                        </span>
                        <Badge tone="navy">{template.category}</Badge>
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-navy-950">{template.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-navy-500">{template.description}</p>
                    </Card>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-navy-900">
                <Globe2 size={16} className="text-gold-600" />
                قوالب من lawhub.info
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {lawhubTemplates.map((template) => (
                  <button key={template.id} type="button" onClick={() => pickTemplate(template)} className="text-right">
                    <Card className="h-full p-5 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                          <FileEdit size={18} />
                        </span>
                        <Badge tone="gold">{template.category}</Badge>
                      </div>
                      <h3 className="mt-4 text-sm font-bold text-navy-950">{template.title}</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-navy-500">{template.description}</p>
                    </Card>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'fill' && selectedTemplate && (
          <Card className="p-6">
            <div className="flex items-center gap-3 border-b border-navy-100 pb-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                <FileEdit size={20} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy-900">{selectedTemplate.title}</h3>
                <p className="text-xs text-navy-500">أدخل بيانات العقد ثم أنشئ المسودة</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {selectedTemplate.fields.map((field) =>
                field.multiline ? (
                  <div key={field.id} className="sm:col-span-2">
                    <label htmlFor={field.id} className="mb-1.5 block text-sm font-semibold text-navy-800">
                      {field.label}
                    </label>
                    <textarea
                      id={field.id}
                      rows={3}
                      value={values[field.id] ?? ''}
                      onChange={(event) => setValues((prev) => ({ ...prev, [field.id]: event.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full resize-none rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-400 focus:border-navy-400"
                    />
                  </div>
                ) : (
                  <Field
                    key={field.id}
                    id={field.id}
                    label={field.label}
                    placeholder={field.placeholder}
                    value={values[field.id] ?? ''}
                    onChange={(event) => setValues((prev) => ({ ...prev, [field.id]: event.target.value }))}
                  />
                ),
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-navy-100 pt-5">
              <Button variant="ghost" size="md" icon={<ArrowRight size={16} />} onClick={() => setStep('pick')}>
                اختيار قالب آخر
              </Button>
              <Button
                size="md"
                icon={generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                disabled={!allFieldsFilled || generating}
                onClick={generateContract}
              >
                {generating ? 'جارٍ إنشاء العقد...' : 'إنشاء العقد'}
              </Button>
            </div>
          </Card>
        )}

        {step === 'preview' && selectedTemplate && (
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3 border-b border-navy-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-navy-900">مسودة {selectedTemplate.title}</h3>
                <p className="text-xs text-navy-500">راجع النص قبل التنزيل، ويُنصح بمراجعته مع محامٍ مرخص</p>
              </div>
              <Button size="md" icon={<Download size={16} />} onClick={downloadContract}>
                تنزيل العقد
              </Button>
            </div>

            <pre className="mt-5 whitespace-pre-wrap rounded-xl bg-navy-50/60 p-5 text-sm leading-relaxed text-navy-800">
              {generateContractText(selectedTemplate, values)}
            </pre>

            <div className="mt-5 flex justify-end border-t border-navy-100 pt-4">
              <Button variant="secondary" size="md" onClick={() => setStep('fill')}>
                تعديل البيانات
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
