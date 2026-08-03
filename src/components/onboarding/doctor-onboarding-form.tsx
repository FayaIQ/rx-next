"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/layout/brand-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/i18n/locale-provider";
import { resolveImageUrl } from "@/lib/image-url";
import { PrescriptionSystemCredit } from "@/components/prescription/prescription-system-credit";

type OnboardingData = {
  clinicName: string | null;
  doctorName: string;
  doctorSpecialty: string;
  professionalTitle: string | null;
  licenseNumber: string | null;
  services: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  logoPath: string | null;
  completed: boolean;
};

const EMPTY_FORM: OnboardingData = {
  clinicName: "",
  doctorName: "",
  doctorSpecialty: "",
  professionalTitle: "",
  licenseNumber: "",
  services: "",
  phoneNumber: "",
  email: "",
  address: "",
  logoPath: null,
  completed: false,
};

const COPY = {
  ar: {
    eyebrow: "إعداد الحساب · خطوة واحدة",
    title: "خلّينا نجهّز هوية عيادتك",
    subtitle: "هذه المعلومات ستُحفظ كأساس لرأس الوصفة ويمكنك تعديلها لاحقاً من إعدادات التصميم.",
    clinicSection: "بيانات الطبيب والعيادة",
    prescriptionSection: "معلومات تظهر في الوصفة",
    clinicName: "اسم العيادة أو المركز",
    clinicNamePlaceholder: "مثال: عيادة الشفاء الطبية",
    doctorName: "اسم الطبيب",
    doctorNamePlaceholder: "د. أحمد محمد",
    specialty: "التخصص",
    specialtyPlaceholder: "طب عام، طب أسنان، أطفال...",
    professionalTitle: "اللقب أو المؤهل العلمي",
    professionalTitlePlaceholder: "بكالوريوس طب وجراحة / طبيب أسنان",
    licenseNumber: "رقم الإجازة أو النقابة",
    licenseNumberPlaceholder: "مثال: 01663/23",
    services: "الخدمات الرئيسية",
    servicesPlaceholder: "اكتب كل خدمة في سطر\nزراعة الأسنان\nتبييض الأسنان",
    phone: "هاتف العيادة",
    email: "البريد الإلكتروني (اختياري)",
    address: "عنوان العيادة",
    addressPlaceholder: "بغداد — الكرادة — قرب...",
    logo: "شعار العيادة (اختياري)",
    logoHint: "PNG أو JPG، وسيظهر في رأس الوصفة.",
    chooseLogo: "اختيار شعار",
    changeLogo: "تغيير الشعار",
    save: "حفظ وبدء استخدام RX Clinic",
    saving: "جاري تجهيز حسابك...",
    preview: "معاينة أولية",
    patient: "اسم المريض",
    age: "العمر",
    date: "التاريخ",
    diagnosis: "التشخيص",
    contact: "بيانات التواصل",
    previewHint: "هذا هو القالب الافتراضي الذي سيُستخدم مباشرة بعد حفظ البيانات.",
    required: "الحقول المعلّمة مطلوبة",
    loadError: "تعذّر تحميل بيانات الحساب",
    saveError: "تعذّر حفظ البيانات",
    success: "تم تجهيز بيانات عيادتك",
  },
  en: {
    eyebrow: "Account setup · one step",
    title: "Let’s set up your clinic identity",
    subtitle: "These details form the basis of your prescription header and can be changed later in design settings.",
    clinicSection: "Doctor and clinic details",
    prescriptionSection: "Prescription information",
    clinicName: "Clinic or center name",
    clinicNamePlaceholder: "e.g. Al Shifa Medical Clinic",
    doctorName: "Doctor name",
    doctorNamePlaceholder: "Dr. John Smith",
    specialty: "Specialty",
    specialtyPlaceholder: "General practice, dentistry, pediatrics...",
    professionalTitle: "Professional title or qualification",
    professionalTitlePlaceholder: "MBChB / Doctor of Dental Medicine",
    licenseNumber: "License or syndicate number",
    licenseNumberPlaceholder: "e.g. 01663/23",
    services: "Main services",
    servicesPlaceholder: "Enter one service per line\nDental implants\nTeeth whitening",
    phone: "Clinic phone",
    email: "Email (optional)",
    address: "Clinic address",
    addressPlaceholder: "Baghdad — Karrada — near...",
    logo: "Clinic logo (optional)",
    logoHint: "PNG or JPG; it will appear in the prescription header.",
    chooseLogo: "Choose logo",
    changeLogo: "Change logo",
    save: "Save and start using RX Clinic",
    saving: "Preparing your account...",
    preview: "Quick preview",
    patient: "Patient name",
    age: "Age",
    date: "Date",
    diagnosis: "Diagnosis",
    contact: "Contact details",
    previewHint: "This is the default template that will be used immediately after saving.",
    required: "Marked fields are required",
    loadError: "Could not load account details",
    saveError: "Could not save details",
    success: "Your clinic details are ready",
  },
} as const;

async function jsonOrThrow<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Request failed"
    );
  }
  return data as T;
}

export function DoctorOnboardingForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const copy = COPY[locale];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<OnboardingData>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/onboarding")
      .then((response) =>
        jsonOrThrow<{ onboarding: OnboardingData }>(response)
      )
      .then(({ onboarding }) => {
        if (active) setForm(onboarding);
      })
      .catch((error: Error) => toast.error(error.message || copy.loadError))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [copy.loadError]);

  useEffect(() => {
    if (!logoFile) {
      setLocalLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLocalLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const logoUrl = localLogoUrl ?? resolveImageUrl(form.logoPath);
  const services = useMemo(
    () =>
      (form.services ?? "")
        .split("\n")
        .map((service) => service.trim())
        .filter(Boolean)
        .slice(0, 5),
    [form.services]
  );
  const ContinueArrow = locale === "ar" ? ArrowLeft : ArrowRight;

  function patch<K extends keyof OnboardingData>(
    key: K,
    value: OnboardingData[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);

    try {
      if (logoFile) {
        const upload = new FormData();
        upload.append("kind", "logo");
        upload.append("file", logoFile);
        await jsonOrThrow(
          await fetch("/api/recipe-settings/upload", {
            method: "POST",
            body: upload,
          })
        );
      }

      await jsonOrThrow(
        await fetch("/api/onboarding", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      );

      toast.success(copy.success);
      router.replace("/home");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-rx-bg">
        <LoaderCircle className="animate-spin text-rx-primary" size={30} />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,116,144,0.12),transparent_38%),var(--rx-bg)]">
      <header className="border-b border-rx-border/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <BrandLogo size="sm" />
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-xs font-medium text-rx-muted sm:flex">
              <BadgeCheck size={15} className="text-rx-success" />
              {copy.required}
            </span>
            <LanguageSwitcher variant="toggle" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-8 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
            <Check size={14} />
            {copy.eyebrow}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-rx-text sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-rx-muted sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="rounded-3xl border border-rx-border/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-rx-primary">
                  <Stethoscope size={20} />
                </span>
                <h2 className="text-lg font-bold">{copy.clinicSection}</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="clinicName">{copy.clinicName}</Label>
                  <div className="relative">
                    <Building2 className="absolute start-3.5 top-3.5 text-rx-muted" size={17} />
                    <Input id="clinicName" className="ps-10" value={form.clinicName ?? ""} onChange={(e) => patch("clinicName", e.target.value)} placeholder={copy.clinicNamePlaceholder} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorName">{copy.doctorName} *</Label>
                  <Input id="doctorName" required minLength={2} value={form.doctorName} onChange={(e) => patch("doctorName", e.target.value)} placeholder={copy.doctorNamePlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">{copy.specialty} *</Label>
                  <Input id="specialty" required minLength={2} value={form.doctorSpecialty} onChange={(e) => patch("doctorSpecialty", e.target.value)} placeholder={copy.specialtyPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="professionalTitle">{copy.professionalTitle}</Label>
                  <Input id="professionalTitle" value={form.professionalTitle ?? ""} onChange={(e) => patch("professionalTitle", e.target.value)} placeholder={copy.professionalTitlePlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">{copy.licenseNumber}</Label>
                  <Input id="licenseNumber" dir="ltr" value={form.licenseNumber ?? ""} onChange={(e) => patch("licenseNumber", e.target.value)} placeholder={copy.licenseNumberPlaceholder} />
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-rx-border/80 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                  <MapPin size={20} />
                </span>
                <h2 className="text-lg font-bold">{copy.prescriptionSection}</h2>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="services">{copy.services}</Label>
                  <Textarea id="services" rows={4} value={form.services ?? ""} onChange={(e) => patch("services", e.target.value)} placeholder={copy.servicesPlaceholder} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{copy.phone} *</Label>
                  <div className="relative">
                    <Phone className="absolute start-3.5 top-3.5 text-rx-muted" size={17} />
                    <Input id="phone" required minLength={8} dir="ltr" className="ps-10 text-start" value={form.phoneNumber ?? ""} onChange={(e) => patch("phoneNumber", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{copy.email}</Label>
                  <Input id="email" type="email" dir="ltr" className="text-start" value={form.email ?? ""} onChange={(e) => patch("email", e.target.value)} placeholder="doctor@clinic.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">{copy.address} *</Label>
                  <Input id="address" required minLength={3} value={form.address ?? ""} onChange={(e) => patch("address", e.target.value)} placeholder={copy.addressPlaceholder} />
                </div>
                <div className="space-y-3 sm:col-span-2">
                  <Label>{copy.logo}</Label>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-rx-border bg-rx-bg-subtle/50 p-4 text-start transition hover:border-rx-primary/50 hover:bg-cyan-50/50">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-rx-border bg-white text-rx-primary">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <ImagePlus size={23} />
                      )}
                    </span>
                    <span>
                      <strong className="block text-sm text-rx-text">{logoUrl ? copy.changeLogo : copy.chooseLogo}</strong>
                      <span className="mt-1 block text-xs leading-5 text-rx-muted">{logoFile?.name ?? copy.logoHint}</span>
                    </span>
                  </button>
                </div>
              </div>
            </section>

            <Button type="submit" size="lg" disabled={saving} className="w-full sm:w-auto">
              {saving ? <LoaderCircle size={18} className="animate-spin" /> : <ContinueArrow size={18} />}
              {saving ? copy.saving : copy.save}
            </Button>
          </form>

          <aside className="lg:sticky lg:top-8">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-rx-text">{copy.preview}</span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">A5</span>
            </div>
            <div className="relative flex aspect-[1/1.414] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="h-1.5 shrink-0 bg-gradient-to-l from-cyan-500 via-sky-700 to-slate-800" />

              <div className="flex min-h-0 flex-1 flex-col p-5 sm:p-7">
                <header className="shrink-0">
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1 text-center text-slate-800">
                      <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700 sm:text-xs">
                        {form.clinicName || "RX Clinic"}
                      </p>
                      <h3 className="mt-2 truncate text-xl font-black leading-tight text-slate-900 sm:text-2xl">
                        {form.doctorName || copy.doctorNamePlaceholder}
                      </h3>
                      <p className="mt-1 text-xs font-bold text-sky-800 sm:text-sm">
                        {form.doctorSpecialty || copy.specialtyPlaceholder}
                      </p>
                      {form.professionalTitle && (
                        <p className="mx-auto mt-1.5 max-w-[90%] text-[9px] leading-4 text-slate-600 sm:text-[11px]">
                          {form.professionalTitle}
                        </p>
                      )}
                      {form.licenseNumber && (
                        <p className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[8px] font-semibold text-slate-600 sm:text-[10px]">
                          {copy.licenseNumber}:&nbsp;
                          <span dir="ltr">{form.licenseNumber}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sky-800 shadow-sm sm:h-20 sm:w-20">
                      {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoUrl} alt="" className="h-full w-full object-contain p-2" />
                      ) : (
                        <Stethoscope size={28} strokeWidth={1.7} />
                      )}
                    </div>
                  </div>

                  {services.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-0.5 border-y border-slate-100 py-1 text-[9px] font-medium text-slate-500 sm:text-[10px]">
                      {services.map((service, index) => (
                        <span key={`${service}-${index}`} className="inline-flex items-center gap-1.5">
                          {index > 0 && <span className="text-cyan-500">•</span>}
                          {service}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 h-px bg-slate-300" />
                  <div className="mt-1 h-0.5 bg-sky-700" />
                </header>

                <section className="mt-3 shrink-0 border-b border-slate-200 pb-2">
                  <div className="grid grid-cols-[1fr_0.38fr_0.68fr] gap-3 text-[9px] text-slate-500 sm:text-[10px]">
                    <div className="flex items-end gap-1.5">
                      <span className="shrink-0 font-semibold text-slate-700">{copy.patient}:</span>
                      <span className="mb-0.5 min-w-0 flex-1 border-b border-dotted border-slate-400" />
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className="shrink-0 font-semibold text-slate-700">{copy.age}:</span>
                      <span className="mb-0.5 min-w-0 flex-1 border-b border-dotted border-slate-400" />
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className="shrink-0 font-semibold text-slate-700">{copy.date}:</span>
                      <span className="mb-0.5 min-w-0 flex-1 border-b border-dotted border-slate-400" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-end gap-1.5 text-[9px] text-slate-500 sm:text-[10px]">
                    <span className="shrink-0 font-semibold text-slate-700">{copy.diagnosis}:</span>
                    <span className="mb-0.5 min-w-0 flex-1 border-b border-dotted border-slate-400" />
                  </div>
                </section>

                <section className="relative mt-3 min-h-0 flex-1 overflow-hidden">
                  <div dir="ltr" className="flex items-center border-b border-slate-200 pb-1.5">
                    <span className="font-sans text-3xl font-black leading-none tracking-[-0.06em] text-sky-800/90 sm:text-4xl">
                      RX
                    </span>
                  </div>

                  <div className="absolute inset-x-0 top-12 space-y-9 opacity-60 sm:top-14 sm:space-y-11">
                    <div className="border-b border-dashed border-slate-200" />
                    <div className="border-b border-dashed border-slate-200" />
                    <div className="border-b border-dashed border-slate-200" />
                  </div>

                </section>

                <footer className="mt-2 shrink-0 border-t border-sky-700 pt-1.5 text-center">
                  <div className="flex min-w-0 items-center justify-center gap-x-1.5 text-[9px] leading-3 text-slate-500 sm:text-[10px]">
                    {form.phoneNumber && (
                      <span className="shrink-0 font-semibold text-sky-900" dir="ltr">
                        {form.phoneNumber}
                      </span>
                    )}
                    {form.phoneNumber && (form.address || form.email) && (
                      <span className="shrink-0 text-slate-300">•</span>
                    )}
                    {(form.address || form.email) && (
                      <span className="truncate">{form.address || form.email}</span>
                    )}
                  </div>
                </footer>
              </div>
              <PrescriptionSystemCredit color="#075985" />
            </div>
            <p className="mt-3 px-2 text-center text-xs leading-5 text-rx-muted">{copy.previewHint}</p>
          </aside>
        </div>
      </div>
    </main>
  );
}
