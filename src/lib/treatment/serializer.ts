import { fromDbId } from "@/lib/bigint";

export function serializeTreatmentSession(session: {
  id: bigint;
  planId: bigint;
  doctorId: bigint;
  patientId: bigint;
  sessionNumber: number;
  status: string;
  scheduledDate: Date | null;
  performedAt: Date | null;
  notes: string | null;
  appointmentId?: bigint | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: fromDbId(session.id),
    planId: fromDbId(session.planId),
    doctorId: fromDbId(session.doctorId),
    patientId: fromDbId(session.patientId),
    appointmentId: session.appointmentId ? fromDbId(session.appointmentId) : null,
    sessionNumber: session.sessionNumber,
    status: session.status,
    scheduledDate: session.scheduledDate
      ? session.scheduledDate.toISOString().slice(0, 10)
      : null,
    performedAt: session.performedAt?.toISOString() ?? null,
    notes: session.notes,
    createdAt: session.createdAt?.toISOString() ?? null,
    updatedAt: session.updatedAt?.toISOString() ?? null,
  };
}

export function serializeTreatmentPlan(plan: {
  id: bigint;
  doctorId: bigint;
  patientId: bigint;
  toothFdi: number;
  treatmentType: string;
  title: string | null;
  totalSessions: number | null;
  status: string;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  sessions?: Array<{
    id: bigint;
    planId: bigint;
    doctorId: bigint;
    patientId: bigint;
    sessionNumber: number;
    status: string;
    scheduledDate: Date | null;
    performedAt: Date | null;
    notes: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>;
}) {
  return {
    id: fromDbId(plan.id),
    doctorId: fromDbId(plan.doctorId),
    patientId: fromDbId(plan.patientId),
    toothFdi: plan.toothFdi,
    treatmentType: plan.treatmentType,
    title: plan.title,
    totalSessions: plan.totalSessions,
    status: plan.status,
    notes: plan.notes,
    createdAt: plan.createdAt?.toISOString() ?? null,
    updatedAt: plan.updatedAt?.toISOString() ?? null,
    sessions: plan.sessions
      ?.slice()
      .sort((a, b) => a.sessionNumber - b.sessionNumber)
      .map(serializeTreatmentSession),
  };
}

export type TreatmentPlanDto = ReturnType<typeof serializeTreatmentPlan>;
export type TreatmentSessionDto = ReturnType<typeof serializeTreatmentSession>;
