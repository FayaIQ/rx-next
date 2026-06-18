"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PrescriptionDocument,
  type PrescriptionDocumentData,
} from "@/components/prescription/prescription-document";
import { paperPageSizeCss } from "@/lib/recipe-paper";

type Props = {
  data: PrescriptionDocumentData;
  prescriptionId: number;
  autoPrint?: boolean;
};

export default function PrescriptionPrintClient({
  data,
  prescriptionId,
  autoPrint = true,
}: Props) {
  const paperSize = data.settings.paperSize;

  useEffect(() => {
    document.body.classList.add("prescription-print-page");
    return () => document.body.classList.remove("prescription-print-page");
  }, []);

  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: ${paperPageSizeCss(paperSize)};
            margin: 0;
          }
        }
      `}</style>

      <div className="prescription-print-root min-h-screen bg-gray-100 p-4 print:bg-white print:p-0" dir="rtl">
        <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2 print:hidden">
          <Button asChild variant="secondary">
            <Link href="/home">رجوع</Link>
          </Button>
          <Button onClick={() => window.print()}>طباعة / حفظ PDF</Button>
          <Button asChild variant="secondary">
            <Link
              href={`/api/prescriptions/${prescriptionId}/download-pdf`}
              target="_blank"
            >
              تحميل PDF
            </Link>
          </Button>
        </div>

        <PrescriptionDocument data={data} className="print:shadow-none" />
      </div>
    </>
  );
}
