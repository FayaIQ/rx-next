import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Calendar, FileText, Shield, Wifi } from "lucide-react";

type Props = {
  children: React.ReactNode;
  role: "doctor" | "secretary" | "admin";
  panelTitle?: string;
  panelSubtitle?: string;
};

const panels = {
  doctor: {
    gradient: "from-[#075985] via-[#0e7490] to-[#134e4a]",
    title: "RX Clinic",
    subtitle: "اكتب، اطبع، وأدر عيادتك بكفاءة — حتى بدون إنترنت",
    features: [
      { icon: FileText, text: "وصفات طبية احترافية قابلة للطباعة" },
      { icon: Calendar, text: "إدارة المواعيد والمرضى" },
      { icon: Wifi, text: "يعمل أوفلاين ويتزامن تلقائياً" },
    ],
  },
  secretary: {
    gradient: "from-[#0f766e] via-[#0d9488] to-[#115e59]",
    title: "RX Clinic — السكرتير",
    subtitle: "ساعد طبيبك في إدارة المرضى والمواعيد",
    features: [
      { icon: Calendar, text: "حجز وتعديل المواعيد" },
      { icon: FileText, text: "إدارة بيانات المرضى" },
    ],
  },
  admin: {
    gradient: "from-[#0c4a6e] via-[#075985] to-[#082f49]",
    title: "RX Clinic — الإدارة",
    subtitle: "تحكم كامل بالأطباء والاشتراكات والباقات",
    features: [
      { icon: Shield, text: "إدارة الاشتراكات والتفعيل" },
      { icon: FileText, text: "إحصائيات وتقارير شاملة" },
    ],
  },
};

export function AuthPageLayout({
  children,
  role,
  panelTitle,
  panelSubtitle,
}: Props) {
  const panel = panels[role];

  return (
    <div className="flex min-h-screen">
      <div
        className={`relative hidden w-[45%] flex-col justify-between bg-gradient-to-br p-12 text-white lg:flex ${panel.gradient}`}
      >
        <div>
          <BrandLogo variant="dark" size="lg" showName={false} />
          <h2 className="mt-8 text-3xl font-bold leading-tight">
            {panelTitle ?? panel.title}
          </h2>
          <p className="mt-4 max-w-sm text-base text-white/75">
            {panelSubtitle ?? panel.subtitle}
          </p>
        </div>

        <ul className="space-y-4">
          {panel.features.map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="flex items-center gap-3 text-sm text-white/85"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                <Icon size={18} />
              </div>
              {text}
            </li>
          ))}
        </ul>

        <p className="text-xs text-white/40">© RX Clinic — FAYA</p>
      </div>

      <div className="rx-app-bg flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 lg:hidden">
          <BrandLogo size="md" showName subtitle="نظام الوصفات الطبية" />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function AuthSignInPage({
  role,
  title,
  subtitle,
  alternateHref,
  alternateLabel,
  footerLinks,
}: {
  role: "doctor" | "secretary" | "admin";
  title: string;
  subtitle?: string;
  alternateHref?: string;
  alternateLabel?: string;
  footerLinks?: Array<{ href: string; label: string }>;
}) {
  return (
    <AuthPageLayout role={role}>
      <Suspense fallback={null}>
        <AuthForm
          mode="signin"
          role={role}
          title={title}
          subtitle={subtitle}
          alternateHref={alternateHref}
          alternateLabel={alternateLabel}
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
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </AuthPageLayout>
  );
}
