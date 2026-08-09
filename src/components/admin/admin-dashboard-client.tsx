"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpLeft,
  CalendarClock,
  CircleAlert,
  FileText,
  RefreshCw,
  Sparkles,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import {
  adminApi,
  type AdminDashboardDoctorDto,
} from "@/lib/api/admin-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContent } from "@/components/ui/page-shell";
import { DashboardPageLoading } from "@/components/ui/page-loading";
import { Pagination } from "@/components/ui/pagination";
import { useLocale } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

const PERIODS = [7, 14, 30] as const;

const copy = {
  ar: {
    subtitle: "نمو الأطباء، تفعيلهم، واستخدام المنصة لحظة بلحظة",
    overview: "أداء المنصة",
    periodHint: "غيّر الفترة حسب تاريخ إطلاق حملتك وقارنها بالفترة السابقة تلقائياً.",
    lastDays: (days: number) => `آخر ${days} يوم`,
    refresh: "تحديث",
    campaignPulse: "نبضة الحملة",
    campaignTitle: "هل التسجيلات الجديدة تتحول إلى استخدام حقيقي؟",
    campaignEmpty: "لا توجد تسجيلات جديدة ضمن هذه الفترة. جرّب فترة أطول أو راجع توقيت الحملة.",
    campaignStrong: "أداء جيد: أغلب المسجلين الجدد بدأوا استخدام النظام فعلياً.",
    campaignMedium: "التسجيل جيد، لكن توجد فرصة لتحسين خطوة أول استخدام بعد التسجيل.",
    campaignWeak: "التسجيلات لا تتحول إلى استخدام كافٍ؛ تابع الأطباء الجدد بسرعة.",
    registered: "سجّلوا",
    activated: "بدأوا الاستخدام",
    wroteRx: "كتبوا وصفة",
    repeatedUse: "3 إجراءات فأكثر",
    newDoctors: "أطباء جدد",
    activationRate: "نسبة تفعيل الجدد",
    activeDoctors: "أطباء نشطون حالياً",
    prescriptions: "الوصفات المنشأة",
    visits: "الزيارات المسجلة",
    futureActivity: "النشاط القادم",
    totalDoctors: (total: number) => `من أصل ${total} طبيب`,
    doctorCount: (count: number) => `${count} طبيب`,
    appointmentCount: (count: number) => `${count} موعد خلال 7 أيام`,
    comparedPrevious: "عن الفترة السابقة",
    previousRate: (rate: number) => `السابق ${rate}%`,
    activityTrend: "حركة الاستخدام اليومية",
    activityTrendDesc: "تمييز التسجيل عن الاستخدام يساعدك على قراءة أثر الحملة بوضوح.",
    doctorsLegend: "تسجيل أطباء",
    prescriptionsLegend: "وصفات",
    visitsLegend: "زيارات",
    funnelTitle: "تحويل المسجلين الجدد",
    funnelDesc: "من التسجيل إلى الاستخدام المتكرر خلال الفترة المحددة.",
    platformHealth: "صحة قاعدة الأطباء",
    healthy: "نشاط قوي",
    growing: "نشاط نامٍ",
    atRisk: "معرّضون للتوقف",
    neverActivated: "لم يبدأوا أبداً",
    dormant: "متوقفون +60 يوم",
    followUpTitle: "فرص تحتاج متابعة",
    followUpDesc: "قوائم جاهزة تساعدك تحدد رسالة الحملة القادمة.",
    onboardingGap: "فجوة التهيئة",
    onboardingGapDesc: "أطباء سجّلوا لكن لم ينشئوا أي مريض أو موعد أو وصفة.",
    winBack: "إعادة تنشيط",
    winBackDesc: "استخدموا المنصة سابقاً لكن غابوا عن الفترة الحالية.",
    upcomingDemand: "طلب قادم",
    upcomingDemandDesc: "لديهم مواعيد مؤكدة خلال الأيام السبعة القادمة.",
    recentDoctors: "أحدث الأطباء وأداؤهم",
    recentDoctorsDesc: "جميع التسجيلات مرتبة من الأحدث، مع آخر استخدام وزيارة ومؤشر النشاط.",
    doctor: "الطبيب",
    registration: "التسجيل",
    lastUse: "آخر استخدام",
    lastVisit: "آخر زيارة",
    periodWork: "عمل الفترة",
    activityIndex: "مؤشر النشاط",
    activityIndexHint: "المؤشر من 100: حداثة الاستخدام 40، حجم العمل 45، والمواعيد القادمة 15.",
    noUse: "لم يستخدم النظام",
    noVisit: "لا توجد زيارة",
    prescriptionsShort: "وصفة",
    patientsShort: "مريض",
    visitsShort: "زيارة",
    upcomingShort: "قادم",
    statusHigh: "قوي",
    statusGrowing: "نامٍ",
    statusLow: "ضعيف",
    statusNone: "لم يبدأ",
    topDoctors: "الأكثر نشاطاً",
    topDoctorsDesc: "أفضل أداء خلال الفترة مع احتساب الاستمرارية القادمة.",
    viewDoctor: "فتح ملف الطبيب",
    noRecentDoctors: "لا توجد حسابات أطباء بعد.",
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: (days: number) => `قبل ${days} يوم`,
    error: "تعذّر تحميل تحليلات المنصة.",
    retry: "إعادة المحاولة",
    actionPrescription: "أنشأ وصفة",
    actionPatient: "أضاف مريضاً",
    actionAppointment: "أنشأ موعداً",
    actionVisit: "سجّل زيارة",
  },
  en: {
    subtitle: "Doctor growth, activation, and platform usage in one view",
    overview: "Platform performance",
    periodHint: "Match the period to your campaign launch and compare it automatically.",
    lastDays: (days: number) => `Last ${days} days`,
    refresh: "Refresh",
    campaignPulse: "Campaign pulse",
    campaignTitle: "Are new registrations turning into real usage?",
    campaignEmpty: "No new registrations in this period. Try a wider range or review campaign timing.",
    campaignStrong: "Strong result: most new registrations started using the product.",
    campaignMedium: "Registrations are landing, with room to improve first-use onboarding.",
    campaignWeak: "Registrations are not converting into enough usage; follow up quickly.",
    registered: "Registered",
    activated: "Started using",
    wroteRx: "Wrote an Rx",
    repeatedUse: "3+ actions",
    newDoctors: "New doctors",
    activationRate: "New doctor activation",
    activeDoctors: "Currently active doctors",
    prescriptions: "Prescriptions created",
    visits: "Visits recorded",
    futureActivity: "Upcoming activity",
    totalDoctors: (total: number) => `of ${total} doctors`,
    doctorCount: (count: number) => `${count} doctors`,
    appointmentCount: (count: number) => `${count} appointments in 7 days`,
    comparedPrevious: "vs previous period",
    previousRate: (rate: number) => `previous ${rate}%`,
    activityTrend: "Daily product usage",
    activityTrendDesc: "Separating registrations from usage makes campaign impact easier to read.",
    doctorsLegend: "Doctor signups",
    prescriptionsLegend: "Prescriptions",
    visitsLegend: "Visits",
    funnelTitle: "New signup conversion",
    funnelDesc: "From registration to repeated usage within the selected period.",
    platformHealth: "Doctor base health",
    healthy: "Strong activity",
    growing: "Growing activity",
    atRisk: "At risk",
    neverActivated: "Never activated",
    dormant: "Dormant +60 days",
    followUpTitle: "Follow-up opportunities",
    followUpDesc: "Ready segments to shape your next campaign message.",
    onboardingGap: "Onboarding gap",
    onboardingGapDesc: "Doctors who registered but never created a patient, appointment, or prescription.",
    winBack: "Win-back",
    winBackDesc: "Previously used the platform but were absent in the current period.",
    upcomingDemand: "Upcoming demand",
    upcomingDemandDesc: "Have confirmed appointments in the next seven days.",
    recentDoctors: "Newest doctors and performance",
    recentDoctorsDesc: "All registrations, newest first, with last use, last visit, and activity index.",
    doctor: "Doctor",
    registration: "Registered",
    lastUse: "Last use",
    lastVisit: "Last visit",
    periodWork: "Period usage",
    activityIndex: "Activity index",
    activityIndexHint: "Index out of 100: recency 40, usage volume 45, upcoming appointments 15.",
    noUse: "No usage yet",
    noVisit: "No visit yet",
    prescriptionsShort: "Rx",
    patientsShort: "patients",
    visitsShort: "visits",
    upcomingShort: "upcoming",
    statusHigh: "Strong",
    statusGrowing: "Growing",
    statusLow: "Low",
    statusNone: "Not started",
    topDoctors: "Most active",
    topDoctorsDesc: "Top period performance including forward continuity.",
    viewDoctor: "Open doctor profile",
    noRecentDoctors: "No doctor accounts yet.",
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: (days: number) => `${days} days ago`,
    error: "Could not load platform analytics.",
    retry: "Try again",
    actionPrescription: "Created a prescription",
    actionPatient: "Added a patient",
    actionAppointment: "Created an appointment",
    actionVisit: "Recorded a visit",
  },
};

type MetricCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
  change?: number;
  changeLabel?: string;
  tone?: "cyan" | "emerald" | "violet" | "amber";
};

function MetricCard({
  label,
  value,
  hint,
  icon,
  change,
  changeLabel,
  tone = "cyan",
}: MetricCardProps) {
  const tones = {
    cyan: "bg-cyan-50 text-cyan-700",
    emerald: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-rx-muted">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-rx-text">{value}</p>
            <p className="mt-1 truncate text-xs text-rx-muted">{hint}</p>
          </div>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="mt-4 flex items-center gap-1.5 border-t border-rx-border/70 pt-3 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                change > 0 ? "text-emerald-700" : change < 0 ? "text-red-600" : "text-rx-muted"
              )}
            >
              {change > 0 ? <ArrowUpLeft size={14} /> : change < 0 ? <ArrowDownLeft size={14} /> : null}
              {change > 0 ? "+" : ""}{change}%
            </span>
            <span className="text-rx-muted">{changeLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ doctor, labels }: { doctor: AdminDashboardDoctorDto; labels: typeof copy.ar }) {
  const status = {
    high: { label: labels.statusHigh, variant: "success" as const, bar: "bg-emerald-500" },
    growing: { label: labels.statusGrowing, variant: "default" as const, bar: "bg-cyan-500" },
    low: { label: labels.statusLow, variant: "warning" as const, bar: "bg-amber-500" },
    none: { label: labels.statusNone, variant: "outline" as const, bar: "bg-slate-300" },
  }[doctor.status];

  return (
    <div className="min-w-[118px]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="font-semibold tabular-nums text-rx-text">{doctor.activityScore}/100</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-rx-bg-subtle">
        <div className={cn("h-full rounded-full", status.bar)} style={{ width: `${doctor.activityScore}%` }} />
      </div>
    </div>
  );
}

export function AdminDashboardClient() {
  const { t, locale } = useLocale();
  const labels = copy[locale];
  const [days, setDays] = useState<(typeof PERIODS)[number]>(14);
  const [recentPage, setRecentPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["admin-stats", days, recentPage],
    queryFn: () => adminApi.stats(days, recentPage),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-IQ" : "en-US");
  const dateLocale = locale === "ar" ? "ar-IQ" : "en-GB";

  const formatDate = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })
      : "—";
  const formatRelative = (value: string | null) => {
    if (!value) return labels.noUse;
    const diff = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
    if (diff === 0) return labels.today;
    if (diff === 1) return labels.yesterday;
    return labels.daysAgo(diff);
  };
  const actionLabel = (type: AdminDashboardDoctorDto["lastActivityType"]) => ({
    prescription: labels.actionPrescription,
    patient: labels.actionPatient,
    appointment: labels.actionAppointment,
    visit: labels.actionVisit,
  }[type ?? "prescription"]);

  if (isLoading && !data) return <DashboardPageLoading />;

  if (isError || !data) {
    return (
      <>
        <AppHeader title={t("admin.dashboardTitle")} subtitle={labels.subtitle} />
        <PageContent>
          <Card className="mx-auto mt-16 max-w-lg text-center">
            <CardContent className="p-10">
              <CircleAlert className="mx-auto text-red-500" size={36} />
              <p className="mt-4 font-semibold">{labels.error}</p>
              <Button className="mt-5" onClick={() => void refetch()}>{labels.retry}</Button>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  const { kpis, funnel, segments } = data;
  const campaignMessage =
    funnel.registered === 0
      ? labels.campaignEmpty
      : kpis.activatedNewDoctors.rate >= 60
        ? labels.campaignStrong
        : kpis.activatedNewDoctors.rate >= 30
          ? labels.campaignMedium
          : labels.campaignWeak;
  const trendMax = Math.max(...data.trend.flatMap((item) => [item.doctors, item.prescriptions, item.visits]), 1);
  const funnelItems = [
    { label: labels.registered, value: funnel.registered },
    { label: labels.activated, value: funnel.activated },
    { label: labels.wroteRx, value: funnel.prescribed },
    { label: labels.repeatedUse, value: funnel.returning },
  ];

  return (
    <>
      <AppHeader
        title={t("admin.dashboardTitle")}
        subtitle={labels.subtitle}
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            <span className="hidden sm:inline">{labels.refresh}</span>
          </Button>
        }
      />
      <PageContent wide className="min-w-0 space-y-5 lg:space-y-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-rx-border bg-rx-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between lg:p-5">
          <div>
            <h2 className="text-lg font-bold text-rx-text">{labels.overview}</h2>
            <p className="mt-1 text-sm text-rx-muted">{labels.periodHint}</p>
          </div>
          <div className="inline-flex w-fit rounded-xl bg-rx-bg-subtle p-1" aria-label={labels.overview}>
            {PERIODS.map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setDays(period);
                  setRecentPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold transition-all sm:px-4",
                  days === period ? "bg-rx-surface text-rx-primary shadow-sm" : "text-rx-muted hover:text-rx-text"
                )}
              >
                {labels.lastDays(period)}
              </button>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-950 via-cyan-900 to-teal-800 p-5 text-white shadow-lg lg:p-7">
          <div className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute -bottom-20 right-1/3 h-52 w-52 rounded-full bg-teal-300/10 blur-3xl" />
          <div className="relative grid gap-6 xl:grid-cols-[1.25fr_1fr] xl:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-50">
                <Sparkles size={14} />
                {labels.campaignPulse} · {labels.lastDays(days)}
              </div>
              <h3 className="max-w-2xl text-xl font-bold leading-relaxed lg:text-2xl">{labels.campaignTitle}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-cyan-100">{campaignMessage}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
              {funnelItems.map((item, index) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
                  <p className="text-xs text-cyan-100">{item.label}</p>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <span className="text-2xl font-bold tabular-nums">{number.format(item.value)}</span>
                    {index > 0 && (
                      <span className="text-[11px] font-medium text-cyan-100">
                        {funnel.registered ? Math.round((item.value / funnel.registered) * 100) : 0}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            label={labels.newDoctors}
            value={number.format(kpis.newDoctors.value)}
            hint={labels.comparedPrevious}
            icon={<UserPlus size={21} />}
            change={kpis.newDoctors.changePercent}
            changeLabel={labels.comparedPrevious}
          />
          <MetricCard
            label={labels.activationRate}
            value={`${number.format(kpis.activatedNewDoctors.rate)}%`}
            hint={labels.previousRate(kpis.activatedNewDoctors.previousRate)}
            icon={<UserCheck size={21} />}
            tone="emerald"
          />
          <MetricCard
            label={labels.activeDoctors}
            value={number.format(kpis.activeDoctors.value)}
            hint={`${number.format(kpis.activeDoctors.rate)}% · ${labels.totalDoctors(data.totals.doctors)}`}
            icon={<Activity size={21} />}
            change={kpis.activeDoctors.changePercent}
            changeLabel={labels.comparedPrevious}
            tone="violet"
          />
          <MetricCard
            label={labels.prescriptions}
            value={number.format(kpis.prescriptions.value)}
            hint={labels.comparedPrevious}
            icon={<FileText size={21} />}
            change={kpis.prescriptions.changePercent}
            changeLabel={labels.comparedPrevious}
          />
          <MetricCard
            label={labels.visits}
            value={number.format(kpis.visits.value)}
            hint={labels.comparedPrevious}
            icon={<Stethoscope size={21} />}
            change={kpis.visits.changePercent}
            changeLabel={labels.comparedPrevious}
            tone="emerald"
          />
          <MetricCard
            label={labels.futureActivity}
            value={`${number.format(kpis.futureActivity.rate)}%`}
            hint={`${labels.doctorCount(kpis.futureActivity.doctors)} · ${labels.appointmentCount(kpis.futureActivity.appointments)}`}
            icon={<CalendarClock size={21} />}
            tone="amber"
          />
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
          <Card className="min-w-0">
            <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{labels.activityTrend}</CardTitle>
                <CardDescription className="mt-1">{labels.activityTrendDesc}</CardDescription>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-rx-muted sm:mt-0">
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-cyan-400" />{labels.doctorsLegend}</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sky-800" />{labels.prescriptionsLegend}</span>
                <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" />{labels.visitsLegend}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto pb-1">
                <div className="flex h-52 min-w-[680px] items-end gap-1 border-b border-rx-border px-1">
                  {data.trend.map((item, index) => (
                    <div key={item.date} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                      <div className="flex h-40 items-end justify-center gap-[2px]">
                        <div className="w-1/3 max-w-3 rounded-t bg-cyan-400 transition-all" style={{ height: `${Math.max((item.doctors / trendMax) * 138, item.doctors ? 5 : 1)}px` }} title={`${labels.doctorsLegend}: ${item.doctors}`} />
                        <div className="w-1/3 max-w-3 rounded-t bg-sky-800 transition-all" style={{ height: `${Math.max((item.prescriptions / trendMax) * 138, item.prescriptions ? 5 : 1)}px` }} title={`${labels.prescriptionsLegend}: ${item.prescriptions}`} />
                        <div className="w-1/3 max-w-3 rounded-t bg-emerald-500 transition-all" style={{ height: `${Math.max((item.visits / trendMax) * 138, item.visits ? 5 : 1)}px` }} title={`${labels.visitsLegend}: ${item.visits}`} />
                      </div>
                      <span className={cn("mt-2 text-center text-[9px] text-rx-muted", days === 30 && index % 3 !== 0 && "invisible")}>
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString(dateLocale, { day: "numeric", month: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>{labels.funnelTitle}</CardTitle>
              <CardDescription>{labels.funnelDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnelItems.map((item, index) => {
                const width = funnel.registered ? Math.round((item.value / funnel.registered) * 100) : 0;
                return (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-rx-text-secondary">{index + 1}. {item.label}</span>
                      <span className="font-bold tabular-nums text-rx-text">{number.format(item.value)} <small className="font-medium text-rx-muted">({width}%)</small></span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-rx-bg-subtle">
                      <div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-sky-700" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section>
          <div className="mb-3">
            <h3 className="font-bold text-rx-text">{labels.followUpTitle}</h3>
            <p className="mt-1 text-sm text-rx-muted">{labels.followUpDesc}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-amber-200/80 bg-amber-50/40">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><UserPlus size={21} /></div>
                <div><div className="flex items-center gap-2"><p className="font-bold">{labels.onboardingGap}</p><Badge variant="warning">{number.format(segments.neverActivated)}</Badge></div><p className="mt-1 text-sm leading-6 text-rx-muted">{labels.onboardingGapDesc}</p></div>
              </CardContent>
            </Card>
            <Card className="border-red-200/80 bg-red-50/40">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><CircleAlert size={21} /></div>
                <div><div className="flex items-center gap-2"><p className="font-bold">{labels.winBack}</p><Badge variant="danger">{number.format(segments.atRisk)}</Badge></div><p className="mt-1 text-sm leading-6 text-rx-muted">{labels.winBackDesc}</p></div>
              </CardContent>
            </Card>
            <Card className="border-emerald-200/80 bg-emerald-50/40">
              <CardContent className="flex gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CalendarClock size={21} /></div>
                <div><div className="flex items-center gap-2"><p className="font-bold">{labels.upcomingDemand}</p><Badge variant="success">{number.format(segments.upcomingDoctors)}</Badge></div><p className="mt-1 text-sm leading-6 text-rx-muted">{labels.upcomingDemandDesc}</p></div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,0.65fr)]">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b border-rx-border/70">
              <CardTitle>{labels.recentDoctors}</CardTitle>
              <CardDescription>{labels.recentDoctorsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {data.recentDoctors.length === 0 ? (
                <p className="p-10 text-center text-sm text-rx-muted">{labels.noRecentDoctors}</p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <table className="rx-table w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="text-start text-xs text-rx-muted">
                        <th className="px-5 py-3 text-start font-medium">{labels.doctor}</th>
                        <th className="px-4 py-3 text-start font-medium">{labels.registration}</th>
                        <th className="px-4 py-3 text-start font-medium">{labels.lastUse}</th>
                        <th className="px-4 py-3 text-start font-medium">{labels.lastVisit}</th>
                        <th className="px-4 py-3 text-start font-medium">{labels.periodWork}</th>
                        <th className="px-5 py-3 text-start font-medium" title={labels.activityIndexHint}>{labels.activityIndex}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rx-border/60">
                      {data.recentDoctors.map((doctor) => (
                        <tr key={doctor.id}>
                          <td className="px-5 py-4">
                            <Link href={`/dashboard/users/${doctor.id}`} className="font-semibold text-rx-text hover:text-rx-primary">{doctor.name}</Link>
                            <p className="mt-0.5 text-xs text-rx-muted" dir="ltr">{doctor.phoneNumber}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-rx-text-secondary">{formatDate(doctor.registeredAt)}</td>
                          <td className="px-4 py-4">
                            <p className={cn("whitespace-nowrap font-medium", doctor.lastActivityAt ? "text-rx-text-secondary" : "text-amber-700")}>{formatRelative(doctor.lastActivityAt)}</p>
                            {doctor.lastActivityAt && <p className="mt-0.5 text-xs text-rx-muted">{actionLabel(doctor.lastActivityType)}</p>}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-rx-text-secondary">{doctor.lastVisitAt ? formatRelative(doctor.lastVisitAt) : labels.noVisit}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-rx-muted">
                              <span><b className="text-rx-text">{number.format(doctor.prescriptionsCount)}</b> {labels.prescriptionsShort}</span>
                              <span><b className="text-rx-text">{number.format(doctor.patientsCount)}</b> {labels.patientsShort}</span>
                              <span><b className="text-rx-text">{number.format(doctor.visitsCount)}</b> {labels.visitsShort}</span>
                              {doctor.upcomingAppointments > 0 && <span className="text-emerald-700"><b>{number.format(doctor.upcomingAppointments)}</b> {labels.upcomingShort}</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4"><ScoreBadge doctor={doctor} labels={labels as typeof copy.ar} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    pagination={data.recentDoctorsPagination}
                    onPageChange={setRecentPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{labels.platformHealth}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {[
                  [labels.healthy, segments.healthy, "bg-emerald-50 text-emerald-700"],
                  [labels.growing, segments.growing, "bg-cyan-50 text-cyan-700"],
                  [labels.atRisk, segments.atRisk, "bg-amber-50 text-amber-700"],
                  [labels.dormant, segments.dormant, "bg-slate-100 text-slate-700"],
                ].map(([label, value, tone]) => (
                  <div key={String(label)} className={cn("rounded-xl p-3", tone)}>
                    <p className="text-2xl font-bold tabular-nums">{number.format(Number(value))}</p>
                    <p className="mt-1 text-xs font-medium">{label}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{labels.topDoctors}</CardTitle>
                <CardDescription>{labels.topDoctorsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.topDoctors.map((doctor, index) => (
                  <Link key={doctor.id} href={`/dashboard/users/${doctor.id}`} className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-rx-bg-subtle">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-xs font-bold text-sky-800">#{index + 1}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-rx-text">{doctor.name}</span><span className="block text-xs text-rx-muted">{doctor.prescriptionsCount} {labels.prescriptionsShort} · {doctor.visitsCount} {labels.visitsShort}</span></span>
                    <span className="text-sm font-bold text-rx-primary">{doctor.activityScore}</span>
                  </Link>
                ))}
                {data.topDoctors.length > 0 && <Button asChild variant="ghost" size="sm" className="mt-2 w-full"><Link href="/dashboard/doctors"><Users size={14} />{t("admin.viewDetails")}</Link></Button>}
              </CardContent>
            </Card>
          </div>
        </section>
      </PageContent>
    </>
  );
}
