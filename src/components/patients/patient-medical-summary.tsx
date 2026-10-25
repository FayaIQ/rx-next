"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/i18n/locale-provider";
import { rxApi } from "@/lib/api/rx-client";
import { getRxDb } from "@/lib/db/rx-db";
import { localPatientToDto, syncLocalPatientFromDto } from "@/lib/sync/offline-store";
import { Button } from "@/components/ui/button";

type MedicalSummary = {
  allergies?: string | null;
  chronicConditions?: string | null;
  currentMedications?: string | null;
};

export function PatientMedicalSummary({ patient }: { patient: MedicalSummary }) {
  const { t } = useLocale();
  return <section aria-label={t("medicalSummary.title")} className="rounded-lg border border-rx-border bg-rx-bg-subtle/40 p-3 text-sm">
    <p className="mb-2 font-semibold">{t("medicalSummary.title")}</p>
    <dl className="space-y-2">
      {(["allergies", "chronicConditions", "currentMedications"] as const).map((key) => <div key={key} className={key === "allergies" && patient[key]?.trim() ? "rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-950" : ""}>
        <dt className="font-medium">{t(`medicalSummary.${key}`)}</dt>
        <dd className="whitespace-pre-wrap break-words">{patient[key]?.trim() || <span className="text-rx-muted">{t("medicalSummary.notRecorded")}</span>}</dd>
      </div>)}
    </dl>
  </section>;
}

export function PatientMedicalSummaryLoader({ patientId }: { patientId: number }) {
  const { t } = useLocale();
  const query = useQuery({
    queryKey: ["patient-medical-summary", patientId],
    queryFn: async () => {
      if (!navigator.onLine) {
        const cached = await getRxDb().patients.where("serverId").equals(patientId).first();
        if (!cached) throw new Error("Patient not cached");
        return localPatientToDto(cached);
      }
      const { patient } = await rxApi.patients.get(patientId);
      await syncLocalPatientFromDto(patient);
      return patient;
    },
    enabled: patientId > 0,
    networkMode: "always",
  });
  if (query.isError) return <div role="alert" className="rounded-lg border border-amber-200 p-3 text-sm">{t("medicalSummary.loadFailed")} <Button type="button" variant="ghost" size="sm" onClick={() => void query.refetch()}>{t("medicalSummary.retry")}</Button></div>;
  if (!query.data) return <p role="status" className="text-sm text-rx-muted">{t("common.loading")}</p>;
  return <PatientMedicalSummary patient={query.data} />;
}
