import type { AppointmentDto } from "@/lib/api/rx-client";
import { getRxDb, type LocalAppointment } from "@/lib/db/rx-db";
import {
  type VisitStatus,
  DOCTOR_VISIT_STATUS_NEXT,
  SECRETARY_VISIT_STATUS_NEXT,
  isVisitStatus,
} from "@/lib/visit-queue/constants";
import {
  enqueueSyncItem,
  getLocalAppointments,
  syncLocalAppointmentFromDto,
} from "@/lib/sync/offline-store";
import { processSyncQueue } from "@/lib/sync/sync-engine";

function localAppointmentToDto(
  row: LocalAppointment,
  patient?: AppointmentDto["patient"]
): AppointmentDto {
  return {
    id: row.serverId ?? 0,
    doctorId: row.doctorId,
    patientId: row.patientServerId ?? 0,
    appointmentDatetime: row.appointmentDatetime,
    bookingDate: row.bookingDate,
    notes: row.notes ?? null,
    status: row.status,
    visitStatus: row.visitStatus ?? "scheduled",
    checkedInAt: row.checkedInAt ?? null,
    createdAt: row.updatedAt,
    updatedAt: row.updatedAt,
    patient,
  };
}

async function findLocalAppointment(
  id: number
): Promise<LocalAppointment | undefined> {
  const db = getRxDb();
  return (
    (await db.appointments.get(`srv-${id}`)) ??
    (await db.appointments.filter((a) => a.serverId === id).first())
  );
}

async function applyVisitStatusLocally(
  row: LocalAppointment,
  visitStatus: VisitStatus
): Promise<LocalAppointment> {
  const db = getRxDb();
  const now = new Date().toISOString();
  const checkedInAt =
    visitStatus !== "scheduled" &&
    visitStatus !== "done" &&
    !row.checkedInAt
      ? now
      : row.checkedInAt ?? null;

  const updated: LocalAppointment = {
    ...row,
    visitStatus,
    checkedInAt,
    synced: false,
    updatedAt: now,
  };
  await db.appointments.put(updated);
  return updated;
}

async function enqueueVisitStatusSync(
  row: LocalAppointment,
  visitStatus: VisitStatus
) {
  if (!row.serverId) return;
  await enqueueSyncItem({
    entity: "appointment",
    action: "visit_status",
    payload: { visitStatus },
    localId: row.id,
    serverId: row.serverId,
  });
}

export async function updateVisitStatusOffline(
  appointmentId: number,
  visitStatus: VisitStatus
): Promise<{ appointment: AppointmentDto }> {
  const existing = await findLocalAppointment(appointmentId);
  if (!existing) throw new Error("الموعد غير موجود");

  const db = getRxDb();

  if (visitStatus === "with_doctor") {
    const dayKey = (existing.bookingDate ?? existing.appointmentDatetime).slice(
      0,
      10
    );
    const sameDay = await db.appointments
      .filter(
        (a) =>
          (a.bookingDate ?? a.appointmentDatetime).slice(0, 10) === dayKey &&
          a.visitStatus === "with_doctor" &&
          a.id !== existing.id
      )
      .toArray();
    for (const other of sameDay) {
      await applyVisitStatusLocally(other, "done");
      await enqueueVisitStatusSync(other, "done");
    }
  }

  const updated = await applyVisitStatusLocally(existing, visitStatus);

  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/visit-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitStatus }),
      });
      const data = await res.json();
      if (res.ok && data.appointment) {
        await syncLocalAppointmentFromDto(data.appointment);
        return { appointment: data.appointment };
      }
    } catch {
      // fall through to queue
    }
  }

  await enqueueVisitStatusSync(updated, visitStatus);
  void processSyncQueue();

  const all = await getLocalAppointments();
  const dto =
    all.find((a) => a.id === appointmentId) ??
    localAppointmentToDto(updated);
  return { appointment: dto };
}

export async function advanceVisitOffline(
  appointmentId: number,
  role: "doctor" | "secretary"
): Promise<{ appointment: AppointmentDto }> {
  const existing = await findLocalAppointment(appointmentId);
  if (!existing) throw new Error("الموعد غير موجود");

  const current = isVisitStatus(existing.visitStatus ?? "scheduled")
    ? existing.visitStatus!
    : "scheduled";
  const nextMap =
    role === "secretary"
      ? SECRETARY_VISIT_STATUS_NEXT
      : DOCTOR_VISIT_STATUS_NEXT;
  const next = nextMap[current as VisitStatus];
  if (!next) throw new Error("لا يمكن تقديم حالة هذا الموعد");

  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/advance-visit`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.appointment) {
        await syncLocalAppointmentFromDto(data.appointment);
        return { appointment: data.appointment };
      }
    } catch {
      // fall through to local
    }
  }

  return updateVisitStatusOffline(appointmentId, next);
}

export async function callNextOffline(
  date: string
): Promise<{ appointment: AppointmentDto | null; message?: string }> {
  if (navigator.onLine) {
    try {
      const res = await fetch("/api/appointments/queue/call-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(date ? { date } : {}),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.appointment) {
          await syncLocalAppointmentFromDto(data.appointment);
        }
        return {
          appointment: data.appointment ?? null,
          message: data.message ?? undefined,
        };
      }
    } catch {
      // fall through
    }
  }

  const db = getRxDb();
  const withDoctor = await db.appointments
    .filter(
      (a) =>
        (a.bookingDate ?? a.appointmentDatetime).slice(0, 10) === date &&
        a.visitStatus === "with_doctor"
    )
    .toArray();

  for (const row of withDoctor) {
    await applyVisitStatusLocally(row, "done");
    await enqueueVisitStatusSync(row, "done");
  }

  const waiting = (
    await db.appointments
      .filter(
        (a) =>
          (a.bookingDate ?? a.appointmentDatetime).slice(0, 10) === date &&
          a.status &&
          a.visitStatus === "waiting"
      )
      .toArray()
  ).sort((a, b) => {
    const ta = a.checkedInAt ?? a.appointmentDatetime;
    const tb = b.checkedInAt ?? b.appointmentDatetime;
    return ta.localeCompare(tb);
  });

  const next = waiting[0];
  if (!next) {
    void processSyncQueue();
    return { appointment: null, message: "لا يوجد مرضى في الانتظار" };
  }

  if (!next.serverId) {
    const updated = await applyVisitStatusLocally(next, "with_doctor");
    void processSyncQueue();
    const all = await getLocalAppointments(date);
    const dto = all.find((a) => a.id === 0) ?? localAppointmentToDto(updated);
    return { appointment: dto };
  }

  const { appointment } = await updateVisitStatusOffline(next.serverId, "with_doctor");
  return { appointment: appointment.id ? appointment : null };
}

/** Cache server appointments into IndexedDB after an online fetch. */
export async function cacheAppointmentsFromServer(
  appointments: import("@/lib/api/rx-client").AppointmentDto[]
) {
  for (const ap of appointments) {
    await syncLocalAppointmentFromDto(ap);
  }
}
