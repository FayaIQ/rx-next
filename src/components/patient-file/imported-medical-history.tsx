"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";
import { ClinicalCard } from "@/components/patients/legacy-archive-client";
import { patientHistoryFields, recordNotes } from "@/lib/legacy-import/medical-display";
import type { ArchivePage, LegacyEntity } from "@/lib/legacy-import/types";

const sections: [LegacyEntity, string, string][] = [
  ["Visits", "الزيارات", "Visits"], ["LabWorkups", "الفحوصات", "Tests"],
  ["VitalSigns", "القياسات الحيوية", "Vital signs"], ["PatientChronicConditions", "الحالات المزمنة", "Chronic conditions"],
  ["Histories", "التاريخ المرضي", "Clinical history"], ["PatientDiagnoses", "التشخيصات", "Diagnoses"],
  ["PatientFamilyHistories", "التاريخ العائلي", "Family history"],
];
export function ImportedMedicalHistory({ source }: { source: { batchId: string; patientId: string } }) {
  const { locale } = useLocale(), ar = locale === "ar";
  const [section, setSection] = useState<LegacyEntity>("Visits"), [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery<ArchivePage>({
    queryKey: ["patient-medical-history", source.batchId, source.patientId, section, page],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ patient: source.patientId, entity: section, page: String(page) });
      const response = await fetch(`/api/patients/imports/${source.batchId}?${params}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(ar ? "تعذر تحميل التاريخ الطبي" : "Could not load medical history");
      return response.json();
    },
  });
  const fields = data?.patient ? patientHistoryFields(data.patient, locale) : [];
  const note = data?.patient ? recordNotes(data.patient) : "";
  return <div className="space-y-5">
    {(fields.length > 0 || note) && <section className="rounded-2xl border bg-white p-5"><dl className="grid gap-4 sm:grid-cols-2">{fields.map(f => <div key={f.label}><dt className="text-xs text-slate-500">{f.label}</dt><dd dir="auto" className="mt-2 whitespace-pre-wrap text-sm leading-7">{f.value}</dd></div>)}</dl>{note && <p dir="auto" className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-8">{note}</p>}</section>}
    <nav aria-label={ar ? "التاريخ الطبي" : "Medical history"} className="flex flex-wrap gap-2">{sections.map(([key, label, en]) => <Button key={key} size="sm" variant={section === key ? "default" : "outline"} onClick={() => { setSection(key); setPage(1); }}>{ar ? label : en} {data?.counts?.[key] ?? ""}</Button>)}</nav>
    {isLoading && <p className="p-5 text-sm text-slate-500">{ar ? "جاري التحميل…" : "Loading…"}</p>}
    {error && <p role="alert">{error.message}</p>}
    {data?.rows.map(row => <ClinicalCard key={row.id} row={row} locale={locale} inPatient drugs={data.drugs?.filter(d => d.sourceVisitId === row.sourceId) ?? []} observations={data.observations?.filter(d => d.sourceVisitId === row.sourceId) ?? []} labResults={data.labResults?.filter(d => d.sourceVisitId === row.sourceId) ?? []} references={data.references} onPatient={() => {}} />)}
    {data && !data.rows.length && <p className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">{ar ? "لا توجد سجلات بهذا القسم." : "No records in this section."}</p>}
    {data && data.total > 25 && <div className="flex items-center justify-between gap-4"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{ar ? "السابق" : "Previous"}</Button><span className="text-sm text-slate-500">{page} / {Math.ceil(data.total / 25)}</span><Button variant="outline" disabled={page * 25 >= data.total} onClick={() => setPage(p => p + 1)}>{ar ? "التالي" : "Next"}</Button></div>}
  </div>;
}
