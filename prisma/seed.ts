import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PACKAGES = [
  {
    name: "تجربة مجانية",
    price: 0,
    description: "تجربة مجانية لمدة 14 يوماً",
    duration: 14,
    durationUnit: "days",
    planType: "trial",
    isTrial: true,
  },
  {
    name: "اشتراك شهري",
    price: 50000,
    description: "اشتراك شهري",
    duration: 1,
    durationUnit: "months",
    planType: "monthly",
    isTrial: false,
  },
  {
    name: "اشتراك سنوي",
    price: 500000,
    description: "اشتراك سنوي — وفر أكثر",
    duration: 12,
    durationUnit: "months",
    planType: "yearly",
    isTrial: false,
  },
  {
    name: "اشتراك 3 أشهر",
    price: 135000,
    description: "اشتراك ربع سنوي",
    duration: 3,
    durationUnit: "months",
    planType: "quarterly",
    isTrial: false,
  },
] as const;

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 12);

  const existingAdmin = await prisma.user.findUnique({
    where: { phoneNumber: "+963950000000" },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "مدير النظام",
        phoneNumber: "+963950000000",
        password: adminPassword,
        type: "admin",
        isConfirmed: true,
      },
    });
  }

  for (const pkg of PACKAGES) {
    const existing = await prisma.package.findFirst({
      where: { planType: pkg.planType },
    });
    if (!existing) {
      await prisma.package.create({
        data: {
          ...pkg,
          price: pkg.price,
          description: pkg.description,
        },
      });
    }
  }

  console.log("Seed completed (skipped existing records)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
