"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsPageLoading } from "@/components/ui/page-loading";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { adminApi } from "@/lib/api/admin-client";
import { useLocale } from "@/i18n/locale-provider";

export function AdminSecretariesClient() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    doctorId: "",
  });
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState("secretaries");

  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors-all"],
    queryFn: () => adminApi.doctors(undefined, { page: 1, pageSize: 500 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-secretaries", page, pageSize],
    queryFn: () => adminApi.secretaries({ page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSecretary({
        ...form,
        doctorId: Number(form.doctorId),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-secretaries"] });
      setShowForm(false);
      setForm({ name: "", phone: "", password: "", doctorId: "" });
      toast.success(t("admin.secretaryAdded"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const secretaries = data?.secretaries ?? [];
  const pagination = data?.pagination;
  const doctors = doctorsData?.doctors ?? [];
  const total = pagination?.total ?? secretaries.length;

  if (isLoading && !data) {
    return <CardsPageLoading />;
  }

  return (
    <>
      <AppHeader
        title={t("admin.secretariesTitle")}
        subtitle={t("admin.secretaryCount", { count: total })}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title={t("admin.manageSecretaries")}
          description={t("admin.manageSecretariesDesc")}
          actions={
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              {t("admin.newSecretary")}
            </Button>
          }
        />

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{t("admin.addSecretary")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("admin.name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.password")}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.doctor")}</Label>
                <select
                  className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
                  value={form.doctorId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, doctorId: e.target.value }))
                  }
                >
                  <option value="">{t("admin.chooseDoctor")}</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.doctorId}
                >
                  {t("common.save")}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="divide-y p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : secretaries.length === 0 ? (
              <EmptyState
                icon={UserCog}
                title={t("admin.noSecretaries")}
                description={t("admin.noSecretariesDesc")}
              />
            ) : (
              secretaries.map((s) => (
                <div
                  key={s.id}
                  className="p-5 transition-colors hover:bg-rx-bg-subtle/50"
                >
                  <p className="font-semibold text-rx-text">{s.name}</p>
                  <p className="text-sm text-rx-muted" dir="ltr">
                    {s.phoneNumber}
                  </p>
                  <p className="text-sm text-rx-text-secondary">
                    {t("admin.doctorLabel", { name: s.doctorName ?? "—" })}
                  </p>
                  <Badge
                    variant={s.isConfirmed ? "success" : "warning"}
                    className="mt-2"
                  >
                    {s.isConfirmed
                      ? t("admin.confirmed")
                      : t("admin.pendingActivation")}
                  </Badge>
                </div>
              ))
            )}
            {pagination && (
              <Pagination
                pagination={pagination}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
