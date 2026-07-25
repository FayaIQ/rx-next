import { z } from "zod";
import { apiError, apiOk, apiServerError } from "@/lib/api/response";
import { resetPasswordWithToken } from "@/lib/password-reset";

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  resetToken: z.string().min(32, "رمز إعادة التعيين غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());
    const changed = await resetPasswordWithToken({
      phone: data.phone,
      token: data.resetToken,
      password: data.password,
    });
    if (!changed) {
      return apiError("انتهت جلسة إعادة التعيين — اطلب رمزاً جديداً", 401);
    }

    return apiOk({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
