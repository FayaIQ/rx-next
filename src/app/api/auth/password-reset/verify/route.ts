import { z } from "zod";
import { apiError, apiOk, apiServerError } from "@/lib/api/response";
import { isOtpEnabled, verifyOtp } from "@/lib/otp";
import {
  createPasswordResetToken,
  passwordResetUserExists,
} from "@/lib/password-reset";

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
    const data = schema.parse(await request.json());

    if (!isOtpEnabled()) {
      return apiError("خدمة استعادة كلمة المرور غير مفعّلة", 503);
    }

    const result = await verifyOtp(data.phone, data.code);
    if (!result.valid || !(await passwordResetUserExists(data.phone))) {
      return apiError(result.error ?? "الرمز غير صحيح أو منتهي الصلاحية", 401);
    }

    const resetToken = await createPasswordResetToken(data.phone);
    return apiOk({ verified: true, resetToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
