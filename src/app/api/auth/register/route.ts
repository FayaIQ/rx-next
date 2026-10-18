import { after } from "next/server";
import { acquisitionSchema } from "@/lib/product-analytics/shared";
import { z } from "zod";
import { registerDoctor } from "@/lib/auth-credentials";
import { fromDbId } from "@/lib/bigint";
import { apiOk, apiError, apiServerError } from "@/lib/api/response";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { isDevTestDoctorPhone } from "@/lib/dev-test-doctor";
import { sendCflowWelcomeMessage } from "@/lib/cflow-messages";

const schema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().min(8, "رقم الهاتف غير صالح"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  practiceType: z.enum(["general", "dental"], {
    message: "اختر نوع العيادة",
  }),
  acquisition: acquisitionSchema.optional(),
  turnstileToken: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    const isDevTestDoctor = isDevTestDoctorPhone(data.phone);

    if (
      isTurnstileEnabled() &&
      !isDevTestDoctor &&
      !(await verifyTurnstileToken(data.turnstileToken))
    ) {
      return apiError("أكمل التحقق من أنك لست روبوتاً", 401);
    }

    const user = await registerDoctor(data);

    // Account creation is the success boundary. Welcome-message delivery must
    // not turn a saved account into a failed registration or block sign-in.
    after(async () => {
      try {
        const result = await sendCflowWelcomeMessage({
          doctorId: fromDbId(user.id),
          name: user.name,
          phone: user.phoneNumber,
        });
        if (!result.ok && !result.skipped) console.warn("CFlow welcome message was not delivered", { status: result.status });
      } catch {
        console.warn("CFlow welcome message delivery failed");
      }
    });

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
