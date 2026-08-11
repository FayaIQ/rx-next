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
import { useSyncStore } from "@/stores/sync-store";
import { useClinicFeatureEnabled } from "@/components/clinic/clinic-features-provider";

export function PatientsPageClient({
  title,
  showRecordLink = true,
}: {
  title?: string;
  showRecordLink?: boolean;
}) {
  const { t, locale } = useLocale();
  const dentalEnabled = useClinicFeatureEnabled("dental");
  const online = useSyncStore((state) => state.online);
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
    retry: (failureCount) => online && failureCount < 1,
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
      <AppHeader title={pageTitle} />
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
          className="mb-4 max-w-md"
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
              <>
                <div className="divide-y divide-rx-border/60 sm:hidden">
                  {patients.map((patient) => (
                    <article key={patient.id} className="space-y-3 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-rx-text">
                            {patient.name}
                          </p>
                          <p className="mt-1 font-mono text-xs text-rx-muted" dir="ltr">
                            {patient.phone ?? "—"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {t("patients.visits")}: {patient.visitCount}
                        </Badge>
                      </div>

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-rx-muted">{t("patients.gender")}</dt>
                          <dd className="mt-0.5 text-rx-text-secondary">
                            {genderLabel(patient.gender, locale)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-rx-muted">{t("patients.age")}</dt>
                          <dd className="mt-0.5 text-rx-text-secondary">{patient.age}</dd>
                        </div>
                        {personalFields.map((field) => (
                          <div key={field.id} className="min-w-0">
                            <dt className="truncate text-xs text-rx-muted">{field.name}</dt>
                            <dd className="mt-0.5 break-words text-rx-text-secondary">
                              {getFieldValue(patient.fieldValues, field.id)}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="flex flex-wrap gap-1 border-t border-rx-border/60 pt-2">
                        {dentalEnabled && patient.id > 0 && (
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
                          className="size-8"
                          onClick={() => {
                            setEditing(patient);
                            setShowForm(true);
                          }}
                          aria-label={t("common.edit")}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => {
                            if (confirm(t("patients.confirmDelete"))) {
                              deleteMutation.mutate(patient.id);
                            }
                          }}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 size={16} className="text-rx-danger" />
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto sm:block">
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
                        <td
                          className="px-5 py-4 text-right font-mono text-xs text-rx-muted"
                          dir="ltr"
                        >
                          {patient.phone ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            {dentalEnabled && patient.id > 0 && (
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
