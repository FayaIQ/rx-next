import type { Metadata } from "next";
import { DoctorOnboardingForm } from "@/components/onboarding/doctor-onboarding-form";

export const metadata: Metadata = {
  title: "إعداد بيانات العيادة",
};

export default function DoctorOnboardingPage() {
  return <DoctorOnboardingForm />;
}
