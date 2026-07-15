import { useState, type FormEvent } from 'react'
import { Lock, LogIn, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import Field from '../components/ui/Field'
import Button from '../components/ui/Button'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="تسجيل الدخول"
      subtitle="أهلًا بعودتك، أدخل بياناتك للمتابعة"
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link to="/signup" className="font-semibold text-navy-900 hover:underline">
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
          <label className="flex items-center gap-2 text-navy-600">
            <input type="checkbox" className="h-4 w-4 rounded border-navy-300" />
            تذكرني
          </label>
          <a href="#" className="font-semibold text-navy-700 hover:text-navy-950">
            نسيت كلمة المرور؟
          </a>
        </div>

        <Button type="submit" size="lg" className="w-full" icon={<LogIn size={18} />}>
          تسجيل الدخول
        </Button>
      </form>
    </AuthLayout>
  )
}
