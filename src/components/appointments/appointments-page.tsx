"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  fetchAppointmentsOfflineFirst,
  deleteAppointmentOffline,
} from "@/lib/data/offline-api";
import { rxApi, type AppointmentDto } from "@/lib/api/rx-client";
import { refreshPendingCount } from "@/lib/sync/sync-engine";
import { genderLabel } from "@/lib/patient-utils";

type Props = {
  title?: string;
  offline?: boolean;
};

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AppointmentsPageClient({
  title = "المواعيد",
  offline = true,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppointmentDto | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "cancelled">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", selectedDate],
    queryFn: () => fetchAppointmentsOfflineFirst(selectedDate),
  });

  const appointments = useMemo(() => {
    const list = data ?? [];
    if (filter === "active") return list.filter((a) => a.status);
    if (filter === "cancelled") return list.filter((a) => !a.status);
    return list;
  }, [data, filter]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      active: all.filter((a) => a.status).length,
      cancelled: all.filter((a) => !a.status).length,
    };
  }, [data]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      if (offline) {
        await deleteAppointmentOffline(id);
        return;
      }
      await rxApi.appointments.delete(id);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await refreshPendingCount();
      toast.success("تم حذف الموعد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => rxApi.appointments.toggleStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("تم تحديث حالة الموعد");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function shiftDay(delta: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateKey(d));
  }

  const dateLabel = new Date(selectedDate).toLocaleDateString("ar-SY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <AppHeader
        title={title}
        subtitle={`${stats.total} موعد في هذا اليوم`}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title="جدول المواعيد"
          description="تصفّح المواعيد حسب اليوم وأدر حالتها"
          actions={
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              موعد جديد
            </Button>
          }
        />

        <Card hover>
          <CardContent className="flex flex-col items-center gap-4 p-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => shiftDay(-1)}>
                <ChevronRight size={18} />
              </Button>
              <div className="min-w-[220px] text-center">
                <p className="flex items-center justify-center gap-2 font-semibold text-rx-text">
                  <Calendar size={18} className="text-rx-primary" />
                  {dateLabel}
                </p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-rx-border bg-rx-bg-subtle px-3 py-2 text-sm focus:border-rx-primary focus:outline-none focus:ring-2 focus:ring-rx-primary/20"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => shiftDay(1)}>
                <ChevronLeft size={18} />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDate(toDateKey(new Date()))}
            >
              اليوم
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="إجمالي اليوم"
            value={stats.total}
            icon={<CalendarDays size={20} />}
          />
          <StatCard
            label="نشطة"
            value={stats.active}
            className="border-green-200/80"
            icon={<CheckCircle2 size={20} className="text-green-600" />}
          />
          <StatCard
            label="ملغاة"
            value={stats.cancelled}
            className="border-red-200/80"
            icon={<XCircle size={20} className="text-rx-danger" />}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "الكل"],
              ["active", "نشطة"],
              ["cancelled", "ملغاة"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {(showForm || editing) && (
          <Card hover>
            <CardHeader>
              <CardTitle>{editing ? "تعديل موعد" : "موعد جديد"}</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentForm
                appointment={editing}
                defaultDate={selectedDate}
                offline={offline}
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
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="لا توجد مواعيد"
                description="لا توجد مواعيد في هذا اليوم — أضف موعداً جديداً"
                action={
                  <Button onClick={() => setShowForm(true)}>
                    <Plus size={16} />
                    موعد جديد
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-rx-border/60">
                {appointments.map((ap) => (
                  <div
                    key={ap.id || ap.appointmentDatetime + String(ap.patientId)}
                    className="flex flex-col gap-4 p-5 transition-colors hover:bg-rx-bg-subtle/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-rx-primary-light px-3 py-1 font-mono text-lg font-bold text-rx-primary">
                          {formatTime(ap.appointmentDatetime)}
                        </span>
                        <Badge variant={ap.status ? "success" : "danger"}>
                          {ap.status ? "نشط" : "ملغى"}
                        </Badge>
                      </div>
                      <p className="font-semibold text-rx-text">
                        {ap.patient?.name ?? "مريض"}
                        {ap.patient && (
                          <span className="mx-2 text-sm font-normal text-rx-muted">
                            {genderLabel(ap.patient.gender as "male" | "female")} —{" "}
                            {ap.patient.age}
                          </span>
                        )}
                      </p>
                      {ap.patient?.phone && (
                        <p className="text-sm text-rx-muted" dir="ltr">
                          {ap.patient.phone}
                        </p>
                      )}
                      {ap.notes && (
                        <p className="text-sm text-rx-text-secondary">{ap.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ap.id > 0 && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleMutation.mutate(ap.id)}
                            disabled={toggleMutation.isPending}
                          >
                            {ap.status ? (
                              <>
                                <XCircle size={14} />
                                إلغاء
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                تفعيل
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditing(ap);
                              setShowForm(true);
                            }}
                          >
                            <Pencil size={14} />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("حذف هذا الموعد؟")) {
                                deleteMutation.mutate(ap.id);
                              }
                            }}
                          >
                            <Trash2 size={14} className="text-rx-danger" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
