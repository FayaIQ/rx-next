"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/ui/page-shell";
import { PatientFileClient } from "@/components/patient-file/patient-file-client";
import { useQuery } from "@tanstack/react-query";

export default function PatientRecordPage() {
  const params = useParams();
  const patientId = Number(params.id);

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
      <AppHeader title={`ملف المريض: ${isError ? "—" : (data?.name ?? "…")}`} />
      <PageContent className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patients">
            <ArrowRight size={14} />
            العودة للمرضى
          </Link>
        </Button>
        <PatientFileClient patientId={patientId} />
      </PageContent>
    </>
  );
}
