import { useState, type FormEvent } from 'react'
import { Lock, Mail, MapPin, Phone, User, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth'

export default function Signup() {
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
      return
    }

    setIsSubmitting(true)
    try {
      await signup(name, email, phone, city, password)
      navigate('/consultation')
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'Email already registered'
          ? 'هذا البريد الإلكتروني مسجّل بالفعل'
          : 'حدث خطأ أثناء إنشاء الحساب، حاول مرة أخرى',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      subtitle="سجّل مجانًا وابدأ استشارتك القانونية الأولى"
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-semibold text-green-700 hover:underline">
            تسجيل الدخول
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field
          id="name"
          type="text"
          label="الاسم الكامل"
          placeholder="أحمد محمد"
          icon={<User size={16} />}
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
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
          id="phone"
          type="tel"
          label="رقم الهاتف"
          placeholder="01012345678"
          icon={<Phone size={16} />}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
        <Field
          id="city"
          type="text"
          label="المدينة"
          placeholder="القاهرة"
          icon={<MapPin size={16} />}
          value={city}
          onChange={(event) => setCity(event.target.value)}
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

        <p className="text-xs leading-relaxed text-ink-soft">
          بإنشاء الحساب، أنت توافق على{' '}
          <a href="#" className="font-semibold text-green-700 hover:underline">
            الشروط والأحكام
          </a>{' '}
          و{' '}
          <a href="#" className="font-semibold text-green-700 hover:underline">
            سياسة الخصوصية
          </a>
          .
        </p>

        {error && <p className="text-sm font-semibold text-rubric-600">{error}</p>}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          icon={<UserPlus size={18} />}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
        </Button>
      </form>
    </AuthLayout>
  )
}
