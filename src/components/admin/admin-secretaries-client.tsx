"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { adminApi } from "@/lib/api/admin-client";

export function AdminSecretariesClient() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    doctorId: "",
  });

  const { data: doctorsData } = useQuery({
    queryKey: ["admin-doctors-all"],
    queryFn: () => adminApi.doctors(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-secretaries"],
    queryFn: () => adminApi.secretaries(),
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
      toast.success("تم إضافة السكرتير");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const secretaries = data?.secretaries ?? [];
  const doctors = doctorsData?.doctors ?? [];

  return (
    <>
      <AppHeader title="السكرتارية" subtitle={`${secretaries.length} سكرتير`} />
      <PageContent className="space-y-6">
        <PageHeader
          title="إدارة السكرتارية"
          description="ربط السكرتير بالطبيب وتتبع حالة التفعيل"
          actions={
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              سكرتير جديد
            </Button>
          }
        />

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>إضافة سكرتير</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>الاسم</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>الهاتف</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>كلمة المرور</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>الطبيب</Label>
                <select
                  className="h-11 w-full rounded-xl border border-rx-border bg-rx-surface px-3 text-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
                  value={form.doctorId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, doctorId: e.target.value }))
                  }
                >
                  <option value="">— اختر طبيب —</option>
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
                  حفظ
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
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
                title="لا يوجد سكرتارية"
                description="أضف سكرتيراً واربطه بطبيب"
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
                    طبيب: {s.doctorName ?? "—"}
                  </p>
                  <Badge
                    variant={s.isConfirmed ? "success" : "warning"}
                    className="mt-2"
                  >
                    {s.isConfirmed ? "مفعّل" : "بانتظار التفعيل"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
