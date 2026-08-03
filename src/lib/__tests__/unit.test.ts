import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { migrateRecipeFontId, recipeFontFamilyName } from "../recipe-fonts";
import { normalizeQueueStatus } from "../visit-queue/constants";
import { normalizePatientFieldsArray } from "../patient-field-display";
import { sendOtp } from "../otp";
import {
  createClinicTaskSchema,
  updateClinicTaskSchema,
} from "../validations/tasks";
import { doctorOnboardingSchema } from "../validations/settings";
import {
  DEV_TEST_DOCTOR_PHONE,
  isDevTestDoctorPhone,
} from "../dev-test-doctor";
import { defaultRecipeSettingsForDoctor } from "../recipe-settings";
import { ACADEMIC_RECIPE_TEMPLATE_DEFAULTS } from "../academic-recipe-template";
import {
  ACCOUNT_DELETE_PHRASES,
  isValidAccountDeletePhrase,
} from "../account-deletion";
import { optimizeUploadedImage } from "../upload";
import {
  prescriptionDraftHasContent,
  type PrescriptionComposerDraft,
} from "../prescription-draft";

const originalFetch = globalThis.fetch;
const originalCflowKey = process.env.CFLOW_OTP_KEY;
const originalCflowUrl = process.env.CFLOW_OTP_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCflowKey === undefined) delete process.env.CFLOW_OTP_KEY;
  else process.env.CFLOW_OTP_KEY = originalCflowKey;
  if (originalCflowUrl === undefined) delete process.env.CFLOW_OTP_URL;
  else process.env.CFLOW_OTP_URL = originalCflowUrl;
});

describe("recipe fonts", () => {
  it("migrates legacy font ids", () => {
    assert.equal(migrateRecipeFontId("Cairo"), "cairo");
    assert.equal(migrateRecipeFontId("FF_Shamel"), "amiri");
    assert.equal(migrateRecipeFontId("lateef"), "lateef");
  });

  it("builds css family names", () => {
    assert.equal(recipeFontFamilyName("aref_ruqaa_ink"), "RX aref ruqaa ink");
  });
});

describe("visit queue", () => {
  it("normalizes arrived into waiting", () => {
    assert.equal(normalizeQueueStatus("arrived"), "waiting");
    assert.equal(normalizeQueueStatus("scheduled"), "scheduled");
  });
});

describe("patient fields", () => {
  it("normalizes array and wrapped shapes", () => {
    const row = { id: 1, name: "x" } as never;
    assert.deepEqual(normalizePatientFieldsArray([row]), [row]);
    assert.deepEqual(normalizePatientFieldsArray({ fields: [row] }), [row]);
    assert.deepEqual(normalizePatientFieldsArray(undefined), []);
  });
});

describe("doctor onboarding", () => {
  it("trims profile data and normalizes optional values", () => {
    const data = doctorOnboardingSchema.parse({
      clinicName: "  عيادة الشفاء  ",
      doctorName: "  د. أحمد محمد  ",
      doctorSpecialty: "  طب الأسنان  ",
      professionalTitle: "",
      licenseNumber: "  01663/23  ",
      services: "زراعة الأسنان\nتبييض الأسنان",
      phoneNumber: " 07700000000 ",
      email: "",
      address: "  بغداد — الكرادة  ",
    });

    assert.equal(data.doctorName, "د. أحمد محمد");
    assert.equal(data.clinicName, "عيادة الشفاء");
    assert.equal(data.professionalTitle, null);
    assert.equal(data.licenseNumber, "01663/23");
    assert.equal(data.email, null);
  });

  it("rejects incomplete required prescription data", () => {
    assert.equal(
      doctorOnboardingSchema.safeParse({
        doctorName: "د",
        doctorSpecialty: "",
        phoneNumber: "123",
        address: "",
      }).success,
      false
    );
  });

  it("uses the readable academic A5 prescription as the new-doctor default", () => {
    const settings = defaultRecipeSettingsForDoctor(99, {
      name: "د. اختبار",
      phoneNumber: "07700000000",
    });

    assert.equal(settings.designTemplate, "academic");
    assert.equal(settings.paperSize, "A5");
    assert.equal(settings.fontSize, "17");
    assert.equal(
      settings.designItemsHeight,
      ACADEMIC_RECIPE_TEMPLATE_DEFAULTS.designItemsHeight
    );
    assert.equal(settings.designPatientX, 69.5);
    assert.equal(settings.designAgeX, 41);
    assert.equal(settings.designDateX, 17);
  });
});

describe("development test doctor", () => {
  it("recognizes Iraqi local and international formats only outside production", () => {
    const enabled = process.env.NODE_ENV !== "production";
    assert.equal(isDevTestDoctorPhone(DEV_TEST_DOCTOR_PHONE), enabled);
    assert.equal(isDevTestDoctorPhone("+964 770 000 0000"), enabled);
    assert.equal(isDevTestDoctorPhone("07711111111"), false);
  });
});

describe("account deletion confirmations", () => {
  it("accepts only the exact Arabic or English destructive-action phrase", () => {
    assert.equal(isValidAccountDeletePhrase(ACCOUNT_DELETE_PHRASES.ar), true);
    assert.equal(isValidAccountDeletePhrase(ACCOUNT_DELETE_PHRASES.en), true);
    assert.equal(isValidAccountDeletePhrase("حذف حسابي"), false);
    assert.equal(isValidAccountDeletePhrase("delete my account"), false);
  });
});

describe("uploaded images", () => {
  it("keeps transparent PNG pixels transparent after optimization", async () => {
    const transparentPng = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 4,
        background: { r: 15, g: 90, b: 130, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const optimized = await optimizeUploadedImage(transparentPng, 4);
    const metadata = await sharp(optimized).metadata();
    const pixel = await sharp(optimized).ensureAlpha().raw().toBuffer();

    assert.equal(metadata.format, "webp");
    assert.equal(metadata.hasAlpha, true);
    assert.equal(pixel[3], 0);
  });
});

describe("prescription drafts", () => {
  const emptyDraft: PrescriptionComposerDraft = {
    version: 1,
    doctorId: 7,
    savedAt: "2026-08-03T10:00:00.000Z",
    currentPrescriptionId: null,
    prescriptionNumber: 12,
    prescriptionDate: "2026-08-03",
    patientSearch: "",
    selectedPatient: null,
    showNewPatient: false,
    newPatientInitialName: "",
    newPatientDraft: null,
    diagnosis: "",
    consultationFee: 0,
    consultationFeeWaived: false,
    items: [
      {
        key: "medicine-row-0",
        name: "",
        type: "",
        dosage: "",
        quantity: "",
        period: "",
        timeOfUse: "",
      },
    ],
    fieldValues: {},
    xrayImage: null,
    analysisImage: null,
  };

  it("ignores an untouched composer and keeps meaningful medicine input", () => {
    assert.equal(prescriptionDraftHasContent(emptyDraft), false);
    assert.equal(
      prescriptionDraftHasContent({
        ...emptyDraft,
        items: [{ ...emptyDraft.items[0]!, dosage: "500 mg" }],
      }),
      true
    );
  });
});

describe("clinic tasks", () => {
  it("normalizes optional links and applies a normal priority", () => {
    const task = createClinicTaskSchema.parse({
      title: "  Call the patient  ",
      assignedToId: null,
      patientId: null,
      dueAt: "2026-07-27T09:30:00.000Z",
    });

    assert.equal(task.title, "Call the patient");
    assert.equal(task.priority, "normal");
    assert.equal(task.assignedToId, null);
  });

  it("rejects unsafe task states and empty updates", () => {
    assert.equal(
      createClinicTaskSchema.safeParse({
        title: "x",
        priority: "critical",
      }).success,
      false
    );
    assert.equal(updateClinicTaskSchema.safeParse({}).success, false);
    assert.equal(
      updateClinicTaskSchema.safeParse({ status: "in_progress" }).success,
      true
    );
  });
});

describe("CFlow OTP client", () => {
  it("uses the configured base URL without a duplicate slash", async () => {
    process.env.CFLOW_OTP_KEY = "test-key";
    process.env.CFLOW_OTP_URL = "https://otp.example.test/api/otp/";
    let requestedUrl = "";
    globalThis.fetch = async (input) => {
      requestedUrl = String(input);
      return Response.json(
        {
          success: false,
          error: { code: "invalid_phone" },
          request_trace_id: "trace-test",
        },
        { status: 422 }
      );
    };

    const result = await sendOtp("invalid-phone");

    assert.equal(requestedUrl, "https://otp.example.test/api/otp/send");
    assert.equal(result.ok, false);
    assert.equal(result.status, 422);
    assert.equal(result.upstreamCode, "invalid_phone");
    assert.equal(result.requestTraceId, "trace-test");
  });

  it("identifies an upstream API-key rejection as configuration failure", async () => {
    process.env.CFLOW_OTP_KEY = "rejected-key";
    globalThis.fetch = async () =>
      Response.json(
        { success: false, error: { code: "unauthorized" } },
        { status: 401 }
      );

    const result = await sendOtp("+9647000000000");

    assert.equal(result.ok, false);
    assert.equal(result.status, 401);
    assert.match(result.error ?? "", /غير مهيأة/);
  });
});
