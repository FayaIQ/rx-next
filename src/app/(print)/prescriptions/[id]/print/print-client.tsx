"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PrescriptionDocument,
  type PrescriptionDocumentData,
} from "@/components/prescription/prescription-document";
import { paperPageSizeCss } from "@/lib/recipe-paper";
import { useLocale } from "@/i18n/locale-provider";

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
  const { t, dir } = useLocale();
  const paperSize = data.settings.paperSize;
  const canHideBackground =
    data.settings.designMode === "image" && !!data.settings.designImagePath;

  const [hideDesignBackground, setHideDesignBackground] = useState(
    () => canHideBackground && data.settings.printWithoutDesignImage
  );

  const pdfHref = useMemo(() => {
    const base = `/api/prescriptions/${prescriptionId}/download-pdf`;
    if (!canHideBackground) return base;
    return `${base}?blank=${hideDesignBackground ? "1" : "0"}`;
  }, [canHideBackground, hideDesignBackground, prescriptionId]);

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

      <div
        className="prescription-print-root min-h-screen bg-gray-100 p-4 print:bg-white print:p-0"
        dir={dir}
      >
        <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center gap-2 print:hidden">
          <Button asChild variant="secondary">
            <Link href="/home">{t("common.back")}</Link>
          </Button>
          <Button onClick={() => window.print()}>{t("print.printSavePdf")}</Button>
          <Button asChild variant="secondary">
            <Link href={pdfHref} target="_blank">
              {t("print.downloadPdf")}
            </Link>
          </Button>
          {canHideBackground && (
            <Button
              type="button"
              variant={hideDesignBackground ? "default" : "outline"}
              onClick={() => setHideDesignBackground((v) => !v)}
              title={t("print.blankPaperTitle")}
            >
              {hideDesignBackground
                ? t("print.showBackground")
                : t("print.hideBackground")}
            </Button>
          )}
        </div>

        {canHideBackground && hideDesignBackground && (
          <p className="mx-auto mb-3 max-w-[210mm] rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
            {t("print.blankPaperHint")}
          </p>
        )}

        <PrescriptionDocument
          data={data}
          className="print:shadow-none"
          hideDesignBackground={hideDesignBackground}
        />
      </div>
    </>
  );
}
