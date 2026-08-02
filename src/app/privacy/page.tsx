import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "سياسة خصوصية وحماية البيانات في منصة RX Clinic.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
