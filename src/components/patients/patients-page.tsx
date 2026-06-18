"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Users, FileText } from "lucide-react";
import { useState } from "react";
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
import { PatientForm } from "@/components/patients/patient-form";
import {
  fetchPatientsOfflineFirst,
  deletePatientOffline,
} from "@/lib/data/offline-api";
import { refreshPendingCount } from "@/lib/sync/sync-engine";
import type { PatientDto } from "@/lib/api/rx-client";
import { genderLabel } from "@/lib/patient-utils";

export function PatientsPageClient({
  title = "المرضى",
  showRecordLink = true,
}: {
  title?: string;
  showRecordLink?: boolean;
}) {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<PatientDto | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["patients", q],
    queryFn: () => fetchPatientsOfflineFirst(q || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePatientOffline(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      await refreshPendingCount();
      toast.success("تم حذف المريض");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patients = data ?? [];

  return (
    <>
      <AppHeader title={title} subtitle={`${patients.length} مريض مسجّل`} />
      <PageContent>
        <PageHeader
          title="قائمة المرضى"
          description="ابحث، أضف، وعدّل بيانات المرضى"
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              مريض جديد
            </Button>
          }
        />

        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="بحث بالاسم أو الهاتف..."
          className="mb-6 max-w-md"
        />

        {(showForm || editing) && (
          <Card hover className="mb-6">
            <CardHeader>
              <CardTitle>{editing ? "تعديل بيانات المريض" : "مريض جديد"}</CardTitle>
            </CardHeader>
            <CardContent>
              <PatientForm
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
                title="لا يوجد مرضى"
                description="ابدأ بإضافة أول مريض لعيادتك"
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    إضافة مريض
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">الاسم</th>
                      <th className="px-5 py-3.5 text-right font-medium">الجنس</th>
                      <th className="px-5 py-3.5 text-right font-medium">العمر</th>
                      <th className="px-5 py-3.5 text-right font-medium">الزيارات</th>
                      <th className="px-5 py-3.5 text-right font-medium">الهاتف</th>
                      <th className="px-5 py-3.5 text-right font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-rx-text">{patient.name}</p>
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {genderLabel(patient.gender)}
                        </td>
                        <td className="px-5 py-4 text-rx-text-secondary">{patient.age}</td>
                        <td className="px-5 py-4">
                          <Badge variant="secondary">{patient.visitCount}</Badge>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-rx-muted" dir="ltr">
                          {patient.phone ?? "—"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            {showRecordLink && patient.id > 0 && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/patients/${patient.id}/record`}>
                                  <FileText size={14} />
                                  السجل
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
                                if (confirm("حذف هذا المريض؟")) {
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
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
