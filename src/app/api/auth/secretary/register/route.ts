import { z } from "zod";
import { registerSecretary } from "@/lib/auth-credentials";
import { fromDbId } from "@/lib/bigint";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { isOtpEnabled, verifyOtpToken } from "@/lib/otp";

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  otpToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (isOtpEnabled() && !(await verifyOtpToken(data.phone, data.otpToken))) {
      return apiError("يجب التحقق من رقم الهاتف أولاً", 401);
    }

    const user = await registerSecretary(data);

    return apiOk({
      success: true,
      user: {
        id: fromDbId(user.id),
        name: user.name,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    if (error instanceof Error) {
      return apiError(error.message);
    }
    return apiServerError(undefined, error);
  }
}
