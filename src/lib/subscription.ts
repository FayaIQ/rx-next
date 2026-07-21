import { prisma } from "./prisma";
import { toDbId, fromDbId } from "./bigint";

export async function getActiveSubscription(userId: number) {
  return prisma.subscription.findFirst({
    where: {
      userId: toDbId(userId),
      status: "active",
      endsAt: { gt: new Date() },
    },
    include: { package: true },
    orderBy: { endsAt: "desc" },
  });
}

export async function isSubscriptionActive(
  userId: number,
  userType: string,
  doctorId?: number | null
): Promise<boolean> {
  if (userType === "admin") return true;

  if (userType === "secretary") {
    if (!doctorId) return false;
    const doctor = await prisma.user.findUnique({
      where: { id: toDbId(doctorId) },
      select: { id: true, type: true },
    });
    if (!doctor || doctor.type !== "doctor") return false;
    return isSubscriptionActive(fromDbId(doctor.id), "doctor");
  }

  const sub = await getActiveSubscription(userId);
  return !!sub;
}

export function addDuration(
  start: Date,
  duration: number,
  unit: "days" | "months"
): Date {
  const end = new Date(start);
  if (unit === "days") {
    end.setDate(end.getDate() + duration);
  } else {
    end.setMonth(end.getMonth() + duration);
  }
  return end;
}

const DEFAULT_TRIAL_DAYS = 14;

export async function activateTrialForDoctor(userId: number) {
  const uid = toDbId(userId);
  let trialPackage = await prisma.package.findFirst({
    where: { isTrial: true, isActive: true },
  });

  // Shared DB may have no seeded packages — create a default trial pack once.
  if (!trialPackage) {
    trialPackage = await prisma.package.create({
      data: {
        name: "تجربة مجانية",
        price: 0,
        description: `تجربة مجانية لمدة ${DEFAULT_TRIAL_DAYS} يوماً`,
        duration: DEFAULT_TRIAL_DAYS,
        durationUnit: "days",
        planType: "trial",
        isTrial: true,
        isActive: true,
      },
    });
  }

  await supersedeActiveSubscriptions(userId);

  const startsAt = new Date();
  const endsAt = addDuration(
    startsAt,
    trialPackage.duration || DEFAULT_TRIAL_DAYS,
    (trialPackage.durationUnit as "days" | "months") || "days"
  );

  return prisma.subscription.create({
    data: {
      userId: uid,
      packageId: trialPackage.id,
      planType: trialPackage.planType || "trial",
      status: "active",
      startsAt,
      endsAt,
      notes: "تجربة تلقائية عند التسجيل",
    },
  });
}

export async function supersedeActiveSubscriptions(userId: number) {
  await prisma.subscription.updateMany({
    where: { userId: toDbId(userId), status: "active" },
    data: { status: "superseded" },
  });
}

export async function activatePackageForUser(
  userId: number,
  packageId: number,
  adminId: number,
  notes?: string | null
) {
  const pkg = await prisma.package.findUnique({
    where: { id: toDbId(packageId) },
  });
  if (!pkg || !pkg.isActive) throw new Error("الباقة غير متوفرة");

  const active = await getActiveSubscription(userId);
  const startsAt =
    active && active.endsAt > new Date() ? new Date(active.endsAt) : new Date();

  await supersedeActiveSubscriptions(userId);

  const endsAt = addDuration(
    startsAt,
    pkg.duration,
    pkg.durationUnit as "days" | "months"
  );

  return prisma.subscription.create({
    data: {
      userId: toDbId(userId),
      packageId: pkg.id,
      planType: pkg.planType,
      status: "active",
      startsAt,
      endsAt,
      activatedBy: toDbId(adminId),
      notes: notes ?? null,
    },
    include: { package: true },
  });
}

export async function activateCustomSubscription(
  userId: number,
  adminId: number,
  duration: number,
  unit: "days" | "months",
  notes?: string | null
) {
  const active = await getActiveSubscription(userId);
  const startsAt =
    active && active.endsAt > new Date() ? new Date(active.endsAt) : new Date();

  await supersedeActiveSubscriptions(userId);

  const endsAt = addDuration(startsAt, duration, unit);

  return prisma.subscription.create({
    data: {
      userId: toDbId(userId),
      planType: "custom",
      status: "active",
      startsAt,
      endsAt,
      activatedBy: toDbId(adminId),
      notes: notes ?? null,
    },
  });
}

export async function cancelActiveSubscription(userId: number) {
  const result = await prisma.subscription.updateMany({
    where: { userId: toDbId(userId), status: "active" },
    data: { status: "cancelled" },
  });
  if (result.count === 0) throw new Error("لا يوجد اشتراك نشط");
}

export function serializeSubscription(sub: {
  id: bigint | number;
  userId: bigint | number;
  packageId: bigint | number | null;
  planType: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  notes: string | null;
  createdAt?: Date | null;
  package?: { name: string; price: unknown } | null;
}) {
  return {
    id: fromDbId(sub.id),
    userId: fromDbId(sub.userId),
    packageId: sub.packageId ? fromDbId(sub.packageId) : null,
    planType: sub.planType,
    status: sub.status,
    startsAt: sub.startsAt.toISOString(),
    endsAt: sub.endsAt.toISOString(),
    notes: sub.notes,
    createdAt: sub.createdAt?.toISOString() ?? null,
    packageName: sub.package?.name ?? null,
    packagePrice: sub.package ? Number(sub.package.price) : null,
    isActive: sub.status === "active" && sub.endsAt > new Date(),
  };
}
