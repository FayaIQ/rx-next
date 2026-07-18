import { prisma } from "@/lib/prisma";
import { requireAdminApi, isAdminApiError } from "@/lib/api/admin-auth";
import { apiOk, apiError, apiNotFound } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";
import {
  CLINIC_FEATURE_KEYS,
  listClinicFeatures,
  setClinicFeatureEnabled,
  ensureClinicFeaturesReady,
  type ClinicFeatureKey,
} from "@/lib/clinic-features";

export async function GET(req: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  await ensureClinicFeaturesReady();

  const doctorIdParam = new URL(req.url).searchParams.get("doctorId");
  if (!doctorIdParam) {
    const doctors = await prisma.user.findMany({
      where: { type: "doctor" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
      },
    });
    return apiOk({
      doctors: doctors.map((d) => ({
        id: fromDbId(d.id),
        name: d.name,
        phoneNumber: d.phoneNumber,
      })),
    });
  }

  const doctorId = Number(doctorIdParam);
  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return apiError("معرّف الطبيب غير صالح");
  }

  const doctor = await prisma.user.findFirst({
    where: { id: toDbId(doctorId), type: "doctor" },
    select: { id: true, name: true, phoneNumber: true },
  });
  if (!doctor) return apiNotFound("الطبيب غير موجود");

  const features = await listClinicFeatures(doctorId);
  return apiOk({
    doctor: {
      id: fromDbId(doctor.id),
      name: doctor.name,
      phoneNumber: doctor.phoneNumber,
    },
    features,
  });
}

export async function PATCH(req: Request) {
  const ctx = await requireAdminApi();
  if (isAdminApiError(ctx)) return ctx;

  const body = await req.json();
  const doctorId = Number(body?.doctorId);
  const key = body?.key as string | undefined;
  const enabled = body?.enabled;

  if (!Number.isFinite(doctorId) || doctorId <= 0) {
    return apiError("معرّف الطبيب غير صالح");
  }
  if (!key || !CLINIC_FEATURE_KEYS.includes(key as ClinicFeatureKey)) {
    return apiError("مفتاح الميزة غير صالح");
  }
  if (typeof enabled !== "boolean") {
    return apiError("حالة التفعيل غير صالحة");
  }

  const doctor = await prisma.user.findFirst({
    where: { id: toDbId(doctorId), type: "doctor" },
    select: { id: true },
  });
  if (!doctor) return apiNotFound("الطبيب غير موجود");

  await ensureClinicFeaturesReady();
  await setClinicFeatureEnabled(doctorId, key as ClinicFeatureKey, enabled);
  const features = await listClinicFeatures(doctorId);
  return apiOk({ features });
}
