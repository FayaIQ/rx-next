import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "برنامج إدارة العيادات في العراق",
  description:
    "برنامج عربي لإدارة العيادات في العراق: ملفات مرضى، مواعيد، وصفات، حسابات ومخطط أسنان. يعمل دون إنترنت مع تجربة مجانية 14 يوماً.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    locale: "ar_IQ",
    siteName: "RX Clinic",
    title: "برنامج إدارة العيادات في العراق | RX Clinic",
    description: "نظّم المرضى والمواعيد والوصفات والحسابات في نظام عربي يعمل حتى عند انقطاع الإنترنت.",
  },
};

export default function HomePage() {
  return <LandingPage />;
}
