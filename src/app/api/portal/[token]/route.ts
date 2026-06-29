import { apiOk, apiNotFound } from "@/lib/api/response";
import { loadPatientPortalByToken } from "@/lib/portal/patient-portal";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const data = await loadPatientPortalByToken(token);
  if (!data) return apiNotFound("الرابط غير صالح أو منتهي");
  return apiOk(data);
}
