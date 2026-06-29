"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toothStatusLabel } from "@/lib/dental/constants";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

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
          طباعة / حفظ PDF
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/patients/${patientId}/record`}>رجوع</Link>
        </Button>
      </div>

      <h1 className="text-xl font-bold">طبلة أسنان — {patientName}</h1>
      <p className="text-sm text-slate-600">
        {new Date().toLocaleDateString("ar-SY")}
      </p>

      {chartNotes ? (
        <p className="mt-4 rounded border p-3 text-sm">{chartNotes}</p>
      ) : null}

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2 text-right">السن</th>
            <th className="py-2 text-right">الحالة</th>
            <th className="py-2 text-right">ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {teeth.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-center text-slate-500">
                لا توجد حالات مسجّلة
              </td>
            </tr>
          ) : (
            teeth.map((t) => (
              <tr key={t.toothFdi} className="border-b">
                <td className="py-2">{t.toothFdi}</td>
                <td className="py-2">{toothStatusLabel(t.status)}</td>
                <td className="py-2">{t.notes ?? "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {treatmentPlans.length > 0 ? (
        <div className="mt-8">
          <h2 className="font-bold">خطط العلاج</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {treatmentPlans.map((p) => (
              <li key={p.id}>
                سن {p.toothFdi} — {treatmentTypeLabel(p.treatmentType)} ·{" "}
                {p.sessions.filter((s) => s.status === "completed").length}/
                {p.sessions.length} جلسة
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
