import { auth } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toDbId } from "@/lib/bigint";
import { toUserId } from "@/lib/user-id";
import { assertValidSession } from "@/lib/api/api-guard";
import {
  apiError,
  apiForbidden,
  apiOk,
  apiServerError,
  apiUnauthorized,
} from "@/lib/api/response";
import { isOtpEnabled, sendOtp, verifyOtp } from "@/lib/otp";
import {
  DEV_TEST_ACCOUNT_DELETE_OTP,
  isDevTestDoctorPhone,
} from "@/lib/dev-test-doctor";
import { isValidAccountDeletePhrase } from "@/lib/account-deletion";
import { deleteUploadedFile } from "@/lib/upload";
import { getPhoneLookupVariants } from "@/lib/patient-utils";

const deleteSchema = z.object({
  acknowledgeDataLoss: z.literal(true),
  acknowledgeIrreversible: z.literal(true),
  confirmationPhrase: z
    .string()
    .trim()
    .refine(isValidAccountDeletePhrase, "عبارة التأكيد غير صحيحة"),
  otpCode: z.string().trim().regex(/^\d{4,8}$/, "رمز التحقق غير صحيح"),
});

async function requireDeletionDoctor() {
  const session = await auth();
  if (!session?.user) return { error: apiUnauthorized() };
  if (session.user.type !== "doctor") return { error: apiForbidden() };

  const sessionError = await assertValidSession(session);
  if (sessionError) return { error: sessionError };

  return { doctorId: toUserId(session.user.id) };
}

function maskedPhone(phone: string) {
  const visible = phone.slice(-3);
  return `${"•".repeat(Math.max(0, phone.length - visible.length))}${visible}`;
}

function otpErrorStatus(status?: number) {
  if (status === 400 || status === 422) return 400;
  if (status === 429) return 429;
  if (status === 401 || status === 403) return 503;
  return 502;
}

export async function POST() {
  try {
    const authResult = await requireDeletionDoctor();
    if ("error" in authResult) return authResult.error;

    const user = await prisma.user.findUnique({
      where: { id: toDbId(authResult.doctorId) },
      select: { id: true, phoneNumber: true },
    });
    if (!user) return apiError("المستخدم غير موجود", 404);

    const testDoctor = isDevTestDoctorPhone(user.phoneNumber);
    if (!testDoctor && !isOtpEnabled()) {
      return apiError("خدمة التحقق غير مفعّلة حالياً — لا يمكن حذف الحساب بدون OTP", 503);
    }

    if (testDoctor) {
      return apiOk({
        sent: true,
        maskedPhone: maskedPhone(user.phoneNumber),
        developmentCode: DEV_TEST_ACCOUNT_DELETE_OTP,
      });
    }

    const result = await sendOtp(
      user.phoneNumber,
      `account-delete:${authResult.doctorId}`
    );
    if (!result.ok) {
      console.error("[account-deletion] OTP send failed", {
        doctorId: authResult.doctorId,
        status: result.status,
        code: result.upstreamCode,
        traceId: result.requestTraceId,
        transport: result.transportError,
      });
      return apiError(
        result.error ?? "تعذر إرسال رمز التحقق",
        otpErrorStatus(result.status)
      );
    }

    return apiOk({
      sent: true,
      maskedPhone: maskedPhone(user.phoneNumber),
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    return apiServerError("تعذر إرسال رمز حذف الحساب", error);
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await requireDeletionDoctor();
    if ("error" in authResult) return authResult.error;

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
    }

    const doctorDbId = toDbId(authResult.doctorId);
    const user = await prisma.user.findUnique({
      where: { id: doctorDbId },
      select: { id: true, phoneNumber: true },
    });
    if (!user) return apiError("المستخدم غير موجود", 404);

    const testDoctor = isDevTestDoctorPhone(user.phoneNumber);
    if (!testDoctor && !isOtpEnabled()) {
      return apiError("خدمة التحقق غير مفعّلة حالياً — لا يمكن حذف الحساب بدون OTP", 503);
    }

    const otpValid = testDoctor
      ? parsed.data.otpCode === DEV_TEST_ACCOUNT_DELETE_OTP
      : (await verifyOtp(user.phoneNumber, parsed.data.otpCode)).valid;
    if (!otpValid) return apiError("رمز التحقق غير صحيح أو منتهي الصلاحية");

    const phoneVariants = getPhoneLookupVariants(user.phoneNumber);
    const matchingAccounts = await prisma.user.findMany({
      where: {
        OR: [
          { id: doctorDbId },
          ...(phoneVariants.length > 0
            ? [{ phoneNumber: { in: phoneVariants } }]
            : []),
        ],
      },
      select: { id: true, type: true },
    });
    const doctorIds = Array.from(
      new Set([
        doctorDbId,
        ...matchingAccounts
          .filter((account) => account.type === "doctor")
          .map((account) => account.id),
      ])
    );
    const matchingAccountIds = matchingAccounts.map((account) => account.id);

    const [clinicUsers, recipeFiles, prescriptionFiles, toothFiles] =
      await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { id: { in: matchingAccountIds } },
              { doctorId: { in: doctorIds } },
            ],
          },
          select: { id: true, phoneNumber: true, profileImage: true },
        }),
        prisma.recipeSettings.findMany({
          where: { doctorId: { in: doctorIds } },
          select: { logoPath: true, designImagePath: true },
        }),
        prisma.prescription.findMany({
          where: { doctorId: { in: doctorIds } },
          select: { xrayImage: true, analysisImage: true },
        }),
        prisma.dentalToothImage.findMany({
          where: { doctorId: { in: doctorIds } },
          select: { imageUrl: true },
        }),
      ]);

    const clinicUserIds = clinicUsers.map((clinicUser) => clinicUser.id);
    const clinicPhones = clinicUsers.flatMap((clinicUser) =>
      getPhoneLookupVariants(clinicUser.phoneNumber)
    );

    await prisma.$transaction(async (tx) => {
      // Task authors/actors are restrictive relations, so remove those records
      // before deleting the clinic users. Clinic-owned tasks cascade their
      // comments and activity rows.
      await tx.clinicTaskComment.deleteMany({
        where: { authorId: { in: clinicUserIds } },
      });
      await tx.clinicTaskActivity.deleteMany({
        where: { actorId: { in: clinicUserIds } },
      });
      await tx.clinicTask.deleteMany({
        where: {
          OR: [
            { doctorId: { in: doctorIds } },
            { createdById: { in: clinicUserIds } },
          ],
        },
      });

      await tx.subscription.updateMany({
        where: { activatedBy: { in: clinicUserIds } },
        data: { activatedBy: null },
      });
      await tx.secretaryInvite.deleteMany({
        where: {
          OR: [
            { doctorId: { in: doctorIds } },
            { secretaryId: { in: clinicUserIds } },
          ],
        },
      });
      await tx.sessions.deleteMany({ where: { user_id: { in: clinicUserIds } } });
      if (clinicPhones.length > 0) {
        await tx.password_reset_tokens.deleteMany({
          where: { phone_number: { in: clinicPhones } },
        });
      }
      const deletedUsers = await tx.user.deleteMany({
        where: { id: { in: clinicUserIds } },
      });
      if (deletedUsers.count === 0) {
        throw new Error("Account deletion did not remove any users");
      }
    });

    const uploadedPaths = [
      ...clinicUsers.map((clinicUser) => clinicUser.profileImage),
      ...recipeFiles.flatMap((file) => [file.logoPath, file.designImagePath]),
      ...prescriptionFiles.flatMap((file) => [file.xrayImage, file.analysisImage]),
      ...toothFiles.map((file) => file.imageUrl),
    ].filter((value): value is string => Boolean(value?.startsWith("/uploads/")));

    await Promise.allSettled(uploadedPaths.map((path) => deleteUploadedFile(path)));

    return apiOk({ deleted: true });
  } catch (error) {
    return apiServerError("تعذر حذف الحساب — لم يتم حذف أي بيانات", error);
  }
}
