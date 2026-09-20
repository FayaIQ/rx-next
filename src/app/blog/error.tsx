"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8F7] px-5 text-center" dir="rtl">
      <div className="max-w-md rounded-[1.75rem] border border-red-100 bg-white p-8 shadow-xl shadow-slate-900/5">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertCircle size={24} /></span>
        <h1 className="mt-5 text-2xl font-bold text-[#0B2C3D]">تعذّر تحميل المدونة</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">واجهنا مشكلة مؤقتة أثناء جلب المقالات. جرّب مرة ثانية بعد لحظات.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-[#0B5F5A] px-5 py-2.5 text-sm font-bold text-white"><RotateCcw size={16} />إعادة المحاولة</button>
          <Link href="/" className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600">الرئيسية</Link>
        </div>
      </div>
    </main>
  );
}
