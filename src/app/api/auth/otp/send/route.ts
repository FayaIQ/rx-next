import { z } from "zod";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { isOtpEnabled, sendOtp } from "@/lib/otp";
import { verifyUserCredentials } from "@/lib/auth-credentials";
import { getPhoneLookupVariants } from "@/lib/patient-utils";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  mode: z.enum(["signin", "signup"]),
  // signin only — OTP is sent after the password checks out, so wrong
  // passwords can't burn the phone's WhatsApp rate limit.
  password: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // No key configured → tell the client to use the password-only flow.
    if (!isOtpEnabled()) {
      return apiOk({ enabled: false });
    }

    if (data.mode === "signup") {
      const variants = getPhoneLookupVariants(data.phone);
      if (variants.length === 0) {
        return apiError("رقم الهاتف غير صالح");
      }
      const existing = await prisma.user.findFirst({
        where: { phoneNumber: { in: variants } },
        select: { id: true },
      });
      if (existing) {
        return apiError("رقم الهاتف مستخدم مسبقاً");
      }
    } else {
      if (!data.password) {
        return apiError("كلمة المرور مطلوبة");
      }
      const user = await verifyUserCredentials(data.phone, data.password);
      if (!user) {
        return apiError("بيانات الدخول غير صحيحة", 401);
      }
    }

    const result = await sendOtp(data.phone);
    if (!result.ok) {
      return apiError(result.error ?? "تعذر إرسال رمز التحقق", 502);
    }

    return apiOk({
      enabled: true,
      requestId: result.requestId,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
