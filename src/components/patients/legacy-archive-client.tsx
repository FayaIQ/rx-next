"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, FileText, FlaskConical, Pill, Search, UserRound, Users } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { PageContent } from "@/components/ui/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/locale-provider";
import { archiveLabel, entityLabels, reviewLabels } from "@/lib/legacy-import/labels";
import { medicalDate, medicalFields, patientBirthdate, patientFields, patientGender, patientHistoryFields, recordDate, recordNotes } from "@/lib/legacy-import/medical-display";
import type { ArchiveBatch, ArchivePage, ArchiveRecord, LegacyEntity } from "@/lib/legacy-import/types";

type Section = LegacyEntity | "Prescriptions";
type View = "overview" | "patients" | "review" | "templates" | "patient" | "records";
const tabs: Section[] = ["Visits", "Prescriptions", "LabWorkups", "VitalSigns", "Appointments", "PatientChronicConditions", "Histories", "PatientDiagnoses", "PatientFamilyHistories"];
const templates: Section[] = ["DrugTemplates", "PrescriptionListTemplates", "PrescriptionListTemplateItems", "TextTemplates", "ReferringDoctors"];
const shownDate = new Set(["Visits", "LabWorkups", "VitalSigns", "Appointments", "Histories"]);
const nameOf = (row: ArchiveRecord) => row.displayName.replace(/^[\s|]+/, "").trim();
const textOf = (value: unknown) => value === null || value === undefined ? "" : String(value).trim();

function Fields({ values }: { values: ReturnType<typeof medicalFields> }) {
  if (!values.length) return null;
  return <dl className="grid gap-x-7 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">{values.map((field) => <div key={field.label} className="min-w-0"><dt className="text-xs font-medium text-slate-500">{field.label}</dt><dd dir="auto" className="mt-1.5 whitespace-pre-wrap break-words text-sm font-medium leading-7 text-slate-800">{field.value}</dd></div>)}</dl>;
}

function Medicine({ row, locale }: { row: ArchiveRecord; locale: string }) {
  const note = recordNotes(row);
  return <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"><div className="mb-3 flex items-start gap-3"><Pill className="mt-1 shrink-0 text-teal-700" size={17} /><h4 dir="auto" className="font-semibold leading-7">{textOf(row.presentation.fields.DrugName) || nameOf(row)}</h4></div><Fields values={medicalFields(row, locale)} />{note && <p dir="auto" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{note}</p>}</div>;
}

function PatientProfile({ row, locale }: { row: ArchiveRecord; locale: string }) {
  const ar = locale === "ar", history = patientHistoryFields(row, locale), notes = recordNotes(row);
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-6"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><UserRound size={28} /></span><div><h2 className="text-xl font-bold leading-8">{nameOf(row)}</h2><p className="mt-1 text-sm text-slate-500">{ar ? "الملف الطبي للمريض" : "Patient medical record"}</p></div>{row.sourceDeleted && <span className="ms-auto rounded-full bg-slate-100 px-3 py-1 text-xs">{ar ? "محذوف" : "Deleted"}</span>}</div>
    <div className="p-5 sm:p-6"><Fields values={patientFields(row, locale)} /></div>
    {(history.length > 0 || notes) && <div className="space-y-5 border-t border-slate-100 p-5 sm:p-6">{history.length > 0 && <Fields values={history} />}{notes && <div><h3 className="mb-2 text-sm font-semibold text-slate-600">{ar ? "ملاحظات طبية" : "Medical notes"}</h3><p dir="auto" className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-8 text-slate-700">{notes}</p></div>}</div>}
  </section>;
}

export function ClinicalCard({ row, locale, inPatient, drugs, observations, labResults, references, onPatient }: { row: ArchiveRecord; locale: string; inPatient: boolean; drugs: ArchiveRecord[]; observations: ArchiveRecord[]; labResults: ArchiveRecord[]; references?: Record<string, string>; onPatient: (id: string) => void }) {
  const ar = locale === "ar", f = row.presentation.fields;
  if (["PrescribedDrugs", "DrugTemplates", "PrescriptionListTemplateItems", "VisitTemplateItems"].includes(row.entity)) return <Medicine row={row} locale={locale} />;
  const isVisit = row.entity === "Visits";
  const title = isVisit ? (inPatient ? (ar ? "زيارة طبية" : "Medical visit") : nameOf(row))
    : row.entity === "Appointments" ? (inPatient ? (ar ? "موعد" : "Appointment") : nameOf(row))
    : row.entity === "LabWorkups" ? textOf(f.TestName)
    : row.entity === "VitalSigns" ? (ar ? "القياسات الحيوية" : "Vital signs")
    : row.entity === "PatientChronicConditions" ? textOf(f.ConditionName)
    : row.entity === "PatientDiagnoses" ? textOf(f.HandwrittenText) || references?.[`Icd10Diagnoses:${f.Icd10DiagnosisId}`] || (ar ? "تشخيص" : "Diagnosis")
    : row.entity === "PatientFamilyHistories" ? textOf(f.Condition)
    : row.entity === "Histories" ? (ar ? "تاريخ مرضي" : "Clinical history")
    : textOf(f.TemplateName) || textOf(f.FullName) || nameOf(row);
  const date = shownDate.has(row.entity) ? recordDate(row, locale, isVisit) : "";
  const note = recordNotes(row), details = medicalFields(row, locale, references);
  const needsReview = row.state === "review" && !row.reviewAccepted;
  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div className="min-w-0"><h3 dir="auto" className="font-bold leading-8 text-slate-900">{title}</h3>{date && <div className="mt-1 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} /><span dir="auto">{date}</span></div>}</div><div className="flex items-center gap-2">{row.sourceDeleted && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{ar ? "محذوف" : "Deleted"}</span>}{!inPatient && row.sourcePatientId && <Button size="sm" variant="outline" onClick={() => onPatient(row.sourcePatientId!)}><UserRound size={15} />{ar ? "ملف المريض" : "Patient record"}</Button>}</div></header>
    <div className="space-y-5 p-5 sm:p-6">
      {needsReview && <div className="flex flex-wrap gap-2">{row.reviewReasons.map((reason) => <span key={reason} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900">{archiveLabel(reviewLabels, reason, locale)}</span>)}</div>}
      {note && <div><h4 className="mb-2 text-xs font-semibold text-slate-500">{ar ? "ملاحظات" : "Notes"}</h4><p dir="auto" className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-8 text-slate-800">{note}</p></div>}
      {details.length > 0 && <Fields values={details} />}
      {observations.length > 0 && <section className="space-y-4 border-t border-slate-100 pt-5"><h4 className="flex items-center gap-2 text-sm font-bold"><Activity size={17} className="text-teal-700" />{ar ? "القياسات الحيوية" : "Vital signs"}</h4>{observations.map((item) => <Fields key={item.id} values={medicalFields(item, locale)} />)}</section>}
      {labResults.length > 0 && <section className="space-y-3 border-t border-slate-100 pt-5"><h4 className="flex items-center gap-2 text-sm font-bold"><FlaskConical size={17} className="text-teal-700" />{ar ? "الفحوصات" : "Tests"}</h4>{labResults.map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-sm font-semibold">{textOf(item.presentation.fields.TestName)}</p><Fields values={medicalFields(item, locale)} /></div>)}</section>}
      {drugs.length > 0 && <section className="border-t border-slate-100 pt-5"><h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800"><Pill size={17} className="text-teal-700" />{ar ? "الأدوية الموصوفة" : "Prescribed medicines"}<span className="text-xs font-normal text-slate-400">({drugs.length})</span></h4><div className="grid gap-3 xl:grid-cols-2">{drugs.map((drug) => <Medicine key={drug.id} row={drug} locale={locale} />)}</div></section>}
      {!note && !details.length && !drugs.length && !observations.length && !labResults.length && !["PatientChronicConditions", "PatientDiagnoses", "PatientFamilyHistories", "PrescriptionListTemplates"].includes(row.entity) && <p className="text-sm text-slate-400">{ar ? "لا توجد تفاصيل إضافية مسجلة." : "No additional details recorded."}</p>}
    </div>
  </article>;
}

export function LegacyArchiveClient({ batches, doctorId }: { batches: ArchiveBatch[]; doctorId: number }) {
  const { locale } = useLocale(), ar = locale === "ar";
  const [batchId, setBatchId] = useState(batches[0]?.id ?? "");
  const [view, setView] = useState<View>("overview"), [patientId, setPatientId] = useState<string>();
  const [section, setSection] = useState<Section>("Visits"), [page, setPage] = useState(1);
  const [q, setQ] = useState(""), [search, setSearch] = useState(""), [year, setYear] = useState("");
  const [deleted, setDeleted] = useState(false), [reviewEntity, setReviewEntity] = useState(""), [reviewReason, setReviewReason] = useState("");
  const batch = batches.find((b) => b.id === batchId);
  const pending = Math.max(0, (batch?.stats.states.review ?? 0) - (batch?.approval?.count ?? 0));
  const count = (n: number) => n.toLocaleString("en-US");
  const label = (key: string) => key === "Prescriptions" ? (ar ? "الوصفات" : "Prescriptions") : archiveLabel(entityLabels, key, locale);
  const active = (key: string) => key === "Prescriptions" ? batch?.prescriptionVisits ?? 0 : key === "VitalSigns" ? batch?.meaningfulVitals ?? 0 : (batch?.stats.entities[key]?.ready ?? 0) + (batch?.stats.entities[key]?.review ?? 0);
  const { data, error, isLoading, isFetching, refetch } = useQuery<ArchivePage>({
    queryKey: ["medical-records", doctorId, batchId, view, patientId, section, page, search, year, deleted, reviewEntity, reviewReason],
    enabled: !!batch && view !== "overview",
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: String(page) });
      if (view === "patients") params.set("entity", "Patients");
      if (["patient", "templates", "records"].includes(view)) params.set("entity", section);
      if (view === "patient" && patientId) params.set("patient", patientId);
      if (view === "review") { params.set("state", "review"); if (reviewEntity) params.set("entity", reviewEntity); if (reviewReason) params.set("reason", reviewReason); }
      else if (deleted) params.set("state", "excluded");
      if (search) params.set("q", search);
      if (year) params.set("year", year);
      const response = await fetch(`/api/patients/imports/${batchId}?${params}`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(ar ? "تعذر تحميل السجلات" : "Could not load records");
      return response.json();
    },
  });
  function navigate(next: View, nextSection?: Section) {
    setView(next); setPage(1); setQ(""); setSearch(""); setYear(""); setDeleted(false); setReviewEntity(""); setReviewReason("");
    if (next !== "patient") setPatientId(undefined);
    if (nextSection) setSection(nextSection);
  }
  function openPatient(id: string) { navigate("patient", "Visits"); setPatientId(id); }
  const byVisit = new Map<string, ArchiveRecord[]>();
  for (const drug of data?.drugs ?? []) if (drug.sourceVisitId) { const items = byVisit.get(drug.sourceVisitId) ?? []; items.push(drug); byVisit.set(drug.sourceVisitId, items); }
  const related = (items: ArchiveRecord[] | undefined) => {
    const map = new Map<string, ArchiveRecord[]>();
    for (const item of items ?? []) if (item.sourceVisitId) map.set(item.sourceVisitId, [...(map.get(item.sourceVisitId) ?? []), item]);
    return map;
  };
  const observations = related(data?.observations), labResults = related(data?.labResults);
  const templateItems = new Map<string, ArchiveRecord[]>();
  for (const item of data?.templateItems ?? []) {
    const id = textOf(item.presentation.fields.PrescriptionListTemplateId);
    templateItems.set(id, [...(templateItems.get(id) ?? []), item]);
  }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 25));
  const lastYear = Number(batch?.sourceCreatedAt?.slice(0, 4)) || new Date().getFullYear();
  const years = Array.from({ length: Math.min(20, Math.max(1, lastYear - 2019 + 1)) }, (_, i) => lastYear - i);

  return <><AppHeader title={ar ? "السجلات الطبية" : "Medical records"} /><PageContent>
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight text-slate-900">{ar ? "ملفات المرضى" : "Patient records"}</h1><p className="mt-2 text-sm leading-7 text-slate-500">{ar ? "الزيارات والوصفات والفحوصات في سجل طبي واحد." : "Visits, prescriptions and tests in one medical history."}</p></div><Link href="/patients" className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-slate-600"><ArrowRight size={16} />{ar ? "قائمة المرضى" : "Patient list"}</Link></header>
    {!batch ? <div className="rounded-2xl border bg-white p-12 text-center text-slate-500">{ar ? "لا توجد سجلات متاحة لهذا الحساب." : "No records available for this account."}</div> : <>
      {batches.length > 1 && <label className="mb-5 block text-sm">{ar ? "السجلات" : "Records"}<select className="mx-3 rounded-xl border bg-white p-2" value={batchId} onChange={(e) => { setBatchId(e.target.value); navigate("overview"); }}>{batches.map((b) => <option key={b.id} value={b.id}>{medicalDate(b.sourceCreatedAt, locale)}</option>)}</select></label>}
      <nav aria-label={ar ? "أقسام السجلات الطبية" : "Medical record sections"} className="mb-6 flex flex-wrap gap-2">
        <Button variant={view === "overview" ? "default" : "outline"} onClick={() => navigate("overview")}>{ar ? "نظرة عامة" : "Overview"}</Button>
        <Button variant={view === "patients" || view === "patient" ? "default" : "outline"} onClick={() => navigate("patients")}><Users size={16} />{ar ? "المرضى" : "Patients"}</Button>
        <Button variant={view === "records" && section === "Visits" ? "default" : "outline"} onClick={() => navigate("records", "Visits")}>{ar ? "الزيارات" : "Visits"}</Button>
        <Button variant={view === "records" && section === "Prescriptions" ? "default" : "outline"} onClick={() => navigate("records", "Prescriptions")}>{ar ? "الوصفات" : "Prescriptions"}</Button>
        <Button variant={view === "templates" ? "default" : "outline"} onClick={() => navigate("templates", "DrugTemplates")}>{ar ? "القوالب" : "Templates"}</Button>
        {pending > 0 && <Button variant={view === "review" ? "default" : "outline"} onClick={() => navigate("review")}>{ar ? "للمراجعة" : "Review"} ({count(pending)})</Button>}
      </nav>
      {view === "overview" ? <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{([
        ["Patients", Users], ["Visits", CalendarDays], ["Prescriptions", FileText], ["Appointments", CalendarDays], ["LabWorkups", FlaskConical], ["VitalSigns", Activity],
      ] as const).map(([key, Icon]) => <button key={key} onClick={() => key === "Patients" ? navigate("patients") : navigate("records", key)} className="group flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-start shadow-sm transition hover:border-teal-400 hover:shadow-md"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><Icon size={23} /></span><div><span className="text-sm text-slate-500">{label(key)}</span><strong className="mt-1 block text-3xl font-bold tracking-tight text-slate-900" dir="ltr">{count(active(key))}</strong></div><ChevronLeft className="ms-auto text-slate-300 group-hover:text-teal-600" size={19} /></button>)}</div><section className="mt-6 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6"><div><h2 className="font-bold text-slate-800">{ar ? "افتح الملف الطبي للمريض" : "Open a patient record"}</h2><p className="mt-2 text-sm leading-7 text-slate-500">{ar ? "ابحث بالاسم أو رقم الملف لاستعراض كامل التاريخ الطبي." : "Search by name or file number to browse the full medical history."}</p></div><Button onClick={() => navigate("patients")}><Search size={16} />{ar ? "بحث عن مريض" : "Find a patient"}</Button></section></> : <>
        {view === "patient" && data?.patient && <div className="mb-6"><Button variant="ghost" className="mb-4" onClick={() => navigate("patients")}><ArrowRight size={16} />{ar ? "رجوع إلى المرضى" : "Back to patients"}</Button><PatientProfile row={data.patient} locale={locale} /><div className="mt-6 flex gap-2 overflow-x-auto pb-2">{tabs.map((key) => <Button key={key} size="sm" variant={section === key ? "default" : "outline"} onClick={() => { setSection(key); setPage(1); setYear(""); setQ(""); setSearch(""); }}>{label(key)}<span className="ms-1 opacity-70">{count(data.counts?.[key] ?? 0)}</span></Button>)}</div></div>}
        {view === "templates" && <div className="mb-5 flex flex-wrap gap-2">{templates.map((key) => <Button key={key} size="sm" variant={section === key ? "default" : "outline"} onClick={() => { setSection(key); setPage(1); }}>{label(key)}</Button>)}</div>}
        {view === "records" && <h2 className="mb-5 text-lg font-bold text-slate-800">{label(section)}</h2>}
        {view === "review" && <div className="mb-5 flex flex-wrap gap-4"><label className="text-sm">{ar ? "نوع السجل" : "Record type"}<select className="ms-3 rounded-xl border bg-white p-2" value={reviewEntity} onChange={(e) => { setReviewEntity(e.target.value); setPage(1); }}><option value="">{ar ? "كل الأنواع" : "All types"}</option>{Object.entries(batch.stats.entities).filter(([, n]) => n.review).map(([key]) => <option key={key} value={key}>{label(key)}</option>)}</select></label><label className="text-sm">{ar ? "الملاحظة" : "Reason"}<select className="ms-3 rounded-xl border bg-white p-2" value={reviewReason} onChange={(e) => { setReviewReason(e.target.value); setPage(1); }}><option value="">{ar ? "الكل" : "All"}</option>{Object.keys(reviewLabels).map((key) => <option key={key} value={key}>{archiveLabel(reviewLabels, key, locale)}</option>)}</select></label></div>}
        <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); setPage(1); }} className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><div className="relative min-w-48 flex-1"><Search size={17} className="pointer-events-none absolute start-3 top-3 text-slate-400" /><Input className="ps-10" aria-label={ar ? "البحث في السجلات" : "Search records"} placeholder={view === "patients" ? (ar ? "اسم المريض أو رقم الملف" : "Patient name or file number") : (ar ? "ابحث في السجل الطبي" : "Search medical history")} value={q} onChange={(e) => setQ(e.target.value)} /></div><Button type="submit">{ar ? "بحث" : "Search"}</Button>{["patient", "records"].includes(view) && <select aria-label={ar ? "السنة" : "Year"} value={year} onChange={(e) => { setYear(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">{ar ? "كل السنوات" : "All years"}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>}{view === "patients" && <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={deleted} onChange={(e) => { setDeleted(e.target.checked); setPage(1); }} />{ar ? "المحذوفة" : "Deleted"}</label>}</form>
        {isLoading && <div className="space-y-3 py-3" aria-label={ar ? "جاري التحميل" : "Loading"}>{[1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>}
        {error && <div role="alert" className="rounded-xl bg-red-50 p-5 text-sm text-red-800">{error.message}<Button variant="outline" className="ms-3" onClick={() => refetch()}>{ar ? "إعادة المحاولة" : "Retry"}</Button></div>}
        {data && <><div className="mb-3 flex justify-between text-xs text-slate-500"><span>{count(data.total)} {view === "patients" ? (ar ? "مريض" : "patients") : (ar ? "سجل" : "records")}</span>{isFetching && <span>{ar ? "تحديث…" : "Updating…"}</span>}</div>
          {view === "patients" ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full min-w-[680px] text-start text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{[ar ? "المريض" : "Patient", ar ? "الجنس" : "Sex", ar ? "تاريخ الميلاد" : "Birth date", ar ? "آخر زيارة" : "Last visit", ar ? "الزيارات" : "Visits", ""].map((h, i) => <th key={i} className="p-4 text-start font-medium">{h}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.id} className="border-t border-slate-100 transition hover:bg-teal-50/30"><td className="p-4"><strong className="font-semibold text-slate-800">{nameOf(row)}</strong>{row.presentation.fields.Mrn ? <span className="mt-1 block text-xs text-slate-400" dir="auto">{textOf(row.presentation.fields.Mrn)}</span> : null}</td><td className="p-4 text-slate-600">{patientGender(row, locale)}</td><td className="p-4 text-slate-600">{patientBirthdate(row, locale) || "—"}</td><td className="p-4 text-slate-600">{medicalDate(data.patientStats?.[row.sourceId]?.lastVisit, locale) || "—"}</td><td className="p-4"><span className="rounded-lg bg-slate-50 px-3 py-1 text-slate-600">{count(data.patientStats?.[row.sourceId]?.visits ?? 0)}</span></td><td className="p-4"><Button size="sm" variant="outline" onClick={() => openPatient(row.sourceId)}>{ar ? "الملف الطبي" : "Medical record"}</Button></td></tr>)}</tbody></table></div>
          : <div className="space-y-5">{data.rows.map((row) => row.entity === "Patients" ? <div key={row.id}><PatientProfile row={row} locale={locale} /><Button className="mt-3" variant="outline" onClick={() => openPatient(row.sourceId)}>{ar ? "الملف الطبي" : "Medical record"}</Button></div> : <ClinicalCard key={row.id} row={row} locale={locale} inPatient={view === "patient"} drugs={(row.entity === "PrescriptionListTemplates" ? templateItems : byVisit).get(row.sourceId) ?? []} observations={observations.get(row.sourceId) ?? []} labResults={labResults.get(row.sourceId) ?? []} references={data.references} onPatient={openPatient} />)}</div>}
          {!data.rows.length && <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-400">{ar ? "لا توجد سجلات مطابقة." : "No matching records."}</div>}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3"><span className="text-xs text-slate-500">{ar ? "الصفحة" : "Page"} {count(page)} {ar ? "من" : "of"} {count(pages)}</span><div className="flex gap-2"><Button size="sm" variant="outline" aria-label={ar ? "الصفحة السابقة" : "Previous page"} disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}><ChevronRight size={16} /></Button><Button size="sm" variant="outline" aria-label={ar ? "الصفحة التالية" : "Next page"} disabled={page >= pages || isFetching} onClick={() => setPage((p) => p + 1)}><ChevronLeft size={16} /></Button></div></div>
        </>}
      </>}
    </>}
  </PageContent></>;
}
