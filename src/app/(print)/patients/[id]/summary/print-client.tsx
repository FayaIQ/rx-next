"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/locale-provider";

type TimelineItem = {
  kind: string;
  date: string;
  title: string;
  notes: string | null;
  id: number;
};

type Props = {
  patientId: number;
  patientName: string;
  phone: string | null;
  timeline: TimelineItem[];
  autoPrint?: boolean;
};

export function PatientSummaryPrintClient({
  patientId,
  patientName,
  phone,
  timeline,
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
        {t("print.summaryTitle", { name: patientName })}
      </h1>
      <p className="text-sm text-slate-600">
        {phone ?? ""}
        {phone ? " · " : ""}
        {new Date().toLocaleDateString(locale === "en" ? "en-GB" : "ar-IQ")}
      </p>

      <section className="mt-6">
        <h2 className="font-bold">{t("print.recentActivity")}</h2>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">{t("print.noActivity")}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {timeline.slice(0, 12).map((item) => (
              <li key={`${item.kind}-${item.id}`} className="border-b pb-2">
                <span className="text-slate-500">{item.date}</span> — {item.title}
                {item.notes ? <p className="text-xs">{item.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
