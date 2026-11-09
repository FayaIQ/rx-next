import { requireClinicApi, isClinicApiError } from "@/lib/api/clinic-auth";
import { listLegacyBatches } from "@/lib/legacy-import/read";
import { apiOk } from "@/lib/api/response";

export async function GET() {
  const ctx = await requireClinicApi();
  if (isClinicApiError(ctx)) return ctx;
  const response = apiOk({ batches: await listLegacyBatches(ctx.doctorId) });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
