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

async function findUserByPhone(phone: string) {
  const variants = getPhoneLookupVariants(phone);
  if (variants.length === 0) return null;

  return prisma.user.findFirst({
    where: { phoneNumber: { in: variants } },
  });
}

export async function authenticateUser(
  phone: string,
  password: string
): Promise<AuthUser | null> {
  const user = await findUserByPhone(phone);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

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
}) {
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
          doctorSpecialty: "",
          fontFamily: "cairo",
          fontSize: "14",
          opacity: 0.2,
          color: "#117e65",
        },
      },
    },
  });

  await activateTrialForDoctor(fromDbId(user.id));
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
  sessionId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: toDbId(userId) },
    select: { activeSessionId: true },
  });
  return user?.activeSessionId === sessionId;
}
