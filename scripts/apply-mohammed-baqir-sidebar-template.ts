import { prisma } from "../src/lib/prisma";
import { BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS } from "../src/lib/blue-sidebar-recipe-template";

const DOCTOR_PHONE_VARIANTS = [
  "+9647762235774",
  "9647762235774",
  "07762235774",
  "7762235774",
];
const DOCTOR_EMAIL = "drmohamed@clinic.com";
const DOCTOR_PORTRAIT = "/doctor-assets/mohammed-baqir-alsharaa.png";

async function main() {
  const doctors = await prisma.user.findMany({
    where: {
      type: "doctor",
      OR: [
        { phoneNumber: { in: DOCTOR_PHONE_VARIANTS } },
        {
          recipeSettings: {
            some: {
              email: { equals: DOCTOR_EMAIL, mode: "insensitive" },
            },
          },
        },
      ],
    },
    select: { id: true, name: true, phoneNumber: true },
  });

  if (doctors.length !== 1) {
    throw new Error(
      `Expected exactly one doctor account, found ${doctors.length}. No changes were made.`
    );
  }

  const doctor = doctors[0]!;
  const settings = await prisma.recipeSettings.findFirst({
    where: { doctorId: doctor.id },
    select: { id: true },
  });
  if (!settings) {
    throw new Error("The doctor account has no prescription settings. No changes were made.");
  }

  await prisma.recipeSettings.update({
    where: { id: settings.id },
    data: {
      doctorName: "محمد باقر الشرع",
      doctorSpecialty: "استشاري جراحة العظام والكسور",
      professionalTitle: "M.B.CH.B.F.I.B.MS\nORTHO.ASS.PROF",
      licenseNumber: "25439 بتاريخ 1997-8-28",
      services:
        "وتبديل المفاصل ونواظير الظهر\nوالركبة والإصابات الرياضية\nحاصل على شهادة البورد\nعضو المجلس العالمي لجراحة العظام والكسور",
      additionalText1: "الدكتور الاستشاري",
      phoneNumber: "+9647762235774",
      email: DOCTOR_EMAIL,
      address: "بغداد - ساحة بيروت - مقابل مجسر ساحة بيروت - قرب صيدلية التعافي",
      fontFamily: "cairo",
      fontSize: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.fontSize,
      paperSize: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.paperSize,
      color: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.color,
      logoPath: DOCTOR_PORTRAIT,
      designMode: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designMode,
      designTemplate: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designTemplate,
      designPatientX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientX,
      designPatientY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPatientY,
      designAgeX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeX,
      designAgeY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designAgeY,
      designDateX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateX,
      designDateY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designDateY,
      designPhoneX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPhoneX,
      designPhoneY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designPhoneY,
      designItemsX: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsX,
      designItemsY: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsY,
      designItemsWidth: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsWidth,
      designItemsHeight: BLUE_SIDEBAR_RECIPE_TEMPLATE_DEFAULTS.designItemsHeight,
      printName: true,
      printAge: true,
      printGender: true,
      printPhone: false,
      printDiagnosis: true,
    },
  });

  console.log(
    `Applied the blue sidebar prescription template to doctor ${doctor.id.toString()} (${doctor.name}).`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
