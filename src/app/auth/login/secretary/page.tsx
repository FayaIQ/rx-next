"use client";

import { AuthSignInPage } from "@/components/auth/auth-page-layout";

export default function SecretarySignInPage() {
  return (
    <AuthSignInPage
      role="secretary"
      titleKey="auth.secretarySignInTitle"
      subtitleKey="auth.secretarySignInSubtitle"
      alternateHref="/auth/register/secretary"
      alternateLabelKey="auth.secretaryAlternateSignUp"
      footerLinks={[{ href: "/auth/signin", labelKey: "auth.doctorLogin" }]}
    />
  );
}
