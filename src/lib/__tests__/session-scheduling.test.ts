import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sessionAppointmentDatetime, sessionTimeInput, sessionDateTimeInput, sessionDateTimeFromInput, sessionVisitDate } from "../treatment/session-datetime";
import { todayDateKey } from "../treatment/constants";
import { treatmentPlanCreateSchema, treatmentSessionCreateSchema, treatmentSessionUpdateSchema } from "../validations/treatment";

describe("treatment session scheduling", () => {
  it("uses the current Baghdad clock, including midnight", () => {
    assert.equal(sessionTimeInput(new Date("2026-10-13T14:42:00Z")), "17:42");
    assert.equal(sessionTimeInput(new Date("2026-10-13T21:00:00Z")), "00:00");
  });

  it("keeps the chosen clinic day and time when converting to UTC", () => {
    const day = new Date("2026-10-14T00:00:00Z");
    assert.equal(sessionAppointmentDatetime(day, "17:42").toISOString(), "2026-10-14T14:42:00.000Z");
    assert.equal(sessionAppointmentDatetime(day, "00:30").toISOString(), "2026-10-13T21:30:00.000Z");
    assert.equal(sessionAppointmentDatetime(day, "23:59").toISOString(), "2026-10-14T20:59:00.000Z");
  });

  it("keeps yesterday and midnight stable regardless of the device or server timezone", () => {
    const actual = sessionDateTimeFromInput("2026-11-08T00:30");
    assert.equal(actual.toISOString(), "2026-11-07T21:30:00.000Z");
    assert.equal(sessionDateTimeInput(actual), "2026-11-08T00:30");
    assert.equal(sessionVisitDate(actual).toISOString().slice(0, 10), "2026-11-08");
    assert.equal(todayDateKey(new Date("2026-11-08T20:59:59Z")), "2026-11-08");
    assert.equal(todayDateKey(new Date("2026-11-08T21:00:00Z")), "2026-11-09");
    for (const value of ["", "2026-02-30T12:00", "2026-11-08T24:00", "2026-11-08T10:60", "2026-11-08T12:00Z"]) assert.equal(Number.isNaN(sessionDateTimeFromInput(value).getTime()), true);
  });

  it("accepts manual times and older clients, and rejects invalid clock values", () => {
    const plan = treatmentPlanCreateSchema.parse({ toothFdi: 11, treatmentType: "root_canal", sessions: [{ sessionNumber: 1, scheduledDate: "2026-10-14", scheduledTime: "00:30" }] });
    assert.equal(plan.sessions?.[0].scheduledTime, "00:30");
    assert.equal(treatmentSessionCreateSchema.parse({ scheduledTime: "23:59" }).scheduledTime, "23:59");
    assert.equal(treatmentSessionUpdateSchema.parse({ scheduledTime: "18:45" }).scheduledTime, "18:45");
    assert.equal(treatmentSessionCreateSchema.safeParse({ scheduledDate: "2026-10-14" }).success, true);
    for (const scheduledTime of ["24:00", "12:60", "1:30", "", null, "17:42:30"]) {
      assert.equal(treatmentSessionCreateSchema.safeParse({ scheduledTime }).success, false);
      assert.equal(treatmentSessionUpdateSchema.safeParse({ scheduledTime }).success, false);
    }
  });
});
