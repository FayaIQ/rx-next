"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Smile, Search } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { fetchPatientsPaginated } from "@/lib/data/offline-api";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { Pagination } from "@/components/ui/pagination";

export function DentalHubPage() {
  const [q, setQ] = useState("");
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(q);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", q, page, pageSize, "dental-hub"],
    queryFn: () => fetchPatientsPaginated(q || undefined, page, pageSize),
  });

  const patients = data?.patients ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <AppHeader
        title="طبلة مريض الأسنان"
        subtitle="فحص وتسجيل حالة كل سن على نموذج ثلاثي الأبعاد"
      />
      <PageContent>
        <PageHeader
          title="اختر مريضاً"
          description="افتح طبلة الأسنان لتسجيل حالات الأسنان العلوية والسفلية (نظام FDI)"
        />

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="بحث بالاسم أو الهاتف..."
          className="mb-6 max-w-md"
        />

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-rx-bg-subtle" />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Smile}
            title="لا يوجد مرضى"
            description="أضف مريضاً من صفحة المرضى أولاً"
            action={
              <Button asChild>
                <Link href="/patients">المرضى</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="space-y-2">
              {patients.map((patient) => (
                <Card key={patient.id} hover>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-semibold text-rx-text">{patient.name}</p>
                      <p className="text-xs text-rx-muted">
                        {patient.age} · {patient.phone ?? "بدون هاتف"}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/dental/${patient.id}`}>
                        <Smile size={14} />
                        فتح الطبلة
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
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
      </PageContent>
    </>
  );
}
