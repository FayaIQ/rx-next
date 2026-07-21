"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users, FileText, Smile } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { TablePageLoading } from "@/components/ui/page-loading";
import { PatientForm } from "@/components/patients/patient-form";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import {
  fetchPatientsPaginated,
  deletePatientOffline,
} from "@/lib/data/offline-api";
import { refreshPendingCount } from "@/lib/sync/sync-engine";
import type { PatientDto } from "@/lib/api/rx-client";
import { genderLabel } from "@/lib/patient-utils";
import {
  activePersonalFields,
  getFieldValue,
} from "@/lib/patient-field-display";
import { usePatientFields } from "@/hooks/use-patient-fields";
import { useLocale } from "@/i18n/locale-provider";

export function PatientsPageClient({
  title,
  showRecordLink = true,
}: {
  title?: string;
  showRecordLink?: boolean;
}) {
  const { t, locale } = useLocale();
  const pageTitle = title ?? t("patients.title");
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PatientDto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(q);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", q, page, pageSize],
    queryFn: () => fetchPatientsPaginated(q || undefined, page, pageSize),
    placeholderData: keepPreviousData,
    retry: (failureCount) => navigator.onLine && failureCount < 1,
  });

  const { data: fieldsData } = usePatientFields();

  const personalFields = useMemo(
    () => activePersonalFields(fieldsData),
    [fieldsData]
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePatientOffline(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      await refreshPendingCount();
      toast.success(t("patients.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patients = data?.patients ?? [];
  const pagination = data?.pagination;

  if (isLoading && !data) {
    return <TablePageLoading />;
  }

  return (
    <>
      <AppHeader
        title={pageTitle}
        subtitle={`${pagination?.total ?? patients.length} ${t("patients.title")}`}
      />
      <PageContent>
        <PageHeader
          title={pageTitle}
          description={t("patients.subtitle")}
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              {t("patients.newPatient")}
            </Button>
          }
        />

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={t("patients.searchPlaceholder")}
          className="mb-6 max-w-md"
        />

        {(showForm || editing) && (
          <Card hover className="mb-6">
            <CardHeader>
              <CardTitle>
                {editing ? t("patients.editPatient") : t("patients.newPatient")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PatientForm
                key={editing ? `edit-${editing.id}` : "new-patient"}
                patient={editing}
                onSuccess={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : patients.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("patients.empty")}
                description={t("patients.emptyDescription")}
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    {t("patients.add")}
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("patients.name")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("patients.gender")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("patients.age")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("patients.visits")}
                      </th>
                      {personalFields.map((field) => (
                        <th
                          key={field.id}
                          className="px-5 py-3.5 text-right font-medium whitespace-nowrap"
                        >
                          {field.name}
                        </th>
                      ))}
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("patients.phone")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("common.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-rx-text">{patient.name}</p>
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {genderLabel(patient.gender, locale)}
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">{patient.age}</td>
                        <td className="px-5 py-4">
                          <Badge variant="secondary">{patient.visitCount}</Badge>
                        </td>
                        {personalFields.map((field) => (
                          <td
                            key={field.id}
                            className="px-5 py-4 text-rx-text-secondary whitespace-nowrap"
                          >
                            {getFieldValue(patient.fieldValues, field.id)}
                          </td>
                        ))}
                        <td className="px-5 py-4 font-mono text-xs text-rx-muted" dir="ltr">
                          {patient.phone ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            {patient.id > 0 && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/dental/${patient.id}`}>
                                  <Smile size={14} />
                                  {t("patients.dental")}
                                </Link>
                              </Button>
                            )}
                            {showRecordLink && patient.id > 0 && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/patients/${patient.id}/record`}>
                                  <FileText size={14} />
                                  {t("patients.record")}
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditing(patient);
                                setShowForm(true);
                              }}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(t("patients.confirmDelete"))) {
                                  deleteMutation.mutate(patient.id);
                                }
                              }}
                            >
                              <Trash2 size={16} className="text-rx-danger" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
