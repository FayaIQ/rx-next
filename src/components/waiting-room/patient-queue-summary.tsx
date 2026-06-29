"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calendar,
  FileText,
  Pill,
  Smile,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  patientId: number;
  className?: string;
};

export function PatientQueueSummary({ patientId, className }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["queue-summary", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/queue-summary`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    enabled: patientId > 0,
  });

  if (isLoading || !data) {
    return (
      <div className={cn("h-24 animate-pulse rounded-xl bg-violet-50", className)} />
    );
  }

  return (
    <Card className={cn("border-violet-200 bg-violet-50/60", className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold text-violet-950">{data.patient.name}</p>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/patients/${patientId}/record`}>ملف المريض</Link>
          </Button>
        </div>

        {data.patient.allergies?.trim() ? (
          <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              <strong>حساسية:</strong> {data.patient.allergies}
            </span>
          </p>
        ) : null}

        {data.patient.currentMedications?.trim() ? (
          <p className="flex items-start gap-2 text-xs text-slate-700">
            <Pill size={14} className="mt-0.5 shrink-0 text-slate-500" />
            <span>
              <strong>أدوية حالية:</strong> {data.patient.currentMedications}
            </span>
          </p>
        ) : null}

        <div className="grid gap-2 text-xs sm:grid-cols-2">
          {data.lastPrescription ? (
            <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
              <p className="flex items-center gap-1 font-semibold text-slate-800">
                <FileText size={12} />
                آخر وصفة
              </p>
              <p className="mt-1 text-slate-600">
                #{data.lastPrescription.prescriptionNumber} ·{" "}
                {data.lastPrescription.date}
              </p>
            </div>
          ) : null}

          {data.nextSession ? (
            <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
              <p className="flex items-center gap-1 font-semibold text-slate-800">
                <Smile size={12} />
                جلسة قادمة
              </p>
              <p className="mt-1 text-slate-600">
                سن {data.nextSession.toothFdi} · {data.nextSession.label} · جلسة{" "}
                {data.nextSession.sessionNumber}
                {data.nextSession.scheduledDate
                  ? ` · ${data.nextSession.scheduledDate}`
                  : ""}
              </p>
            </div>
          ) : null}

          {data.nextAppointment ? (
            <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
              <p className="flex items-center gap-1 font-semibold text-slate-800">
                <Calendar size={12} />
                موعد قادم
              </p>
              <p className="mt-1 text-slate-600">
                {new Date(data.nextAppointment.datetime).toLocaleString("ar-SY")}
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-white/80 bg-white/70 px-3 py-2">
            <p className="flex items-center gap-1 font-semibold text-slate-800">
              <Wallet size={12} />
              الرصيد
            </p>
            <p className="mt-1 font-mono text-slate-600">
              {data.financeBalance.toLocaleString("ar-SY")}
            </p>
          </div>
        </div>

        {data.activeTreatments?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {data.activeTreatments.map(
              (t: {
                id: number;
                toothFdi: number;
                label: string;
                completed: number;
                total: number;
              }) => (
                <span
                  key={t.id}
                  className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-900"
                >
                  سن {t.toothFdi} · {t.label} ({t.completed}/{t.total})
                </span>
              )
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
