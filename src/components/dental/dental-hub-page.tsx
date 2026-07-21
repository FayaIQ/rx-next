"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Smile } from "lucide-react";
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
import { useLocale } from "@/i18n/locale-provider";

export function DentalHubPage() {
  const { t } = useLocale();
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
        title={t("dental.hubTitle")}
        subtitle={t("dental.hubSubtitle")}
      />
      <PageContent>
        <PageHeader
          title={t("dental.selectPatient")}
          description={t("dental.selectPatientDesc")}
        />

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("dental.searchPlaceholder")}
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
            title={t("dental.noPatients")}
            description={t("dental.noPatientsDesc")}
            action={
              <Button asChild>
                <Link href="/patients">{t("dental.patientsLink")}</Link>
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
                        {patient.age} · {patient.phone ?? t("dental.noPhone")}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/dental/${patient.id}`}>
                        <Smile size={14} />
                        {t("dental.openChart")}
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
