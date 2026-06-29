import { fromDbId } from "@/lib/bigint";

export function serializePatientVisit(visit: {
  id: bigint;
  doctorId: bigint;
  patientId: bigint;
  visitDate: Date;
  summary: string | null;
  notes: string | null;
  appointmentId: bigint | null;
  prescriptionId: bigint | null;
  treatmentSessionId: bigint | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: fromDbId(visit.id),
    doctorId: fromDbId(visit.doctorId),
    patientId: fromDbId(visit.patientId),
    visitDate: visit.visitDate.toISOString().slice(0, 10),
    summary: visit.summary,
    notes: visit.notes,
    appointmentId: visit.appointmentId ? fromDbId(visit.appointmentId) : null,
    prescriptionId: visit.prescriptionId ? fromDbId(visit.prescriptionId) : null,
    treatmentSessionId: visit.treatmentSessionId
      ? fromDbId(visit.treatmentSessionId)
      : null,
    createdAt: visit.createdAt?.toISOString() ?? null,
    updatedAt: visit.updatedAt?.toISOString() ?? null,
  };
}

export type PatientVisitDto = ReturnType<typeof serializePatientVisit>;
