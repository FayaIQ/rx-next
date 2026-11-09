import { sessionBalance, treatmentSessionBalance } from "@/lib/finance/session-balance";
import { fromDbId } from "@/lib/bigint";
import { treatmentPlanTeeth } from "@/lib/treatment/plan-teeth";

export function serializeTreatmentSession(session: {
  plan?: Parameters<typeof treatmentSessionBalance>[0]["plan"];
  fee?: number | { toString(): string } | null;
  currency?: string;
  payments?: Array<{ amount: number | { toString(): string } }>;
  id: bigint;
  planId: bigint;
  doctorId: bigint;
  patientId: bigint;
  sessionNumber: number;
  status: string;
  scheduledDate: Date | null;
  scheduledTime?: string | null;
  performedAt: Date | null;
  notes: string | null;
  appointmentId?: bigint | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    billing: treatmentSessionBalance(session),
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
    scheduledTime: session.scheduledTime ?? null,
    notes: session.notes,
    createdAt: session.createdAt?.toISOString() ?? null,
    updatedAt: session.updatedAt?.toISOString() ?? null,
  };
}

export function serializeTreatmentPlan(plan: {
  toothFdis?: number[];
  pricingMode?: string;
  fee?: Parameters<typeof sessionBalance>[0]["fee"];
  currency?: string;
  payments?: Parameters<typeof sessionBalance>[0]["payments"];
  id: bigint;
  doctorId: bigint;
  patientId: bigint;
  toothFdi: number | null;
  treatmentType: string;
  title: string | null;
  totalSessions: number | null;
  status: string;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  sessions?: Array<Parameters<typeof serializeTreatmentSession>[0]>;
}) {
  return {
    pricingMode: plan.pricingMode ?? "per_session",
    billing: plan.pricingMode === "plan" ? { ...sessionBalance(plan), scope: "plan" as const } : undefined,
    id: fromDbId(plan.id),
    doctorId: fromDbId(plan.doctorId),
    patientId: fromDbId(plan.patientId),
    toothFdi: plan.toothFdi,
    toothFdis: treatmentPlanTeeth(plan),
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
      .map(session => serializeTreatmentSession({ ...session, plan })),
  };
}

export type TreatmentPlanDto = ReturnType<typeof serializeTreatmentPlan>;
export type TreatmentSessionDto = ReturnType<typeof serializeTreatmentSession>;
