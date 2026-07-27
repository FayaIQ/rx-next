import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateRecipeFontId, recipeFontFamilyName } from "../recipe-fonts";
import { normalizeQueueStatus } from "../visit-queue/constants";
import { normalizePatientFieldsArray } from "../patient-field-display";
import { sendOtp } from "../otp";
import {
  createClinicTaskSchema,
  updateClinicTaskSchema,
} from "../validations/tasks";

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
