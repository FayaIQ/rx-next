"use client";

import { PatientsPageClient } from "@/components/patients/patients-page";
import { useLocale } from "@/i18n/locale-provider";

export default function SecretaryPatientsPage() {
  const { t } = useLocale();
  return (
    <PatientsPageClient
      title={t("secretary.doctorPatients")}
      showRecordLink={false}
    />
  );
}
