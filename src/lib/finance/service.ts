import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { serializeFinanceSettings } from "./serializer";

export async function getOrCreateFinanceSettings(doctorId: number) {
  const doctorDbId = toDbId(doctorId);
  const row = await prisma.clinicFinanceSettings.upsert({
    where: { doctorId: doctorDbId },
    create: { doctorId: doctorDbId },
    update: {},
  });
  return serializeFinanceSettings(row);
}
