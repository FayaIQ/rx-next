import { z } from "zod";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { createOtpToken, isOtpEnabled, verifyOtp } from "@/lib/otp";

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  code: z
    .string()
    .trim()
    .min(4, "الرمز غير صحيح")
    .max(8, "الرمز غير صحيح"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (!isOtpEnabled()) {
      return apiError("خدمة التحقق غير مفعّلة", 503);
    }

    const result = await verifyOtp(data.phone, data.code);
    if (!result.valid) {
      return apiError(result.error ?? "فشل التحقق من الرمز", 401);
    }

    // Single-use CFlow code → short-lived proof token the register/signin
    // endpoints can both accept.
    return apiOk({ valid: true, otpToken: await createOtpToken(data.phone) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
