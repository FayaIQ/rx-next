import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "نظام إدارة العيادات والوصفات الطبية",
  description:
    "نظام لإدارة العيادات العامة وعيادات الأسنان: مرضى، مواعيد، وصفات، خطط علاج، وحسابات — يعمل دون إنترنت ويزامن البيانات تلقائياً.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <LandingPage />;
}
