import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جرّب RX Clinic مجاناً لمدة 14 يوماً",
  description:
    "نظام إدارة العيادات العامة وعيادات الأسنان: المرضى والمواعيد والوصفات والحسابات في مكان واحد.",
  alternates: { canonical: "/clinic/free-trial" },
};

export default function ClinicFreeTrialPage() {
  return <LandingPage />;
}
