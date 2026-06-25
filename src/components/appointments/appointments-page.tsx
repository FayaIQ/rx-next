"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  Pencil,
  Plus,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { CalendarPageLoading } from "@/components/ui/page-loading";
import { PageContent } from "@/components/ui/page-shell";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import {
  fetchAppointmentsOfflineFirst,
  deleteAppointmentOffline,
} from "@/lib/data/offline-api";
import { rxApi, type AppointmentDto } from "@/lib/api/rx-client";
import { refreshPendingCount } from "@/lib/sync/sync-engine";
import { genderLabel } from "@/lib/patient-utils";
import { monthBookingRange, paginateSlice } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  offline?: boolean;
};

type FilterKey = "all" | "active" | "cancelled";

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function appointmentDayKey(ap: AppointmentDto): string {
  return ap.bookingDate?.slice(0, 10) ?? ap.appointmentDatetime.slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

function formatDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ar-SY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    numberingSystem: "latn",
  });
}

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشطة" },
  { key: "cancelled", label: "ملغاة" },
];

type AppointmentRowProps = {
  ap: AppointmentDto;
  onEdit: (ap: AppointmentDto) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  togglePending: boolean;
};

function AppointmentRow({
  ap,
  onEdit,
  onDelete,
  onToggle,
  togglePending,
}: AppointmentRowProps) {
  return (
    <li
      className={cn(
        "flex items-start gap-3 p-4 transition-colors hover:bg-rx-bg-subtle/40",
        !ap.status && "opacity-75"
      )}
    >
      <div className="w-14 shrink-0 pt-0.5 text-center">
        <p className="font-mono text-lg font-bold leading-none text-rx-primary">
          {formatTime(ap.appointmentDatetime)}
        </p>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-rx-text">
            {ap.patient?.name ?? "مريض"}
          </p>
          <Badge variant={ap.status ? "success" : "danger"}>
            {ap.status ? "نشط" : "ملغى"}
          </Badge>
        </div>

        {ap.patient && (
          <p className="text-xs text-rx-muted">
            {genderLabel(ap.patient.gender as "male" | "female")}
            {" · "}
            {ap.patient.age}
            {ap.patient.phone && (
              <>
                {" · "}
                <span dir="ltr">{ap.patient.phone}</span>
              </>
            )}
          </p>
        )}

        {ap.notes?.trim() && (
          <p className="line-clamp-2 text-sm text-rx-text-secondary">
            {ap.notes}
          </p>
        )}
      </div>

      {ap.id > 0 && (
        <div className="flex shrink-0 gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title={ap.status ? "إلغاء الموعد" : "تفعيل الموعد"}
            onClick={() => onToggle(ap.id)}
            disabled={togglePending}
          >
            {ap.status ? (
              <XCircle size={15} className="text-rx-danger" />
            ) : (
              <CheckCircle2 size={15} className="text-green-600" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="تعديل"
            onClick={() => onEdit(ap)}
          >
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            title="حذف"
            onClick={() => {
              if (confirm("حذف هذا الموعد؟")) onDelete(ap.id);
            }}
          >
            <Trash2 size={15} className="text-rx-danger" />
          </Button>
        </div>
      )}
    </li>
  );
}

export function AppointmentsPageClient({
  title = "المواعيد",
  offline = true,
}: Props) {
  const queryClient = useQueryClient();
  const todayKey = toDateKey(new Date());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentDto | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const monthKey = `${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`;
  const { bookingFrom, bookingTo } = monthBookingRange(visibleMonth);
  const dayListKey = `${selectedDate}-${filter}`;
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(dayListKey);

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", monthKey],
    queryFn: () =>
      fetchAppointmentsOfflineFirst({ bookingFrom, bookingTo }),
  });

  const sortedAppointments = useMemo(() => {
    const list = [...(data ?? [])];
    list.sort((a, b) => {
      const dayCmp = appointmentDayKey(a).localeCompare(appointmentDayKey(b));
      if (dayCmp !== 0) return dayCmp;
      return (
        new Date(a.appointmentDatetime).getTime() -
        new Date(b.appointmentDatetime).getTime()
      );
    });
    return list;
  }, [data]);

  const filteredAppointments = useMemo(() => {
    if (filter === "active") return sortedAppointments.filter((a) => a.status);
    if (filter === "cancelled") {
      return sortedAppointments.filter((a) => !a.status);
    }
    return sortedAppointments;
  }, [sortedAppointments, filter]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, AppointmentDto[]>();
    for (const ap of filteredAppointments) {
      const key = appointmentDayKey(ap);
      const group = map.get(key);
      if (group) group.push(ap);
      else map.set(key, [ap]);
    }
    return map;
  }, [filteredAppointments]);

  const selectedDayAppointments = useMemo(
    () => appointmentsByDay.get(selectedDate) ?? [],
    [appointmentsByDay, selectedDate]
  );

  const paginatedDay = useMemo(
    () => paginateSlice(selectedDayAppointments, page, pageSize),
    [selectedDayAppointments, page, pageSize]
  );

  const stats = useMemo(() => {
    return {
      total: sortedAppointments.length,
      active: sortedAppointments.filter((a) => a.status).length,
      cancelled: sortedAppointments.filter((a) => !a.status).length,
    };
  }, [sortedAppointments]);

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

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(ap: AppointmentDto) {
    setEditing(ap);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayKey);
  }

  function handleSelectDate(dateKey: string) {
    setSelectedDate(dateKey);
    const [y, m] = dateKey.split("-").map(Number);
    setVisibleMonth(new Date(y!, m! - 1, 1));
  }

  useEffect(() => {
    if (!formOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formOpen]);

  const formDefaultDate = editing ? appointmentDayKey(editing) : selectedDate;

  if (isLoading && !data) {
    return <CalendarPageLoading />;
  }

  return (
    <>
      <AppHeader
        title={title}
        subtitle={`${stats.total} موعد · ${formatDayLabel(selectedDate)}`}
        actions={
          <Button size="sm" onClick={openCreateForm}>
            <Plus size={16} />
            موعد جديد
          </Button>
        }
      />

      <PageContent className="space-y-4 pb-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map(({ key, label }) => {
                const count =
                  key === "all"
                    ? stats.total
                    : key === "active"
                      ? stats.active
                      : stats.cancelled;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      filter === key
                        ? "bg-rx-primary text-white shadow-sm"
                        : "bg-rx-bg-subtle text-rx-muted hover:bg-rx-border/40 hover:text-rx-text"
                    )}
                  >
                    {label}
                    <span className="mr-1 opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>

            {isLoading ? (
              <Skeleton className="h-72 w-full rounded-xl" />
            ) : (
              <AppointmentCalendar
                month={visibleMonth}
                selectedDate={selectedDate}
                todayKey={todayKey}
                appointmentsByDay={appointmentsByDay}
                onSelectDate={handleSelectDate}
                onMonthChange={setVisibleMonth}
                onToday={goToToday}
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-rx-border/80 px-4 py-3">
            <CardTitle className="text-sm font-semibold">
              {formatDayLabel(selectedDate)}
            </CardTitle>
            <span className="text-xs text-rx-muted">
              {selectedDayAppointments.length} موعد
            </span>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : selectedDayAppointments.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="لا توجد مواعيد"
                description={
                  filter === "all"
                    ? "لا توجد مواعيد في هذا اليوم"
                    : "لا توجد مواعيد بهذه الحالة في هذا اليوم"
                }
                action={
                  filter === "all" ? (
                    <Button size="sm" onClick={openCreateForm}>
                      <Plus size={16} />
                      موعد جديد
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                <ul className="divide-y divide-rx-border/60">
                  {paginatedDay.items.map((ap) => (
                    <AppointmentRow
                      key={ap.id || ap.appointmentDatetime + String(ap.patientId)}
                      ap={ap}
                      onEdit={openEditForm}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onToggle={(id) => toggleMutation.mutate(id)}
                      togglePending={toggleMutation.isPending}
                    />
                  ))}
                </ul>
                {paginatedDay.pagination.totalPages > 1 && (
                  <Pagination
                    pagination={paginatedDay.pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          onClick={closeForm}
        >
          <Card
            className="max-h-[min(92vh,40rem)] w-full max-w-md overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-rx-border/80 pb-3">
              <CardTitle className="text-base">
                {editing ? "تعديل موعد" : "موعد جديد"}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={closeForm}
                aria-label="إغلاق"
              >
                <X size={16} />
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <AppointmentForm
                appointment={editing}
                defaultDate={formDefaultDate}
                offline={offline}
                onSuccess={closeForm}
                onCancel={closeForm}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
