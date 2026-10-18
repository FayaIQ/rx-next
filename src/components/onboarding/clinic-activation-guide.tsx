"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/i18n/locale-provider";
import { trackAnalyticsEvent } from "@/lib/analytics";

type Activation = { practiceType: string; onboardingCompleted: boolean; firstValueCompleted: boolean; firstValueAt: string | null } | null;
export function ClinicActivationGuide({ initial }: { initial: Activation }) {
  const { locale } = useLocale(); const claimed = useRef(false);
  const { data } = useQuery({
    queryKey: ["clinic-activation"], initialData: { activation: initial }, staleTime: 15000,
    queryFn: async () => { const response = await fetch("/api/analytics/activation"); if (!response.ok) throw new Error("activation unavailable"); return response.json() as Promise<{ activation: Activation }>; },
    refetchInterval: query => query.state.data?.activation && !query.state.data.activation.firstValueCompleted ? 30000 : false,
    enabled: !!initial,
  });
  useEffect(() => {
    if (!data?.activation?.firstValueCompleted || claimed.current) return;
    claimed.current = true;
    void fetch("/api/analytics/activation", { method: "POST" }).then(r => r.ok ? r.json() : null).then(result => {
      if (result?.firstValueCompleted) trackAnalyticsEvent("first_value_completed", { role: "doctor", practiceType: data.activation?.practiceType === "dental" ? "dental" : "general" });
    }).catch(() => { claimed.current = false; });
  }, [data?.activation]);
  if (!data?.activation) return null;
  if (data.activation.firstValueCompleted) return initial?.firstValueCompleted ? null : <aside className="min-h-24 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 sm:min-h-14" role="status">{locale === "ar" ? "تم حفظ أول خطوة بنجاح. عيادتك جاهزة للمتابعة." : "First step saved. Your clinic is ready to continue."}</aside>;
  const dental = data.activation.practiceType === "dental";
  return <aside className="min-h-24 border-b border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950 sm:min-h-14" aria-label={locale === "ar" ? "أول خطوة" : "First step"}>
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
      <p>{locale === "ar" ? dental ? "ابدأ بأول مريض، ثم أضف خطة علاج من ملف الأسنان." : "ابدأ بأول مريض، ثم احفظ أول وصفة من الصفحة الرئيسية." : dental ? "Add your first patient, then save a dental treatment plan." : "Add your first patient, then save a prescription on Home."}</p>
      <div className="flex gap-3 font-semibold"><Link className="underline" href="/patients">{locale === "ar" ? "إضافة مريض" : "Add patient"}</Link><Link className="underline" href={dental ? "/dental" : "/home"}>{locale === "ar" ? dental ? "خطط الأسنان" : "كتابة وصفة" : dental ? "Dental plans" : "Write prescription"}</Link></div>
    </div>
  </aside>;
}
