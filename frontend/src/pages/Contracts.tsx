// MOCK PAGE — UX prototype for contract creation. Preview is client-side
// placeholder substitution on shortened template samples; PDF download
// posts that same preview text to the backend for rendering.

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Briefcase,
  Download,
  FileSignature,
  Home,
  Lock,
  ShoppingBag,
} from 'lucide-react'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { downloadContract } from '../lib/api'

interface FieldDef {
  key: string
  label: string
}

interface ContractDef {
  key: string
  title: string
  description: string
  icon: typeof Home
  fields: FieldDef[]
  template: string
}

// Field keys/labels mirror backend/app/templates/contracts.py (REQUIRED_FIELDS)
// and the Arabic mapping in backend/app/agents/contract_agent.py.
const contracts: ContractDef[] = [
  {
    key: 'rental',
    title: 'عقد إيجار',
    description: 'عقد إيجار أملاك وفق القانون 4 لسنة 1996',
    icon: Home,
    fields: [
      { key: 'SIGNING_DAY', label: 'يوم التوقيع' },
      { key: 'SIGNING_DATE', label: 'تاريخ التوقيع' },
      { key: 'LANDLORD_NAME', label: 'اسم المؤجر' },
      { key: 'LANDLORD_ADDRESS', label: 'عنوان المؤجر' },
      { key: 'TENANT_NAME', label: 'اسم المستأجر' },
      { key: 'TENANT_ADDRESS', label: 'عنوان المستأجر' },
      { key: 'PROPERTY_NUMBER', label: 'رقم العقار' },
      { key: 'PROPERTY_STREET', label: 'الشارع' },
      { key: 'PROPERTY_DISTRICT', label: 'الحي / القسم' },
      { key: 'RENTAL_PURPOSE', label: 'الغرض من الإيجار' },
      { key: 'LEASE_DURATION', label: 'مدة الإيجار' },
      { key: 'START_DATE', label: 'تاريخ البدء' },
      { key: 'END_DATE', label: 'تاريخ الانتهاء' },
      { key: 'RENT_AMOUNT', label: 'قيمة الإيجار' },
      { key: 'JURISDICTION', label: 'الاختصاص القضائي' },
    ],
    template: `عقد إيجار أملاك
في ظل أحكام القانون 4 لسنة 1996

أنه في يوم: {SIGNING_DAY} الموافق: {SIGNING_DATE}
قد أجر السيد: {LANDLORD_NAME} المقيم: {LANDLORD_ADDRESS}
إلى السيد: {TENANT_NAME} المقيم: {TENANT_ADDRESS}
العقار رقم: {PROPERTY_NUMBER} شارع: {PROPERTY_STREET} قسم: {PROPERTY_DISTRICT}
بقصد استعماله: {RENTAL_PURPOSE}

بند 1: مدة الإيجار هي: {LEASE_DURATION} تبدأ من: {START_DATE} وتنتهي في: {END_DATE}
بند 3: الأجرة المتفق عليها هي مبلغ: {RENT_AMOUNT}
بند 16: تختص محكمة {JURISDICTION} الابتدائية بالنظر في أي نزاع.

الطرف الثاني (المستأجر)              الطرف الأول (المؤجر)`,
  },
  {
    key: 'employment',
    title: 'عقد عمل',
    description: 'وفق قانون العمل المصري رقم 12 لسنة 2003',
    icon: Briefcase,
    fields: [
      { key: 'SIGNING_DATE', label: 'تاريخ التوقيع' },
      { key: 'EMPLOYER_NAME', label: 'اسم صاحب العمل' },
      { key: 'EMPLOYER_ADDRESS', label: 'مقر صاحب العمل' },
      { key: 'EMPLOYEE_NAME', label: 'اسم العامل' },
      { key: 'EMPLOYEE_NATIONAL_ID', label: 'الرقم القومي للعامل' },
      { key: 'JOB_TITLE', label: 'المسمى الوظيفي' },
      { key: 'START_DATE', label: 'تاريخ بدء العمل' },
      { key: 'BASIC_SALARY', label: 'الأجر الأساسي (جنيه)' },
      { key: 'DAILY_HOURS', label: 'ساعات العمل اليومية' },
      { key: 'NOTICE_PERIOD', label: 'مدة الإخطار' },
      { key: 'JURISDICTION', label: 'الاختصاص القضائي' },
    ],
    template: `عقد عمل
(وفقاً لأحكام قانون العمل المصري رقم 12 لسنة 2003)

أنه في يوم {SIGNING_DATE} تحرر هذا العقد بين:
الطرف الأول: {EMPLOYER_NAME} — ومقره: {EMPLOYER_ADDRESS}
الطرف الثاني: {EMPLOYEE_NAME} — الرقم القومي: {EMPLOYEE_NATIONAL_ID}

المادة 1: يعمل الطرف الثاني بوظيفة {JOB_TITLE} اعتباراً من {START_DATE}
المادة 3: يتقاضى العامل أجراً أساسياً قدره {BASIC_SALARY} جنيه مصري شهرياً
المادة 4: عدد ساعات العمل اليومية {DAILY_HOURS} ساعات
المادة 9: يجوز الإنهاء بإخطار كتابي مدته {NOTICE_PERIOD}
المادة 10: تختص محاكم {JURISDICTION} بأي نزاع.

صاحب العمل: ______________       العامل: ______________`,
  },
  {
    key: 'nda',
    title: 'اتفاقية سرية',
    description: 'اتفاقية سرية وعدم إفصاح بين طرفين',
    icon: Lock,
    fields: [
      { key: 'SIGNING_DATE', label: 'تاريخ التوقيع' },
      { key: 'DISCLOSING_PARTY_NAME', label: 'الطرف المُفصِح' },
      { key: 'RECEIVING_PARTY_NAME', label: 'الطرف المُتلقّي' },
      { key: 'PURPOSE', label: 'الغرض من الاتفاقية' },
      { key: 'START_DATE', label: 'تاريخ السريان' },
      { key: 'DURATION', label: 'مدة الاتفاقية' },
      { key: 'JURISDICTION', label: 'الاختصاص القضائي' },
    ],
    template: `اتفاقية سرية وعدم إفصاح

أنه في يوم {SIGNING_DATE} تحرر هذا الاتفاق بين:
الطرف المُفصِح: {DISCLOSING_PARTY_NAME}
الطرف المُتلقّي: {RECEIVING_PARTY_NAME}

المادة 1: يتفق الطرفان على تبادل معلومات سرية بغرض: {PURPOSE}
المادة 6: تسري الاتفاقية من {START_DATE} ولمدة {DURATION}
المادة 9: يختص بأي نزاع محاكم {JURISDICTION}.

الطرف المُفصِح: ______________       الطرف المُتلقّي: ______________`,
  },
  {
    key: 'sale',
    title: 'عقد بيع',
    description: 'عقد بيع مع ضمانات القانون المدني',
    icon: ShoppingBag,
    fields: [
      { key: 'SIGNING_DATE', label: 'تاريخ التوقيع' },
      { key: 'SELLER_NAME', label: 'اسم البائع' },
      { key: 'BUYER_NAME', label: 'اسم المشتري' },
      { key: 'ITEM_DESCRIPTION', label: 'وصف المبيع' },
      { key: 'TOTAL_PRICE', label: 'الثمن الإجمالي (جنيه)' },
      { key: 'DOWN_PAYMENT', label: 'المقدم (جنيه)' },
      { key: 'DELIVERY_DATE', label: 'تاريخ التسليم' },
      { key: 'JURISDICTION', label: 'الاختصاص القضائي' },
    ],
    template: `عقد بيع

أنه في يوم {SIGNING_DATE} تحرر هذا العقد بين:
الطرف الأول (البائع): {SELLER_NAME}
الطرف الثاني (المشتري): {BUYER_NAME}

البند الثالث: وصف المبيع: {ITEM_DESCRIPTION}
البند الرابع: تم البيع نظير مبلغ {TOTAL_PRICE} جنيه، منها مقدم {DOWN_PAYMENT} جنيه
البند التاسع: يتسلم المشتري المبيع في {DELIVERY_DATE}
البند الثاني عشر: يختص بأي نزاع محاكم {JURISDICTION}.

البائع: ______________       المشتري: ______________`,
  },
]

export default function Contracts() {
  const [selected, setSelected] = useState<ContractDef | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const preview = useMemo(() => {
    if (!selected) return ''
    return selected.template.replace(/\{([A-Z_]+)\}/g, (_, key: string) => {
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
    <AppShell
      title="إنشاء عقد"
      description="اختر نوع العقد واملأ البيانات لمعاينة نصه"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Badge tone="gold">نسخة تجريبية</Badge>
          <p className="text-xs text-navy-500">
            هذه معاينة أولية لتجربة الاستخدام — يمكنك تنزيل العقد بصيغة PDF.
          </p>
        </div>

        {!selected ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {contracts.map((contract) => {
              const Icon = contract.icon
              return (
                <button
                  key={contract.key}
                  onClick={() => {
                    setSelected(contract)
                    setValues({})
                  }}
                  className="text-start"
                >
                  <Card className="group h-full p-6 transition-shadow hover:shadow-md">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                      <Icon size={20} />
                    </span>
                    <h3 className="mt-4 text-base font-bold text-navy-950">
                      {contract.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-navy-500">
                      {contract.description}
                    </p>
                  </Card>
                </button>
              )
            })}
          </div>
        ) : (
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
                  <h3 className="text-sm font-bold text-navy-900">
                    بيانات {selected.title}
                  </h3>
                  <span className="text-xs font-semibold text-navy-400">
                    {filledCount}/{selected.fields.length} حقل
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {selected.fields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs font-bold text-navy-500">
                        {field.label}
                      </label>
                      <input
                        value={values[field.key] ?? ''}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            [field.key]: event.target.value,
                          }))
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
