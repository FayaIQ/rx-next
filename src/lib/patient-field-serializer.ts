import { prisma } from "@/lib/prisma";
import { fromDbId, toDbId } from "@/lib/bigint";
import { defaultFieldPosition } from "@/lib/patient-field-layout";
import type { Decimal } from "@prisma/client/runtime/library";

function dec(v: Decimal | null | undefined): number | null {
  return v == null ? null : Number(v);
}

export function serializePatientField(f: {
  id: bigint;
  name: string;
  size: string;
  isActive: boolean;
  isPrintable: boolean;
  isPersonal: boolean;
  designX?: Decimal | null;
  designY?: Decimal | null;
}) {
  return {
    id: fromDbId(f.id),
    name: f.name,
    size: f.size as "larg" | "medium" | "small",
    isActive: f.isActive,
    isPrintable: f.isPrintable,
    isPersonal: f.isPersonal,
    designX: dec(f.designX),
    designY: dec(f.designY),
  };
}

/** Assign default positions to printable recipe fields missing coordinates */
export async function backfillFieldPositions(doctorId: number) {
  const doctorDbId = toDbId(doctorId);
  const missingCount = await prisma.patientField.count({
    where: {
      doctorId: doctorDbId,
      isActive: true,
      isPersonal: false,
      isPrintable: true,
      OR: [{ designX: null }, { designY: null }],
    },
  });
  if (missingCount === 0) return;

  const fields = await prisma.patientField.findMany({
    where: {
      doctorId: doctorDbId,
      isActive: true,
      isPersonal: false,
      isPrintable: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let index = 0;
  for (const field of fields) {
    const row = field as { designX?: Decimal | null; designY?: Decimal | null };

    if (row.designX != null && row.designY != null) {
      index += 1;
      continue;
    }

    const pos = defaultFieldPosition(index);
    try {
      await prisma.patientField.update({
        where: { id: field.id },
        data: { designX: pos.designX, designY: pos.designY },
      });
    } catch {
      // DB or Prisma client may not have design_x/design_y yet — skip backfill.
      return;
    }
    index += 1;
  }
}

export async function nextPrintableFieldPosition(doctorId: number) {
  const count = await prisma.patientField.count({
    where: {
      doctorId: toDbId(doctorId),
      isActive: true,
      isPersonal: false,
      isPrintable: true,
    },
  });
  return defaultFieldPosition(count);
}
