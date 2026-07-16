import { ArrowLeft, FileEdit, FileSearch, MessageSquareText, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'

const modes = [
  {
    to: '/consultation',
    icon: MessageSquareText,
    title: 'استشارة قانونية',
    description: 'اطرح سؤالك القانوني واحصل على إجابة موثقة بالمصادر الرسمية.',
  },
  {
    to: '/documents',
    icon: FileSearch,
    title: 'تحليل مستند',
    description: 'ارفع عقدًا أو مستندًا قانونيًا لتحليله واستخراج بنوده الأساسية.',
  },
  {
    to: '/contracts',
    icon: FileEdit,
    title: 'صياغة عقد',
    description: 'اختر قالب عقد وامْلأ بياناته للحصول على مسودة جاهزة للتنزيل.',
  },
  {
    to: '/search',
    icon: Search,
    title: 'البحث القانوني',
    description: 'ابحث في القوانين والمواد المصرية بلغتك الطبيعية.',
  },
]

const quickQuestions = [
  'ما هي مدة الإخطار القانونية لإنهاء عقد العمل؟',
  'ما هي حقوق المستأجر عند تجديد عقد الإيجار؟',
  'كيف يتم تأسيس شركة ذات مسؤولية محدودة في مصر؟',
]

export default function Dashboard() {
  return (
    <AppShell
      title="مرحبًا بك في عدالة"
      description="اختر الطريقة التي تناسب استفسارك القانوني"
    >
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {modes.map(({ to, icon: Icon, title, description }) => (
            <Link key={to} to={to}>
              <Card className="group h-full p-6 transition-shadow hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-900 text-gold-300">
                  <Icon size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-base font-bold text-navy-950">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-600">
                  {description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900">
                  ابدأ الآن
                  <ArrowLeft
                    size={16}
                    className="transition-transform group-hover:-translate-x-1"
                  />
                </span>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-sm font-bold text-navy-500">أسئلة شائعة للبدء بها</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {quickQuestions.map((question) => (
              <Link
                key={question}
                to="/consultation"
                className="rounded-full border border-navy-200 bg-white px-4 py-2 text-sm font-semibold text-navy-700 transition-colors hover:border-navy-400 hover:text-navy-950"
              >
                {question}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
