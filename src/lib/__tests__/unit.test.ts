import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { migrateRecipeFontId, recipeFontFamilyName } from "../recipe-fonts.ts";
import { normalizeQueueStatus } from "../visit-queue/constants.ts";
import { normalizePatientFieldsArray } from "../patient-field-display.ts";

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
