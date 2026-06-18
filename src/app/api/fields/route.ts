import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { toDbId } from "@/lib/bigint";
import { patientFieldSchema } from "@/lib/validations/settings";
import {
  backfillFieldPositions,
  nextPrintableFieldPosition,
  serializePatientField,
} from "@/lib/patient-field-serializer";

export async function GET(req: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const url = new URL(req.url);
  const all = url.searchParams.get("all") === "1";

  await backfillFieldPositions(ctx.doctorId);

  const fields = await prisma.patientField.findMany({
    where: {
      doctorId: toDbId(ctx.doctorId),
      ...(all ? {} : { isActive: true }),
    },
    orderBy: { createdAt: "asc" },
  });

  return apiOk({ fields: fields.map(serializePatientField) });
}

export async function POST(req: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const body = await req.json();
  const parsed = patientFieldSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const isPrintableRecipeField =
    (parsed.data.isPrintable ?? false) && !(parsed.data.isPersonal ?? false);
  const position = isPrintableRecipeField
    ? await nextPrintableFieldPosition(ctx.doctorId)
    : null;

  const field = await prisma.patientField.create({
    data: {
      doctorId: toDbId(ctx.doctorId),
      name: parsed.data.name,
      size: parsed.data.size,
      isPersonal: parsed.data.isPersonal ?? false,
      isPrintable: parsed.data.isPrintable ?? false,
      ...(position
        ? { designX: position.designX, designY: position.designY }
        : {}),
    },
  });

  return apiOk({ field: serializePatientField(field) }, 201);
}
