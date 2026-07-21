import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { medicineSchema } from "@/lib/validations/rx";
import { toDbId, fromDbId } from "@/lib/bigint";
import { emptyMed } from "@/lib/prescription-service";
import {
  buildPaginationMeta,
  parsePaginationParams,
} from "@/lib/pagination";
import { z } from "zod";

function serializeMedicine(medicine: {
  id: bigint | number;
  doctorId: bigint | number;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}) {
  return {
    id: fromDbId(medicine.id),
    doctorId: fromDbId(medicine.doctorId),
    name: medicine.name,
    type: medicine.type || null,
    dosage: medicine.dosage || null,
    quantity: medicine.quantity || null,
    period: medicine.period || null,
    timeOfUse: medicine.timeOfUse || null,
    createdAt: medicine.createdAt?.toISOString() ?? null,
    updatedAt: medicine.updatedAt?.toISOString() ?? null,
  };
}

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const { page, pageSize, skip } = parsePaginationParams(searchParams);

  const where = {
    doctorId: toDbId(ctx.doctorId),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    prisma.medicine.count({ where }),
  ]);

  return apiOk({
    medicines: medicines.map(serializeMedicine),
    pagination: buildPaginationMeta(page, pageSize, total),
  });
}

export async function POST(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  try {
    const body = await request.json();
    const data = medicineSchema.parse(body);

    const medicine = await prisma.medicine.create({
      data: {
        doctorId: toDbId(ctx.doctorId),
        name: data.name,
        type: data.type ?? emptyMed.type,
        dosage: data.dosage ?? emptyMed.dosage,
        quantity: data.quantity ?? emptyMed.quantity,
        period: data.period ?? emptyMed.period,
        timeOfUse: data.timeOfUse ?? emptyMed.timeOfUse,
      },
    });

    return apiOk({ medicine: serializeMedicine(medicine) }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
