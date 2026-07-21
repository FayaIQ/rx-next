"use client";

import { FinancesPage } from "@/components/finances/finances-page";
import { useLocale } from "@/i18n/locale-provider";

export default function SecretaryFinancesPage() {
  const { t } = useLocale();
  return (
    <FinancesPage
      title={t("secretary.clinicFinances")}
      subtitle={t("secretary.clinicFinancesSubtitle")}
    />
  );
}
