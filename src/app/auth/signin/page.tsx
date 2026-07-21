"use client";

import { AuthSignInPage } from "@/components/auth/auth-page-layout";

export default function DoctorSignInPage() {
  return (
    <AuthSignInPage
      role="doctor"
      titleKey="auth.doctorSignInTitle"
      subtitleKey="auth.doctorSignInSubtitle"
      alternateHref="/auth/signup"
      alternateLabelKey="auth.doctorAlternateSignUp"
      footerLinks={[
        { href: "/auth/login/secretary", labelKey: "auth.secretaryLogin" },
      ]}
    />
  );
}
