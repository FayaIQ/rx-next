import { PatientsPageClient } from "@/components/patients/patients-page";

export default function SecretaryPatientsPage() {
  return (
    <PatientsPageClient title="مرضى الطبيب" showRecordLink={false} />
  );
}
