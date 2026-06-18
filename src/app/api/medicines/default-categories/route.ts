import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import { fromDbId } from "@/lib/bigint";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const categories = await prisma.defaultMedicineCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { default_medicines: true } } },
  });

  return apiOk({
    categories: categories.map((c) => ({
      id: fromDbId(c.id),
      name: c.name,
      medicinesCount: c._count.default_medicines,
    })),
  });
}
