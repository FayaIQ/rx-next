"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpLeft,
  Calendar,
  Check,
  FileText,
  Gift,
  Layers,
  Pill,
  Smile,
  Star,
  Stethoscope,
  Users,
  Wallet,
  WifiOff,
  ClipboardList,
  BarChart3,
  GraduationCap,
  MessageCircle,
  BadgeCheck,
  Headphones,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LandingRxDemo } from "@/components/landing/landing-rx-demo";
import { LinkedFayaDevText } from "@/components/faya-dev-link";
import { useLocale } from "@/i18n/locale-provider";
import { trackWhatsAppClick } from "@/lib/google-ads";
import { cn } from "@/lib/utils";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#E8F5E0] px-3.5 py-1 text-xs font-semibold tracking-wide text-[#1B6B4A]">
      {children}
    </span>
  );
}

function SectionHead({
  badge,
  title,
  body,
  center,
}: {
  badge: string;
  title: string;
  body?: string;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <Badge>{badge}</Badge>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C3D] sm:text-4xl">
        {title}
      </h2>
      {body ? (
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {body}
        </p>
      ) : null}
    </div>
  );
}

function ShowcaseVideo({
  src,
  poster,
  label,
  title,
  body,
  duration,
  fit = "cover",
}: {
  src: string;
  poster: string;
  label: string;
  title: string;
  body: string;
  duration: string;
  fit?: "cover" | "contain";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVisible = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          isVisible.current = true;
          setShouldLoad(true);
        } else {
          isVisible.current = false;
          video.pause();
        }
      },
      { rootMargin: "350px 0px", threshold: 0.1 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (shouldLoad) videoRef.current?.load();
  }, [shouldLoad]);

  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-[#0B5F5A]/12 bg-white shadow-md shadow-[#0B5F5A]/5 transition duration-500 hover:-translate-y-1 hover:border-[#0B5F5A]/30 hover:shadow-xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EAF7F4]">
        <Image
          src={poster}
          alt=""
          fill
          sizes="(min-width: 1024px) 38vw, 90vw"
          className="scale-110 object-cover opacity-20 blur-2xl transition duration-700 group-hover:scale-125"
          aria-hidden="true"
        />
        <video
          ref={videoRef}
          className={cn(
            "relative z-10 size-full transition duration-700 group-hover:scale-[1.015]",
            fit === "contain" ? "object-contain" : "object-cover"
          )}
          controls
          muted
          loop
          playsInline
          preload="none"
          poster={poster}
          aria-label={title}
          onCanPlay={() => {
            if (isVisible.current) videoRef.current?.play().catch(() => undefined);
          }}
        >
          {shouldLoad ? <source src={src} type="video/mp4" /> : null}
        </video>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-white/90 to-transparent p-4 sm:p-5">
          <span className="rounded-full border border-[#0B5F5A]/15 bg-white/90 px-3 py-1 text-xs font-bold text-[#0B5F5A] shadow-sm backdrop-blur-md">
            {label}
          </span>
          <span className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-bold text-[#0B2C3D] shadow-sm">
            {duration}
          </span>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="text-xl font-bold text-[#0B2C3D]">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      </div>
    </article>
  );
}

function HeroProduct({ t }: { t: (k: string) => string }) {
  return (
    <div className="rx-landing-visual relative w-full lg:w-[115%] lg:max-w-none">
      <Image
        src="/main-img.png"
        alt={t("landing.visualRx")}
        width={1672}
        height={941}
        className="h-auto w-full"
        priority
      />
      <div className="absolute -bottom-4 start-4 rounded-2xl border border-white bg-white px-4 py-3 shadow-md sm:start-6">
        <div className="flex items-center gap-2">
          <div className="flex text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} fill="currentColor" />
            ))}
          </div>
          <p className="text-xs font-semibold text-[#0B2C3D]">
            {t("landing.trustRating")}
          </p>
        </div>
      </div>
    </div>
  );
}

const SERVICES = [
  { key: "1", icon: FileText },
  { key: "2", icon: ClipboardList },
  { key: "3", icon: Calendar },
  { key: "4", icon: Users },
  { key: "5", icon: Smile },
  { key: "6", icon: Wallet },
  { key: "7", icon: Pill },
  { key: "8", icon: BarChart3 },
] as const;

const PROCESS = [
  { key: "1", icon: Stethoscope },
  { key: "2", icon: FileText },
  { key: "3", icon: Calendar },
] as const;

const STATS = [
  { value: "stat1Value", label: "stat1Label", icon: Gift },
  { value: "stat2Value", label: "stat2Label", icon: WifiOff },
  { value: "stat3Value", label: "stat3Label", icon: Layers },
  { value: "stat4Value", label: "stat4Label", icon: Users },
] as const;

const ROLES = [
  { key: "Doctor", icon: Stethoscope, href: "/auth/signup", dark: true },
  {
    key: "Secretary",
    icon: ClipboardList,
    href: "/auth/login/secretary",
    dark: false,
  },
] as const;

const SALES_WHATSAPP = "+9647847076026";

const OFFER_PROOFS = [
  { key: "Price", icon: Wallet },
  { key: "Training", icon: GraduationCap },
  { key: "Doctors", icon: BadgeCheck },
  { key: "Support", icon: Headphones },
] as const;

export function LandingPage() {
  const { t, dir, locale } = useLocale();
  const [showLiveDemo, setShowLiveDemo] = useState(true);
  const hideLiveDemo = useCallback(() => setShowLiveDemo(false), []);
  const year = new Date().getFullYear();
  const whatsappMessage =
    locale === "ar"
      ? "مرحباً، أريد شرحاً مجانياً عن نظام RX Clinic لإدارة العيادات"
      : "Hello, I would like a free RX Clinic setup consultation";
  const whatsappUrl = `https://wa.me/${SALES_WHATSAPP.replace("+", "")}?text=${encodeURIComponent(whatsappMessage)}`;

  const checks = ["bentoCheck1", "bentoCheck2", "bentoCheck3", "bentoCheck4"] as const;

  return (
    <div className="rx-landing min-h-screen bg-[#F6F8F7] text-[#0B2C3D]" dir={dir}>
      {/* Nav — floating pill */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/60 bg-white/90 p-1.5 shadow-[0_8px_32px_rgb(8_51_68/0.18)] backdrop-blur-xl ring-1 ring-slate-900/5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full py-1 pe-3 ps-1.5 transition hover:bg-slate-100"
          >
            <span className="relative h-8 w-8 overflow-hidden rounded-full bg-[#0B5F5A]/10 ring-1 ring-[#0B5F5A]/15">
              <Image
                src="/brand/logo.png"
                alt=""
                width={32}
                height={32}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="text-sm font-bold tracking-tight text-[#0B2C3D]">
              RX Clinic
            </span>
          </Link>

          <div className="mx-0.5 h-8 w-px shrink-0 bg-slate-200" aria-hidden />

          <LanguageSwitcher variant="toggle" className="shrink-0 shadow-none" />
          <Link
            href="/auth/signin"
            className="hidden shrink-0 rounded-full px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-[#0B5F5A] sm:inline"
          >
            {t("landing.navSignIn")}
          </Link>
          <Link
            href="/auth/signup"
            className="shrink-0 rounded-full bg-[#0B5F5A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#094E4A]"
          >
            {t("landing.navStart")}
          </Link>
        </div>
      </header>

      {/* Hero Section - Enhanced */}
      <section className="relative overflow-hidden bg-white">
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10 lg:pb-20 lg:pt-32">
          <div className="rx-landing-hero-copy">
            <Badge>{t("landing.badge")}</Badge>
            <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight text-[#0B2C3D] sm:text-5xl">
              {t("landing.headline")}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {t("landing.subhead")}
            </p>
            <div className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[#0B5F5A]/15 bg-[#E8F5E0]/60 px-4 py-3 text-sm">
              <strong className="text-lg text-[#0B5F5A]">
                {t("landing.offerPrice")}
              </strong>
              <span className="text-slate-500">{t("landing.offerIncludes")}</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#0B5F5A] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#094E4A]"
              >
                {t("landing.ctaTrial")}
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackWhatsAppClick("hero")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0B5F5A]/25 bg-white px-6 py-3 text-sm font-semibold text-[#0B5F5A] transition hover:border-[#0B5F5A]/50 hover:bg-[#E8F5E0]/40"
              >
                <MessageCircle size={17} />
                {t("landing.ctaWhatsApp")}
              </a>
            </div>
            <Link
              href="/auth/login/secretary"
              className="mt-4 inline-block text-sm font-medium text-[#0B5F5A] underline-offset-4 hover:underline"
            >
              {t("landing.ctaSecretary")}
            </Link>

            <div className="mt-10 flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#0B5F5A] text-white shadow-sm ring-4 ring-[#E8F5E0]">
                <BadgeCheck size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#0B2C3D]">
                  {t("landing.trustCount")}
                </p>
                <p className="text-xs text-slate-500">{t("landing.trustDoctors")}</p>
              </div>
            </div>
          </div>

          <HeroProduct t={t} />
        </div>
      </section>

      {/* Commercial proof */}
      <section className="bg-[#F1F0F3] px-5 pb-2 pt-10 sm:px-8 sm:pt-12">
        <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-2 xl:grid-cols-4">
          {OFFER_PROOFS.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-center gap-4 rounded-2xl border border-white bg-white px-5 py-5 shadow-sm"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F5E0] text-[#0B5F5A]">
                <Icon size={21} />
              </span>
              <div>
                <p className="font-bold text-[#0B2C3D]">
                  {t(`landing.proof${key}Title`)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {t(`landing.proof${key}Body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#F1F0F3] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-white">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div
                key={value}
                className={cn(
                  "relative flex flex-col gap-3 p-6 sm:p-8",
                  i % 2 === 1 && "border-s border-slate-100",
                  i >= 2 && "border-t border-slate-100 lg:border-t-0",
                  i > 0 && "lg:border-s lg:border-slate-100"
                )}
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-[#E8F5E0] text-[#0B5F5A]">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-3xl font-extrabold tracking-tight text-[#0B5F5A] sm:text-4xl">
                    {t(`landing.${value}`)}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-slate-500">
                    {t(`landing.${label}`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real product visuals */}
      <section className="border-y border-slate-200/80 bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            badge={t("landing.productBadge")}
            title={t("landing.productTitle")}
            body={t("landing.productBody")}
            center
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-[#F7FBFA] shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl">
              <Image
                src="/landing/campaign/rx-general.png"
                alt={t("landing.productGeneralAlt")}
                width={1122}
                height={1402}
                className="h-auto w-full transition duration-700 group-hover:scale-[1.025]"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="p-6 sm:p-7">
                <h3 className="text-xl font-bold text-[#0B2C3D]">
                  {t("landing.productGeneralTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t("landing.productGeneralBody")}
                </p>
              </div>
            </article>

            <article className="group overflow-hidden rounded-[2rem] border border-[#0B5F5A]/15 bg-[#F7FBFA] shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-xl">
              <Image
                src="/landing/campaign/rx-dental.png"
                alt={t("landing.productDentalAlt")}
                width={1122}
                height={1402}
                className="h-auto w-full transition duration-700 group-hover:scale-[1.025]"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div className="p-6 sm:p-7">
                <h3 className="text-xl font-bold text-[#0B2C3D]">
                  {t("landing.productDentalTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t("landing.productDentalBody")}
                </p>
              </div>
            </article>
          </div>

          <div className="relative mt-16 overflow-hidden rounded-[2.5rem] border border-[#0B5F5A]/10 bg-[#F1F8F6] px-5 py-10 shadow-xl shadow-[#0B5F5A]/5 sm:px-8 sm:py-12 lg:px-12">
            <div className="absolute -start-24 -top-24 size-72 rounded-full bg-[#18A999]/15 blur-3xl" />
            <div className="absolute -bottom-32 -end-20 size-80 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative mx-auto max-w-2xl text-center">
              <span className="inline-flex rounded-full border border-[#0B5F5A]/15 bg-white px-3.5 py-1 text-xs font-semibold text-[#0B5F5A] shadow-sm">
                {t("landing.videoBadge")}
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0B2C3D] sm:text-4xl">
                {t("landing.videoTitle")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                {t("landing.videoBody")}
              </p>
            </div>

            <div className="relative mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
              <ShowcaseVideo
                src="/landing/campaign/rx-promo.mp4"
                poster="/landing/campaign/rx-promo-poster.jpg"
                label={t("landing.videoAdBadge")}
                title={t("landing.videoAdTitle")}
                body={t("landing.videoAdBody")}
                duration="02:08"
                fit="contain"
              />
              <ShowcaseVideo
                src="/landing/campaign/rx-guide.mp4"
                poster="/landing/campaign/rx-guide-poster.jpg"
                label={t("landing.videoGuideBadge")}
                title={t("landing.videoGuideTitle")}
                body={t("landing.videoGuideBody")}
                duration="01:32"
                fit="contain"
              />
            </div>

            <p className="relative mt-6 text-center text-xs text-slate-500">
              {t("landing.videoHint")}
            </p>
          </div>
        </div>
      </section>

      {/* Why RX — showcase */}
      <section className="overflow-hidden bg-[#F1F0F3] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.35fr]">
            {/* Content + checklist */}
            <div>
              <Badge>{t("landing.bentoBadge")}</Badge>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight text-[#0B2C3D] sm:text-4xl">
                {t("landing.bentoTitle")}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-500">
                {t("landing.bentoBody")}
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-sm">
                <h3 className="px-1 text-lg font-bold text-[#0B2C3D]">
                  {t("landing.bentoCard2Title")}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {checks.map((key) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-[#F6F8F7] px-4 py-3 text-sm font-medium text-[#0B2C3D]"
                    >
                      {t(`landing.${key}`)}
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0B5F5A] text-white">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0B5F5A] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#0a544f]"
                >
                  {t("landing.bentoLearn")}
                  <ArrowUpLeft size={16} />
                </Link>
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <Image
                src="/why-rx-img.png"
                alt={t("landing.bentoTitle")}
                width={1526}
                height={1031}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="border-y border-slate-200/80 bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            badge={t("landing.servicesBadge")}
            title={t("landing.servicesTitle")}
            body={t("landing.servicesBody")}
            center
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ key, icon: Icon }, i) => (
              <div
                key={key}
                className="group relative rounded-[1.5rem] border border-slate-200/90 bg-[#F6F8F7] p-6 transition hover:border-[#0B5F5A]/25 hover:bg-white hover:shadow-[0_12px_40px_-24px_rgba(11,95,90,0.35)]"
              >
                <span className="absolute end-5 top-5 text-slate-300 transition group-hover:text-[#0B5F5A]">
                  <ArrowUpLeft size={16} />
                </span>
                <p className="text-xs font-semibold tracking-[0.14em] text-[#0B5F5A]/70">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <span className="mt-5 inline-flex size-12 items-center justify-center rounded-2xl bg-white text-[#0B5F5A] shadow-sm ring-1 ring-slate-100">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-[#0B2C3D]">
                  {t(`landing.svc${key}Title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {t(`landing.svc${key}Body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            badge={t("landing.processBadge")}
            title={t("landing.processTitle")}
            center
          />
          <div className="mt-14 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm sm:grid sm:grid-cols-3">
            {PROCESS.map(({ key, icon: Icon }, i) => (
              <div
                key={key}
                className={cn(
                  "relative p-8 sm:p-9",
                  i > 0 && "border-t border-slate-100 sm:border-s sm:border-t-0"
                )}
              >
                <span
                  className="pointer-events-none absolute -top-3 end-5 text-7xl font-extrabold leading-none text-slate-100"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="relative flex size-12 items-center justify-center rounded-2xl bg-[#E8F5E0] text-[#0B5F5A]">
                  <Icon size={22} />
                </span>
                <h3 className="mt-6 text-lg font-bold text-[#0B2C3D]">
                  {t(`landing.process${key}Title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {t(`landing.process${key}Body`)}
                </p>
                <span
                  className={cn(
                    "mt-6 block h-1 w-10 rounded-full",
                    i === PROCESS.length - 1 ? "bg-[#0B5F5A]" : "bg-[#E8F5E0]"
                  )}
                  aria-hidden
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The entire live-demo section disappears if the frame is unavailable. */}
      {showLiveDemo ? (
        <section
          id="live-demo"
          className="scroll-mt-24 border-t border-slate-200/80 bg-white px-5 py-20 sm:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHead
              badge={t("landing.demoBadge")}
              title={t("landing.demoTitle")}
              body={t("landing.demoBody")}
              center
            />
            <LandingRxDemo onUnavailable={hideLiveDemo} />
          </div>
        </section>
      ) : null}

      {/* Roles */}
      <section className="border-y border-slate-200/80 bg-[#F6F8F7] px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <SectionHead
            badge={t("landing.rolesBadge")}
            title={t("landing.rolesTitle")}
            body={t("landing.rolesBody")}
            center
          />
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2">
            {ROLES.map(({ key, icon: Icon, href, dark }) => (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-[1.75rem] p-8",
                  dark
                    ? "bg-[#0B5F5A] text-white"
                    : "border border-slate-200/80 bg-white text-[#0B2C3D]"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute -end-12 -top-12 size-44 rounded-full",
                    dark ? "bg-white/10" : "bg-[#E8F5E0]/70"
                  )}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between">
                  <span
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl",
                      dark
                        ? "bg-white/15 text-white"
                        : "bg-[#0B5F5A] text-white"
                    )}
                  >
                    <Icon size={26} strokeWidth={1.75} />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-[11px] font-semibold",
                      dark
                        ? "bg-white/15 text-teal-50"
                        : "bg-[#E8F5E0] text-[#1B6B4A]"
                    )}
                  >
                    {t(`landing.role${key}Tag`)}
                  </span>
                </div>
                <h3 className="relative mt-6 text-2xl font-bold">
                  {t(`landing.role${key}Title`)}
                </h3>
                <p
                  className={cn(
                    "relative mt-2 text-sm leading-relaxed",
                    dark ? "text-teal-50/85" : "text-slate-600"
                  )}
                >
                  {t(`landing.role${key}Body`)}
                </p>
                <ul className="relative mt-6 space-y-2.5">
                  {(["Feat1", "Feat2", "Feat3", "Feat4"] as const).map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full",
                          dark
                            ? "bg-white/20 text-white"
                            : "bg-[#0B5F5A] text-white"
                        )}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {t(`landing.role${key}${f}`)}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={cn(
                    "relative mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition",
                    dark
                      ? "bg-white text-[#0B5F5A] hover:bg-teal-50"
                      : "bg-[#0B5F5A] text-white hover:bg-[#094E4A]"
                  )}
                >
                  {t(`landing.role${key}Cta`)}
                  <ArrowUpLeft size={16} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified experience, without invented testimonials */}
      <section className="bg-[#EAF3F0] px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-white/80 bg-white p-7 shadow-sm sm:p-10 lg:grid-cols-[1fr_auto]">
          <div>
            <Badge>{t("landing.experienceBadge")}</Badge>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-[#0B2C3D] sm:text-4xl">
              {t("landing.experienceTitle")}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              {t("landing.experienceBody")}
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackWhatsAppClick("experience")}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B5F5A] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#094E4A]"
          >
            <MessageCircle size={18} />
            {t("landing.ctaWhatsApp")}
          </a>
        </div>
      </section>

      {/* Offline CTA banner */}
      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[1.75rem] bg-[#0B2C3D] shadow-lg lg:flex-row">
          <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#0B5F5A] to-[#0E7490] p-10 lg:max-w-sm">
            <WifiOff size={72} className="text-white/90" strokeWidth={1.25} />
          </div>
          <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
            <Badge>{t("landing.offlineBadge")}</Badge>
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
              {t("landing.offlineTitle")}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t("landing.offlineBody")}
            </p>
            <Link
              href="/auth/signup"
              className="mt-6 inline-flex w-fit items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0B2C3D] transition hover:bg-[#E8F5E0]"
            >
              {t("landing.offlineCta")}
            </Link>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0B2C3D] sm:text-4xl">
            {t("landing.closeTitle")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-slate-600">
            {t("landing.closeBody")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex rounded-full bg-[#0B5F5A] px-7 py-3.5 text-sm font-bold text-white transition hover:bg-[#094E4A]"
            >
              {t("landing.closeCta")}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackWhatsAppClick("closing")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-7 py-3.5 text-sm font-semibold text-[#0B2C3D] transition hover:bg-slate-50"
            >
              <MessageCircle size={17} />
              {t("landing.ctaWhatsApp")}
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#0B2C3D] text-slate-300">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-lg font-bold text-white">RX Clinic</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              <LinkedFayaDevText
                text={t("landing.footerAbout")}
                className="text-slate-300 hover:text-white"
              />
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              {t("landing.footerLinks")}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/solutions/clinic-management-software-iraq" className="hover:text-white">
                  برنامج إدارة العيادات في العراق
                </Link>
              </li>
              <li>
                <Link href="/solutions/dental-clinic-software" className="hover:text-white">
                  برنامج عيادة أسنان
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white">
                  دليل إدارة العيادات
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-white">
                  {t("landing.ctaTrial")}
                </Link>
              </li>
              <li>
                <Link href="/auth/signin" className="hover:text-white">
                  {t("landing.ctaSignIn")}
                </Link>
              </li>
              <li>
                <Link href="/auth/login/secretary" className="hover:text-white">
                  {t("landing.ctaSecretary")}
                </Link>
              </li>
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackWhatsAppClick("footer")}
                  className="hover:text-white"
                >
                  {t("landing.ctaWhatsApp")}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-slate-500 sm:px-8">
            <LinkedFayaDevText
              text={t("landing.footerCopy", { year })}
              className="text-slate-400 hover:text-white"
            />
          </p>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        onClick={() => trackWhatsAppClick("floating_mobile")}
        aria-label={t("landing.ctaWhatsApp")}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-50 inline-flex items-center gap-2 rounded-full bg-[#0B5F5A] px-4 py-3 text-sm font-bold text-white shadow-[0_12px_35px_rgba(11,95,90,0.35)] transition hover:bg-[#094E4A] sm:hidden"
      >
        <MessageCircle size={19} />
        {t("landing.ctaWhatsAppShort")}
      </a>
    </div>
  );
}
