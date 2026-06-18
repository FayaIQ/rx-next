import { fromDbId } from "@/lib/bigint";
import { getActiveSubscription, serializeSubscription } from "@/lib/subscription";

export function serializeAdminUser(user: {
  id: bigint | number;
  name: string;
  phoneNumber: string;
  type: string;
  doctorId?: bigint | number | null;
  isConfirmed: boolean;
  createdAt?: Date | null;
  doctor?: { name: string } | null;
  _count?: { patients?: number; secretaries?: number };
}) {
  return {
    id: fromDbId(user.id),
    name: user.name,
    phoneNumber: user.phoneNumber,
    type: user.type,
    doctorId: user.doctorId ? fromDbId(user.doctorId) : null,
    doctorName: user.doctor?.name ?? null,
    isConfirmed: user.isConfirmed,
    createdAt: user.createdAt?.toISOString() ?? null,
    patientsCount: user._count?.patients ?? 0,
    secretariesCount: user._count?.secretaries ?? 0,
  };
}

export async function serializeAdminUserWithSub(userId: number, user: Parameters<typeof serializeAdminUser>[0]) {
  const base = serializeAdminUser(user);
  const sub = await getActiveSubscription(userId);
  return {
    ...base,
    subscription: sub ? serializeSubscription({ ...sub, package: sub.package }) : null,
  };
}

export function serializePackage(pkg: {
  id: bigint | number;
  name: string;
  price: unknown;
  description: string;
  image?: string | null;
  duration: number;
  durationUnit: string;
  planType: string;
  isTrial: boolean;
  isActive: boolean;
  createdAt?: Date | null;
}) {
  return {
    id: fromDbId(pkg.id),
    name: pkg.name,
    price: Number(pkg.price),
    description: pkg.description,
    image: pkg.image ?? null,
    duration: pkg.duration,
    durationUnit: pkg.durationUnit,
    planType: pkg.planType,
    isTrial: pkg.isTrial,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt?.toISOString() ?? null,
  };
}
