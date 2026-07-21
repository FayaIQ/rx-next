import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "./prisma";
import {
  getPhoneLookupVariants,
  normalizePhoneForAuth,
} from "./patient-utils";
import { activateTrialForDoctor } from "./subscription";
import { fromDbId, toDbId } from "./bigint";
import type { UserRole } from "@/types/next-auth";

export interface AuthUser {
  id: number;
  name: string;
  phoneNumber: string;
  type: UserRole;
  doctorId: number | null;
  isConfirmed: boolean;
  sessionId: string;
}

async function findUsersByPhone(phone: string) {
  const variants = getPhoneLookupVariants(phone);
  if (variants.length === 0) return [];

  return prisma.user.findMany({
    where: { phoneNumber: { in: variants } },
  });
}

async function findUserByPhone(phone: string) {
  const users = await findUsersByPhone(phone);
  if (users.length === 0) return null;

  const trimmed = phone.trim();
  const exact = users.find((u) => u.phoneNumber === trimmed);
  if (exact) return exact;

  // Prefer newest account when duplicates exist under different formats.
  return [...users].sort((a, b) => Number(b.id) - Number(a.id))[0];
}

export async function authenticateUser(
  phone: string,
  password: string
): Promise<AuthUser | null> {
  const users = await findUsersByPhone(phone);
  if (users.length === 0) return null;

  // Same number may exist in multiple formats (077… / +964… / 964…).
  // Prefer the exact typed format, then newest accounts.
  const trimmed = phone.trim();
  const ordered = [...users].sort((a, b) => {
    if (a.phoneNumber === trimmed && b.phoneNumber !== trimmed) return -1;
    if (b.phoneNumber === trimmed && a.phoneNumber !== trimmed) return 1;
    return Number(b.id) - Number(a.id);
  });

  let user = null as (typeof users)[number] | null;
  for (const candidate of ordered) {
    const valid = await bcrypt.compare(password, candidate.password);
    if (valid) {
      user = candidate;
      break;
    }
  }
  if (!user) return null;

  const sessionId = uuidv4();
  await prisma.user.update({
    where: { id: user.id },
    data: { activeSessionId: sessionId },
  });

  return {
    id: fromDbId(user.id),
    name: user.name,
    phoneNumber: user.phoneNumber,
    type: user.type as UserRole,
    doctorId: user.doctorId ? fromDbId(user.doctorId) : null,
    isConfirmed: user.isConfirmed,
    sessionId,
  };
}

export async function registerDoctor(data: {
  name: string;
  phone: string;
  password: string;
  practiceType?: string;
}) {
  const { isDoctorPracticeType, getPracticeTypeMeta, applyPracticeTypeFeatures } =
    await import("@/lib/doctor-practice");

  const practiceType = isDoctorPracticeType(data.practiceType)
    ? data.practiceType
    : "general";
  const practiceMeta = getPracticeTypeMeta(practiceType);

  const phoneNumber = normalizePhoneForAuth(data.phone);
  const existing = await findUserByPhone(data.phone);
  if (existing) {
    throw new Error("رقم الهاتف مستخدم مسبقاً");
  }

  const hashed = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      phoneNumber,
      password: hashed,
      type: "doctor",
      isConfirmed: true,
      recipeSettings: {
        create: {
          doctorName: data.name,
          phoneNumber,
          doctorSpecialty: practiceMeta.specialty,
          fontFamily: "cairo",
          fontSize: "14",
          opacity: 0.2,
          color: "#117e65",
        },
      },
    },
  });

  const doctorId = fromDbId(user.id);
  await activateTrialForDoctor(doctorId);
  await applyPracticeTypeFeatures(doctorId, practiceType);
  return user;
}

export async function registerSecretary(data: {
  name: string;
  phone: string;
  password: string;
}) {
  const phoneNumber = normalizePhoneForAuth(data.phone);
  const existing = await findUserByPhone(data.phone);
  if (existing) {
    throw new Error("رقم الهاتف مستخدم مسبقاً");
  }

  if (data.password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
  }

  const hashed = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: {
      name: data.name,
      phoneNumber,
      password: hashed,
      type: "secretary",
      isConfirmed: false,
    },
  });
}

export async function validateSession(
  userId: number,
  sessionId: string | null | undefined
): Promise<boolean> {
  if (!sessionId) return false;

  const user = await prisma.user.findUnique({
    where: { id: toDbId(userId) },
    select: { activeSessionId: true },
  });
  if (!user) return false;

  // Heal sessions that lost activeSessionId (deploy/restart) while JWT is still valid.
  if (!user.activeSessionId) {
    await prisma.user.update({
      where: { id: toDbId(userId) },
      data: { activeSessionId: sessionId },
    });
    return true;
  }

  return user.activeSessionId === sessionId;
}
