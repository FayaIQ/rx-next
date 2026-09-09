import { prisma } from "@/lib/prisma";
import { isApiError, requireDoctorApi } from "@/lib/api/doctor-auth";
import { toDbId } from "@/lib/bigint";

const TARGET_EMAIL = "drmohamed@clinic.com";
const TARGET_QR_VALUE =
  "https://www.instagram.com/mohammedalsharaa.clinic?igsh=MXFpMGRwdmJzZ2Ixbw==";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:system-ui;padding:32px">${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  return html(`
    <h1>تحديث QR الوصفة</h1>
    <p>سيُحفظ رابط إنستغرام المرفق في إعدادات وصفة الدكتور محمد باقر الشرع.</p>
    <form method="post">
      <button type="submit" style="font:inherit;padding:10px 18px">تطبيق QR</button>
    </form>
  `);
}

export async function POST() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const doctorId = toDbId(ctx.doctorId);
  const settings = await prisma.recipeSettings.findFirst({
    where: { doctorId },
    select: { id: true, doctorName: true, email: true },
  });

  if (!settings || settings.email?.toLowerCase() !== TARGET_EMAIL) {
    return html("<h1>لم يتم التحديث</h1><p>الحساب المفتوح ليس حساب الطبيب المطلوب.</p>", 403);
  }

  await prisma.$executeRawUnsafe(
    'ALTER TABLE "recipe_settings" ADD COLUMN IF NOT EXISTS "qr_value" VARCHAR(2048)'
  );
  await prisma.$executeRaw`
    UPDATE "recipe_settings"
    SET "qr_value" = ${TARGET_QR_VALUE}, "updated_at" = NOW()
    WHERE "id" = ${settings.id}
  `;

  return html(
    `<h1>تم تحديث QR</h1><p>${settings.doctorName}</p><p dir="ltr">${TARGET_QR_VALUE}</p>`
  );
}
