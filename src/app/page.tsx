import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "RX Clinic — نظام إدارة العيادات",
  description:
    "نظام عيادة متكامل للوصفات والمواعيد والمالية — يعمل أوفلاين ويتزامن تلقائياً.",
};

export default function HomePage() {
  return <LandingPage />;
}
