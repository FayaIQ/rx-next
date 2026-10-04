import type { Prisma } from "@prisma/client";

type ManualVisitData = {
  doctorId: bigint;
  patientId: bigint;
  visitDate: Date;
  summary: string | null;
  notes: string | null;
  clientRequestId?: string;
};

export class VisitRequestConflictError extends Error {
  constructor() {
    super("تم حفظ هذا الطلب سابقاً ببيانات مختلفة. حدّث سجل الزيارات قبل إضافة زيارة جديدة.");
  }
}

export async function createManualVisit(
  tx: Pick<Prisma.TransactionClient, "patientVisit">,
  data: ManualVisitData
) {
  if (!data.clientRequestId) {
    return tx.patientVisit.create({ data });
  }

  // The unique index also covers simultaneous requests. Keep the first save's
  // clinical notes when a request is replayed, rather than overwriting them.
  await tx.patientVisit.createMany({ data: [data], skipDuplicates: true });
  const visit = await tx.patientVisit.findUniqueOrThrow({
    where: {
      doctorId_patientId_clientRequestId: {
        doctorId: data.doctorId,
        patientId: data.patientId,
        clientRequestId: data.clientRequestId,
      },
    },
  });
  if (
    visit.visitDate.toISOString().slice(0, 10) !== data.visitDate.toISOString().slice(0, 10) ||
    visit.summary !== data.summary || visit.notes !== data.notes
  ) {
    throw new VisitRequestConflictError();
  }
  return visit;
}
