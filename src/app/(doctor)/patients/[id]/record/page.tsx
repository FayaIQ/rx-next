"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, FileText } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";

export default function PatientRecordPage() {
  const params = useParams();
  const patientId = Number(params.id);

  const { data, isLoading } = useQuery({
    queryKey: ["patient-record", patientId],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/record`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json as {
        patient: { id: number; name: string; gender: string };
        prescriptions: Array<{
          id: number;
          prescriptionNumber: number;
          prescriptionDate: string;
          diagnosis: string | null;
          items: Array<{ name: string }>;
        }>;
      };
    },
  });

  return (
    <>
      <AppHeader title={`سجل المريض: ${data?.patient.name ?? ""}`} />
      <PageContent className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/patients">
            <ArrowRight size={14} />
            العودة للمرضى
          </Link>
        </Button>

        <PageHeader
          title="الوصفات السابقة"
          description="جميع الوصفات المرتبطة بهذا المريض"
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : data?.prescriptions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="لا توجد وصفات سابقة"
            description="لم يُكتب أي وصفة لهذا المريض بعد"
            action={
              <Button asChild>
                <Link href="/home">كتابة وصفة جديدة</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {data?.prescriptions.map((rx) => (
              <Card key={rx.id} hover>
                <CardHeader className="pb-2">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>
                      وصفة #{rx.prescriptionNumber} —{" "}
                      {new Date(rx.prescriptionDate).toLocaleDateString("ar-SY")}
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/home?id=${rx.id}`}>فتح</Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/prescriptions/${rx.id}/preview`}>
                          معاينة
                        </Link>
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {rx.diagnosis && (
                    <p>
                      <span className="text-rx-muted">التشخيص: </span>
                      {rx.diagnosis}
                    </p>
                  )}
                  <ul className="list-inside list-disc text-rx-text-secondary">
                    {rx.items.map((item, i) => (
                      <li key={i}>{item.name}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
