import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RX Clinic — نظام إدارة العيادات",
  description:
    "نظام لإدارة العيادات العامة وعيادات الأسنان: مرضى، مواعيد، وصفات، خطط علاج، وحسابات — يعمل دون إنترنت ويزامن البيانات تلقائياً.",
};

export default function HomePage() {
  return <LandingPage />;
}
