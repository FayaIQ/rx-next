"use client";

import Link from "next/link";
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
        <p className="mt-6 text-center text-xs leading-6 text-rx-muted">
          {t("auth.termsPrefix")}{" "}
          <Link
            href="/terms"
            className="font-semibold text-rx-primary underline-offset-4 hover:underline"
          >
            {t("auth.termsOfUse")}
          </Link>{" "}
          {t("auth.termsAnd")}{" "}
          <Link
            href="/privacy"
            className="font-semibold text-rx-primary underline-offset-4 hover:underline"
          >
            {t("auth.privacyPolicy")}
          </Link>
        </p>
      }
    />
  );
}
