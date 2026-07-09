import { Scale } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-navy-800 bg-navy-950 text-navy-300">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gold-300">
              <Scale size={18} strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-lg font-extrabold text-white">عدالة</p>
              <p className="text-sm text-navy-400">مستشارك القانوني الذكي</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-3 font-semibold text-white">المنصة</p>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white">المزايا</a></li>
                <li><a href="#how-it-works" className="hover:text-white">كيف تعمل</a></li>
                <li><a href="#trust" className="hover:text-white">نطاق التغطية</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-semibold text-white">قانوني</p>
              <ul className="space-y-2">
                <li>إخلاء المسؤولية</li>
                <li>سياسة الخصوصية</li>
                <li>الشروط والأحكام</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-navy-400">
          <p>
            عدالة منصة معلومات قانونية مدعومة بالذكاء الاصطناعي، ولا تُعد بديلاً عن
            استشارة محامٍ مرخص. المحتوى المقدم لأغراض إرشادية ولا يشكل رأيًا قانونيًا
            ملزمًا.
          </p>
          <p className="mt-3">© {new Date().getFullYear()} عدالة. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  )
}
