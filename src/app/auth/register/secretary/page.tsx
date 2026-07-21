"use client";

import Link from "next/link";
import { AuthSignUpPage } from "@/components/auth/auth-page-layout";
import { useLocale } from "@/i18n/locale-provider";

export default function SecretaryRegisterPage() {
  const { t } = useLocale();

  return (
    <AuthSignUpPage
      role="secretary"
      titleKey="auth.secretarySignUpTitle"
      subtitleKey="auth.secretarySignUpSubtitle"
      alternateHref="/auth/login/secretary"
      alternateLabelKey="auth.doctorAlternateSignIn"
      footer={
        <div className="mt-6 text-center text-sm text-rx-muted">
          <Link href="/auth/signin" className="text-rx-primary hover:underline">
            {t("auth.doctorLogin")}
          </Link>
        </div>
      }
    />
  );
}
