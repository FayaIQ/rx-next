"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { adminApi, type AdminUserDto } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { ActivateSubscriptionDialog } from "@/components/admin/activate-subscription-dialog";
import Link from "next/link";

export function AdminDoctorsClient() {
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-doctors", tab],
    queryFn: () => adminApi.doctors(tab === "all" ? undefined : tab),
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createDoctor(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      setShowForm(false);
      setForm({ name: "", phone: "", password: "", specialty: "" });
      toast.success("تم إضافة الطبيب");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const doctors = data?.doctors ?? [];

  return (
    <>
      <AppHeader title="الأطباء" subtitle={`${doctors.length} طبيب`} />
      <PageContent className="space-y-6">
        <PageHeader
          title="إدارة الأطباء"
          description="عرض، إضافة، وتفعيل اشتراكات الأطباء"
          actions={
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus size={16} />
              طبيب جديد
            </Button>
          }
        />

        <div className="flex flex-wrap gap-2">
          {[
            ["all", "الكل"],
            ["today", "مواعيد اليوم"],
            ["new", "جدد هذا الأسبوع"],
          ].map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => setTab(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {showForm && (
          <Card hover>
            <CardHeader>
              <CardTitle>إضافة طبيب</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["name", "الاسم"],
                  ["phone", "الهاتف"],
                  ["password", "كلمة المرور"],
                  ["specialty", "التخصص"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
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
                title="لا يوجد أطباء"
                description="أضف طبيباً جديداً للبدء"
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
                        {d.patientsCount} مريض — {d.secretariesCount} سكرتير
                      </p>
                      <SubscriptionBadge subscription={d.subscription} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setActivateUser(d)}>
                        تفعيل اشتراك
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/dashboard/users/${d.id}`}>تفاصيل</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
