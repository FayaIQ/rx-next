"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/ui/page-shell";
import { PatientFileClient } from "@/components/patient-file/patient-file-client";
import { resolvePatientRecordReturn } from "@/lib/patient-record-navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/i18n/locale-provider";

const RETURN_LABEL_KEYS = {
  home: "patientFile.backToHome",
  queue: "patientFile.backToQueue",
  dental: "patientFile.backToDental",
  dates: "patientFile.backToDates",
  back: "common.back",
  patients: "patientFile.backToPatients",
} as const;

export default function PatientRecordPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = Number(params.id);
  const back = resolvePatientRecordReturn(searchParams.get("returnTo"));
  const { t } = useLocale();

  const { data, isError } = useQuery({
    queryKey: ["patient-file-title", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/file`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.patient as { name: string };
    },
    retry: 1,
  });

  return (
    <>
      <AppHeader
        title={t("patientFile.titleWithName", {
          name: isError ? "—" : (data?.name ?? "…"),
        })}
      />
      <PageContent className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={back.href}>
            <ArrowRight size={14} />
            {t(RETURN_LABEL_KEYS[back.labelKey])}
          </Link>
        </Button>
        <PatientFileClient patientId={patientId} />
      </PageContent>
    </>
  );
}
