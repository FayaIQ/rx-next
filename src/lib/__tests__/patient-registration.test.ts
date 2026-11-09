import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { patientRegistrationTime } from "../patient-registration";
import { reportMonthRange } from "../reports/month-range";
import { localPatientToDto } from "../sync/offline-store";

test("registration keeps its original offline timestamp and does not become the last edit date", () => {
  const syncedAt = new Date("2026-12-01T12:00:00Z");
  const original = "2026-10-31T21:30:00.000Z";
  assert.equal(patientRegistrationTime(original, syncedAt).toISOString(), original);
  assert.equal(patientRegistrationTime(undefined, syncedAt).toISOString(), syncedAt.toISOString());
  assert.equal(patientRegistrationTime("invalid", syncedAt).toISOString(), syncedAt.toISOString());
  assert.equal(patientRegistrationTime("2030-01-01T00:00:00Z", syncedAt).toISOString(), syncedAt.toISOString());
  const dto = localPatientToDto({ id: "offline-registration", name: "Fixture", gender: "male", doctorId: 1, createdAt: original, updatedAt: syncedAt.toISOString(), synced: false });
  assert.equal(dto.createdAt, original);
  assert.equal(dto.updatedAt, syncedAt.toISOString());
});

test("monthly reports use Baghdad midnight for timestamps and calendar dates for date-only records", () => {
  const range = reportMonthRange("2026-11");
  assert.equal(range.timestampRange.gte.toISOString(), "2026-10-31T21:00:00.000Z");
  assert.equal(range.timestampRange.lt.toISOString(), "2026-11-30T21:00:00.000Z");
  assert.equal(range.dateRange.gte.toISOString(), "2026-11-01T00:00:00.000Z");
  assert.equal(range.dateRange.lt.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(reportMonthRange("2026-12").dateRange.lt.toISOString(), "2027-01-01T00:00:00.000Z");
  assert.equal(reportMonthRange("2028-02").dateRange.lt.toISOString(), "2028-03-01T00:00:00.000Z");
  for (const value of ["2026-00", "2026-13", "2026-1", "invalid"]) assert.throws(() => reportMonthRange(value));
});

const localDb = process.env.RUN_DB_TESTS === "1" && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
test("new registrations increment monthly reports; old edits and unknown historical dates do not", { skip: !localDb }, async () => {
  const { prisma } = await import("../prisma");
  const { loadDoctorReports } = await import("../reports/load-reports");
  const { todayDateKey } = await import("../treatment/constants");
  const doctor = await prisma.user.create({ data: { name: "Registration report fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  const other = await prisma.user.create({ data: { name: "Other clinic", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const make = (createdAt: Date | null, doctorId = doctor.id) => prisma.patient.create({ data: { doctorId, name: "Registration fixture", gender: "male", createdAt } });
    const before = await loadDoctorReports(Number(doctor.id), todayDateKey().slice(0, 7));
    assert.equal(before.summary.newPatients, 0);
    const registered = await prisma.patient.create({ data: { doctorId: doctor.id, name: "New registration", gender: "male" } });
    assert(registered.createdAt);
    assert.equal((await loadDoctorReports(Number(doctor.id), todayDateKey().slice(0, 7))).summary.newPatients, 1);
    // Keep the fixed-boundary assertions independent of the day this test runs.
    await prisma.patient.delete({ where: { id: registered.id } });
    const november = await make(patientRegistrationTime("2026-10-31T21:30:00Z", new Date("2026-12-01")));
    const old = await make(new Date("2026-10-31T20:59:59Z"));
    await make(new Date("2026-11-30T21:00:00Z"));
    const unknown = await make(null);
    await make(new Date("2026-11-09T12:00:00Z"), other.id);
    await prisma.patient.update({ where: { id: old.id }, data: { updatedAt: new Date("2026-11-09T12:00:00Z") } });
    await prisma.patient.update({ where: { id: unknown.id }, data: { updatedAt: new Date("2026-11-09T12:00:00Z") } });
    await prisma.financeTransaction.create({ data: { doctorId: doctor.id, patientId: november.id, type: "income", category: "other", amount: 10, currency: "IQD", transactionDate: new Date("2026-11-01") } });
    const report = await loadDoctorReports(Number(doctor.id), "2026-11");
    assert.equal(report.summary.newPatients, 1);
    assert.equal(report.summary.financialTotals[0].income, 10);
    assert.equal((await loadDoctorReports(Number(doctor.id), "2026-10")).summary.newPatients, 1);
    assert.equal((await loadDoctorReports(Number(doctor.id), "2026-12")).summary.newPatients, 1);
    assert.equal((await prisma.patient.findUniqueOrThrow({ where: { id: unknown.id } })).createdAt, null);
    assert.equal((await loadDoctorReports(Number(other.id), "2026-11")).summary.newPatients, 1);
  } finally {
    await prisma.financeTransaction.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.deleteMany({ where: { id: { in: [doctor.id, other.id] } } });
    await prisma.$disconnect();
  }
});
