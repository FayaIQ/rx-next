"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Stethoscope } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsPageLoading } from "@/components/ui/page-loading";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { adminApi, type AdminUserDto } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { ActivateSubscriptionDialog } from "@/components/admin/activate-subscription-dialog";
import Link from "next/link";
import { useLocale } from "@/i18n/locale-provider";

export function AdminDoctorsClient() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [activateUser, setActivateUser] = useState<AdminUserDto | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    specialty: "",
  });
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(tab);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-doctors", tab, page, pageSize],
    queryFn: () =>
      adminApi.doctors(tab === "all" ? undefined : tab, { page, pageSize }),
    placeholderData: keepPreviousData,
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createDoctor(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      setShowForm(false);
      setForm({ name: "", phone: "", password: "", specialty: "" });
      toast.success(t("admin.doctorAdded"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doctors = data?.doctors ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? doctors.length;

  if (isLoading && !data) {
    return <CardsPageLoading />;
  }

  return (
    <>
      <AppHeader
        title={t("admin.doctorsTitle")}
        subtitle={t("admin.doctorCount", { count: total })}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title={t("admin.manageDoctors")}
          description={t("admin.manageDoctorsDesc")}
          actions={
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              {t("admin.newDoctor")}
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "admin.filterAll"],
              ["today", "admin.filterToday"],
              ["new", "admin.filterNewWeek"],
            ] as const
          ).map(([key, labelKey]) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>

        {showForm && (
          <Card hover>
            <CardHeader>
              <CardTitle>{t("admin.addDoctor")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "admin.name"],
                  ["phone", "admin.phone"],
                  ["password", "admin.password"],
                  ["specialty", "admin.specialty"],
                ] as const
              ).map(([key, labelKey]) => (
                <div key={key} className="space-y-2">
                  <Label>{t(labelKey)}</Label>
                  <Input
                    type={key === "password" ? "password" : "text"}
                    value={form[key]}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
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
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <EmptyState
                icon={Stethoscope}
                title={t("admin.noDoctors")}
                description={t("admin.noDoctorsDesc")}
              />
            ) : (
              <div className="divide-y divide-rx-border/60">
                {doctors.map((d) => (
                  <div
                    key={d.id}
                    className="flex flex-col gap-3 p-5 transition-colors hover:bg-rx-bg-subtle/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-rx-text">{d.name}</p>
                      <p className="text-sm text-rx-muted" dir="ltr">
                        {d.phoneNumber}
                      </p>
                      <p className="text-xs text-rx-text-secondary">
                        {t("admin.doctorMeta", {
                          patients: d.patientsCount,
                          secretaries: d.secretariesCount,
                        })}
                      </p>
                      <SubscriptionBadge subscription={d.subscription} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setActivateUser(d)}>
                        {t("admin.activateSubscription")}
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/users/${d.id}`}>
                          {t("admin.details")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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

        {activateUser && (
          <ActivateSubscriptionDialog
            user={activateUser}
            onClose={() => setActivateUser(null)}
          />
        )}
      </PageContent>
    </>
  );
}
