"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BellRing,
  ChevronLeft,
  Clock,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppointmentDto } from "@/lib/api/rx-client";
import {
  advanceVisitOffline,
  callNextOffline,
  updateVisitStatusOffline,
} from "@/lib/sync/visit-queue-offline";
import { fetchAppointmentsOfflineFirst } from "@/lib/data/offline-api";
import { genderLabel } from "@/lib/patient-utils";
import {
  type VisitStatus,
  DOCTOR_ACTION_LABELS,
  DOCTOR_VISIT_STATUS_NEXT,
  SECRETARY_ACTION_LABELS,
  SECRETARY_VISIT_STATUS_NEXT,
  VISIT_STATUS_COLORS,
  VISIT_STATUS_LABELS,
  isVisitStatus,
  normalizeQueueStatus,
  secretaryStatusLabel,
} from "@/lib/visit-queue/constants";
import { cn } from "@/lib/utils";

const SECRETARY_COLUMNS: VisitStatus[] = [
  "scheduled",
  "waiting",
  "with_doctor",
  "done",
];

const DOCTOR_COLUMNS: VisitStatus[] = [
  "scheduled",
  "waiting",
  "with_doctor",
  "done",
];

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

function formatWaitTime(checkedInAt: string | null) {
  if (!checkedInAt) return null;
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(checkedInAt).getTime()) / 60000)
  );
  if (mins < 1) return "الآن";
  return `${mins} د`;
}

type Props = {
  role: "secretary" | "doctor";
  date?: string;
  onChanged?: () => void;
  onSelectPatient?: (patientId: number) => void;
};

export function WaitingRoomBoard({
  role,
  date,
  onChanged,
  onSelectPatient,
}: Props) {
  const queryClient = useQueryClient();
  const day = date ?? todayKey();
  const isDoctor = role === "doctor";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["waiting-room", role, day],
    queryFn: async () => {
      const appointments = await fetchAppointmentsOfflineFirst({
        date: day,
        status: "active",
      });
      return { appointments };
    },
    refetchInterval: navigator.onLine ? (isDoctor ? 10_000 : 5_000) : false,
  });

  const appointments = data?.appointments ?? [];

  const grouped = useMemo(() => {
    const columns = isDoctor ? DOCTOR_COLUMNS : SECRETARY_COLUMNS;
    const map = new Map<VisitStatus, AppointmentDto[]>();
    for (const col of columns) map.set(col, []);

    for (const ap of appointments) {
      const raw = isVisitStatus(ap.visitStatus)
        ? ap.visitStatus
        : "scheduled";
      const status = normalizeQueueStatus(raw);
      if (map.has(status)) {
        map.get(status)!.push(ap);
      }
    }

    for (const [, list] of map) {
      list.sort((a, b) => {
        const ta = a.checkedInAt ?? a.appointmentDatetime;
        const tb = b.checkedInAt ?? b.appointmentDatetime;
        return ta.localeCompare(tb);
      });
    }

    return map;
  }, [appointments, isDoctor]);

  const calledPatients = grouped.get("with_doctor") ?? [];
  const waitingList = grouped.get("waiting") ?? [];

  const advanceMutation = useMutation({
    mutationFn: (id: number) => advanceVisitOffline(id, role),
    onSuccess: () => {
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callPatientMutation = useMutation({
    mutationFn: (id: number) =>
      updateVisitStatusOffline(id, "with_doctor"),
    onSuccess: (res) => {
      invalidate();
      if (res.appointment.patient && onSelectPatient) {
        onSelectPatient(res.appointment.patient.id);
      }
      toast.success(
        `تم استدعاء ${res.appointment.patient?.name ?? "المريض"}`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const callNextMutation = useMutation({
    mutationFn: () => callNextOffline(day),
    onSuccess: (res) => {
      invalidate();
      if (res.appointment?.patient && onSelectPatient) {
        onSelectPatient(res.appointment.patient.id);
      }
      if (res.appointment) {
        toast.success(
          `تم استدعاء ${res.appointment.patient?.name ?? "المريض"}`
        );
      } else {
        toast.info(res.message ?? "لا يوجد مرضى في الانتظار");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
    queryClient.invalidateQueries({ queryKey: ["secretary-desk"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
    onChanged?.();
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-rx-muted">
          جاري تحميل الطابور...
        </CardContent>
      </Card>
    );
  }

  const columns = isDoctor ? DOCTOR_COLUMNS : SECRETARY_COLUMNS;

  return (
    <Card
      className={cn(
        "shadow-sm",
        isDoctor
          ? "border-violet-200 ring-1 ring-violet-100"
          : "border-rx-primary/15"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {isDoctor ? (
              <Stethoscope size={18} className="text-violet-700" />
            ) : (
              <Users size={18} className="text-rx-primary" />
            )}
            {isDoctor ? "طابور الاستدعاء" : "متابعة الطابور"}
            {isFetching && !isLoading ? (
              <span className="text-xs font-normal text-rx-muted">
                تحديث...
              </span>
            ) : null}
          </CardTitle>

          {isDoctor ? (
            <Button
              size="sm"
              disabled={
                callNextMutation.isPending ||
                waitingList.length === 0
              }
              onClick={() => callNextMutation.mutate()}
            >
              <UserCheck size={14} />
              استدعاء التالي
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{appointments.length} موعد</Badge>
              <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                {waitingList.length} انتظار
              </Badge>
            </div>
          )}
        </div>

        {!isDoctor && calledPatients.length > 0 ? (
          <div className="mt-3 space-y-2">
            {calledPatients.map((ap) => (
              <div
                key={ap.id}
                className="flex animate-pulse items-center gap-2 rounded-xl border border-violet-300 bg-violet-100/80 px-3 py-2.5 text-sm text-violet-950"
              >
                <BellRing size={16} className="shrink-0" />
                <span>
                  <strong>{ap.patient?.name ?? "مريض"}</strong>
                  {" — "}
                  <span className="font-semibold">تم استدعاؤه من الطبيب</span>
                  {ap.updatedAt ? (
                    <span className="text-violet-800/80">
                      {" "}
                      · {formatTime(ap.updatedAt)}
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {!isDoctor ? (
          <p className="mt-2 text-xs text-rx-muted">
            تسجيل الوصول يصل المريض للانتظار. الاستدعاء من الطبيب.
          </p>
        ) : (
          <p className="mt-2 text-xs text-rx-muted">
            يمكنك تسجيل وصول المريض أو استدعائه من الانتظار.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-rx-muted">
            لا توجد مواعيد نشطة اليوم.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-4">
            {columns.map((status) => {
              const items = grouped.get(status) ?? [];
              const colors = VISIT_STATUS_COLORS[status];
              const columnLabel = isDoctor
                ? VISIT_STATUS_LABELS[status]
                : secretaryStatusLabel(status);

              return (
                <div
                  key={status}
                  className={cn(
                    "rounded-xl border p-2.5",
                    colors.border,
                    colors.bg,
                    status === "with_doctor" && !isDoctor && items.length > 0
                      ? "ring-2 ring-violet-400/60"
                      : ""
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <p className={cn("text-xs font-bold", colors.text)}>
                      {columnLabel}
                    </p>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                        colors.text,
                        "bg-white/70"
                      )}
                    >
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="py-4 text-center text-[11px] text-rx-muted">
                        —
                      </p>
                    ) : (
                      items.map((ap) => (
                        <QueueCard
                          key={ap.id}
                          appointment={ap}
                          role={role}
                          onAdvance={() => advanceMutation.mutate(ap.id)}
                          onCall={() => callPatientMutation.mutate(ap.id)}
                          onSelectPatient={onSelectPatient}
                          advancing={
                            advanceMutation.isPending ||
                            callPatientMutation.isPending
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QueueCard({
  appointment,
  role,
  onAdvance,
  onCall,
  onSelectPatient,
  advancing,
}: {
  appointment: AppointmentDto;
  role: "secretary" | "doctor";
  onAdvance: () => void;
  onCall: () => void;
  onSelectPatient?: (patientId: number) => void;
  advancing: boolean;
}) {
  const isDoctor = role === "doctor";
  const rawStatus = isVisitStatus(appointment.visitStatus)
    ? appointment.visitStatus
    : "scheduled";
  const status = normalizeQueueStatus(rawStatus);

  const nextMap = isDoctor
    ? DOCTOR_VISIT_STATUS_NEXT
    : SECRETARY_VISIT_STATUS_NEXT;
  const actionLabels = isDoctor
    ? DOCTOR_ACTION_LABELS
    : SECRETARY_ACTION_LABELS;

  const next = nextMap[status];
  const actionLabel = next ? actionLabels[status] : null;
  const colors = VISIT_STATUS_COLORS[status];
  const wait = formatWaitTime(appointment.checkedInAt);
  const called = status === "with_doctor";

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-2.5 shadow-sm",
        colors.border,
        called && !isDoctor && "ring-2 ring-violet-300"
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <button
            type="button"
            className="truncate text-right text-sm font-semibold text-rx-text hover:text-rx-primary"
            onClick={() => {
              if (appointment.patient && onSelectPatient && isDoctor) {
                onSelectPatient(appointment.patient.id);
              }
            }}
          >
            {appointment.patient?.name ?? "مريض"}
          </button>
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-rx-muted">
            <Clock size={10} />
            {formatTime(appointment.appointmentDatetime)}
            {appointment.patient ? (
              <>
                <span>·</span>
                {genderLabel(appointment.patient.gender as "male" | "female")}
              </>
            ) : null}
            {wait && status !== "scheduled" && status !== "done" ? (
              <>
                <span>·</span>
                <span>{wait}</span>
              </>
            ) : null}
          </p>
        </div>
        {called && !isDoctor ? (
          <Badge className="shrink-0 bg-violet-600 text-[10px] hover:bg-violet-600">
            تم الاستدعاء
          </Badge>
        ) : null}
      </div>

      {isDoctor && status === "waiting" ? (
        <Button
          size="sm"
          className="mt-2 h-7 w-full text-xs"
          disabled={advancing}
          onClick={onCall}
        >
          <UserCheck size={12} />
          استدعاء
        </Button>
      ) : null}

      {isDoctor && status === "scheduled" && actionLabel && next ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 w-full text-xs"
          disabled={advancing}
          onClick={onAdvance}
        >
          <ArrowLeft size={12} />
          {actionLabel}
        </Button>
      ) : null}

      {!isDoctor && actionLabel && next ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 w-full text-xs"
          disabled={advancing}
          onClick={onAdvance}
        >
          <ArrowLeft size={12} />
          {actionLabel}
        </Button>
      ) : null}

      {isDoctor && status === "with_doctor" && actionLabel ? (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 h-7 w-full text-xs"
          disabled={advancing}
          onClick={onAdvance}
        >
          <ChevronLeft size={12} />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
