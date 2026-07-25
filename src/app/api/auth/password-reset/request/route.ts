import { z } from "zod";
import { apiError, apiOk, apiServerError } from "@/lib/api/response";
import {
  createProofToken,
  isOtpEnabled,
  sendOtp,
  verifyProofToken,
} from "@/lib/otp";
import { passwordResetUserExists } from "@/lib/password-reset";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

const CAPTCHA_PROOF_TTL_MS = 15 * 60 * 1000;

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  turnstileToken: z.string().optional(),
  captchaProof: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const data = schema.parse(await request.json());

    if (!isOtpEnabled()) {
      return apiError("خدمة استعادة كلمة المرور غير مفعّلة", 503);
    }

    if (isTurnstileEnabled()) {
      const human =
        (await verifyProofToken("captcha", data.phone, data.captchaProof)) ||
        (await verifyTurnstileToken(data.turnstileToken));
      if (!human) {
        return apiError("أكمل التحقق من أنك لست روبوتاً", 401);
      }
    }

    const userExists = await passwordResetUserExists(data.phone);
    if (userExists) {
      const result = await sendOtp(data.phone);
      if (!result.ok) {
        console.error("[password-reset] CFlow send failed", {
          status: result.status,
          code: result.upstreamCode,
          traceId: result.requestTraceId,
          transport: result.transportError,
        });
        const status =
          result.status === 429
            ? 429
            : result.status === 401 || result.status === 403
              ? 503
              : 502;
        return apiError(
          result.error ?? "تعذر إرسال رمز إعادة التعيين",
          status
        );
      }
    }

    return apiOk({
      sent: true,
      // Keep the response identical when the phone is not registered.
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
