"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PrescriptionDocument } from "@/components/prescription/prescription-document";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import { useLocale } from "@/i18n/locale-provider";

export function PrescriptionPreviewClient({
  id,
  data,
}: {
  id: string;
  data: PrescriptionDocumentData;
}) {
  const { t, dir } = useLocale();

  return (
    <div className="min-h-screen bg-gray-100 p-4" dir={dir}>
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/home">{t("common.back")}</Link>
        </Button>
        <Button asChild>
          <Link href={`/prescriptions/${id}/print`}>{t("common.print")}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/api/prescriptions/${id}/download-pdf`} target="_blank">
            {t("print.downloadPdf")}
          </Link>
        </Button>
      </div>

      <PrescriptionDocument data={data} className="mx-auto" />
    </div>
  );
}
