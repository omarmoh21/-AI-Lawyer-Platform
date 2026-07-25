import { useState, type FormEvent } from 'react'
import { Lock, LogIn, Mail, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth'

export default function Login() {
  const navigate = useNavigate()
  const { login, loginAsGuest } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGuestLoading, setIsGuestLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/consultation')
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGuest = async () => {
    setError(null)
    setIsGuestLoading(true)
    try {
      await loginAsGuest()
      navigate('/consultation')
    } catch {
      setError('تعذّر الدخول كزائر، حاول مرة أخرى')
    } finally {
      setIsGuestLoading(false)
    }
  }

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="أهلًا بعودتك، أدخل بياناتك للمتابعة"
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link to="/signup" className="font-semibold text-green-700 hover:underline">
            إنشاء حساب جديد
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="email"
          type="email"
          label="البريد الإلكتروني"
          placeholder="name@example.com"
          icon={<Mail size={16} />}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Field
          id="password"
          type="password"
          label="كلمة المرور"
          placeholder="••••••••"
          icon={<Lock size={16} />}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-ink-soft">
            <input type="checkbox" className="h-4 w-4 rounded-[3px] border-paper-edge accent-green-600" />
            تذكرني
          </label>
          <a href="#" className="font-semibold text-ink-soft hover:text-ink">
            نسيت كلمة المرور؟
          </a>
        </div>

        {error && <p className="text-sm font-semibold text-rubric-600">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={<LogIn size={18} />}
          disabled={isSubmitting || isGuestLoading}
        >
          {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </Button>

        <div className="flex items-center gap-3 text-xs font-semibold text-ink-soft">
          <span className="h-px flex-1 bg-paper-edge" />
          أو
          <span className="h-px flex-1 bg-paper-edge" />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          icon={<UserRound size={18} />}
          onClick={handleGuest}
          disabled={isSubmitting || isGuestLoading}
        >
          {isGuestLoading ? 'جارٍ الدخول...' : 'الدخول كزائر (بدون حساب)'}
        </Button>
        <p className="text-center text-xs leading-relaxed text-ink-soft/70">
          تجربة سريعة بدون تسجيل — لن يتم حفظ سجلّ المحادثات لحساب الزائر.
        </p>
      </form>
    </AuthLayout>
  )
}
