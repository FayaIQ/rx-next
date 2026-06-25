import { fromDbId } from "@/lib/bigint";

export function serializeDentalChart(chart: {
  id: bigint;
  patientId: bigint;
  doctorId: bigint;
  notes: string | null;
  updatedAt: Date | null;
  teeth: Array<{
    toothFdi: number;
    status: string;
    notes: string | null;
    updatedAt: Date | null;
  }>;
}) {
  return {
    id: fromDbId(chart.id),
    patientId: fromDbId(chart.patientId),
    doctorId: fromDbId(chart.doctorId),
    notes: chart.notes,
    updatedAt: chart.updatedAt?.toISOString() ?? null,
    teeth: chart.teeth.map((t) => ({
      toothFdi: t.toothFdi,
      status: t.status,
      notes: t.notes,
      updatedAt: t.updatedAt?.toISOString() ?? null,
    })),
  };
}

export type DentalChartDto = ReturnType<typeof serializeDentalChart>;
