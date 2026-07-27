"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useLocale, type Locale } from "@/i18n/locale-provider";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocument = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

const TERMS: Record<Locale, LegalDocument> = {
  ar: {
    eyebrow: "وثيقة قانونية",
    title: "شروط الاستخدام",
    intro:
      "تنظّم هذه الشروط استخدام منصة RX Clinic لإدارة العيادات والمرضى والمواعيد والوصفات والعمليات المرتبطة بها.",
    updated: "آخر تحديث: 27 تموز 2026",
    sections: [
      {
        title: "1. قبول الشروط",
        paragraphs: [
          "بإنشاء حساب أو استخدام المنصة، فإنك تقر بقراءة هذه الشروط والموافقة عليها. إذا كنت تستخدم المنصة باسم عيادة أو مؤسسة، فأنت تؤكد امتلاكك الصلاحية لتمثيلها.",
        ],
      },
      {
        title: "2. الحسابات والصلاحيات",
        bullets: [
          "يجب تقديم معلومات صحيحة وحديثة عند التسجيل والمحافظة على سرية بيانات الدخول.",
          "يتحمل مالك حساب العيادة مسؤولية دعوة العاملين وتحديد صلاحياتهم وإلغاء وصولهم عند انتهاء عملهم.",
          "يجب إبلاغنا فور الاشتباه باستخدام غير مصرح به للحساب.",
        ],
      },
      {
        title: "3. الاستخدام الطبي ومسؤولية المستخدم",
        paragraphs: [
          "RX Clinic أداة إدارية وتقنية ولا تستبدل الحكم الطبي المهني أو الفحص أو التشخيص. يبقى الطبيب أو مقدم الرعاية مسؤولاً عن صحة الوصفات والقرارات العلاجية والالتزام بالأنظمة المهنية المعمول بها.",
          "على العيادة الحصول على الموافقات أو الأسس النظامية اللازمة لإدخال بيانات المرضى ومعالجتها ومشاركتها مع موظفيها.",
        ],
      },
      {
        title: "4. الاستخدام المقبول",
        bullets: [
          "يُمنع استخدام المنصة بصورة غير قانونية أو احتيالية أو للإضرار بالمرضى أو الغير.",
          "يُمنع محاولة تجاوز الصلاحيات، اختراق الخدمة، تعطيلها، أو الوصول إلى بيانات لا تخص المستخدم.",
          "يُمنع رفع ملفات ضارة أو محتوى ينتهك حقوق الملكية أو الخصوصية.",
        ],
      },
      {
        title: "5. بيانات العيادة والمرضى",
        paragraphs: [
          "تبقى العيادة مسؤولة عن مشروعية ودقة البيانات التي تدخلها. تُستخدم البيانات لتقديم وظائف النظام، والحفظ، والمزامنة، والنسخ الاحتياطي، والدعم الفني وفق سياسة الخصوصية.",
        ],
      },
      {
        title: "6. الاشتراكات والدفع",
        paragraphs: [
          "تخضع الخطط المدفوعة والأسعار ومدة الاشتراك لما يظهر عند الشراء أو لما يتم الاتفاق عليه مع العيادة. قد تتوقف بعض الوظائف عند انتهاء الاشتراك مع مراعاة أي التزامات نظامية تتعلق بإتاحة البيانات أو تصديرها.",
        ],
      },
      {
        title: "7. التوفر والمزامنة",
        paragraphs: [
          "نسعى إلى إبقاء الخدمة متاحة وآمنة، لكن قد تحدث صيانة أو انقطاعات أو أخطاء اتصال. بعض الوظائف تعمل دون إنترنت وتُزامن لاحقاً؛ وعلى المستخدم التحقق من اكتمال المزامنة قبل الاعتماد على البيانات في جهاز آخر.",
        ],
      },
      {
        title: "8. الملكية الفكرية",
        paragraphs: [
          "تعود حقوق المنصة وتصميمها وبرمجياتها وعلاماتها إلى أصحابها. لا تمنح هذه الشروط حق نسخ المنصة أو إعادة بيعها أو هندستها عكسياً، باستثناء ما يسمح به القانون صراحة.",
        ],
      },
      {
        title: "9. التعليق والإنهاء",
        paragraphs: [
          "يجوز تعليق الوصول عند وجود خطر أمني، أو مخالفة جوهرية، أو استخدام غير مشروع، أو عدم سداد مستحقات الخطة. يمكن للمستخدم طلب إغلاق حسابه وفق الإجراءات المتاحة، مع مراعاة متطلبات الاحتفاظ النظامية.",
        ],
      },
      {
        title: "10. حدود المسؤولية والتعديلات",
        paragraphs: [
          "تُقدّم الخدمة ضمن الحدود التي يسمح بها القانون، ولا نتحمل نتائج القرارات الطبية أو البيانات غير الصحيحة التي يدخلها المستخدم. قد نحدّث هذه الشروط عند تطوير الخدمة أو تغير المتطلبات، وسنوضح تاريخ آخر تحديث.",
        ],
      },
      {
        title: "11. التواصل",
        paragraphs: [
          "للاستفسارات المتعلقة بهذه الشروط، تواصل مع فريق RX Clinic عبر قنوات الدعم المعتمدة والمعلنة داخل المنصة.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Legal document",
    title: "Terms of Use",
    intro:
      "These terms govern the use of RX Clinic for managing clinics, patients, appointments, prescriptions, and related operations.",
    updated: "Last updated: July 27, 2026",
    sections: [
      {
        title: "1. Acceptance",
        paragraphs: [
          "By creating an account or using the service, you agree to these terms. If you act for a clinic or organization, you confirm that you are authorized to represent it.",
        ],
      },
      {
        title: "2. Accounts and access",
        bullets: [
          "Provide accurate, current registration information and keep credentials confidential.",
          "Clinic owners are responsible for staff invitations, permissions, and removing access when appropriate.",
          "Notify us promptly if you suspect unauthorized account use.",
        ],
      },
      {
        title: "3. Clinical responsibility",
        paragraphs: [
          "RX Clinic is an administrative technology tool, not a replacement for professional clinical judgment, examination, or diagnosis. Healthcare professionals remain responsible for prescriptions, treatment decisions, and professional compliance.",
          "Clinics must have the permissions or other lawful grounds required to enter and process patient information.",
        ],
      },
      {
        title: "4. Acceptable use",
        bullets: [
          "Do not use the service unlawfully, fraudulently, or to harm patients or others.",
          "Do not bypass permissions, disrupt the service, or access data that is not yours.",
          "Do not upload malicious files or content that violates privacy or intellectual-property rights.",
        ],
      },
      {
        title: "5. Clinic and patient data",
        paragraphs: [
          "The clinic is responsible for the legality and accuracy of submitted data. Data is used to provide storage, synchronization, backup, and support functions as described in the Privacy Policy.",
        ],
      },
      {
        title: "6. Subscriptions and payment",
        paragraphs: [
          "Paid plans, prices, and subscription periods are governed by the information presented at purchase or agreed with the clinic. Some functions may stop when a subscription expires, subject to applicable data-access obligations.",
        ],
      },
      {
        title: "7. Availability and synchronization",
        paragraphs: [
          "We work to keep the service available and secure, but maintenance, outages, or connectivity issues may occur. Offline changes may synchronize later; users should confirm synchronization before relying on another device.",
        ],
      },
      {
        title: "8. Intellectual property",
        paragraphs: [
          "The platform, software, designs, and marks remain the property of their owners. These terms do not permit copying, resale, or reverse engineering except where the law expressly allows it.",
        ],
      },
      {
        title: "9. Suspension and termination",
        paragraphs: [
          "Access may be suspended for security risks, material breaches, unlawful use, or unpaid plan fees. Users may request account closure, subject to applicable record-retention requirements.",
        ],
      },
      {
        title: "10. Liability and changes",
        paragraphs: [
          "To the extent permitted by law, RX Clinic is not responsible for clinical decisions or inaccurate user-entered information. We may update these terms as the service or applicable requirements change.",
        ],
      },
      {
        title: "11. Contact",
        paragraphs: [
          "For questions about these terms, contact the RX Clinic team through the official support channels shown in the platform.",
        ],
      },
    ],
  },
};

const PRIVACY: Record<Locale, LegalDocument> = {
  ar: {
    eyebrow: "حماية البيانات",
    title: "سياسة الخصوصية",
    intro:
      "توضح هذه السياسة أنواع البيانات التي تعالجها RX Clinic، وأغراض استخدامها، وكيفية حمايتها، والخيارات المتاحة للمستخدمين.",
    updated: "آخر تحديث: 27 تموز 2026",
    sections: [
      {
        title: "1. الأدوار والمسؤوليات",
        paragraphs: [
          "تُعد العيادة عادةً الجهة المسؤولة عن بيانات مرضاها وتحدد سبب وكيفية استخدامها، بينما تعالج RX Clinic تلك البيانات لتشغيل الخدمة نيابةً عنها. أما بيانات إنشاء الحساب وتشغيل المنصة والدعم والأمان فتُعالج لإدارة العلاقة مع المستخدم.",
        ],
      },
      {
        title: "2. البيانات التي نعالجها",
        bullets: [
          "بيانات الحساب والعيادة: الاسم، رقم الهاتف، الدور، التخصص، ومعلومات العيادة.",
          "بيانات المرضى: معلومات التعريف والاتصال والتاريخ المرضي والحقول التي تنشئها العيادة.",
          "السجلات الطبية: التشخيصات، الوصفات، الأدوية، المرفقات، الأشعة، التحاليل، وخطط العلاج.",
          "بيانات التشغيل: المواعيد، قوائم الانتظار، المهام، السجلات المالية، وسجل النشاط.",
          "بيانات تقنية: نوع الجهاز، سجلات الأخطاء والأمان، حالة الاتصال والمزامنة، والبيانات المخزنة محلياً لتشغيل وضع عدم الاتصال.",
        ],
      },
      {
        title: "3. أغراض الاستخدام",
        bullets: [
          "تقديم وظائف إدارة العيادة وإنشاء وطباعة الوصفات.",
          "حفظ البيانات ومزامنتها ونسخها احتياطياً واستعادتها.",
          "إدارة الحسابات والاشتراكات والصلاحيات والدعم الفني.",
          "حماية المنصة، منع إساءة الاستخدام، وتشخيص الأعطال وتحسين الأداء.",
          "الامتثال للطلبات النظامية الملزمة وحماية الحقوق القانونية.",
        ],
      },
      {
        title: "4. المشاركة والإفصاح",
        paragraphs: [
          "لا نبيع بيانات المرضى أو بيانات الحسابات. قد تُتاح البيانات لموظفي العيادة المصرح لهم، ولمزودي الاستضافة أو التخزين أو الرسائل أو الدعم بالقدر اللازم لتشغيل الخدمة، أو للجهات المختصة عندما يوجب القانون ذلك.",
        ],
      },
      {
        title: "5. التخزين المحلي ووضع عدم الاتصال",
        paragraphs: [
          "قد يحتفظ التطبيق بنسخة محلية مشفرة أو محمية بحسب إمكانات الجهاز لتمكين العمل دون إنترنت وتسريع الاستخدام. يتحمل المستخدم مسؤولية حماية جهازه، وقفل الشاشة، وعدم مشاركة حساب النظام مع غير المصرح لهم.",
        ],
      },
      {
        title: "6. الحماية",
        paragraphs: [
          "نطبق تدابير تقنية وتنظيمية مناسبة مثل التحكم بالصلاحيات، حماية جلسات الدخول، النقل الآمن، النسخ الاحتياطي، ومراقبة الأخطاء. لا توجد وسيلة تخزين أو نقل مضمونة بالكامل، لذلك نراجع الحماية ونعالج المخاطر باستمرار.",
        ],
      },
      {
        title: "7. مدة الاحتفاظ والحذف",
        paragraphs: [
          "نحتفظ بالبيانات طوال مدة الحاجة لتقديم الخدمة، وتنفيذ العقد، وحماية الحقوق، والامتثال لالتزامات الاحتفاظ بالسجلات. عند طلب الحذف، نحذف أو نخفي البيانات المؤهلة خلال مدة معقولة ما لم يلزم الاحتفاظ بها قانوناً أو لأغراض أمنية مشروعة.",
        ],
      },
      {
        title: "8. حقوق المستخدم والمرضى",
        paragraphs: [
          "يمكن لصاحب الحساب طلب الوصول إلى بياناته أو تصحيحها أو تصديرها أو حذفها، بحسب الصلاحيات والقوانين السارية. يتوجه المرضى عادةً إلى عيادتهم لممارسة حقوقهم المتعلقة بالسجل الطبي، وتساعد RX Clinic العيادة في تنفيذ الطلب عند الحاجة.",
        ],
      },
      {
        title: "9. ملفات الارتباط والتخزين التقني",
        paragraphs: [
          "نستخدم ملفات ارتباط وتقنيات تخزين ضرورية لتسجيل الدخول، حفظ اللغة والإعدادات، تشغيل المزامنة، وتأمين الجلسة. لا تُستخدم هذه التقنيات لبيع البيانات الشخصية.",
        ],
      },
      {
        title: "10. التحديثات والتواصل",
        paragraphs: [
          "قد نحدّث هذه السياسة عند إضافة وظائف أو تغير ممارسات المعالجة. سنعرض تاريخ التحديث، ويمكن التواصل مع فريق RX Clinic عبر قنوات الدعم الرسمية داخل المنصة بخصوص الخصوصية أو طلبات البيانات.",
        ],
      },
    ],
  },
  en: {
    eyebrow: "Data protection",
    title: "Privacy Policy",
    intro:
      "This policy explains the data RX Clinic processes, why it is used, how it is protected, and the choices available to users.",
    updated: "Last updated: July 27, 2026",
    sections: [
      {
        title: "1. Roles and responsibilities",
        paragraphs: [
          "The clinic generally controls its patient data and determines why and how it is used. RX Clinic processes that data to operate the service for the clinic. Account, platform-operation, support, and security data is processed to manage the user relationship.",
        ],
      },
      {
        title: "2. Data we process",
        bullets: [
          "Account and clinic information, including name, phone number, role, specialty, and clinic details.",
          "Patient identity, contact, medical-history, and clinic-defined information.",
          "Clinical records such as diagnoses, prescriptions, medicines, attachments, imaging, laboratory information, and treatment plans.",
          "Operational data including appointments, queues, tasks, finances, and activity records.",
          "Technical data such as device type, security and error logs, connectivity, synchronization, and local offline data.",
        ],
      },
      {
        title: "3. How data is used",
        bullets: [
          "Provide clinic-management and prescription creation and printing.",
          "Store, synchronize, back up, and restore data.",
          "Manage accounts, subscriptions, permissions, and support.",
          "Secure the platform, prevent misuse, diagnose faults, and improve performance.",
          "Comply with binding legal requests and protect legal rights.",
        ],
      },
      {
        title: "4. Sharing",
        paragraphs: [
          "We do not sell patient or account data. Data may be available to authorized clinic staff, necessary hosting, storage, messaging, or support providers, and competent authorities where legally required.",
        ],
      },
      {
        title: "5. Local and offline storage",
        paragraphs: [
          "The app may keep a locally protected copy to support offline work and faster access. Users are responsible for securing their devices, using screen locks, and preventing unauthorized operating-system account access.",
        ],
      },
      {
        title: "6. Security",
        paragraphs: [
          "We use appropriate technical and organizational safeguards, including access controls, session protection, secure transport, backups, and error monitoring. No storage or transmission method is completely risk-free.",
        ],
      },
      {
        title: "7. Retention and deletion",
        paragraphs: [
          "Data is retained as needed to provide the service, perform agreements, protect rights, and meet record-retention obligations. Eligible deletion requests are handled within a reasonable period unless legal or legitimate security retention applies.",
        ],
      },
      {
        title: "8. User and patient rights",
        paragraphs: [
          "Account owners may request access, correction, export, or deletion as allowed by permissions and applicable law. Patients usually exercise medical-record rights through their clinic, and RX Clinic assists the clinic where needed.",
        ],
      },
      {
        title: "9. Cookies and technical storage",
        paragraphs: [
          "Necessary cookies and storage are used for sign-in, language and settings, synchronization, and session security. These technologies are not used to sell personal data.",
        ],
      },
      {
        title: "10. Updates and contact",
        paragraphs: [
          "We may update this policy when features or processing practices change. The revision date will be shown. Privacy and data requests can be sent through the official RX Clinic support channels in the platform.",
        ],
      },
    ],
  },
};

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const { locale, dir } = useLocale();
  const document = kind === "terms" ? TERMS[locale] : PRIVACY[locale];
  const Icon = kind === "terms" ? FileText : ShieldCheck;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0B2C3D]" dir={dir}>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative size-9 overflow-hidden rounded-full bg-[#0B5F5A]/10 ring-1 ring-[#0B5F5A]/15">
              <Image
                src="/brand/logo.png"
                alt=""
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="font-bold">RX Clinic</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="toggle" />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#0B5F5A]/30 hover:text-[#0B5F5A]"
            >
              <BackIcon size={16} />
              {locale === "ar" ? "الرئيسية" : "Home"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
          <div className="border-b border-slate-100 bg-gradient-to-br from-[#E8F5E0] via-white to-[#E6F6F8] px-6 py-10 sm:px-10 sm:py-14">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0B5F5A] text-white shadow-sm">
              <Icon size={24} />
            </div>
            <p className="mt-6 text-sm font-bold text-[#0B5F5A]">
              {document.eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              {document.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              {document.intro}
            </p>
            <p className="mt-5 text-xs font-medium text-slate-400">
              {document.updated}
            </p>
          </div>

          <div className="space-y-9 px-6 py-9 sm:px-10 sm:py-12">
            {document.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-bold text-[#0B2C3D]">
                  {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-[15px] leading-8 text-slate-600"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2.5 text-[15px] leading-8 text-slate-600">
                    {section.bullets.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-3 size-1.5 shrink-0 rounded-full bg-[#10A6C3]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </section>

        <nav className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link
            href="/terms"
            className={`font-semibold hover:text-[#0B5F5A] hover:underline ${
              kind === "terms" ? "text-[#0B5F5A]" : "text-slate-500"
            }`}
          >
            {locale === "ar" ? "شروط الاستخدام" : "Terms of Use"}
          </Link>
          <span className="text-slate-300">•</span>
          <Link
            href="/privacy"
            className={`font-semibold hover:text-[#0B5F5A] hover:underline ${
              kind === "privacy" ? "text-[#0B5F5A]" : "text-slate-500"
            }`}
          >
            {locale === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
          </Link>
        </nav>
      </main>
    </div>
  );
}
