import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiNotFound } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { emptyMed } from "@/lib/prescription-service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { id } = await params;
  const categoryId = toDbId(id);

  const category = await prisma.defaultMedicineCategory.findUnique({
    where: { id: categoryId },
    include: { default_medicines: true },
  });
  if (!category) return apiNotFound("التصنيف غير موجود");

  const existing = await prisma.medicine.findMany({
    where: { doctorId: toDbId(ctx.doctorId) },
    select: { name: true, type: true, dosage: true },
  });
  const existingKeys = new Set(
    existing.map((m) => `${m.name}|${m.type}|${m.dosage}`)
  );

  const toAdd = category.default_medicines.filter(
    (m) => !existingKeys.has(`${m.name}|${m.type ?? ""}|${m.dosage ?? ""}`)
  );

  if (toAdd.length > 0) {
    await prisma.medicine.createMany({
      data: toAdd.map((m) => ({
        doctorId: toDbId(ctx.doctorId),
        name: m.name,
        type: m.type ?? emptyMed.type,
        dosage: m.dosage ?? emptyMed.dosage,
        quantity: m.quantity ?? emptyMed.quantity,
        period: m.period ?? emptyMed.period,
        timeOfUse: m.time_of_use ?? emptyMed.timeOfUse,
      })),
    });
  }

  return apiOk({ added: toAdd.length });
}
