"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import {
  ChevronLeft,
  ListOrdered,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { type AppointmentDto } from "@/lib/api/rx-client";
import { fetchAppointmentsOfflineFirst } from "@/lib/data/offline-api";
import {
  callNextOffline,
  updateVisitStatusOffline,
} from "@/lib/sync/visit-queue-offline";
import {
  type VisitStatus,
  isVisitStatus,
  isWaitingInQueue,
  normalizeQueueStatus,
  visitStatusSortOrder,
} from "@/lib/visit-queue/constants";
import { cn } from "@/lib/utils";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Props = {
  onSelectPatient?: (patientId: number) => void;
};

export function DoctorQueuePanel({ onSelectPatient }: Props) {
  const queryClient = useQueryClient();
  const day = todayKey();

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-queue", day],
    queryFn: async () => {
      const appointments = await fetchAppointmentsOfflineFirst({
        date: day,
        status: "active",
      });
      return { appointments };
    },
    refetchInterval: navigator.onLine ? 10_000 : false,
  });

  const appointments = data?.appointments ?? [];

  const { current, waiting } = useMemo(() => {
    const currentAp = appointments.find((a) => a.visitStatus === "with_doctor");

    const waitingList = appointments
      .filter((a) => {
        const s = isVisitStatus(a.visitStatus) ? a.visitStatus : "scheduled";
        return isWaitingInQueue(s);
      })
      .sort((a, b) => {
        const sa = normalizeQueueStatus(
          (isVisitStatus(a.visitStatus)
            ? a.visitStatus
            : "scheduled") as VisitStatus
        );
        const sb = normalizeQueueStatus(
          (isVisitStatus(b.visitStatus)
            ? b.visitStatus
            : "scheduled") as VisitStatus
        );
        const orderDiff = visitStatusSortOrder(sa) - visitStatusSortOrder(sb);
        if (orderDiff !== 0) return orderDiff;
        const ta = a.checkedInAt ?? a.appointmentDatetime;
        const tb = b.checkedInAt ?? b.appointmentDatetime;
        return ta.localeCompare(tb);
      });

    return {
      current: currentAp ?? null,
      waiting: waitingList,
    };
  }, [appointments]);

  const callNextMutation = useMutation({
    mutationFn: () => callNextOffline(day),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
      if (res.appointment?.patient && onSelectPatient) {
        onSelectPatient(res.appointment.patient.id);
      }
      if (res.appointment) {
        toast.success(`تم استدعاء ${res.appointment.patient?.name ?? "المريض"}`);
      } else {
        toast.info(res.message ?? "لا يوجد مرضى في الانتظار");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const finishMutation = useMutation({
    mutationFn: (id: number) => updateVisitStatusOffline(id, "done"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-queue"] });
      queryClient.invalidateQueries({ queryKey: ["waiting-room"] });
      toast.success("انتهت الزيارة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || appointments.length === 0) return null;

  const hasQueueActivity = current || waiting.length > 0;
  if (!hasQueueActivity) return null;

  return (
    <div
      className={cn(
        "mb-2 flex min-w-0 items-center gap-1.5 overflow-x-auto rounded-full border border-violet-200/90",
        "bg-gradient-to-l from-violet-50/95 via-white to-sky-50/80 px-2 py-1.5 shadow-sm",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      )}
    >
      <Link
        href="/queue"
        className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100/80"
      >
        <Users size={13} />
        <span className="hidden sm:inline">الطابور</span>
      </Link>

      <span className="h-4 w-px shrink-0 bg-violet-200" aria-hidden />

      {current ? (
        <>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-violet-100/90 px-2.5 py-1">
            <Stethoscope size={12} className="text-violet-700" />
            <button
              type="button"
              className="max-w-[8rem] truncate text-xs font-bold text-violet-950 sm:max-w-[10rem]"
              onClick={() => {
                if (current.patient && onSelectPatient) {
                  onSelectPatient(current.patient.id);
                }
              }}
            >
              {current.patient?.name ?? "مريض"}
            </button>
            <button
              type="button"
              className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-violet-800 hover:bg-white"
              disabled={finishMutation.isPending}
              onClick={() => finishMutation.mutate(current.id)}
            >
              انتهى
            </button>
          </div>
          {waiting.length > 0 ? (
            <span className="h-4 w-px shrink-0 bg-violet-200" aria-hidden />
          ) : null}
        </>
      ) : null}

      {waiting.length > 0 ? (
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 text-[10px] font-medium text-amber-800">
            {waiting.length} انتظار
          </span>
          {waiting.slice(0, 6).map((ap, i) => (
            <WaitingCapsuleChip
              key={ap.id}
              appointment={ap}
              index={i + 1}
              onSelect={onSelectPatient}
            />
          ))}
          {waiting.length > 6 ? (
            <span className="shrink-0 text-[10px] text-rx-muted">
              +{waiting.length - 6}
            </span>
          ) : null}
        </div>
      ) : !current ? (
        <span className="shrink-0 text-xs text-rx-muted">لا أحد في الانتظار</span>
      ) : null}

      <span className="ms-auto h-4 w-px shrink-0 bg-violet-200" aria-hidden />

      <Button
        size="sm"
        className="h-7 shrink-0 rounded-full px-2.5 text-xs"
        disabled={callNextMutation.isPending || waiting.length === 0}
        onClick={() => callNextMutation.mutate()}
      >
        <UserCheck size={13} />
        <span className="hidden sm:inline">استدعاء</span>
        <ChevronLeft size={12} className="sm:hidden" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0 rounded-full p-0 text-violet-700"
        asChild
      >
        <Link href="/queue" title="فتح الطابور">
          <ListOrdered size={14} />
        </Link>
      </Button>
    </div>
  );
}

function WaitingCapsuleChip({
  appointment,
  index,
  onSelect,
}: {
  appointment: AppointmentDto;
  index: number;
  onSelect?: (patientId: number) => void;
}) {
  return (
    <button
      type="button"
      className="shrink-0 rounded-full border border-amber-200/90 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-950 transition hover:bg-amber-100"
      onClick={() => {
        if (appointment.patient && onSelect) {
          onSelect(appointment.patient.id);
        }
      }}
    >
      <span className="font-mono opacity-50">{index}.</span>{" "}
      {appointment.patient?.name ?? "مريض"}
    </button>
  );
}
