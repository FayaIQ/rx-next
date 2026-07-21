"use client";

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
import { useLocale } from "@/i18n/locale-provider";
import { tToothQuadrant, tToothStatus } from "@/lib/i18n-labels";

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
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [chartNotes, setChartNotes] = useState("");
  const [toothMap, setToothMap] = useState<
    Record<number, { status: ToothStatusId; notes: string }>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ["dental-chart", patientId],
    queryFn: () => fetchDentalChartOfflineFirst(patientId),
  });

  const { data: plansData } = useQuery({
    queryKey: ["treatment-plans", patientId],
    queryFn: () => fetchTreatmentPlansOfflineFirst(patientId),
  });

  const treatmentPlanMarkers = useMemo(
    () => buildTreatmentPlanMarkers(plansData?.plans ?? []),
    [plansData?.plans]
  );

  useEffect(() => {
    const tooth = searchParams.get("tooth");
    if (tooth) {
      const fdi = Number(tooth);
      if (Number.isFinite(fdi)) setSelectedFdi(fdi);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!data?.chart) return;
    setChartNotes(data.chart.notes ?? "");
    const map: Record<number, { status: ToothStatusId; notes: string }> = {};
    for (const tooth of data.chart.teeth) {
      map[tooth.toothFdi] = {
        status: tooth.status as ToothStatusId,
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
        teeth: teethList.filter(
          (tooth) => tooth.status !== "healthy" || tooth.notes.trim().length > 0
        ),
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
    (fdi: number, patch: Partial<{ status: ToothStatusId; notes: string }>) => {
      setToothMap((current) => ({
        ...current,
        [fdi]: {
          status: patch.status ?? current[fdi]?.status ?? "healthy",
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
        <div className="h-64 animate-pulse rounded-2xl bg-rx-bg-subtle" />
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
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <DentalViewerShell
                teeth={teethList}
                selectedFdi={selectedFdi}
                onSelect={setSelectedFdi}
                showAnnotations={recordedCount > 0}
                treatmentPlanMarkers={treatmentPlanMarkers}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
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
                            (selected?.status ?? "healthy") === s.id;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() =>
                                updateTooth(selectedFdi, { status: s.id })
                              }
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
                    <ToothSessionsPanel
                      patientId={patientId}
                      toothFdi={selectedFdi}
                    />
                  </>
                ) : (
                  <p className="text-sm text-rx-muted">{t("dental.selectHint")}</p>
                )}
              </CardContent>
            </Card>

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
                          {tToothStatus(t, tooth.status)}
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
