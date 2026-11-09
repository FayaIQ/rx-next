import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { apiError, apiNotFound, apiOk } from "@/lib/api/response";
import { getLegacyBatch, readLegacyRecords } from "@/lib/legacy-import/read";
import { LEGACY_ENTITIES, type ArchiveState, type LegacyEntity } from "@/lib/legacy-import/types";
import { reviewLabels } from "@/lib/legacy-import/labels";

const validId = (s: string) => /^[1-9]\d{0,18}$/.test(s) && BigInt(s) <= 9223372036854775807n;

export async function GET(request: Request, context: { params: Promise<{ batchId: string }> }) {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const { batchId } = await context.params;
  const params = new URL(request.url).searchParams;
  const patientId = params.get("patient") || undefined;
  const entity = params.get("entity") || undefined;
  const state = params.get("state") || undefined;
  const reason = params.get("reason") || undefined;
  const year = params.get("year") ? Number(params.get("year")) : undefined;
  if (!validId(batchId) || (patientId && !validId(patientId)) ||
    (entity && entity !== "Prescriptions" && !LEGACY_ENTITIES.includes(entity as LegacyEntity)) ||
    (state && !["ready", "review", "excluded"].includes(state)) ||
    (reason && !Object.hasOwn(reviewLabels, reason)) ||
    (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 9998))) return apiError("طلب غير صالح");
  if (!(await getLegacyBatch(ctx.doctorId, batchId))) return apiNotFound();
  const page = Math.min(100000, Math.max(1, Number(params.get("page")) || 1));
  const result = await readLegacyRecords(ctx.doctorId, batchId, {
    entity: entity === "Prescriptions" ? "Visits" : entity as LegacyEntity | undefined, withMedicines: entity === "Prescriptions", year, patientId, state: state as ArchiveState | undefined,
    q: params.get("q")?.trim().slice(0, 150), reason, page: Math.floor(page), pageSize: 25,
  });
  if (patientId && !result.patient) return apiNotFound();
  const response = apiOk(result);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
