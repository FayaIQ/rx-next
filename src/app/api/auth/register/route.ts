import { z } from "zod";
import { registerDoctor, authenticateUser } from "@/lib/auth-credentials";
import { fromDbId } from "@/lib/bigint";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { isOtpEnabled, verifyOtpToken } from "@/lib/otp";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  practiceType: z.enum(["general", "dental"], {
    message: "اختر نوع العيادة",
  }),
  otpToken: z.string().optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (isOtpEnabled()) {
      if (!(await verifyOtpToken(data.phone, data.otpToken))) {
        return apiError("يجب التحقق من رقم الهاتف أولاً", 401);
      }
    } else if (
      isTurnstileEnabled() &&
      !(await verifyTurnstileToken(data.turnstileToken))
    ) {
      // Password-only flow — the captcha token wasn't consumed by /otp/send.
      return apiError("أكمل التحقق من أنك لست روبوتاً", 401);
    }

    const user = await registerDoctor(data);

    const authUser = await authenticateUser(data.phone, data.password);
    if (!authUser) {
      return apiServerError("فشل إنشاء الحساب");
    }

    return apiOk(
      {
        success: true,
        user: {
          id: fromDbId(user.id),
          name: user.name,
          phoneNumber: user.phoneNumber,
          practiceType: data.practiceType,
        },
      },
      201
    );
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
