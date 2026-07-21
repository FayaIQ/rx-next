"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";
import { tToothStatus, tTreatmentType } from "@/lib/i18n-labels";

type ToothRow = {
  toothFdi: number;
  status: string;
  notes: string | null;
};

type PlanRow = {
  id: number;
  toothFdi: number;
  treatmentType: string;
  sessions: Array<{ sessionNumber: number; status: string }>;
};

type Props = {
  patientId: number;
  patientName: string;
  chartNotes: string | null;
  teeth: ToothRow[];
  treatmentPlans: PlanRow[];
  autoPrint?: boolean;
};

export function PatientDentalPrintClient({
  patientId,
  patientName,
  chartNotes,
  teeth,
  treatmentPlans,
  autoPrint = true,
}: Props) {
  const { t, locale } = useLocale();

  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-white p-8 font-sans text-slate-900">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button onClick={() => window.print()}>
          <Printer size={14} />
          {t("print.printSavePdf")}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/patients/${patientId}/record`}>{t("common.back")}</Link>
        </Button>
      </div>

      <h1 className="text-xl font-bold">
        {t("print.dentalTitle", { name: patientName })}
      </h1>
      <p className="text-sm text-slate-600">
        {new Date().toLocaleDateString(locale === "en" ? "en-GB" : "ar-IQ")}
      </p>

      {chartNotes ? (
        <p className="mt-4 rounded border p-3 text-sm">{chartNotes}</p>
      ) : null}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-start">{t("print.colTooth")}</th>
            <th className="py-2 text-start">{t("print.colStatus")}</th>
            <th className="py-2 text-start">{t("print.colNotes")}</th>
          </tr>
        </thead>
        <tbody>
          {teeth.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-center text-slate-500">
                {t("print.noCases")}
              </td>
            </tr>
          ) : (
            teeth.map((row) => (
              <tr key={row.toothFdi} className="border-b">
                <td className="py-2">{row.toothFdi}</td>
                <td className="py-2">{tToothStatus(t, row.status)}</td>
                <td className="py-2">{row.notes ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {treatmentPlans.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-bold">{t("print.treatmentPlans")}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {treatmentPlans.map((p) => (
              <li key={p.id}>
                {t("print.planSessions", {
                  fdi: p.toothFdi,
                  type: tTreatmentType(t, p.treatmentType),
                  done: p.sessions.filter((s) => s.status === "completed").length,
                  total: p.sessions.length,
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
