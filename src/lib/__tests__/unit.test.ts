import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { migrateRecipeFontId, recipeFontFamilyName } from "../recipe-fonts";
import { normalizeQueueStatus } from "../visit-queue/constants";
import { normalizePatientFieldsArray } from "../patient-field-display";
import { sendOtp } from "../otp";
import { sendCflowWelcomeMessage } from "../cflow-messages";
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
import {
  CLINIC_FEATURE_KEYS,
  isClinicFeatureEffectivelyEnabled,
  resolveClinicFeatureForPath,
} from "../clinic-features-shared";
import {
  buildPrescriptionAdditionalInfo,
  readPrescriptionDocumentMeta,
} from "../prescription-document-kind";
import { prescriptionSchema } from "../validations/rx";
import { composeInternationalPhone } from "../phone-countries";
import {
  getPhoneLookupVariants,
  normalizePhoneForAuth,
} from "../patient-utils";
import { buildDashboardVisitActivity } from "../dashboard-visit-activity";
import { seoPages } from "../seo-pages";

const originalFetch = globalThis.fetch;
const originalCflowKey = process.env.CFLOW_OTP_KEY;
const originalCflowUrl = process.env.CFLOW_OTP_URL;
const originalCflowMessagesKey = process.env.CFLOW_MESSAGES_KEY;
const originalCflowMessagesUrl = process.env.CFLOW_MESSAGES_URL;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalCflowKey === undefined) delete process.env.CFLOW_OTP_KEY;
  else process.env.CFLOW_OTP_KEY = originalCflowKey;
  if (originalCflowUrl === undefined) delete process.env.CFLOW_OTP_URL;
  else process.env.CFLOW_OTP_URL = originalCflowUrl;
  if (originalCflowMessagesKey === undefined) delete process.env.CFLOW_MESSAGES_KEY;
  else process.env.CFLOW_MESSAGES_KEY = originalCflowMessagesKey;
  if (originalCflowMessagesUrl === undefined) delete process.env.CFLOW_MESSAGES_URL;
  else process.env.CFLOW_MESSAGES_URL = originalCflowMessagesUrl;
});

describe("SEO and AI discovery pages", () => {
  it("keeps canonical paths unique and all internal recommendations valid", () => {
    const paths = seoPages.map((page) => page.path);
    const knownPaths = new Set(paths);

    assert.equal(knownPaths.size, paths.length);
    for (const page of seoPages) {
      assert.match(page.path, /^\/[a-z0-9-/]+$/);
      assert.ok(page.metaTitle.length >= 20 && page.metaTitle.length <= 65);
      assert.ok(page.description.length >= 80 && page.description.length <= 180);
      for (const relatedPath of page.relatedPaths) {
        assert.ok(knownPaths.has(relatedPath), `${page.path} links to unknown SEO page ${relatedPath}`);
      }
    }
  });

  it("gives high-intent editorial pages quotable answers and trust signals", () => {
    const editorialPages = seoPages.filter(
      (page) => page.kind === "article" || page.kind === "comparison"
    );

    assert.ok(editorialPages.length >= 3);
    for (const page of editorialPages) {
      assert.ok(page.quickAnswer && page.quickAnswer.length >= 100);
      assert.ok(page.keyFacts && page.keyFacts.length >= 4);
      assert.ok(page.author);
      assert.ok(page.publishedAt);
      assert.ok(page.updatedAt);
    }
  });
});

describe("admin dashboard visit activity", () => {
  it("counts prescription and explicit visits once per patient and day", () => {
    const periodStart = new Date(2026, 7, 1);
    const previousStart = new Date(2026, 6, 18);
    const activity = buildDashboardVisitActivity(
      [
        { doctorId: 10n, patientId: 1n, date: new Date(2026, 7, 2, 9) },
        { doctorId: 10n, patientId: 1n, date: new Date(2026, 7, 2, 12) },
        { doctorId: 10n, patientId: 1n, date: new Date(2026, 7, 2, 15) },
        { doctorId: 10n, patientId: 2n, date: new Date(2026, 7, 2, 10) },
        { doctorId: 10n, patientId: 1n, date: new Date(2026, 7, 3, 10) },
        { doctorId: 10n, patientId: 3n, date: new Date(2026, 6, 25, 10) },
        { doctorId: 20n, patientId: 4n, date: new Date(2026, 7, 2, 10) },
        { doctorId: null, patientId: 5n, date: new Date(2026, 7, 2, 10) },
      ],
      periodStart,
      previousStart
    );

    assert.equal(activity.currentCounts.get("10"), 3);
    assert.equal(activity.previousCounts.get("10"), 1);
    assert.equal(activity.currentCounts.get("20"), 1);
    assert.equal(activity.currentTrend.get("2026-08-02"), 3);
    assert.equal(activity.currentTrend.get("2026-08-03"), 1);
  });
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

describe("repeatable test doctor", () => {
  it("recognizes Iraqi local and international formats in production", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      assert.equal(isDevTestDoctorPhone(DEV_TEST_DOCTOR_PHONE), true);
      assert.equal(isDevTestDoctorPhone("+964 770 000 0000"), true);
      assert.equal(isDevTestDoctorPhone("07711111111"), false);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});

describe("Iraqi auth phone numbers", () => {
  it("accepts Zain 078 numbers in local and international forms", () => {
    assert.equal(
      composeInternationalPhone("+964", "0780 123 4567"),
      "+9647801234567"
    );
    assert.equal(normalizePhoneForAuth("07801234567"), "+9647801234567");
    assert.equal(
      normalizePhoneForAuth("+964 780 123 4567"),
      "+9647801234567"
    );
    assert.ok(
      getPhoneLookupVariants("07801234567").includes("+9647801234567")
    );
  });

  it("normalizes pasted full and Arabic-digit phone numbers", () => {
    assert.equal(
      composeInternationalPhone("+964", "+964 780 123 4567"),
      "+9647801234567"
    );
    assert.equal(
      composeInternationalPhone("+964", "٠٧٨٠١٢٣٤٥٦٧"),
      "+9647801234567"
    );
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

describe("prescription and message documents", () => {
  it("allows a selected patient to be saved without medicines", () => {
    const result = prescriptionSchema.safeParse({
      patientId: 7,
      prescriptionDate: new Date().toISOString(),
      items: [],
    });
    assert.equal(result.success, true);
  });

  it("stores message mode and keeps unrelated additional information", () => {
    const info = buildPrescriptionAdditionalInfo(
      { source: "composer" },
      "message",
      "راجع العيادة بعد أسبوع"
    );
    assert.deepEqual(readPrescriptionDocumentMeta(info), {
      documentKind: "message",
      messageText: "راجع العيادة بعد أسبوع",
    });
    assert.equal(info.source, "composer");
  });
});

describe("clinic feature dependencies", () => {
  it("hides treatment everywhere when dental is disabled", () => {
    const enabledMap = Object.fromEntries(
      CLINIC_FEATURE_KEYS.map((key) => [key, true])
    ) as Record<(typeof CLINIC_FEATURE_KEYS)[number], boolean>;

    enabledMap.dental = false;
    assert.equal(
      isClinicFeatureEffectivelyEnabled(enabledMap, "treatment"),
      false
    );
    assert.equal(isClinicFeatureEffectivelyEnabled(enabledMap, "patients"), true);

    enabledMap.dental = true;
    enabledMap.treatment = false;
    assert.equal(
      isClinicFeatureEffectivelyEnabled(enabledMap, "treatment"),
      false
    );
    assert.equal(resolveClinicFeatureForPath("/patients/9/dental"), "dental");
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

describe("CFlow welcome messages", () => {
  it("sends the welcome template once with a stable idempotency key", async () => {
    process.env.CFLOW_MESSAGES_KEY = "test-message-key";
    process.env.CFLOW_MESSAGES_URL = "https://messages.example.test/api/send/";
    let requestedUrl = "";
    let requestInit: RequestInit | undefined;
    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      requestInit = init;
      return Response.json({ success: true }, { status: 201 });
    };

    const result = await sendCflowWelcomeMessage({
      doctorId: "42",
      name: "أحمد علي",
      phone: "07847076026",
    });

    assert.equal(result.ok, true);
    assert.equal(requestedUrl, "https://messages.example.test/api/send");
    assert.equal(
      new Headers(requestInit?.headers).get("Idempotency-Key"),
      "rx-doctor-42-welcome-v1"
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
      phone: "+9647847076026",
      name: "أحمد علي",
      variables: ["أحمد علي"],
    });
  });
});
