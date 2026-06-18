"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FileText, Eye, Printer } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { rxApi } from "@/lib/api/rx-client";

export function PrescriptionsLogPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: () => rxApi.prescriptions.list(),
  });

  const prescriptions = data?.prescriptions ?? [];

  return (
    <>
      <AppHeader
        title="سجل الوصفات"
        subtitle={`${prescriptions.length} وصفة`}
      />
      <PageContent>
        <PageHeader
          title="جميع الوصفات"
          description="تصفّح، عدّل، واطبع الوصفات السابقة"
        />

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="لا توجد وصفات"
                description="ستظهر هنا الوصفات التي تكتبها"
                action={
                  <Button asChild>
                    <Link href="/home">كتابة وصفة جديدة</Link>
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">الرقم</th>
                      <th className="px-5 py-3.5 text-right font-medium">المريض</th>
                      <th className="px-5 py-3.5 text-right font-medium">التاريخ</th>
                      <th className="px-5 py-3.5 text-right font-medium">التشخيص</th>
                      <th className="px-5 py-3.5 text-right font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td className="px-5 py-4 font-mono font-semibold text-rx-primary">
                          #{rx.prescriptionNumber}
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {(rx as { patientName?: string }).patientName ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {new Date(rx.prescriptionDate).toLocaleString("ar-SY")}
                        </td>
                        <td className="max-w-xs truncate px-5 py-4 text-rx-text-secondary">
                          {rx.diagnosis ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/home?id=${rx.id}`}>تعديل</Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/prescriptions/${rx.id}/preview`}>
                                <Eye size={14} />
                                معاينة
                              </Link>
                            </Button>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/prescriptions/${rx.id}/print`}>
                                <Printer size={14} />
                                طباعة
                              </Link>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
