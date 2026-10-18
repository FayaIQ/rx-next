import { apiError } from "@/lib/api/response";

export async function POST() {
  return apiError("التسجيل لا يتطلب رمز تحقق", 410);
}
