// Contract builder — templates (full text + labeled fields) come from the
// backend (GET /api/contracts/templates), which is the single source of truth
// mirroring backend/app/templates/contracts.py. The user fills fields, previews
// the substituted text live, and downloads it as a PDF.

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  Download,
  FileSignature,
  HandCoins,
  Handshake,
  HardHat,
  Home,
  Lock,
  ShoppingBag,
  UserCheck,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { downloadContract, getContractTemplates, type ContractTemplate } from '../lib/api'

// Icons are presentation-only, keyed by the backend contract type.
const ICONS: Record<string, typeof Home> = {
  rental: Home,
  employment: Briefcase,
  nda: Lock,
  sale: ShoppingBag,
  contracting: HardHat,
  agency: UserCheck,
  loan: HandCoins,
  partnership: Handshake,
}

export default function Contracts() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selected, setSelected] = useState<ContractTemplate | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    getContractTemplates()
      .then(setTemplates)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : 'تعذّر تحميل نماذج العقود'),
      )
      .finally(() => setIsLoading(false))
  }, [])

  const preview = useMemo(() => {
    if (!selected) return ''
    return selected.template.replace(/\{([A-Z0-9_]+)\}/g, (_, key: string) => {
      const value = values[key]?.trim()
      return value ? value : '________'
    })
  }, [selected, values])

  const filledCount = selected
    ? selected.fields.filter((f) => values[f.key]?.trim()).length
    : 0

  const handleDownload = async () => {
    if (!selected) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadContract(selected.key, selected.title, preview)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'تعذّر تنزيل الملف')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <AppShell title="إنشاء عقد" description="اختر نوع العقد واملأ البيانات لمعاينة نصه وتنزيله">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {isLoading && (
          <Card className="p-10 text-center text-sm text-navy-400">
            جارٍ تحميل نماذج العقود...
          </Card>
        )}

        {loadError && !isLoading && (
          <Card className="p-8 text-center text-sm text-red-600">{loadError}</Card>
        )}

        {!isLoading && !loadError && !selected && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {templates.map((contract) => {
              const Icon = ICONS[contract.key] ?? FileSignature
              return (
                <button
                  key={contract.key}
                  onClick={() => {
                    setSelected(contract)
                    setValues({})
                    setDownloadError(null)
                  }}
                  className="text-start"
                >
                  <Card className="group h-full p-6 transition-shadow hover:shadow-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-base font-bold text-navy-950">{contract.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                      {contract.description}
                    </p>
                  </Card>
                </button>
              )
            })}
          </div>
        )}

        {selected && (
          <>
            <button
              onClick={() => setSelected(null)}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:text-navy-900"
            >
              <ArrowRight size={16} />
              اختيار نوع آخر
            </button>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-navy-900">بيانات {selected.title}</h3>
                  <span className="text-xs font-semibold text-navy-400">
                    {filledCount}/{selected.fields.length} حقل
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {selected.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-bold text-navy-500">{field.label}</label>
                      <input
                        value={values[field.key] ?? ''}
                        onChange={(event) =>
                          setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                        }
                        className="mt-1.5 w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900 outline-none focus:border-navy-400"
                      />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="flex flex-col p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gold-600">
                    <FileSignature size={16} />
                    <span className="text-xs font-bold">معاينة العقد</span>
                  </div>
                  <Button
                    size="md"
                    icon={<Download size={16} />}
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? 'جارٍ التنزيل...' : 'تنزيل PDF'}
                  </Button>
                </div>
                {downloadError && (
                  <p className="mt-2 text-xs font-semibold text-red-600">{downloadError}</p>
                )}
                <pre
                  dir="rtl"
                  className="mt-4 flex-1 overflow-auto rounded-xl bg-navy-50 p-4 font-[inherit] text-xs leading-loose whitespace-pre-wrap text-navy-800"
                >
                  {preview}
                </pre>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
