import { z } from "zod";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import {
  createProofToken,
  isOtpEnabled,
  sendOtp,
  verifyProofToken,
} from "@/lib/otp";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { verifyUserCredentials } from "@/lib/auth-credentials";
import { getPhoneLookupVariants } from "@/lib/patient-utils";
import { prisma } from "@/lib/prisma";

const CAPTCHA_PROOF_TTL_MS = 15 * 60 * 1000;

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  mode: z.enum(["signin", "signup"]),
  // signin only — OTP is sent after the password checks out, so wrong
  // passwords can't burn the phone's WhatsApp rate limit.
  password: z.string().optional(),
  // Turnstile widget response (first send) or the captchaProof returned by a
  // previous send (resends — the widget token is single-use).
  turnstileToken: z.string().optional(),
  captchaProof: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    // No key configured → tell the client to use the password-only flow.
    if (!isOtpEnabled()) {
      return apiOk({ enabled: false });
    }

    if (isTurnstileEnabled()) {
      const human =
        (await verifyProofToken("captcha", data.phone, data.captchaProof)) ||
        (await verifyTurnstileToken(data.turnstileToken));
      if (!human) {
        return apiError("أكمل التحقق من أنك لست روبوتاً", 401);
      }
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
      // Lets the client resend without solving the captcha again.
      ...(isTurnstileEnabled()
        ? {
            captchaProof: await createProofToken(
              "captcha",
              data.phone,
              CAPTCHA_PROOF_TTL_MS
            ),
          }
        : {}),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(error.issues[0]?.message ?? "بيانات غير صالحة");
    }
    return apiServerError(undefined, error);
  }
}
