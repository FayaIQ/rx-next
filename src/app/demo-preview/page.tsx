"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function DemoPreviewBootstrapPage() {
  const startedRef = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function startDemo() {
      const result = await signIn("demo", { redirect: false });
      if (!result?.ok || result.error) {
        setFailed(true);
        return;
      }

      window.location.replace(`/home?demo-preview=${Date.now()}`);
    }

    void startDemo();
  }, []);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f5f8fa] p-6 text-center"
      dir="rtl"
    >
      {failed ? (
        <p className="text-sm font-medium text-red-600">
          تعذّر تشغيل المعاينة الحية. أعد تحميل الصفحة.
        </p>
      ) : (
        <div className="text-slate-700">
          <Loader2 className="mx-auto animate-spin text-[#10A6C3]" size={30} />
          <p className="mt-3 text-sm font-semibold">
            جاري تجهيز حساب المعاينة…
          </p>
        </div>
      )}
    </main>
  );
}
