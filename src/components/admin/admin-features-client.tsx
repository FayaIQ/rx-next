"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Search, Shield, Stethoscope, ToggleLeft } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { FormPageLoading } from "@/components/ui/page-loading";
import { adminApi, type AdminFeatureDto } from "@/lib/api/admin-client";
import { cn } from "@/lib/utils";

function FeatureToggleRow({
  feature,
  disabled,
  onToggle,
}: {
  feature: AdminFeatureDto;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-rx-border bg-rx-surface p-4">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-rx-text">{feature.label}</p>
          <Badge variant={feature.enabled ? "default" : "secondary"}>
            {feature.enabled ? "مفتوحة" : "مغلقة"}
          </Badge>
        </div>
        <p className="text-sm text-rx-muted">{feature.description}</p>
        {feature.navHref ? (
          <p className="text-xs text-rx-muted" dir="ltr">
            {feature.navHref}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!feature.enabled)}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors",
          feature.enabled ? "bg-teal-600" : "bg-slate-300",
          disabled && "opacity-60"
        )}
        aria-label={
          feature.enabled ? `إغلاق ${feature.label}` : `فتح ${feature.label}`
        }
      >
        <span
          className={cn(
            "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
            feature.enabled ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function AdminFeaturesClient() {
  const queryClient = useQueryClient();
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [q, setQ] = useState("");

  const doctorsQuery = useQuery({
    queryKey: ["admin-features-doctors"],
    queryFn: () => adminApi.features(),
  });

  const doctorFeaturesQuery = useQuery({
    queryKey: ["admin-features", selectedDoctorId],
    queryFn: () => adminApi.features(selectedDoctorId!),
    enabled: selectedDoctorId != null,
  });

  const toggleMutation = useMutation({
    mutationFn: ({
      key,
      enabled,
    }: {
      key: string;
      enabled: boolean;
    }) => adminApi.setFeature(selectedDoctorId!, key, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-features", selectedDoctorId],
      });
      toast.success("تم تحديث صفحات هذا الطبيب");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doctors = doctorsQuery.data?.doctors ?? [];
  const filteredDoctors = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return doctors;
    return doctors.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.phoneNumber.toLowerCase().includes(term)
    );
  }, [doctors, q]);

  const features = doctorFeaturesQuery.data?.features ?? [];
  const selectedDoctor = doctorFeaturesQuery.data?.doctor;
  const enabledCount = features.filter((f) => f.enabled).length;

  if (doctorsQuery.isLoading && !doctorsQuery.data) {
    return <FormPageLoading />;
  }

  if (selectedDoctorId != null) {
    return (
      <>
        <AppHeader
          title="تحكم صفحات الطبيب"
          subtitle={
            selectedDoctor
              ? `${selectedDoctor.name} · ${enabledCount} من ${features.length} مفعّلة`
              : "تحميل…"
          }
        />
        <PageContent className="space-y-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedDoctorId(null)}
          >
            <ArrowRight size={14} />
            رجوع لقائمة الأطباء
          </Button>

          <PageHeader
            title={selectedDoctor?.name ?? "الطبيب"}
            description="افتح أو أغلق الصفحات لهذا الطبيب فقط — باقي الأطباء لا يتأثرون."
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield size={18} />
                صفحات هذا الطبيب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {doctorFeaturesQuery.isLoading && features.length === 0 ? (
                <p className="text-sm text-rx-muted">جاري التحميل…</p>
              ) : (
                features.map((feature) => (
                  <FeatureToggleRow
                    key={feature.key}
                    feature={feature}
                    disabled={toggleMutation.isPending}
                    onToggle={(enabled) =>
                      toggleMutation.mutate({ key: feature.key, enabled })
                    }
                  />
                ))
              )}
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <AppHeader
        title="تحكم الصفحات"
        subtitle={`${doctors.length} طبيب`}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title="فتح وإغلاق صفحات كل طبيب"
          description="اختر طبيباً ثم عطّل أو فعّل الصفحات له فقط دون التأثير على بقية الأطباء."
        />

        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-rx-muted"
          />
          <Input
            className="pr-9"
            placeholder="بحث بالاسم أو الهاتف…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope size={18} />
              الأطباء
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-rx-border/60 p-0">
            {filteredDoctors.length === 0 ? (
              <EmptyState
                icon={ToggleLeft}
                title="لا يوجد أطباء"
                description="أضف طبيباً أولاً ثم عد لإدارة صفحاته"
              />
            ) : (
              filteredDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  type="button"
                  onClick={() => setSelectedDoctorId(doctor.id)}
                  className="flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition-colors hover:bg-rx-bg-subtle"
                >
                  <div>
                    <p className="font-semibold text-rx-text">{doctor.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-rx-muted" dir="ltr">
                      {doctor.phoneNumber}
                    </p>
                  </div>
                  <Badge variant="secondary">إدارة الصفحات</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
