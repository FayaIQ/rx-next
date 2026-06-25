"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Save, Smile } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageContent } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { rxApi } from "@/lib/api/rx-client";
import {
  FDI_ALL,
  TOOTH_STATUSES,
  toothQuadrantLabel,
  toothStatusLabel,
  type ToothStatusId,
} from "@/lib/dental/constants";

const DentalArchViewer = dynamic(
  () =>
    import("@/components/dental/dental-arch-viewer").then(
      (m) => m.DentalArchViewer
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[min(58vh,520px)] items-center justify-center rounded-2xl border border-rx-border bg-rx-bg-subtle text-sm text-rx-muted">
        جاري تحميل المشهد ثلاثي الأبعاد...
      </div>
    ),
  }
);

type Props = {
  patientId: number;
};

export function DentalChartClient({ patientId }: Props) {
  const queryClient = useQueryClient();
  const [selectedFdi, setSelectedFdi] = useState<number | null>(null);
  const [chartNotes, setChartNotes] = useState("");
  const [toothMap, setToothMap] = useState<
    Record<number, { status: ToothStatusId; notes: string }>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ["dental-chart", patientId],
    queryFn: () => rxApi.dental.getChart(patientId),
  });

  useEffect(() => {
    if (!data?.chart) return;
    setChartNotes(data.chart.notes ?? "");
    const map: Record<number, { status: ToothStatusId; notes: string }> = {};
    for (const t of data.chart.teeth) {
      map[t.toothFdi] = {
        status: t.status as ToothStatusId,
        notes: t.notes ?? "",
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
        (t) => t.status !== "healthy" || t.notes.trim().length > 0
      ).length,
    [teethList]
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      rxApi.dental.saveChart(patientId, {
        notes: chartNotes || null,
        teeth: teethList.filter(
          (t) => t.status !== "healthy" || t.notes.trim().length > 0
        ),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(["dental-chart", patientId], {
        patient: data?.patient,
        chart: res.chart,
      });
      toast.success("تم حفظ طبلة الأسنان");
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

  const patientName = data?.patient.name ?? "المريض";

  return (
    <>
      <AppHeader
        title={`طبلة مريض الأسنان — ${patientName}`}
        subtitle={`${recordedCount} سن مسجّل`}
      />
      <PageContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dental">
              <ArrowRight size={14} />
              العودة لقائمة الطبلات
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/patients/${patientId}/record`}>سجل الوصفات</Link>
          </Button>
          <Button
            size="sm"
            className="mr-auto"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={14} />
            {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الطبلة"}
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Smile size={18} className="text-rx-primary" />
                الفك العلوي والسفلي — نموذج أسنان توضيحي
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <DentalArchViewer
                teeth={teethList}
                selectedFdi={selectedFdi}
                onSelect={setSelectedFdi}
                showAnnotations={recordedCount > 0}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {selectedFdi
                    ? `السن ${selectedFdi} — ${toothQuadrantLabel(selectedFdi)}`
                    : "اختر سناً من النموذج"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedFdi ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      {TOOTH_STATUSES.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            updateTooth(selectedFdi, { status: s.id })
                          }
                          className={`rounded-lg border px-2 py-2 text-right text-xs transition ${
                            (selected?.status ?? "healthy") === s.id
                              ? "border-rx-primary bg-rx-primary/10 font-semibold text-rx-primary"
                              : "border-rx-border hover:bg-rx-bg-subtle"
                          }`}
                        >
                          <span
                            className="ml-1.5 inline-block size-2.5 rounded-full align-middle"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      <Label>ملاحظات السن</Label>
                      <Textarea
                        rows={3}
                        value={selected?.notes ?? ""}
                        onChange={(e) =>
                          updateTooth(selectedFdi, { notes: e.target.value })
                        }
                        placeholder="مثال: تسوس سطح ماضغ، يحتاج حشوة..."
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-rx-muted">
                    اضغط على أي سن في النموذج ثلاثي الأبعاد لتسجيل حالته
                    (تسوس، حشوة، تاج، مفقود...).
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملاحظات عامة</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={3}
                  value={chartNotes}
                  onChange={(e) => setChartNotes(e.target.value)}
                  placeholder="ملاحظات عامة عن فم المريض..."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">ملخص الأسنان المسجّلة</CardTitle>
              </CardHeader>
              <CardContent className="max-h-48 space-y-1.5 overflow-y-auto">
                {recordedCount === 0 ? (
                  <p className="text-sm text-rx-muted">لا توجد حالات مسجّلة بعد.</p>
                ) : (
                  teethList
                    .filter(
                      (t) =>
                        t.status !== "healthy" || t.notes.trim().length > 0
                    )
                    .map((t) => (
                      <button
                        key={t.toothFdi}
                        type="button"
                        onClick={() => setSelectedFdi(t.toothFdi)}
                        className="flex w-full items-center justify-between rounded-lg border border-rx-border/80 px-3 py-2 text-right text-sm hover:bg-rx-bg-subtle"
                      >
                        <span>
                          <strong>{t.toothFdi}</strong> —{" "}
                          {toothStatusLabel(t.status)}
                        </span>
                        <Badge variant="secondary">{t.toothFdi}</Badge>
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
