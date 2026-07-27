"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandLogo } from "@/components/layout/brand-logo";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  FileText,
  Shield,
  Wifi,
} from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { FayaDevLink } from "@/components/faya-dev-link";

type Role = "doctor" | "secretary" | "admin";

type Props = {
  children: React.ReactNode;
  role: Role;
};

const PANEL_META: Record<
  Role,
  {
    subtitleKey: string;
    featureKeys: Array<{
      icon: typeof FileText;
      textKey: string;
    }>;
  }
> = {
  doctor: {
    subtitleKey: "auth.panelDoctorSubtitle",
    featureKeys: [
      { icon: FileText, textKey: "auth.featureRx" },
      { icon: Calendar, textKey: "auth.featureAppointments" },
      { icon: Wifi, textKey: "auth.featureOffline" },
    ],
  },
  secretary: {
    subtitleKey: "auth.panelSecretarySubtitle",
    featureKeys: [
      { icon: Calendar, textKey: "auth.featureBook" },
      { icon: FileText, textKey: "auth.featurePatients" },
    ],
  },
  admin: {
    subtitleKey: "auth.panelAdminSubtitle",
    featureKeys: [
      { icon: Shield, textKey: "auth.featureSubs" },
      { icon: FileText, textKey: "auth.featureStats" },
    ],
  },
};

export function AuthPageLayout({ children, role }: Props) {
  const { t, locale } = useLocale();
  const panel = PANEL_META[role];
  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F4F7F6]">
      <div
        className="pointer-events-none absolute -start-32 -top-40 size-[32rem] rounded-full bg-[#10A6C3]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -end-28 size-[34rem] rounded-full bg-[#80C45A]/10 blur-3xl"
        aria-hidden
      />

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="rounded-2xl transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5F5A]"
          >
            <BrandLogo size="md" subtitle={t("app.tagline")} />
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="toggle" />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-[#0B5F5A]/30 hover:text-[#0B5F5A]"
            >
              <BackIcon size={16} />
              <span className="hidden sm:inline">{t("common.back")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-[1380px] items-center px-5 pb-8 pt-28 sm:px-8 lg:px-10 lg:pb-12 lg:pt-28">
        <div className="grid w-full overflow-hidden rounded-[2.5rem] border border-white/90 bg-white shadow-[0_32px_100px_rgba(15,69,66,0.14)] ring-1 ring-slate-900/5 lg:grid-cols-[minmax(0,1.12fr)_minmax(29rem,0.88fr)]">
          <section className="relative hidden min-h-[720px] overflow-hidden border-e border-slate-100 bg-gradient-to-br from-[#FBFDFC] via-[#F3FAF7] to-[#E8F5E0] lg:flex lg:flex-col">
            <div
              className="pointer-events-none absolute -end-24 -top-28 size-80 rounded-full bg-[#10A6C3]/10 blur-3xl"
              aria-hidden
            />
            <div className="relative px-9 pb-0 pt-9 xl:px-12 xl:pt-11">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E2F3DB] px-3.5 py-1.5 text-xs font-bold text-[#1B6B4A]">
                <Check size={14} />
                {t("landing.badge")}
              </span>
              <h2 className="mt-5 max-w-2xl text-3xl font-bold leading-[1.3] tracking-tight text-[#0B2C3D]">
                {t("landing.headline")}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600">
                {t(panel.subtitleKey)}
              </p>
            </div>

            <div className="relative flex min-h-[300px] flex-1 items-center justify-center px-7 py-2">
              <Image
                src="/main-img.png"
                alt={t("landing.visualRx")}
                width={1672}
                height={941}
                className="h-auto w-full max-w-[780px] object-contain"
                priority
              />
            </div>

            <ul className="relative grid grid-cols-3 gap-2 px-7 pb-7 xl:px-10 xl:pb-9">
              {panel.featureKeys.map(({ icon: Icon, textKey }) => (
                <li
                  key={textKey}
                  className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-white bg-white/85 px-3 py-3 text-xs font-semibold leading-5 text-[#0B2C3D] shadow-sm"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#0B5F5A]/10 text-[#0B5F5A]">
                    <Icon size={17} />
                  </span>
                  <span>{t(textKey)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex min-w-0 flex-col justify-center bg-white px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="mx-auto mb-6 flex w-full max-w-md items-center justify-center lg:hidden">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#F3FAF7] to-[#E8F5E0] p-2 ring-1 ring-[#0B5F5A]/10">
                <Image
                  src="/main-img.png"
                  alt={t("landing.visualRx")}
                  width={1672}
                  height={941}
                  className="h-auto w-full max-w-md"
                  priority
                />
              </div>
            </div>

            <div className="mx-auto w-full max-w-md">{children}</div>

            <p className="mt-7 text-center text-xs text-slate-400">
              © RX Clinic —{" "}
              <FayaDevLink className="text-slate-500 hover:text-[#0B5F5A]">
                Faya Dev
              </FayaDevLink>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

export function AuthSignInPage({
  role,
  titleKey,
  subtitleKey,
  alternateHref,
  alternateLabelKey,
  footerLinks,
}: {
  role: Role;
  titleKey: string;
  subtitleKey?: string;
  alternateHref?: string;
  alternateLabelKey?: string;
  footerLinks?: Array<{ href: string; labelKey: string }>;
}) {
  const { t } = useLocale();

  return (
    <AuthPageLayout role={role}>
      <Suspense fallback={null}>
        <AuthForm
          mode="signin"
          role={role}
          title={t(titleKey)}
          subtitle={subtitleKey ? t(subtitleKey) : undefined}
          alternateHref={alternateHref}
          alternateLabel={
            alternateLabelKey ? t(alternateLabelKey) : undefined
          }
        />
      </Suspense>
      {footerLinks && footerLinks.length > 0 && (
        <div className="mt-8 flex flex-wrap justify-center gap-4 border-t border-rx-border pt-6 text-sm text-rx-muted">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-rx-primary hover:underline"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </div>
      )}
    </AuthPageLayout>
  );
}

export function AuthSignUpPage({
  role,
  titleKey,
  subtitleKey,
  alternateHref,
  alternateLabelKey,
  footer,
}: {
  role: Role;
  titleKey: string;
  subtitleKey?: string;
  alternateHref?: string;
  alternateLabelKey?: string;
  footer?: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <AuthPageLayout role={role}>
      <Suspense fallback={null}>
        <AuthForm
          mode="signup"
          role={role}
          title={t(titleKey)}
          subtitle={subtitleKey ? t(subtitleKey) : undefined}
          alternateHref={alternateHref}
          alternateLabel={
            alternateLabelKey ? t(alternateLabelKey) : undefined
          }
        />
      </Suspense>
      {footer}
    </AuthPageLayout>
  );
}
