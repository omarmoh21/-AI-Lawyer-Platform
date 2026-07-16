import type { ContractTemplate, ConsultationTurn, OcrPage, SearchResult, UserProfile } from '../types'

export const currentUser: UserProfile = {
  name: 'أحمد محمد السيد',
  email: 'ahmed.mohamed@example.com',
  phone: '01012345678',
  city: 'القاهرة',
  joinedAt: 'يناير 2026',
  avatarUrl: null,
}

export const features = [
  {
    id: 'consultation',
    title: 'استشارات قانونية ذكية',
    description:
      'اطرح سؤالك القانوني واحصل على إجابة واضحة مبنية على القانون المصري، وليس مجرد نص عام.',
  },
  {
    id: 'documents',
    title: 'تحليل المستندات والعقود',
    description:
      'ارفع عقدًا أو مستندًا قانونيًا لاستخراج البنود الأساسية وتلخيصها في دقائق.',
  },
  {
    id: 'search',
    title: 'بحث قانوني دلالي',
    description:
      'ابحث في القوانين والأحكام المصرية بلغتك الطبيعية، لا حاجة لمعرفة رقم المادة مسبقًا.',
  },
  {
    id: 'voice',
    title: 'مساعد صوتي',
    description:
      'تحدث بدلاً من الكتابة، ودع المنصة تحوّل صوتك إلى استشارة قانونية كاملة.',
  },
  {
    id: 'summary',
    title: 'تلخيص المستندات',
    description:
      'ملخصات موجزة ودقيقة للمستندات القانونية المعقدة، بدون تفويت أي بند جوهري.',
  },
  {
    id: 'sources',
    title: 'إجابات موثقة بالمصادر',
    description:
      'كل إجابة مرفقة بالمواد القانونية والمصادر الرسمية التي استندت إليها.',
  },
]

export const howItWorks = [
  {
    step: '01',
    title: 'اطرح سؤالك أو ارفع مستندك',
    description: 'اكتب استفسارك القانوني بصيغتك الطبيعية أو ارفع عقدًا للتحليل.',
  },
  {
    step: '02',
    title: 'نبحث في القانون المصري',
    description:
      'تسترجع المنصة القوانين والمواد ذات الصلة من مصادر رسمية موثوقة.',
  },
  {
    step: '03',
    title: 'تحصل على إجابة موثقة',
    description: 'إجابة واضحة مدعومة بالمصادر القانونية التي استُخدمت في تكوينها.',
  },
]

export const legalCoverage = [
  'القانون المدني المصري',
  'قانون العمل',
  'قانون الشركات',
  'قانون الأسرة والأحوال الشخصية',
  'القانون الجنائي',
  'قانون الإيجارات',
]

export const sampleConsultation: ConsultationTurn = {
  id: 't1',
  question: 'ما هي مدة الإخطار القانونية لإنهاء عقد العمل غير محدد المدة؟',
  answer:
    'وفقًا لقانون العمل المصري، يجب على أي من طرفي عقد العمل غير محدد المدة إخطار الطرف الآخر كتابةً قبل إنهاء العقد بمدة لا تقل عن شهرين إذا كانت مدة خدمة العامل حتى عشر سنوات، وثلاثة أشهر إذا زادت مدة الخدمة عن ذلك.',
  sources: [
    {
      id: 's1',
      title: 'قانون العمل المصري رقم 12 لسنة 2003',
      article: 'المادة 111',
      snippet: 'يجوز لطرفي عقد العمل غير محدد المدة إنهاؤه بشرط إخطار الطرف الآخر كتابة...',
    },
    {
      id: 's2',
      title: 'قانون العمل المصري رقم 12 لسنة 2003',
      article: 'المادة 122',
      snippet: 'في حالة إنهاء العقد دون مراعاة مدة الإخطار، يستحق الطرف الآخر تعويضًا...',
    },
  ],
}

export const searchResults: SearchResult[] = [
  {
    id: 'r1',
    title: 'إنهاء عقد العمل غير محدد المدة',
    category: 'قانون العمل',
    snippet:
      'أحكام إخطار إنهاء عقد العمل غير محدد المدة والمهل القانونية الواجب مراعاتها بين الطرفين.',
    article: 'المادة 111',
    date: '2003',
  },
  {
    id: 'r2',
    title: 'الشروط الجزائية في العقود المدنية',
    category: 'القانون المدني',
    snippet: 'تنظيم الشرط الجزائي وحق القاضي في تعديله إذا كان مبالغًا فيه أو صوريًا.',
    article: 'المادة 224',
    date: '1948',
  },
  {
    id: 'r3',
    title: 'حقوق المستأجر عند تجديد عقد الإيجار',
    category: 'قانون الإيجارات',
    snippet: 'الأحكام المنظمة لتجديد عقود الإيجار القديمة وحقوق كل من المالك والمستأجر.',
    article: 'المادة 18',
    date: '1996',
  },
  {
    id: 'r4',
    title: 'تأسيس الشركات ذات المسؤولية المحدودة',
    category: 'قانون الشركات',
    snippet: 'الإجراءات والشروط القانونية اللازمة لتأسيس شركة ذات مسؤولية محدودة في مصر.',
    article: 'المادة 8',
    date: '1981',
  },
]

export const searchFilters = {
  categories: [
    'القانون المدني',
    'قانون العمل',
    'قانون الشركات',
    'قانون الأسرة',
    'قانون الإيجارات',
  ],
  authorities: ['مجلس الدولة', 'المحكمة الدستورية', 'محكمة النقض', 'الجريدة الرسمية'],
}

export const contractTemplates: ContractTemplate[] = [
  {
    id: 'rental',
    title: 'عقد إيجار',
    description: 'عقد إيجار وحدة سكنية أو تجارية بين مالك ومستأجر.',
    source: 'local',
    category: 'قانون الإيجارات',
    fields: [
      { id: 'landlord', label: 'اسم المؤجر' },
      { id: 'tenant', label: 'اسم المستأجر' },
      { id: 'property', label: 'وصف العقار وعنوانه', multiline: true },
      { id: 'duration', label: 'مدة الإيجار', placeholder: 'مثال: سنة واحدة' },
      { id: 'rent', label: 'قيمة الإيجار الشهري' },
    ],
  },
  {
    id: 'employment',
    title: 'عقد عمل',
    description: 'عقد عمل بين صاحب عمل وموظف، محدد أو غير محدد المدة.',
    source: 'local',
    category: 'قانون العمل',
    fields: [
      { id: 'employer', label: 'اسم صاحب العمل' },
      { id: 'employee', label: 'اسم الموظف' },
      { id: 'position', label: 'المسمى الوظيفي' },
      { id: 'salary', label: 'الراتب الشهري' },
      { id: 'startDate', label: 'تاريخ بدء العمل' },
    ],
  },
  {
    id: 'nda',
    title: 'اتفاقية عدم إفصاح',
    description: 'اتفاقية حفاظ على سرية المعلومات بين طرفين.',
    source: 'local',
    category: 'القانون المدني',
    fields: [
      { id: 'partyA', label: 'الطرف الأول' },
      { id: 'partyB', label: 'الطرف الثاني' },
      { id: 'purpose', label: 'الغرض من مشاركة المعلومات', multiline: true },
      { id: 'duration', label: 'مدة الالتزام بالسرية', placeholder: 'مثال: سنتان' },
    ],
  },
  {
    id: 'sale',
    title: 'عقد بيع',
    description: 'عقد بيع منقول أو عقار بين بائع ومشترٍ.',
    source: 'local',
    category: 'القانون المدني',
    fields: [
      { id: 'seller', label: 'اسم البائع' },
      { id: 'buyer', label: 'اسم المشتري' },
      { id: 'item', label: 'وصف المبيع', multiline: true },
      { id: 'price', label: 'الثمن الإجمالي' },
    ],
  },
  {
    id: 'lawhub-partnership',
    title: 'عقد شراكة تجارية',
    description: 'قالب من مكتبة lawhub لتأسيس شراكة بين طرفين أو أكثر.',
    source: 'lawhub',
    category: 'قانون الشركات',
    fields: [
      { id: 'partners', label: 'أسماء الشركاء', multiline: true },
      { id: 'capital', label: 'رأس المال ونسب المساهمة' },
      { id: 'activity', label: 'نشاط الشركة' },
    ],
  },
  {
    id: 'lawhub-poa',
    title: 'توكيل عام',
    description: 'قالب من مكتبة lawhub لتوكيل شخص للتصرف نيابة عن آخر.',
    source: 'lawhub',
    category: 'القانون المدني',
    fields: [
      { id: 'principal', label: 'اسم الموكِّل' },
      { id: 'agent', label: 'اسم الوكيل' },
      { id: 'scope', label: 'نطاق التوكيل وصلاحياته', multiline: true },
    ],
  },
]

export const ocrPages: OcrPage[] = [
  {
    id: 'p1',
    pageNumber: 1,
    thumbnailLabel: 'صفحة 1',
    extractedText:
      'عقد عمل\nمبرم بين الطرف الأول (صاحب العمل) والطرف الثاني (الموظف) بتاريخ اليوم الموافق...\nيلتزم الطرف الثاني بأداء العمل المتفق عليه بموجب المسمى الوظيفي المحدد، مقابل راتب شهري يُدفع في نهاية كل شهر ميلادي.',
  },
  {
    id: 'p2',
    pageNumber: 2,
    thumbnailLabel: 'صفحة 2',
    extractedText:
      'مدة العقد: يسري هذا العقد لمدة سنة واحدة قابلة للتجديد التلقائي ما لم يُخطر أحد الطرفين الآخر كتابةً برغبته في عدم التجديد قبل انتهاء المدة بستين يومًا.\nالشرط الجزائي: في حال التأخير في الوفاء بالالتزامات، يستحق الطرف المتضرر تعويضًا يعادل 1% من قيمة العقد عن كل أسبوع تأخير.',
  },
]
