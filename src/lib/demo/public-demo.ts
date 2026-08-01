import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { fromDbId } from "@/lib/bigint";
import {
  CLINIC_FEATURE_KEYS,
  ensureClinicFeaturesReady,
} from "@/lib/clinic-features";
import type { AuthUser } from "@/lib/auth-credentials";
import {
  PUBLIC_DEMO_DATASET_VERSION,
  PUBLIC_DEMO_PRESCRIPTION_BACKGROUND,
  PUBLIC_DEMO_SESSION_ID,
} from "@/lib/demo/constants";

const DEMO_PHONE = "+9647000000000";
const DEMO_SECRETARY_PHONE = "+9647000000001";
const DEMO_PASSWORD = "RX-Public-Demo-2026!";
const DEMO_DATASET_VERSION = `RX public demo dataset ${PUBLIC_DEMO_DATASET_VERSION}`;

const DEMO_RECIPE_SETTINGS = {
  doctorName: "د. أحمد الخالدي",
  doctorSpecialty: "طب وجراحة عامة",
  additionalText1: "عيادة الشفاء",
  phoneNumber: "0770 123 4567",
  address: "بغداد — الكرادة",
  fontFamily: "cairo",
  fontSize: "17",
  opacity: 1,
  paperSize: "A4",
  color: "#063E70",
  designImagePath: PUBLIC_DEMO_PRESCRIPTION_BACKGROUND,
  designMode: "image",
  designTemplate: "classic",
  designImageScale: 1,
  designPatientX: 72,
  designPatientY: 29.7,
  designAgeX: 41,
  designAgeY: 29.7,
  designDateX: 15.5,
  designDateY: 29.7,
  designItemsX: 14,
  designItemsY: 42.4,
  designItemsWidth: 79,
  designItemsHeight: 36.5,
  showGender: true,
  showAge: true,
  showPhone: true,
  printName: true,
  printAge: true,
  printGender: false,
  printPhone: false,
  printDiagnosis: true,
  printWithoutDesignImage: false,
  designPhoneX: 77,
  designPhoneY: 32,
} as const;

function atTime(daysFromToday: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export async function ensurePublicDemoDoctor(): Promise<AuthUser> {
  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { phoneNumber: DEMO_PHONE },
        { activeSessionId: PUBLIC_DEMO_SESSION_ID },
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "د. أحمد الخالدي — حساب تجريبي",
        phoneNumber: DEMO_PHONE,
        password,
        type: "doctor",
        isConfirmed: true,
        createdAt: new Date(),
        activeSessionId: PUBLIC_DEMO_SESSION_ID,
        recipeSettings: {
          create: DEMO_RECIPE_SETTINGS,
        },
      },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "د. أحمد الخالدي — حساب تجريبي",
        phoneNumber: DEMO_PHONE,
        password,
        type: "doctor",
        isConfirmed: true,
        activeSessionId: PUBLIC_DEMO_SESSION_ID,
      },
    });
  }

  const recipeSettings = await prisma.recipeSettings.findFirst({
    where: { doctorId: user.id },
    select: { id: true },
  });
  if (recipeSettings) {
    await prisma.recipeSettings.update({
      where: { id: recipeSettings.id },
      data: DEMO_RECIPE_SETTINGS,
    });
  } else {
    await prisma.recipeSettings.create({
      data: {
        doctorId: user.id,
        ...DEMO_RECIPE_SETTINGS,
      },
    });
  }

  const now = new Date();
  let activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      status: "active",
      endsAt: { gt: now },
    },
  });
  if (!activeSubscription) {
    const endsAt = new Date(now);
    endsAt.setFullYear(endsAt.getFullYear() + 5);
    activeSubscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planType: "demo",
        status: "active",
        startsAt: now,
        endsAt,
        notes: null,
      },
    });
  }

  await ensureClinicFeaturesReady();
  await prisma.clinicFeatureToggle.createMany({
    data: CLINIC_FEATURE_KEYS.map((key) => ({
      doctorId: user.id,
      key,
      enabled: true,
    })),
    skipDuplicates: true,
  });
  await prisma.clinicFeatureToggle.updateMany({
    where: { doctorId: user.id },
    data: { enabled: true },
  });

  await prisma.clinicFinanceSettings.upsert({
    where: { doctorId: user.id },
    update: {},
    create: {
      doctorId: user.id,
      consultationFee: 25000,
      followUpFee: 15000,
      procedureFee: 50000,
      currency: "IQD",
    },
  });

  const patientCount = await prisma.patient.count({
    where: { doctorId: user.id },
  });
  const shouldRebuildDataset =
    activeSubscription.notes !== DEMO_DATASET_VERSION || patientCount === 0;

  if (shouldRebuildDataset) {
    await prisma.$transaction(
      async (tx) => {
        await tx.clinicTask.deleteMany({ where: { doctorId: user.id } });
        await tx.financeTransaction.deleteMany({
          where: { doctorId: user.id },
        });
        await tx.patientVisit.deleteMany({ where: { doctorId: user.id } });
        await tx.treatmentSession.deleteMany({
          where: { doctorId: user.id },
        });
        await tx.treatmentPlan.deleteMany({ where: { doctorId: user.id } });
        await tx.appointment.deleteMany({ where: { doctorId: user.id } });
        await tx.prescription.deleteMany({ where: { doctorId: user.id } });
        await tx.dentalChart.deleteMany({ where: { doctorId: user.id } });
        await tx.patient.deleteMany({ where: { doctorId: user.id } });
        await tx.patientField.deleteMany({ where: { doctorId: user.id } });
        await tx.medicinePreset.deleteMany({
          where: { doctorId: user.id },
        });
        await tx.medicine.deleteMany({ where: { doctorId: user.id } });

        const secretary = await tx.user.upsert({
          where: { phoneNumber: DEMO_SECRETARY_PHONE },
          update: {
            doctorId: user.id,
            name: "رنا قاسم",
            password,
            type: "secretary",
            isConfirmed: true,
            activeSessionId: null,
          },
          create: {
            doctorId: user.id,
            name: "رنا قاسم",
            phoneNumber: DEMO_SECRETARY_PHONE,
            password,
            type: "secretary",
            isConfirmed: true,
          },
        });

        const bloodTypeField = await tx.patientField.create({
          data: {
            doctorId: user.id,
            name: "فصيلة الدم",
            size: "small",
            isActive: true,
            isPrintable: false,
            isPersonal: true,
          },
        });
        const occupationField = await tx.patientField.create({
          data: {
            doctorId: user.id,
            name: "المهنة",
            size: "medium",
            isActive: true,
            isPrintable: false,
            isPersonal: true,
          },
        });

        const sara = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "سارة كاظم عبد الرحمن",
            gender: "female",
            birthdate: new Date("1994-04-18"),
            diagnosis: "التهاب بلعوم حاد",
            phone: "0770 214 8365",
            allergies: "لا توجد حساسية دوائية معروفة",
            currentMedications: "لا يوجد",
          },
        });
        const ali = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "علي فاضل حسن",
            gender: "male",
            birthdate: new Date("1978-09-03"),
            diagnosis: "ارتفاع ضغط الدم والسكري من النوع الثاني",
            phone: "0781 432 9076",
            allergies: "حساسية من السلفا",
            currentMedications: "Metformin 500mg، Amlodipine 5mg",
          },
        });
        const mariam = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "مريم سعد جبار",
            gender: "female",
            birthdate: new Date("2001-01-26"),
            diagnosis: "فقر دم بعوز الحديد",
            phone: "0750 618 2249",
            allergies: "لا توجد",
            currentMedications: "Ferrous sulfate 200mg",
          },
        });
        const noor = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "نور حسين علي",
            gender: "female",
            birthdate: new Date("2014-11-20"),
            diagnosis: "ربو قصبي خفيف متقطع",
            phone: "0773 905 1172",
            allergies: "غبار الطلع",
            currentMedications: "Salbutamol inhaler عند الحاجة",
          },
        });
        const mustafa = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "مصطفى كريم عباس",
            gender: "male",
            birthdate: new Date("1989-06-14"),
            diagnosis: "ألم أسفل الظهر غير نوعي",
            phone: "0780 347 5621",
            allergies: "لا توجد",
            currentMedications: "لا يوجد",
          },
        });
        const hussein = await tx.patient.create({
          data: {
            doctorId: user.id,
            name: "حسين ناظم خليل",
            gender: "male",
            birthdate: new Date("1987-02-08"),
            diagnosis: "التهاب لب السن 36",
            phone: "0751 820 4493",
            allergies: "حساسية من البنسلين",
            currentMedications: "Paracetamol عند الحاجة",
          },
        });

        await tx.patientFieldValue.createMany({
          data: [
            {
              patientId: sara.id,
              patientFieldId: bloodTypeField.id,
              value: "O+",
            },
            {
              patientId: sara.id,
              patientFieldId: occupationField.id,
              value: "مدرّسة",
            },
            {
              patientId: ali.id,
              patientFieldId: bloodTypeField.id,
              value: "A+",
            },
            {
              patientId: ali.id,
              patientFieldId: occupationField.id,
              value: "مهندس مدني",
            },
            {
              patientId: mariam.id,
              patientFieldId: bloodTypeField.id,
              value: "B+",
            },
            {
              patientId: noor.id,
              patientFieldId: bloodTypeField.id,
              value: "O-",
            },
            {
              patientId: mustafa.id,
              patientFieldId: occupationField.id,
              value: "موظف مصرف",
            },
            {
              patientId: hussein.id,
              patientFieldId: occupationField.id,
              value: "محاسب",
            },
          ],
        });

        const medicines = [
          {
            name: "Amoxicillin 500mg",
            type: "كبسولة",
            dosage: "1×3",
            quantity: "21",
            period: "7 أيام",
            timeOfUse: "بعد الطعام",
          },
          {
            name: "Paracetamol 500mg",
            type: "قرص",
            dosage: "1×3",
            quantity: "15",
            period: "5 أيام",
            timeOfUse: "عند الحاجة بعد الطعام",
          },
          {
            name: "Omeprazole 20mg",
            type: "كبسولة",
            dosage: "1×1",
            quantity: "14",
            period: "14 يوماً",
            timeOfUse: "قبل الإفطار بنصف ساعة",
          },
          {
            name: "Amlodipine 5mg",
            type: "قرص",
            dosage: "1×1",
            quantity: "30",
            period: "30 يوماً",
            timeOfUse: "مساءً",
          },
          {
            name: "Metformin 500mg",
            type: "قرص",
            dosage: "1×2",
            quantity: "60",
            period: "30 يوماً",
            timeOfUse: "مع الطعام",
          },
          {
            name: "Ferrous sulfate 200mg",
            type: "قرص",
            dosage: "1×1",
            quantity: "30",
            period: "30 يوماً",
            timeOfUse: "بعد الطعام",
          },
          {
            name: "Salbutamol 100mcg",
            type: "بخاخ",
            dosage: "بختان",
            quantity: "1",
            period: "عند الحاجة",
            timeOfUse: "عند ضيق التنفس",
          },
          {
            name: "Cetirizine 10mg",
            type: "قرص",
            dosage: "1×1",
            quantity: "10",
            period: "10 أيام",
            timeOfUse: "مساءً",
          },
          {
            name: "Azithromycin 500mg",
            type: "قرص",
            dosage: "1×1",
            quantity: "3",
            period: "3 أيام",
            timeOfUse: "قبل الطعام بساعة",
          },
        ];
        await tx.medicine.createMany({
          data: medicines.map((medicine) => ({
            doctorId: user.id,
            ...medicine,
          })),
        });
        await tx.medicinePreset.createMany({
          data: medicines.slice(0, 7).map((medicine, index) => ({
            doctorId: user.id,
            medicineKey: medicine.name.split(/\s+/)[0]!.toLowerCase(),
            ...medicine,
            usageCount: 12 - index,
            lastUsedAt: atTime(-index, 12),
          })),
        });

        await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: sara.id,
            appointmentDatetime: atTime(0, 10, 15),
            bookingDate: atTime(-2, 9),
            notes: "مراجعة نتيجة مسحة الحلق",
            visitStatus: "waiting",
            checkedInAt: atTime(0, 10, 5),
            status: true,
          },
        });
        await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: ali.id,
            appointmentDatetime: atTime(0, 10, 45),
            bookingDate: atTime(-5, 12),
            notes: "متابعة الضغط والسكر",
            visitStatus: "with_doctor",
            checkedInAt: atTime(0, 10, 32),
            status: true,
          },
        });
        await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: mariam.id,
            appointmentDatetime: atTime(0, 11, 30),
            bookingDate: atTime(-1, 16),
            notes: "مراجعة تحليل CBC وFerritin",
            visitStatus: "scheduled",
            status: true,
          },
        });
        await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: noor.id,
            appointmentDatetime: atTime(1, 9, 30),
            bookingDate: atTime(-3, 14),
            notes: "متابعة السيطرة على أعراض الربو",
            visitStatus: "scheduled",
            status: true,
          },
        });
        await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: mustafa.id,
            appointmentDatetime: atTime(2, 17),
            bookingDate: atTime(0, 8),
            notes: "إعادة تقييم ألم الظهر",
            visitStatus: "scheduled",
            status: true,
          },
        });
        const aliPastAppointment = await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: ali.id,
            appointmentDatetime: atTime(-8, 9, 45),
            bookingDate: atTime(-12, 10),
            notes: "قياس الضغط ومراجعة HbA1c",
            visitStatus: "done",
            checkedInAt: atTime(-8, 9, 35),
            status: true,
          },
        });
        const dentalPastAppointment = await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: hussein.id,
            appointmentDatetime: atTime(-7, 16),
            bookingDate: atTime(-10, 11),
            notes: "الجلسة الأولى لعلاج جذر السن 36",
            visitStatus: "done",
            checkedInAt: atTime(-7, 15, 50),
            status: true,
          },
        });
        const dentalNextAppointment = await tx.appointment.create({
          data: {
            doctorId: user.id,
            patientId: hussein.id,
            appointmentDatetime: atTime(1, 16),
            bookingDate: atTime(-7, 17),
            notes: "الجلسة الثانية لعلاج جذر السن 36",
            visitStatus: "scheduled",
            status: true,
          },
        });

        const saraPrescription = await tx.prescription.create({
          data: {
            doctorId: user.id,
            patientId: sara.id,
            prescriptionDate: atTime(-10, 12),
            diagnosis: "التهاب بلعوم جرثومي حاد",
            prescriptionNumber: 1021,
            consultationFee: 25000,
            items: {
              create: [
                medicines[0]!,
                medicines[1]!,
              ],
            },
          },
        });
        const aliPrescription = await tx.prescription.create({
          data: {
            doctorId: user.id,
            patientId: ali.id,
            prescriptionDate: atTime(-8, 12),
            diagnosis: "ضغط دم غير مسيطر عليه مع سكري نوع ثانٍ",
            prescriptionNumber: 1022,
            consultationFee: 15000,
            items: {
              create: [medicines[3]!, medicines[4]!],
            },
          },
        });
        const mariamPrescription = await tx.prescription.create({
          data: {
            doctorId: user.id,
            patientId: mariam.id,
            prescriptionDate: atTime(-4, 12),
            diagnosis: "فقر دم خفيف بعوز الحديد",
            prescriptionNumber: 1023,
            consultationFee: 25000,
            items: { create: [medicines[5]!] },
          },
        });
        const noorPrescription = await tx.prescription.create({
          data: {
            doctorId: user.id,
            patientId: noor.id,
            prescriptionDate: atTime(-15, 12),
            diagnosis: "ربو قصبي خفيف متقطع",
            prescriptionNumber: 1024,
            consultationFee: 25000,
            items: {
              create: [medicines[6]!, medicines[7]!],
            },
          },
        });

        await tx.patientVisit.createMany({
          data: [
            {
              doctorId: user.id,
              patientId: sara.id,
              visitDate: atTime(-10, 12),
              summary: "ألم حلق وحرارة منذ ثلاثة أيام",
              notes: "العلامات الحيوية مستقرة، ونُصح بالإكثار من السوائل.",
              prescriptionId: saraPrescription.id,
            },
            {
              doctorId: user.id,
              patientId: ali.id,
              visitDate: atTime(-8, 12),
              summary: "متابعة ضغط الدم والسكري",
              notes: "ضغط الدم 150/92، مع طلب سجل قياسات منزلية.",
              appointmentId: aliPastAppointment.id,
              prescriptionId: aliPrescription.id,
            },
            {
              doctorId: user.id,
              patientId: mariam.id,
              visitDate: atTime(-4, 12),
              summary: "تعب وشحوب مع انخفاض Ferritin",
              notes: "إعادة فحص CBC وFerritin بعد ستة أسابيع.",
              prescriptionId: mariamPrescription.id,
            },
            {
              doctorId: user.id,
              patientId: noor.id,
              visitDate: atTime(-15, 12),
              summary: "صفير متقطع مرتبط بالغبار",
              notes: "شرح طريقة استخدام البخاخ ومؤشرات المراجعة العاجلة.",
              prescriptionId: noorPrescription.id,
            },
          ],
        });

        await tx.financeTransaction.createMany({
          data: [
            {
              doctorId: user.id,
              patientId: sara.id,
              prescriptionId: saraPrescription.id,
              type: "income",
              category: "consultation",
              amount: 25000,
              paymentMethod: "cash",
              description: "كشفية واستشارة طبية",
              transactionDate: atTime(-10, 12),
              createdById: secretary.id,
            },
            {
              doctorId: user.id,
              patientId: ali.id,
              appointmentId: aliPastAppointment.id,
              prescriptionId: aliPrescription.id,
              type: "income",
              category: "follow_up",
              amount: 15000,
              paymentMethod: "card",
              description: "زيارة متابعة للضغط والسكري",
              transactionDate: atTime(-8, 12),
              createdById: secretary.id,
            },
            {
              doctorId: user.id,
              patientId: mariam.id,
              prescriptionId: mariamPrescription.id,
              type: "income",
              category: "consultation",
              amount: 25000,
              paymentMethod: "cash",
              description: "كشفية واستشارة طبية",
              transactionDate: atTime(-4, 12),
              createdById: secretary.id,
            },
            {
              doctorId: user.id,
              patientId: noor.id,
              prescriptionId: noorPrescription.id,
              type: "income",
              category: "consultation",
              amount: 25000,
              paymentMethod: "transfer",
              description: "كشفية واستشارة طبية",
              transactionDate: atTime(-15, 12),
              createdById: secretary.id,
            },
            {
              doctorId: user.id,
              patientId: hussein.id,
              appointmentId: dentalPastAppointment.id,
              type: "income",
              category: "procedure",
              amount: 75000,
              paymentMethod: "cash",
              description: "دفعة جلسة علاج جذر",
              transactionDate: atTime(-7, 12),
              createdById: secretary.id,
            },
            {
              doctorId: user.id,
              type: "expense",
              category: "supplies",
              amount: 185000,
              paymentMethod: "transfer",
              description: "مواد تعقيم ومستلزمات طبية",
              transactionDate: atTime(-6, 12),
              createdById: user.id,
            },
            {
              doctorId: user.id,
              type: "expense",
              category: "utilities",
              amount: 92000,
              paymentMethod: "cash",
              description: "كهرباء وإنترنت العيادة",
              transactionDate: atTime(-3, 12),
              createdById: user.id,
            },
            {
              doctorId: user.id,
              type: "expense",
              category: "rent",
              amount: 750000,
              paymentMethod: "transfer",
              description: "إيجار العيادة الشهري",
              transactionDate: atTime(-20, 12),
              createdById: user.id,
            },
          ],
        });

        await tx.dentalChart.create({
          data: {
            doctorId: user.id,
            patientId: hussein.id,
            notes: "ألم تلقائي ليلي في الفك السفلي الأيسر؛ صورة الأشعة تدعم تشخيص التهاب لب غير عكوس في السن 36.",
            teeth: {
              create: [
                {
                  toothFdi: 36,
                  status: "root_canal",
                  notes: "علاج جذر جارٍ — أُنجز فتح الحجرة وتنظيف أولي",
                },
                {
                  toothFdi: 37,
                  status: "filled",
                  notes: "حشوة مركبة بحالة جيدة",
                },
                {
                  toothFdi: 46,
                  status: "decayed",
                  notes: "نخر سطحي يحتاج إلى حشوة",
                },
              ],
            },
          },
        });

        const rootCanalPlan = await tx.treatmentPlan.create({
          data: {
            doctorId: user.id,
            patientId: hussein.id,
            toothFdi: 36,
            treatmentType: "root_canal",
            title: "علاج جذر السن 36",
            totalSessions: 3,
            status: "active",
            notes: "خطة من ثلاث جلسات مع تقييم الحاجة إلى تاج بعد إكمال العلاج.",
          },
        });
        const completedDentalSession = await tx.treatmentSession.create({
          data: {
            planId: rootCanalPlan.id,
            doctorId: user.id,
            patientId: hussein.id,
            appointmentId: dentalPastAppointment.id,
            sessionNumber: 1,
            status: "completed",
            scheduledDate: atTime(-7, 12),
            performedAt: atTime(-7, 16, 35),
            notes: "فتح الحجرة، تحديد القنوات، وغسل أولي.",
          },
        });
        await tx.treatmentSession.createMany({
          data: [
            {
              planId: rootCanalPlan.id,
              doctorId: user.id,
              patientId: hussein.id,
              appointmentId: dentalNextAppointment.id,
              sessionNumber: 2,
              status: "planned",
              scheduledDate: atTime(1, 12),
              notes: "تنظيف وتوسيع القنوات.",
            },
            {
              planId: rootCanalPlan.id,
              doctorId: user.id,
              patientId: hussein.id,
              sessionNumber: 3,
              status: "planned",
              scheduledDate: atTime(8, 12),
              notes: "حشو القنوات والتقييم النهائي.",
            },
          ],
        });
        await tx.patientVisit.create({
          data: {
            doctorId: user.id,
            patientId: hussein.id,
            visitDate: atTime(-7, 12),
            summary: "الجلسة الأولى لعلاج جذر السن 36",
            notes: "تحمّل المريض الإجراء جيداً مع تعليمات ما بعد الجلسة.",
            appointmentId: dentalPastAppointment.id,
            treatmentSessionId: completedDentalSession.id,
          },
        });

        await tx.clinicTask.create({
          data: {
            doctorId: user.id,
            patientId: noor.id,
            assignedToId: secretary.id,
            createdById: user.id,
            title: "تأكيد موعد نور حسين ليوم غد",
            description:
              "الاتصال بولي الأمر وتأكيد إحضار البخاخ المستخدم حالياً.",
            status: "todo",
            priority: "high",
            dueAt: atTime(0, 18),
            comments: {
              create: {
                authorId: user.id,
                body: "يرجى تثبيت الموعد قبل نهاية الدوام.",
              },
            },
            activities: {
              create: {
                actorId: user.id,
                action: "created",
                toValue: "todo",
              },
            },
          },
        });
        await tx.clinicTask.create({
          data: {
            doctorId: user.id,
            patientId: sara.id,
            assignedToId: user.id,
            createdById: user.id,
            title: "مراجعة نتيجة مسحة الحلق",
            description:
              "مقارنة النتيجة مع الاستجابة السريرية وتحديث الخطة عند الحاجة.",
            status: "in_progress",
            priority: "urgent",
            dueAt: atTime(0, 13),
            activities: {
              create: [
                {
                  actorId: user.id,
                  action: "created",
                  toValue: "todo",
                },
                {
                  actorId: user.id,
                  action: "status",
                  fromValue: "todo",
                  toValue: "in_progress",
                },
              ],
            },
          },
        });
        await tx.clinicTask.create({
          data: {
            doctorId: user.id,
            assignedToId: secretary.id,
            createdById: user.id,
            title: "جرد مواد التعقيم",
            description:
              "حصر الكميات المتبقية من القفازات والمعقمات وأكياس التعقيم.",
            status: "todo",
            priority: "normal",
            dueAt: atTime(2, 15),
            activities: {
              create: {
                actorId: user.id,
                action: "created",
                toValue: "todo",
              },
            },
          },
        });
        await tx.clinicTask.create({
          data: {
            doctorId: user.id,
            patientId: mariam.id,
            assignedToId: secretary.id,
            createdById: user.id,
            title: "إرسال موعد إعادة فحص CBC",
            description:
              "تم إرسال تذكير للمريضة بإعادة التحليل بعد ستة أسابيع.",
            status: "done",
            priority: "low",
            dueAt: atTime(-1, 12),
            completedAt: atTime(-1, 10),
            comments: {
              create: {
                authorId: secretary.id,
                body: "تم التواصل وتأكيد استلام التعليمات.",
              },
            },
            activities: {
              create: [
                {
                  actorId: user.id,
                  action: "created",
                  toValue: "todo",
                },
                {
                  actorId: secretary.id,
                  action: "status",
                  fromValue: "todo",
                  toValue: "done",
                },
              ],
            },
          },
        });

        await tx.subscription.update({
          where: { id: activeSubscription.id },
          data: { notes: DEMO_DATASET_VERSION },
        });
      },
      { timeout: 20_000 }
    );
  }

  return {
    id: fromDbId(user.id),
    name: user.name,
    phoneNumber: user.phoneNumber,
    type: "doctor",
    doctorId: null,
    isConfirmed: true,
    sessionId: PUBLIC_DEMO_SESSION_ID,
  };
}
