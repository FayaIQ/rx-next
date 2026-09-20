import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function BlogNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8F7] px-5 text-center" dir="rtl">
      <div className="max-w-md">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#E8F5E0] text-[#0B5F5A]"><FileQuestion size={28} /></span>
        <h1 className="mt-6 text-3xl font-bold text-[#0B2C3D]">المقال غير موجود</h1>
        <p className="mt-3 leading-7 text-slate-600">قد يكون الرابط قديم أو تم تحديث عنوان المقال.</p>
        <Link href="/blog" className="mt-7 inline-flex rounded-full bg-[#0B5F5A] px-6 py-3 text-sm font-bold text-white">استعرض كل المقالات</Link>
      </div>
    </main>
  );
}
