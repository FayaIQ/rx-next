import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  getPhoneLookupVariants,
  normalizePhoneForAuth,
} from "@/lib/patient-utils";

const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function passwordResetUserExists(phone: string): Promise<boolean> {
  const variants = getPhoneLookupVariants(phone);
  if (variants.length === 0) return false;
  return (
    (await prisma.user.count({
      where: { phoneNumber: { in: variants } },
    })) > 0
  );
}

export async function createPasswordResetToken(phone: string): Promise<string> {
  const phoneKey = normalizePhoneForAuth(phone);
  const token = randomToken();
  const tokenHash = await hashToken(token);

  await prisma.password_reset_tokens.upsert({
    where: { phone_number: phoneKey },
    create: {
      phone_number: phoneKey,
      token: tokenHash,
      created_at: new Date(),
    },
    update: {
      token: tokenHash,
      created_at: new Date(),
    },
  });

  return token;
}

export async function resetPasswordWithToken(input: {
  phone: string;
  token: string;
  password: string;
}): Promise<boolean> {
  const phoneKey = normalizePhoneForAuth(input.phone);
  const variants = getPhoneLookupVariants(input.phone);
  if (variants.length === 0) return false;

  const providedHash = await hashToken(input.token);
  const passwordHash = await bcrypt.hash(input.password, 12);

  return prisma.$transaction(async (tx) => {
    const reset = await tx.password_reset_tokens.findUnique({
      where: { phone_number: phoneKey },
    });
    if (!reset?.created_at) return false;

    const expired =
      Date.now() - reset.created_at.getTime() > RESET_TOKEN_TTL_MS;
    if (expired) {
      await tx.password_reset_tokens.delete({
        where: { phone_number: phoneKey },
      });
      return false;
    }

    if (!constantTimeEqual(providedHash, reset.token)) return false;

    const users = await tx.user.findMany({
      where: { phoneNumber: { in: variants } },
      select: { id: true, phoneNumber: true },
    });
    if (users.length === 0) return false;

    const user =
      users.find((candidate) => candidate.phoneNumber === phoneKey) ??
      [...users].sort((a, b) => Number(b.id) - Number(a.id))[0];

    await tx.user.update({
      where: { id: user.id },
      data: {
        password: passwordHash,
        // Rotate the id so every JWT issued before the reset becomes invalid.
        activeSessionId: crypto.randomUUID(),
      },
    });
    await tx.password_reset_tokens.delete({
      where: { phone_number: phoneKey },
    });

    return true;
  });
}
