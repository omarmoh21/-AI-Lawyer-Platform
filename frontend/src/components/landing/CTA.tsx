import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../ui/Button'

export default function CTA() {
  return (
    <section className="bg-navy-50 py-20">
      <div className="mx-auto max-w-4xl rounded-3xl bg-navy-900 px-8 py-14 text-center sm:px-16">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          ابدأ رحلتك القانونية اليوم
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-navy-200">
          استشارة قانونية، تحليل مستند، أو بحث في القوانين — كل ذلك في منصة واحدة
          مصممة للمستخدم المصري.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/signup">
            <Button size="lg" icon={<ArrowLeft size={18} />}>
              أنشئ حسابك المجاني
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="lg"
              variant="secondary"
              className="!bg-transparent !text-white !border-white/20 hover:!bg-white/10"
            >
              تسجيل الدخول
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
