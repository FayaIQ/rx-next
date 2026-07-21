"use client";

import { AppHeader } from "@/components/layout/app-header";
import { WeeklyTreatmentCalendar } from "@/components/treatment/weekly-treatment-calendar";
import { PageContent } from "@/components/ui/page-shell";
import { useLocale } from "@/i18n/locale-provider";

export default function TreatmentWeekPage() {
  const { t } = useLocale();
  return (
    <>
      <AppHeader
        title={t("treatment.weekTitle")}
        subtitle={t("treatment.weekSubtitle")}
      />
      <PageContent>
        <WeeklyTreatmentCalendar />
      </PageContent>
    </>
  );
}
