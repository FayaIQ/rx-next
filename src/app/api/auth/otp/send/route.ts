import { z } from "zod";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import {
  createProofToken,
  isOtpEnabled,
  sendOtp,
  verifyProofToken,
} from "@/lib/otp";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { getPhoneLookupVariants } from "@/lib/patient-utils";
import { prisma } from "@/lib/prisma";
import { isDevTestDoctorPhone } from "@/lib/dev-test-doctor";

const CAPTCHA_PROOF_TTL_MS = 15 * 60 * 1000;

const schema = z.object({
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  mode: z.literal("signup"),
  // Turnstile widget response (first send) or the captchaProof returned by a
  // previous send (resends — the widget token is single-use).
  turnstileToken: z.string().optional(),
  captchaProof: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    if (isDevTestDoctorPhone(data.phone)) {
      return apiOk({ enabled: false, testDoctor: true });
    }

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

    const result = await sendOtp(data.phone);
    if (!result.ok) {
      console.error("[otp] CFlow send failed", {
        status: result.status,
        code: result.upstreamCode,
        traceId: result.requestTraceId,
        transport: result.transportError,
      });

      const status =
        result.status === 400 || result.status === 422
          ? 400
          : result.status === 429
            ? 429
            : result.status === 401 || result.status === 403
              ? 503
              : 502;
      return apiError(result.error ?? "تعذر إرسال رمز التحقق", status);
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
