"use client";

import { PatientAccountPanel } from "@/components/finances/patient-account";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Save, Smile } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContent } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { ToothSessionsPanel } from "@/components/dental/tooth-sessions-panel";
import { buildTreatmentPlanMarkers } from "@/lib/dental/treatment-plan-markers";
import {
  fetchDentalChartOfflineFirst,
  fetchTreatmentPlansOfflineFirst,
  saveDentalChartOffline,
} from "@/lib/data/dental-offline-api";
import {
  FDI_ALL,
  TOOTH_STATUSES,
  type ToothStatusId,
} from "@/lib/dental/constants";
import { cn } from "@/lib/utils";
import { toggleToothStatus } from "@/lib/dental/findings";
import { useLocale } from "@/i18n/locale-provider";
import { tToothQuadrant, tToothStatus } from "@/lib/i18n-labels";
import { useClinicFeatureEnabled } from "@/components/clinic/clinic-features-provider";

function DentalViewerLoading() {
  const { t } = useLocale();
  return (
    <div className="flex h-[min(62vh,560px)] items-center justify-center rounded-2xl border border-slate-700 bg-black text-sm text-slate-400">
      {t("dental.loading3d")}
    </div>
  );
}

const DentalViewerShell = dynamic(
  () =>
    import("@/components/dental/dental-viewer-shell").then(
      (m) => m.DentalViewerShell
    ),
  {
    ssr: false,
    loading: () => <DentalViewerLoading />,
  }
);

type Props = {
  patientId: number;
};

export function DentalChartClient({ patientId }: Props) {
  const { t } = useLocale();
  const treatmentEnabled = useClinicFeatureEnabled("treatment");
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedFdis, setSelectedFdis] = useState<number[]>([]);
  const [chartNotes, setChartNotes] = useState("");
  const [toothMap, setToothMap] = useState<
    Record<number, { status: ToothStatusId; statuses: ToothStatusId[]; notes: string }>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ["dental-chart", patientId],
    queryFn: () => fetchDentalChartOfflineFirst(patientId),
  });

  const { data: plansData } = useQuery({
    queryKey: ["treatment-plans", patientId],
    queryFn: () => fetchTreatmentPlansOfflineFirst(patientId),
    enabled: treatmentEnabled,
  });

  const treatmentPlanMarkers = useMemo(
    () =>
      treatmentEnabled
        ? buildTreatmentPlanMarkers(plansData?.plans ?? [])
        : [],
    [plansData?.plans, treatmentEnabled]
  );

  useEffect(() => {
    const group = searchParams.get("teeth");
    if (group) {
      const teeth = [...new Set(group.split(",").map(Number))].filter(fdi => (FDI_ALL as readonly number[]).includes(fdi)).sort((a, b) => a - b);
      if (teeth.length) {
        setMultiSelect(true);
        setSelectedFdis(teeth);
        return;
      }
    }
    setMultiSelect(false);
    if (searchParams.get("scope") === "mouth") setSelectedFdi(null);
    const tooth = searchParams.get("tooth");
    if (tooth) {
      const fdi = Number(tooth);
      if (Number.isFinite(fdi)) setSelectedFdi(fdi);
    }
  }, [searchParams]);

  const selectTooth = (fdi: number) => {
    if (multiSelect) setSelectedFdis(teeth => teeth.includes(fdi) ? teeth.filter(tooth => tooth !== fdi) : [...teeth, fdi].sort((a, b) => a - b));
    else setSelectedFdi(fdi);
  };

  useEffect(() => {
    if (!data?.chart) return;
    setChartNotes(data.chart.notes ?? "");
    const map: Record<number, { status: ToothStatusId; statuses: ToothStatusId[]; notes: string }> = {};
    for (const tooth of data.chart.teeth) {
      map[tooth.toothFdi] = {
        status: tooth.status as ToothStatusId,
        statuses: (tooth.statuses?.length ? tooth.statuses : [tooth.status]) as ToothStatusId[],
        notes: tooth.notes ?? "",
      };
    }
    setToothMap(map);
  }, [data?.chart]);

  const teethList = useMemo(
    () =>
      FDI_ALL.map((fdi) => ({
        toothFdi: fdi,
        status: toothMap[fdi]?.status ?? ("healthy" as ToothStatusId),
        statuses: toothMap[fdi]?.statuses ?? ["healthy" as ToothStatusId],
        notes: toothMap[fdi]?.notes ?? "",
      })),
    [toothMap]
  );

  const recordedCount = useMemo(
    () =>
      teethList.filter(
        (tooth) => tooth.status !== "healthy" || tooth.notes.trim().length > 0
      ).length,
    [teethList]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      saveDentalChartOffline(patientId, {
        notes: chartNotes || null,
        teeth: teethList,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["dental-chart", patientId], {
        patient: data?.patient,
        chart: res.chart,
      });
      toast.success(t("dental.saved"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTooth = useCallback(
    (fdi: number, patch: Partial<{ status: ToothStatusId; statuses: ToothStatusId[]; notes: string }>) => {
      setToothMap((current) => ({
        ...current,
        [fdi]: {
          status: patch.status ?? current[fdi]?.status ?? "healthy",
          statuses: patch.statuses ?? current[fdi]?.statuses ?? ["healthy"],
          notes: patch.notes ?? current[fdi]?.notes ?? "",
        },
      }));
    },
    []
  );

  const selected = selectedFdi != null ? toothMap[selectedFdi] : null;

  if (isLoading && !data) {
    return (
      <PageContent>
        <div className="h-[min(62vh,560px)] animate-pulse rounded-2xl bg-rx-bg-subtle" />
      </PageContent>
    );
  }

  const patientName = data?.patient.name ?? t("dental.patientFallback");

  return (
    <>
      <AppHeader
        title={t("dental.chartTitle", { name: patientName })}
        subtitle={t("dental.teethRecorded", { count: recordedCount })}
      />
      <PageContent className="space-y-4">
        <PatientAccountPanel patientId={patientId} compact />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dental">
              <ArrowRight size={14} />
              {t("dental.backToList")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${patientId}/record`}>
              {t("dental.patientFile")}
            </Link>
          </Button>
          <Button
            size="sm"
            className="mr-auto"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={14} />
            {saveMutation.isPending ? t("common.saving") : t("dental.saveChart")}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smile size={18} className="text-rx-primary" />
                {t("dental.archTitle")}
              </CardTitle>
              {treatmentEnabled && <Button type="button" size="sm" variant={multiSelect ? "default" : "outline"} aria-pressed={multiSelect} onClick={() => {
                if (!multiSelect) setSelectedFdis(selectedFdi == null ? [] : [selectedFdi]);
                setMultiSelect(value => !value);
              }}>{t(multiSelect ? "dental.singleSelect" : "dental.multiSelect")}</Button>}
            </CardHeader>
            <CardContent className="p-3 pt-0">
              {multiSelect && <p className="mb-3 text-sm text-teal-800">{t("dental.multiSelectHint")}</p>}
              <DentalViewerShell
                teeth={teethList}
                selectedFdi={multiSelect ? null : selectedFdi}
                selectedFdis={multiSelect ? selectedFdis : undefined}
                onSelect={selectTooth}
                showAnnotations={recordedCount > 0}
                treatmentPlanMarkers={treatmentPlanMarkers}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {treatmentEnabled && multiSelect && <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{t("dental.sharedPlan")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-semibold" aria-live="polite">{t("dental.selectedTeeth", { count: selectedFdis.length })}</p>
                <div className="flex flex-wrap gap-2">{selectedFdis.map(fdi => <Button key={fdi} type="button" size="sm" variant="outline" aria-label={t("dental.removeTooth", { fdi })} onClick={() => selectTooth(fdi)}>{fdi} ×</Button>)}</div>
                {selectedFdis.length ? <>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedFdis([])}>{t("dental.clearSelection")}</Button>
                  <ToothSessionsPanel key={`multi-${patientId}`} patientId={patientId} toothFdi={selectedFdis[0]} toothFdis={selectedFdis} />
                </> : <p className="text-sm text-rx-muted">{t("dental.selectTeethHint")}</p>}
              </CardContent>
            </Card>}
            {treatmentEnabled && !multiSelect ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("treatment.typeFullMouthCleaning")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ToothSessionsPanel key={`mouth-${patientId}`} patientId={patientId} toothFdi={null} />
                </CardContent>
              </Card>
            ) : null}
            {!multiSelect && <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {selectedFdi
                    ? t("dental.toothSelected", {
                        fdi: selectedFdi,
                        quadrant: tToothQuadrant(t, selectedFdi),
                      })
                    : t("dental.selectTooth")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedFdi ? (
                  <>
                    <div>
                      <Label className="mb-2 block text-xs text-rx-muted">
                        {t("dental.toothStatus")}
                      </Label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TOOTH_STATUSES.map((s) => {
                          const active =
                            (selected?.statuses ?? ["healthy"]).includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                updateTooth(selectedFdi, toggleToothStatus(selected?.statuses ?? ["healthy"], s.id))
                              }
                              aria-pressed={active}
                              className={cn(
                                "rounded-md border px-2 py-1.5 text-right text-[11px] transition",
                                active
                                  ? "border-slate-800 bg-slate-900 font-semibold text-white shadow-sm"
                                  : "border-rx-border bg-white text-slate-700 hover:border-slate-400"
                              )}
                            >
                              <span
                                className="ml-1 inline-block size-2 rounded-full align-middle"
                                style={{ backgroundColor: s.color }}
                              />
                              {tToothStatus(t, s.id)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-rx-muted">
                        {t("dental.toothNotes")}
                      </Label>
                      <Textarea
                        rows={2}
                        value={selected?.notes ?? ""}
                        onChange={(e) =>
                          updateTooth(selectedFdi, { notes: e.target.value })
                        }
                        placeholder={t("dental.toothNotesPlaceholder")}
                      />
                    </div>
                    {treatmentEnabled ? (
                      <ToothSessionsPanel
                        key={selectedFdi}
                        patientId={patientId}
                        toothFdi={selectedFdi}
                      />
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-rx-muted">{t("dental.selectHint")}</p>
                )}
              </CardContent>
            </Card>}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("dental.generalNotes")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={3}
                  value={chartNotes}
                  onChange={(e) => setChartNotes(e.target.value)}
                  placeholder={t("dental.generalNotesPlaceholder")}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("dental.recordedSummary")}
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 space-y-1.5 overflow-y-auto">
                {recordedCount === 0 ? (
                  <p className="text-sm text-rx-muted">{t("dental.noRecorded")}</p>
                ) : (
                  teethList
                    .filter(
                      (tooth) =>
                        tooth.status !== "healthy" ||
                        tooth.notes.trim().length > 0
                    )
                    .map((tooth) => (
                      <button
                        key={tooth.toothFdi}
                        type="button"
                        onClick={() => setSelectedFdi(tooth.toothFdi)}
                        className="flex w-full items-center justify-between rounded-lg border border-rx-border/80 px-3 py-2 text-right text-sm hover:bg-rx-bg-subtle"
                      >
                        <span>
                          <strong>{tooth.toothFdi}</strong> —{" "}
                          {tooth.statuses.map((status) => tToothStatus(t, status)).join(" · ")}
                        </span>
                        <Badge variant="secondary">{tooth.toothFdi}</Badge>
                      </button>
                    ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}
