# RX Clinic — Next.js PWA

نظام إدارة العيادات والوصفات الطبية (نسخة Next.js 15)

## التشغيل السريع

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000)

## حسابات التجربة

| الدور | الهاتف | كلمة المرور |
|-------|--------|-------------|
| أدمن | `+963950000000` | `admin123` |

- **تسجيل طبيب جديد:** `/auth/signup` — يحصل تلقائياً على تجربة 14 يوماً
- **دخول الأدمن:** `/auth/admin`

## المرحلة 1 (مكتملة)

- Next.js 15 + TypeScript + Tailwind v4 + RTL عربي
- Prisma schema كامل (SQLite للتطوير)
- NextAuth v5 (دخول بالهاتف + أدوار)
- Middleware للمسارات والأدوار
- فحص الاشتراك في layouts
- Layouts: طبيب / أدمن / سكرتير
- Dexie skeleton (`rx_db`) جاهز للمرحلة 3
- Seed: أدمن + 5 باقات + عينة أدوية عراقية

## المرحلة 2 (مكتملة)

- **API:** مرضى، أدوية، وصفات، حقول مخصصة، استيراد كتالوج
- **`/home`:** كاتب الوصفات (حفظ، حفظ+طباعة، تعديل، مريض جديد)
- **`/patients`:** CRUD + سجل المريض
- **`/pharmaceutical`:** مكتبة الأدوية + استيراد التصنيفات
- **`/prescriptions`:** سجل الوصفات + معاينة + طباعة أساسية

قاعدة البيانات المحلية في `data/dev.db` (خارج جذر المشروع). عند ربط MySQL لاحقاً غيّر `DATABASE_URL` فقط.

## قاعدة البيانات

متصلة بـ **PostgreSQL** (بيانات Laravel الحية). المخطط مُستخرج عبر `prisma db pull`.

```env
DATABASE_URL="postgresql://rxuser:***@188.245.154.191:5432/rxdb?schema=public"
```

## المرحلة 3 (مكتملة) — الأوفلاين

- **IndexedDB (Dexie):** مرضى، أدوية، وصفات، مواعيد، حقول، إعدادات
- **API مزامنة:** `/api/sync/hydrate`, `/changes`, `/bulk`
- **Sync Queue:** حفظ أوفلاين → مزامنة FIFO عند العودة
- **Serwist PWA:** Service Worker + Background Sync
- **مؤشرات:** أوفلاين/متصل + badge "X تغييرات بانتظار المزامنة"
- **تحميل تلقائي** لبيانات الطبيب عند الدخول

## المرحلة 4 (التالية)

- `/home` — كاتب الوصفات
- CRUD المرضى والأدوية
- API routes كاملة

## أوامر مفيدة

```bash
npm run dev        # تشغيل التطوير
npm run build      # بناء الإنتاج
npm run db:studio  # واجهة قاعدة البيانات
```
