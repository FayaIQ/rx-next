import assert from "node:assert/strict";
import { test } from "node:test";
import { medicalDate, patientFields, medicineFields, observationFields, recordDate } from "../legacy-import/medical-display";
import type { ArchiveRecord } from "../legacy-import/types";

const fixture = (entity: ArchiveRecord["entity"], fields: Record<string, unknown>, reasons: string[] = []): ArchiveRecord => ({
  id: "1", entity, sourceId: "1", sourcePatientId: "1", sourceVisitId: null,
  sourceDate: "2019-12-21T00:00:00.1234567", eventDay: "2019-12-21", displayName: "Fixture",
  sourceDeleted: false, state: reasons.length ? "review" : "ready", reviewReasons: reasons,
  presentation: { fields, enumLabels: { PersonalInformation_Sex: "Male", DurationUnit: "Day", RelationToMeal: "AfterMeal" } },
});
test("medical dates preserve the source day without ISO syntax, fractions or fake midnight", () => {
  assert.equal(medicalDate("2019-12-21T00:00:00.1234567", "ar", true), "21/12/2019");
  assert.equal(medicalDate("2026-11-05T19:54:46.0173690", "ar", true), "05/11/2026 · 7:54 مساءً");
  assert.equal(medicalDate("2026-10-31T23:59:59.9999999"), "31/10/2026");
});
test("patient presentation hides technical enums and placeholder contacts without changing the original", () => {
  const row = fixture("Patients", { PersonalInformation_Sex: 1, PersonalInformation_PhoneNumber: "11111111111", PersonalInformation_Birthdate: "1985-01-01T00:00:00", SmokingStatus: 2, BloodGroup: 0, IsFavourite: true }, ["phone_placeholder"]);
  const original = JSON.stringify(row);
  const fields = patientFields(row);
  assert(fields.some((f) => f.value === "ذكر"));
  assert(fields.some((f) => f.value === "01/01/1985"));
  assert(!JSON.stringify(fields).match(/SmokingStatus|IsFavourite|11111111111|Male|T00:|رمز/));
  assert.equal(JSON.stringify(row), original);
});
test("medicine presentation uses evidenced directions and never invents an interval or unknown unit", () => {
  const row = fixture("PrescribedDrugs", { Dose: "5", DoseUnit: "mg", FrequencyStart: "1", FrequencyEnd: "3", Duration: "7", DurationUnit: 1, RelationToMeal: 1 });
  assert.deepEqual(medicineFields(row), [
    { label: "الجرعة", value: "5 mg" }, { label: "الجدول المدوّن", value: "1 × 3" },
    { label: "المدة", value: "7 يوم" }, { label: "وقت الاستخدام", value: "بعد الطعام" },
  ]);
  delete row.presentation.enumLabels;
  assert(!medicineFields(row).some((f) => f.label === "المدة" || f.label === "وقت الاستخدام"));
});
test("invalid dates and observations are not displayed as verified clinical values after acceptance", () => {
  const row = fixture("VitalSigns", { Spo2: "101", PulseRate: -2, TemperatureCelsius: "37.0", Consciousness: 0 }, ["future_date", "invalid_vital"]);
  row.reviewAccepted = true;
  assert.equal(recordDate(row), "");
  assert.deepEqual(observationFields(row), [{ label: "الحرارة", value: "37.0 °C" }]);
});
