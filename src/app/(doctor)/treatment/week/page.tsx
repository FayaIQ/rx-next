import { AppHeader } from "@/components/layout/app-header";
import { WeeklyTreatmentCalendar } from "@/components/treatment/weekly-treatment-calendar";
import { PageContent } from "@/components/ui/page-shell";

export default function TreatmentWeekPage() {
  return (
    <>
      <AppHeader
        title="تقويم العلاج الأسبوعي"
        subtitle="جلسات العلاج المجدولة لهذا الأسبوع"
      />
      <PageContent>
        <WeeklyTreatmentCalendar />
      </PageContent>
    </>
  );
}
