import { useState, type FormEvent } from 'react'
import { Lock, Mail, User, UserPlus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="إنشاء حساب جديد"
      subtitle="سجّل مجانًا وابدأ استشارتك القانونية الأولى"
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="font-semibold text-navy-900 hover:underline">
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
          id="password"
          type="password"
          label="كلمة المرور"
          placeholder="••••••••"
          icon={<Lock size={16} />}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <p className="text-xs leading-relaxed text-navy-500">
          بإنشاء الحساب، أنت توافق على{' '}
          <a href="#" className="font-semibold text-navy-700 hover:underline">
            الشروط والأحكام
          </a>{' '}
          و{' '}
          <a href="#" className="font-semibold text-navy-700 hover:underline">
            سياسة الخصوصية
          </a>
          .
        </p>

        <Button type="submit" size="lg" className="w-full" icon={<UserPlus size={18} />}>
          إنشاء الحساب
        </Button>
      </form>
    </AuthLayout>
  )
}
