import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "شروط الاستخدام | RX Clinic",
  description: "شروط استخدام منصة RX Clinic لإدارة العيادات.",
};

export default function TermsPage() {
  return <LegalPage kind="terms" />;
}
