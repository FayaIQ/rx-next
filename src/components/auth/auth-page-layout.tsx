"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Calendar, FileText, Shield, Wifi } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";

type Role = "doctor" | "secretary" | "admin";

type Props = {
  children: React.ReactNode;
  role: Role;
};

const PANEL_META: Record<
  Role,
  {
    gradient: string;
    subtitleKey: string;
    featureKeys: Array<{
      icon: typeof FileText;
      textKey: string;
    }>;
  }
> = {
  doctor: {
    gradient: "from-[#075985] via-[#0e7490] to-[#134e4a]",
    subtitleKey: "auth.panelDoctorSubtitle",
    featureKeys: [
      { icon: FileText, textKey: "auth.featureRx" },
      { icon: Calendar, textKey: "auth.featureAppointments" },
      { icon: Wifi, textKey: "auth.featureOffline" },
    ],
  },
  secretary: {
    gradient: "from-[#0f766e] via-[#0d9488] to-[#115e59]",
    subtitleKey: "auth.panelSecretarySubtitle",
    featureKeys: [
      { icon: Calendar, textKey: "auth.featureBook" },
      { icon: FileText, textKey: "auth.featurePatients" },
    ],
  },
  admin: {
    gradient: "from-[#0c4a6e] via-[#075985] to-[#082f49]",
    subtitleKey: "auth.panelAdminSubtitle",
    featureKeys: [
      { icon: Shield, textKey: "auth.featureSubs" },
      { icon: FileText, textKey: "auth.featureStats" },
    ],
  },
};

export function AuthPageLayout({ children, role }: Props) {
  const { t } = useLocale();
  const panel = PANEL_META[role];

  return (
    <div className="flex min-h-screen">
      <div
        className={`relative hidden w-[45%] flex-col justify-between bg-gradient-to-br p-12 text-white lg:flex ${panel.gradient}`}
      >
        <div>
          <BrandLogo variant="dark" size="lg" showName={false} />
          <h2 className="mt-8 text-3xl font-bold leading-tight">
            {t("app.name")}
          </h2>
          <p className="mt-4 max-w-sm text-base text-white/75">
            {t(panel.subtitleKey)}
          </p>
        </div>

        <ul className="space-y-4">
          {panel.featureKeys.map(({ icon: Icon, textKey }) => (
            <li
              key={textKey}
              className="flex items-center gap-3 text-sm text-white/85"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <Icon size={18} />
              </div>
              {t(textKey)}
            </li>
          ))}
        </ul>

        <p className="text-xs text-white/40">© RX Clinic — FAYA</p>
      </div>

      <div className="rx-app-bg flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 lg:hidden">
          <BrandLogo size="md" showName subtitle={t("app.tagline")} />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
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
