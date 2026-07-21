"use client";

import { AuthSignUpPage } from "@/components/auth/auth-page-layout";
import { useLocale } from "@/i18n/locale-provider";

export default function DoctorSignUpPage() {
  const { t } = useLocale();

  return (
    <AuthSignUpPage
      role="doctor"
      titleKey="auth.doctorSignUpTitle"
      subtitleKey="auth.doctorSignUpSubtitle"
      alternateHref="/auth/signin"
      alternateLabelKey="auth.doctorAlternateSignIn"
      footer={
        <p className="mt-6 text-center text-xs text-rx-muted">{t("auth.terms")}</p>
      }
    />
  );
}
