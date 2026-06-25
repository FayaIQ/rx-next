"use client";

import { useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import {
  FileText,
  Eye,
  Printer,
  Plus,
  Pencil,
  UserRound,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContent } from "@/components/ui/page-shell";
import { TablePageLoading } from "@/components/ui/page-loading";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { fetchPrescriptionsPaginated } from "@/lib/data/offline-api";
import { usePatientFields } from "@/hooks/use-patient-fields";
import type { PrescriptionDto } from "@/lib/api/rx-client";
import { formatPrescriptionDateTime } from "@/lib/patient-utils";
import {
  activeRecipeFields,
  getFieldValue,
} from "@/lib/patient-field-display";

function PrescriptionActions({ rx }: { rx: PrescriptionDto }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="ghost" size="icon" asChild title="تعديل">
        <Link href={`/home?id=${rx.id}`}>
          <Pencil size={15} />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild title="معاينة">
        <Link href={`/prescriptions/${rx.id}/preview`}>
          <Eye size={15} />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild title="طباعة">
        <Link href={`/prescriptions/${rx.id}/print`}>
          <Printer size={15} />
        </Link>
      </Button>
      {rx.patientId > 0 && (
        <Button variant="ghost" size="icon" asChild title="سجل المريض">
          <Link href={`/patients/${rx.patientId}/record`}>
            <UserRound size={15} />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function PrescriptionsLogPage() {
  const [q, setQ] = useState("");
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(q);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["prescriptions", q, page, pageSize],
    queryFn: () =>
      fetchPrescriptionsPaginated(q.trim() || undefined, page, pageSize),
    placeholderData: keepPreviousData,
    retry: (failureCount) => navigator.onLine && failureCount < 1,
  });

  const { data: fieldsData } = usePatientFields();

  const recipeFields = useMemo(
    () => activeRecipeFields(fieldsData),
    [fieldsData]
  );

  const prescriptions = data?.prescriptions ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? prescriptions.length;

  const subtitle = useMemo(() => {
    if (q.trim()) return `${total} نتيجة للبحث`;
    return `${total} وصفة محفوظة`;
  }, [q, total]);

  if (isLoading && !data) {
    return <TablePageLoading />;
  }

  return (
    <>
      <AppHeader title="سجل الوصفات" subtitle={subtitle} />

      <PageContent>
        <Card className="overflow-hidden">
          <CardHeader className="space-y-3 border-b border-rx-border/80 bg-rx-bg-subtle/30 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchInput
                value={q}
                onChange={setQ}
                placeholder="بحث بالمريض، التشخيص، أو رقم الوصفة..."
                className="w-full sm:max-w-md sm:flex-1"
              />
              <Button size="sm" asChild className="shrink-0">
                <Link href="/home">
                  <Plus size={15} />
                  وصفة جديدة
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isFetching && !isLoading && (
              <div className="h-0.5 w-full overflow-hidden bg-rx-border/40">
                <div className="h-full w-1/3 animate-pulse bg-rx-primary" />
              </div>
            )}

            {prescriptions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title={q.trim() ? "لا توجد نتائج" : "لا توجد وصفات بعد"}
                description={
                  q.trim()
                    ? "جرّب اسم مريض أو رقم وصفة مختلف"
                    : "ابدأ بكتابة أول وصفة من الصفحة الرئيسية"
                }
                action={
                  <Button asChild>
                    <Link href="/home">
                      <Plus size={16} />
                      كتابة وصفة جديدة
                    </Link>
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="rx-table w-full text-sm">
                    <thead>
                      <tr className="border-b border-rx-border text-rx-muted">
                        <th className="px-4 py-3.5 text-right font-medium">#</th>
                        <th className="px-4 py-3.5 text-right font-medium">المريض</th>
                        <th className="px-4 py-3.5 text-right font-medium">التاريخ</th>
                        <th className="px-4 py-3.5 text-right font-medium">التشخيص</th>
                        {recipeFields.map((field) => (
                          <th
                            key={field.id}
                            className="px-4 py-3.5 text-right font-medium whitespace-nowrap"
                          >
                            {field.name}
                          </th>
                        ))}
                        <th className="px-4 py-3.5 text-right font-medium">الأدوية</th>
                        <th className="px-4 py-3.5 text-right font-medium">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rx-border/60">
                      {prescriptions.map((rx, index) => {
                        const patientName =
                          rx.patientName ?? rx.patient?.name ?? "مريض غير معروف";
                        const medicinePreview = rx.items
                          .slice(0, 3)
                          .map((item) => item.name)
                          .join(" · ");
                        const moreCount = Math.max(0, rx.items.length - 3);

                        return (
                          <tr
                            key={
                              rx.id > 0
                                ? rx.id
                                : `local-${rx.patientId}-${rx.prescriptionDate}-${index}`
                            }
                          >
                            <td className="px-4 py-3.5 font-mono text-rx-primary">
                              {rx.prescriptionNumber}
                            </td>
                            <td className="px-4 py-3.5 font-medium text-rx-text">
                              {patientName}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap text-rx-text-secondary">
                              {formatPrescriptionDateTime(rx.prescriptionDate)}
                            </td>
                            <td className="max-w-[12rem] px-4 py-3.5 text-rx-text-secondary">
                              {rx.diagnosis?.trim() || "—"}
                            </td>
                            {recipeFields.map((field) => (
                              <td
                                key={field.id}
                                className="px-4 py-3.5 whitespace-nowrap text-rx-text-secondary"
                              >
                                {getFieldValue(rx.fieldValues, field.id)}
                              </td>
                            ))}
                            <td className="max-w-[16rem] px-4 py-3.5 text-xs text-rx-muted">
                              {medicinePreview}
                              {moreCount > 0 ? ` · +${moreCount}` : ""}
                            </td>
                            <td className="px-4 py-3.5">
                              <PrescriptionActions rx={rx} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
