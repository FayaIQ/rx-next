import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";
import { profileUpdateSchema } from "@/lib/validations/settings";

export async function GET() {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const user = await prisma.user.findUnique({
    where: { id: toDbId(ctx.userId) },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      profileImage: true,
    },
  });

  if (!user) return apiError("المستخدم غير موجود", 404);

  return apiOk({
    profile: {
      id: fromDbId(user.id),
      name: user.name,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage,
    },
  });
}

export async function PUT(req: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const body = await req.json();
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "بيانات غير صالحة");
  }

  const user = await prisma.user.findUnique({
    where: { id: toDbId(ctx.userId) },
  });
  if (!user) return apiError("المستخدم غير موجود", 404);

  const { name, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    if (!currentPassword) {
      return apiError("أدخل كلمة المرور الحالية");
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return apiError("كلمة المرور الحالية غير صحيحة");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      ...(newPassword
        ? { password: await bcrypt.hash(newPassword, 10) }
        : {}),
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      profileImage: true,
    },
  });

  return apiOk({
    profile: {
      id: fromDbId(updated.id),
      name: updated.name,
      phoneNumber: updated.phoneNumber,
      profileImage: updated.profileImage,
    },
  });
}
