import { useRef, useState } from 'react'
import { Camera, IdCard, Mail, MapPin, Pencil, Phone, Trash2, UserRound, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useAuth } from '../lib/auth'

export default function Profile() {
  const navigate = useNavigate()
  const { user, deleteAccount } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    city: user?.city ?? '',
  })
  const [savedForm, setSavedForm] = useState(form)

  const handleAvatarChange = (file: File | undefined) => {
    if (!file) return
    setAvatarUrl(URL.createObjectURL(file))
  }

  const handleCancel = () => {
    setForm(savedForm)
    setIsEditing(false)
  }

  const handleSave = () => {
    setSavedForm(form)
    setIsEditing(false)
  }

  const handleDeleteAccount = async () => {
    setIsDeleteOpen(false)
    await deleteAccount()
    navigate('/')
  }

  return (
    <AppShell title="الملف الشخصي" description="إدارة معلومات حسابك الشخصي">
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Card className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-start">
          <div className="relative shrink-0">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-navy-100 text-navy-500">
              {avatarUrl ? (
                <img src={avatarUrl} alt="الصورة الشخصية" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={36} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-navy-900 text-gold-300 shadow-sm transition-colors hover:bg-navy-800"
              aria-label="تغيير الصورة الشخصية"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => handleAvatarChange(event.target.files?.[0])}
            />
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-navy-950">{savedForm.name}</h2>
            <p className="mt-1 text-sm text-navy-500">{savedForm.email}</p>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-950">البيانات الشخصية</h3>
            {!isEditing ? (
              <Button
                variant="ghost"
                size="md"
                icon={<Pencil size={15} />}
                onClick={() => setIsEditing(true)}
              >
                تعديل البيانات
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="md" icon={<X size={15} />} onClick={handleCancel}>
                  إلغاء
                </Button>
                <Button size="md" onClick={handleSave}>
                  حفظ التغييرات
                </Button>
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field
              id="name"
              label="الاسم الكامل"
              icon={<IdCard size={16} />}
              value={form.name}
              disabled={!isEditing}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <Field
              id="email"
              type="email"
              label="البريد الإلكتروني"
              icon={<Mail size={16} />}
              value={form.email}
              disabled={!isEditing}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <Field
              id="phone"
              type="tel"
              label="رقم الهاتف"
              icon={<Phone size={16} />}
              value={form.phone}
              disabled={!isEditing}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <Field
              id="city"
              label="المدينة"
              icon={<MapPin size={16} />}
              value={form.city}
              disabled={!isEditing}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </div>
        </Card>

        <Card className="border-red-200 p-6">
          <h3 className="text-base font-bold text-red-700">حذف الحساب</h3>
          <p className="mt-2 text-sm leading-relaxed text-navy-600">
            سيؤدي حذف حسابك إلى إزالة جميع بياناتك واستشاراتك ومستنداتك بشكل نهائي. لا يمكن
            التراجع عن هذا الإجراء.
          </p>
          <Button
            size="md"
            className="mt-4 !bg-red-600 hover:!bg-red-700"
            icon={<Trash2 size={15} />}
            onClick={() => setIsDeleteOpen(true)}
          >
            حذف الحساب نهائيًا
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={isDeleteOpen}
        title="هل أنت متأكد من حذف الحساب؟"
        description="هذا الإجراء نهائي ولا يمكن التراجع عنه، وسيتم فقدان جميع بياناتك واستشاراتك."
        confirmLabel="نعم، احذف حسابي"
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </AppShell>
  )
}
