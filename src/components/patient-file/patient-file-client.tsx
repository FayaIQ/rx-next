"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import {
  Calendar,
  FileText,
  ImagePlus,
  Printer,
  Share2,
  Smile,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { ToothImageCompare } from "@/components/patient-file/tooth-image-compare";
import {
  buildPortalShareMessage,
  buildWhatsAppShareUrl,
} from "@/lib/portal/whatsapp-share";
import { cn } from "@/lib/utils";
import { useLocale, type TranslateFn } from "@/i18n/locale-provider";
import { tToothStatus, tTreatmentType } from "@/lib/i18n-labels";

type TabId =
  | "overview"
  | "prescriptions"
  | "appointments"
  | "dental"
  | "treatment"
  | "visits"
  | "images"
  | "finance";

const TAB_DEFS: { id: TabId; labelKey: string }[] = [
  { id: "overview", labelKey: "patientFile.tabOverview" },
  { id: "prescriptions", labelKey: "patientFile.tabPrescriptions" },
  { id: "appointments", labelKey: "patientFile.tabAppointments" },
  { id: "dental", labelKey: "patientFile.tabDental" },
  { id: "treatment", labelKey: "patientFile.tabTreatment" },
  { id: "visits", labelKey: "patientFile.tabVisits" },
  { id: "images", labelKey: "patientFile.tabImages" },
  { id: "finance", labelKey: "patientFile.tabFinance" },
];

type PatientFile = {
  patient: {
    id: number;
    name: string;
    gender?: "male" | "female";
    phone?: string | null;
    diagnosis?: string | null;
    allergies?: string | null;
    currentMedications?: string | null;
    portalInstructions?: string | null;
  };
  prescriptions: Array<{
    id: number;
    prescriptionNumber: number | null;
    prescriptionDate: string | null;
    diagnosis: string | null;
    items: Array<{ name: string }>;
  }>;
  appointments: Array<{
    id: number;
    appointmentDatetime: string;
    notes: string | null;
    visitStatus: string;
  }>;
  dentalChart: {
    notes: string | null;
    teeth: Array<{ toothFdi: number; status: string; statusLabel: string; notes: string | null }>;
  } | null;
  treatmentPlans: Array<{
    id: number;
    toothFdi: number;
    treatmentType: string;
    status: string;
    totalSessions: number | null;
    sessions?: Array<{ sessionNumber: number; status: string; scheduledDate: string | null; notes: string | null }>;
  }>;
  visits: Array<{
    id: number;
    visitDate: string;
    summary: string | null;
    notes: string | null;
  }>;
  toothImages: Array<{
    id: number;
    toothFdi: number;
    imageUrl: string;
    imageType: string;
    caption: string | null;
  }>;
  finance: Array<{
    id: number;
    type: string;
    category: string;
    amount: number;
    transactionDate: string;
    description: string | null;
  }>;
  timeline: Array<{
    kind: string;
    date: string;
    title: string;
    notes: string | null;
    id: number;
  }>;
};

export function PatientFileClient({ patientId }: { patientId: number }) {
  const { t, locale } = useLocale();
  const dateLocale = locale === "ar" ? "ar-IQ" : "en-GB";
  const [tab, setTab] = useState<TabId>("overview");
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["patient-file", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/file`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("patientFile.loadFailed"));
      return json as PatientFile;
    },
    retry: 1,
  });

  const addVisitMutation = useMutation({
    mutationFn: async (body: { visitDate: string; summary: string; notes: string }) => {
      const res = await fetch(`/api/patients/${patientId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-file", patientId] });
      toast.success(t("patientFile.visitAdded"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p className="font-semibold">{t("patientFile.loadErrorTitle")}</p>
        <p className="mt-1 text-red-800">
          {error instanceof Error ? error.message : t("patientFile.unexpectedError")}
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
          {t("patientFile.retry")}
        </Button>
      </div>
    );
  }

  const recordedTeeth =
    data.dentalChart?.teeth.filter((tooth) => tooth.status !== "healthy" || tooth.notes) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" asChild>
          <Link href={`/home?patientId=${patientId}`}>
            <FileText size={14} />
            {t("patientFile.newPrescription")}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dental/${patientId}`}>
            <Smile size={14} />
            {t("patientFile.dentalChart")}
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/print/patients/${patientId}/summary`} target="_blank">
            <Printer size={14} />
            {t("patientFile.printSummary")}
          </Link>
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-rx-border pb-1 [scrollbar-width:none]">
        {TAB_DEFS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              tab === item.id
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("patientFile.timeline")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.timeline.length === 0 ? (
                <p className="text-sm text-rx-muted">{t("patientFile.noActivity")}</p>
              ) : (
                data.timeline.slice(0, 15).map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="border-r-2 border-slate-200 pr-3"
                  >
                    <p className="text-xs text-rx-muted">{item.date}</p>
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.notes ? (
                      <p className="text-xs text-slate-600">{item.notes}</p>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("patientFile.quickSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-rx-muted">{t("patientFile.phone")} </span>
                {data.patient.phone ?? "—"}
              </p>
              <p>
                <span className="text-rx-muted">{t("patientFile.diagnosis")} </span>
                {data.patient.diagnosis ?? "—"}
              </p>
              {data.patient.allergies?.trim() ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-amber-950">
                  <span className="font-semibold">{t("patientFile.allergies")} </span>
                  {data.patient.allergies}
                </p>
              ) : null}
              {data.patient.currentMedications?.trim() ? (
                <p>
                  <span className="text-rx-muted">{t("patientFile.currentMeds")} </span>
                  {data.patient.currentMedications}
                </p>
              ) : null}
              <p>
                <span className="text-rx-muted">{t("patientFile.prescriptionsCount")} </span>
                {data.prescriptions.length}
              </p>
              <p>
                <span className="text-rx-muted">{t("patientFile.treatmentPlansCount")} </span>
                {data.treatmentPlans.length}
              </p>
              <p>
                <span className="text-rx-muted">{t("patientFile.recordedTeeth")} </span>
                {recordedTeeth.length}
              </p>
              <PatientPortalSection patientId={patientId} data={data} t={t} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "prescriptions" ? (
        <div className="space-y-3">
          {data.prescriptions.length === 0 ? (
            <EmptyState icon={FileText} title={t("patientFile.noPrescriptions")} />
          ) : (
            data.prescriptions.map((rx) => (
              <Card key={rx.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-semibold">
                      {t("patientFile.prescriptionNum", {
                        number: rx.prescriptionNumber ?? "",
                        date: rx.prescriptionDate
                          ? new Date(rx.prescriptionDate).toLocaleDateString(dateLocale)
                          : "",
                      })}
                    </p>
                    <p className="text-sm text-rx-muted">{rx.diagnosis}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/home?id=${rx.id}`}>{t("patientFile.open")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "appointments" ? (
        <div className="space-y-2">
          {data.appointments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-lg border border-rx-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">
                  {new Date(a.appointmentDatetime).toLocaleString(dateLocale)}
                </p>
                <p className="text-xs text-rx-muted">{a.notes}</p>
              </div>
              <span className="text-xs text-slate-500">{a.visitStatus}</span>
            </div>
          ))}
          <Button size="sm" variant="outline" asChild>
            <Link href="/dates">
              <Calendar size={14} />
              {t("patientFile.openAppointments")}
            </Link>
          </Button>
        </div>
      ) : null}

      {tab === "dental" ? (
        <div className="space-y-3">
          <Button size="sm" asChild>
            <Link href={`/dental/${patientId}`}>
              {t("patientFile.openInteractiveChart")}
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/print/patients/${patientId}/dental`} target="_blank">
              {t("patientFile.printChart")}
            </Link>
          </Button>
          {recordedTeeth.length === 0 ? (
            <p className="text-sm text-rx-muted">{t("patientFile.noToothCases")}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {recordedTeeth.map((tooth) => (
                <li key={tooth.toothFdi} className="rounded border px-2 py-1">
                  <strong>
                    {t("patientFile.toothLine", { fdi: tooth.toothFdi })}
                  </strong>{" "}
                  — {tToothStatus(t, tooth.status)}
                  {tooth.notes ? ` · ${tooth.notes}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "treatment" ? (
        <div className="space-y-3">
          {data.treatmentPlans.length === 0 ? (
            <p className="text-sm text-rx-muted">{t("patientFile.noTreatmentPlans")}</p>
          ) : (
            data.treatmentPlans.map((plan) => (
              <Card key={plan.id}>
                <CardContent className="p-4 text-sm">
                  <p className="font-semibold">
                    {t("patientFile.planLine", {
                      fdi: plan.toothFdi,
                      type: tTreatmentType(t, plan.treatmentType),
                      status: plan.status,
                    })}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {(plan.sessions ?? []).map((s) => (
                      <li key={s.sessionNumber}>
                        {t("patientFile.sessionLine", {
                          number: s.sessionNumber,
                          status: s.status,
                        })}
                        {s.scheduledDate ? ` · ${s.scheduledDate}` : ""}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="ghost" className="mt-2 h-auto p-0" asChild>
                    <Link href={`/dental/${patientId}?tooth=${plan.toothFdi}`}>
                      {t("patientFile.openInChart")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {tab === "visits" ? (
        <VisitLogSection
          visits={data.visits}
          onAdd={(body) => addVisitMutation.mutate(body)}
          isPending={addVisitMutation.isPending}
          t={t}
        />
      ) : null}

      {tab === "images" ? (
        <div className="space-y-4">
          <ToothImageCompare images={data.toothImages} />
          <ToothImagesSection patientId={patientId} images={data.toothImages} t={t} />
        </div>
      ) : null}

      {tab === "finance" ? (
        <div className="space-y-2">
          {data.finance.length === 0 ? (
            <p className="text-sm text-rx-muted">{t("patientFile.noFinance")}</p>
          ) : (
            data.finance.map((f) => (
              <div
                key={f.id}
                className="flex justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {f.category} — {f.description}
                </span>
                <span className="font-mono">
                  {f.amount} ({f.type})
                </span>
              </div>
            ))
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href="/finances">
              <Wallet size={14} />
              {t("patientFile.finances")}
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PatientPortalSection({
  patientId,
  data,
  t,
}: {
  patientId: number;
  data: PatientFile;
  t: TranslateFn;
}) {
  const queryClient = useQueryClient();
  const [instructions, setInstructions] = useState(
    data.patient.portalInstructions ?? ""
  );
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  const tokenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/portal-token`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.url as string;
    },
    onSuccess: (url) => {
      setPortalUrl(`${window.location.origin}${url}`);
      toast.success(t("patientFile.portalCreated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveInstructionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.patient.name,
          gender: data.patient.gender ?? "male",
          phone: data.patient.phone,
          diagnosis: data.patient.diagnosis,
          allergies: data.patient.allergies,
          currentMedications: data.patient.currentMedications,
          portalInstructions: instructions || null,
          fieldValues: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-file", patientId] });
      toast.success(t("patientFile.portalInstructionsSaved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      let url = portalUrl;
      if (!url) {
        const res = await fetch(`/api/patients/${patientId}/portal-token`, {
          method: "POST",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        url = `${window.location.origin}${json.url as string}`;
        setPortalUrl(url);
      }

      const message = buildPortalShareMessage(
        data.patient.name,
        url,
        instructions
      );
      const waUrl = buildWhatsAppShareUrl(data.patient.phone, message);
      if (!waUrl) {
        throw new Error(t("patientFile.needValidPhone"));
      }
      return waUrl;
    },
    onSuccess: (waUrl) => {
      window.open(waUrl, "_blank", "noopener,noreferrer");
      toast.success(t("patientFile.whatsappOpened"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mt-3 space-y-2 border-t border-rx-border pt-3">
      <p className="text-xs font-semibold text-slate-700">
        {t("patientFile.patientPortal")}
      </p>
      <Textarea
        rows={2}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder={t("patientFile.portalInstructionsPh")}
        className="text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={saveInstructionsMutation.isPending}
          onClick={() => saveInstructionsMutation.mutate()}
        >
          {t("patientFile.saveInstructions")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={tokenMutation.isPending}
          onClick={() => tokenMutation.mutate()}
        >
          {t("patientFile.createPortalLink")}
        </Button>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
          disabled={shareMutation.isPending}
          onClick={() => shareMutation.mutate()}
        >
          <Share2 size={14} />
          {t("patientFile.shareWithPatient")}
        </Button>
        {portalUrl ? (
          <div className="w-full flex flex-wrap items-start gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="rounded-lg bg-white p-2 shadow-sm">
              <QRCode value={portalUrl} size={120} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-slate-600">{t("patientFile.scanQr")}</p>
              <p className="break-all text-xs text-slate-500" dir="ltr">
                {portalUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={() => {
                    void navigator.clipboard.writeText(portalUrl);
                    toast.success(t("patientFile.linkCopied"));
                  }}
                >
                  {t("patientFile.copyLink")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit border-green-600 text-green-700 hover:bg-green-50"
                  disabled={shareMutation.isPending}
                  onClick={() => shareMutation.mutate()}
                >
                  <Share2 size={14} />
                  {t("patientFile.whatsapp")}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VisitLogSection({
  visits,
  onAdd,
  isPending,
  t,
}: {
  visits: PatientFile["visits"];
  onAdd: (body: { visitDate: string; summary: string; notes: string }) => void;
  isPending: boolean;
  t: TranslateFn;
}) {
  const [visitDate, setVisitDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-rx-border p-3 space-y-2">
        <p className="text-sm font-semibold">{t("patientFile.addManualVisit")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">{t("patientFile.date")}</Label>
            <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">{t("patientFile.summary")}</Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("patientFile.summaryPh")}
            />
          </div>
        </div>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("patientFile.visitNotesPh")}
        />
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => onAdd({ visitDate, summary, notes })}
        >
          <Stethoscope size={14} />
          {t("patientFile.saveVisit")}
        </Button>
      </div>
      <div className="space-y-2">
        {visits.map((v) => (
          <div key={v.id} className="rounded-lg border px-3 py-2 text-sm">
            <p className="font-semibold">
              {v.visitDate} — {v.summary ?? t("patientFile.visitFallback")}
            </p>
            {v.notes ? <p className="text-xs text-slate-600">{v.notes}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ToothImagesSection({
  patientId,
  images,
  t,
}: {
  patientId: number;
  images: PatientFile["toothImages"];
  t: TranslateFn;
}) {
  const queryClient = useQueryClient();
  const [toothFdi, setToothFdi] = useState("11");
  const [imageType, setImageType] = useState<"photo" | "xray">("photo");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.set("file", file);
      form.set("toothFdi", toothFdi);
      form.set("imageType", imageType);
      const res = await fetch(`/api/patients/${patientId}/tooth-images`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-file", patientId] });
      toast.success(t("patientFile.imageUploaded"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
        <div>
          <Label className="text-xs">{t("patientFile.toothFdi")}</Label>
          <Input className="w-20" value={toothFdi} onChange={(e) => setToothFdi(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">{t("patientFile.type")}</Label>
          <select
            className="h-10 rounded-md border px-2 text-sm"
            value={imageType}
            onChange={(e) => setImageType(e.target.value as "photo" | "xray")}
          >
            <option value="photo">{t("patientFile.photo")}</option>
            <option value="xray">{t("patientFile.xray")}</option>
          </select>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
          <span className="inline-flex h-10 items-center gap-1 rounded-md bg-slate-900 px-3 text-sm text-white">
            <ImagePlus size={14} />
            {t("patientFile.upload")}
          </span>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div key={img.id} className="overflow-hidden rounded-lg border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.imageUrl} alt="" className="aspect-square w-full object-cover" />
            <p className="p-2 text-xs">
              {t("patientFile.toothImageMeta", {
                fdi: img.toothFdi,
                type:
                  img.imageType === "xray"
                    ? t("patientFile.xray")
                    : t("patientFile.photo"),
              })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
