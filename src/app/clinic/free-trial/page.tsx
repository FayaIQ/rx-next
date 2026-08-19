import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جرّب RX Clinic مجاناً لمدة 14 يوماً",
  description:
    "نظام إدارة العيادات العامة وعيادات الأسنان: المرضى والمواعيد والوصفات والحسابات في مكان واحد.",
  alternates: { canonical: "/clinic/free-trial" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/clinic/free-trial",
    locale: "ar_IQ",
    siteName: "RX Clinic",
    title: "جرّب RX Clinic مجاناً لمدة 14 يوماً",
    description: "ابدأ تجربة برنامج إدارة العيادات من دون بطاقة دفع، مع إعداد وتدريب مجاني.",
  },
};

export default function ClinicFreeTrialPage() {
  return <LandingPage />;
}
