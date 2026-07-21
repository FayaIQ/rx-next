"use client";

import { AppointmentsPageClient } from "@/components/appointments/appointments-page";
import { useLocale } from "@/i18n/locale-provider";

export default function SecretaryDatesPage() {
  const { t } = useLocale();
  return (
    <AppointmentsPageClient
      title={t("secretary.doctorAppointments")}
      showTreatmentLinks={false}
    />
  );
}
