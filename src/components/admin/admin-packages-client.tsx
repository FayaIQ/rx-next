"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FormPageLoading } from "@/components/ui/page-loading";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { adminApi, type AdminPackageDto } from "@/lib/api/admin-client";
import { useLocale } from "@/i18n/locale-provider";

const emptyPkg = {
  name: "",
  price: 0,
  description: "",
  duration: 1,
  durationUnit: "months" as "days" | "months",
  planType: "monthly",
  isTrial: false,
  isActive: true,
};

export function AdminPackagesClient() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminPackageDto | null>(null);
  const [form, setForm] = useState(emptyPkg);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-packages"],
    queryFn: () => adminApi.packages(),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editing) return adminApi.updatePackage(editing.id, form);
      return adminApi.createPackage(form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-packages"] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyPkg);
      toast.success(editing ? t("admin.updated") : t("admin.added"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const packages = data?.packages ?? [];
  const numberLocale = locale === "en" ? "en-GB" : "ar-IQ";

  if (isLoading && !data) {
    return <FormPageLoading />;
  }

  function startEdit(pkg: AdminPackageDto) {
    setEditing(pkg);
    setForm({
      name: pkg.name,
      price: pkg.price,
      description: pkg.description,
      duration: pkg.duration,
      durationUnit: pkg.durationUnit as "days" | "months",
      planType: pkg.planType,
      isTrial: pkg.isTrial,
      isActive: pkg.isActive,
    });
    setShowForm(true);
  }

  return (
    <>
      <AppHeader
        title={t("admin.packagesTitle")}
        subtitle={t("admin.packageCount", { count: packages.length })}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title={t("admin.managePackages")}
          description={t("admin.managePackagesDesc")}
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setForm(emptyPkg);
                setShowForm(!showForm);
              }}
            >
              <Plus size={16} />
              {t("admin.newPackage")}
            </Button>
          }
        />

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editing ? t("admin.editPackage") : t("admin.newPackage")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("admin.name")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.priceSyp")}</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>{t("admin.duration")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.duration}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, duration: Number(e.target.value) }))
                    }
                  />
                  <select
                    className="rounded-md border px-2 text-sm"
                    value={form.durationUnit}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationUnit: e.target.value as "days" | "months",
                      }))
                    }
                  >
                    <option value="days">{t("admin.day")}</option>
                    <option value="months">{t("admin.month")}</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>{t("admin.description")}</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isTrial}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isTrial: e.target.checked }))
                  }
                />
                {t("admin.trialPackage")}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                {t("admin.activeLabel")}
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {t("common.save")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : packages.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={Package}
                title={t("admin.noPackages")}
                description={t("admin.noPackagesDesc")}
              />
            </div>
          ) : (
            packages.map((pkg) => (
              <Card key={pkg.id} hover>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold">{pkg.name}</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(pkg)}
                    >
                      <Pencil size={14} />
                    </Button>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-rx-primary">
                    {pkg.price.toLocaleString(numberLocale)} {t("admin.currencySyp")}
                  </p>
                  <p className="mt-1 text-sm text-rx-muted">
                    {pkg.duration}{" "}
                    {pkg.durationUnit === "days" ? t("admin.day") : t("admin.month")}
                  </p>
                  <p className="mt-2 text-sm">{pkg.description}</p>
                  <div className="mt-3 flex gap-2">
                    {pkg.isTrial && (
                      <Badge variant="default">{t("admin.trialBadge")}</Badge>
                    )}
                    <Badge variant={pkg.isActive ? "success" : "secondary"}>
                      {pkg.isActive
                        ? t("admin.activeLabel")
                        : t("admin.inactiveLabel")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </PageContent>
    </>
  );
}
