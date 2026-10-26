import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { treatmentPlanCreateSchema } from "../validations/treatment";
import { defaultSessionsForType, treatmentChartHref, treatmentTargetLabel } from "../treatment/constants";
import { buildTreatmentPlanMarkers } from "../dental/treatment-plan-markers";
import type { TreatmentPlanDto } from "../treatment/serializer";

test("full-mouth cleaning needs no tooth and cannot be assigned to one", () => {
  for (const tooth of [{}, { toothFdi: null }]) {
    assert.equal(treatmentPlanCreateSchema.safeParse({ ...tooth, treatmentType: "full_mouth_cleaning" }).success, true);
  }
  assert.equal(defaultSessionsForType("full_mouth_cleaning"), 1);
  assert.equal(treatmentPlanCreateSchema.safeParse({ toothFdi: 11, treatmentType: "full_mouth_cleaning" }).success, false);
  for (const treatmentType of ["root_canal", "cleaning", "other"]) {
    assert.equal(treatmentPlanCreateSchema.safeParse({ toothFdi: null, treatmentType }).success, false);
    assert.equal(treatmentPlanCreateSchema.safeParse({ treatmentType }).success, false);
    assert.equal(treatmentPlanCreateSchema.safeParse({ toothFdi: 36, treatmentType }).success, true);
  }
  assert.equal(treatmentPlanCreateSchema.safeParse({ toothFdi: 0, treatmentType: "cleaning" }).success, false);
});

test("whole-mouth plans link to their own section and never mark an individual tooth", () => {
  assert.equal(treatmentChartHref(7, null), "/dental/7?scope=mouth");
  assert.equal(treatmentChartHref(7, 36), "/dental/7?tooth=36");
  assert.equal(treatmentTargetLabel(null), "الفم بالكامل");
  const plans = [
    { toothFdi: null, treatmentType: "full_mouth_cleaning", status: "active", totalSessions: 1, sessions: [] },
    { toothFdi: 36, treatmentType: "cleaning", status: "active", totalSessions: 1, sessions: [] },
  ] as unknown as TreatmentPlanDto[];
  assert.deepEqual(buildTreatmentPlanMarkers(plans).map((marker) => marker.toothFdi), [36]);
});

// This guard intentionally cannot target a production or shared database.
const localDb = process.env.RUN_DB_TESTS === "1" &&
  /^postgresql:\/\/[^@]+@(?:localhost|127\.0\.0\.1):5432\/rx_mouth_20261026$/.test(process.env.DATABASE_URL ?? "");

test("one whole-mouth plan persists, schedules once, replays safely and completes one visit", { skip: !localDb }, async () => {
  const { prisma } = await import("../prisma");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { recordSessionVisit, syncSessionAppointment } = await import("../treatment/session-appointment");
  const { refreshPlanStatus, assertPlanAccess } = await import("../treatment/plan-utils");
  const doctor = await prisma.user.create({ data: { name: "Whole mouth fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Whole mouth fixture", gender: "female" } });
    const data = treatmentPlanCreateSchema.parse({ toothFdi: null, treatmentType: "full_mouth_cleaning", clientRequestId: randomUUID(), sessions: [{ sessionNumber: 1, scheduledDate: "2026-10-26", scheduledTime: "18:30" }] });
    const [plan, replay] = await Promise.all([createTreatmentPlanForPatient(Number(doctor.id), patient.id, data), createTreatmentPlanForPatient(Number(doctor.id), patient.id, data)]);
    assert.equal(plan.id, replay.id);
    assert.equal(plan.toothFdi, null);
    assert.equal(plan.totalSessions, 1);
    assert.equal(plan.title, "غسل اسنان — الفم بالكامل");
    assert.equal(plan.sessions?.length, 1);
    assert.equal(await prisma.treatmentPlan.count({ where: { patientId: patient.id } }), 1);
    assert.equal((await assertPlanAccess(BigInt(plan.id), doctor.id + 1n)), null);
    const sessionId = BigInt(plan.sessions![0].id);
    await syncSessionAppointment(sessionId);
    const scheduled = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: sessionId }, include: { appointment: true } });
    assert.equal(await prisma.appointment.count({ where: { patientId: patient.id } }), 1);
    assert.equal(scheduled.appointment?.notes, "غسل اسنان — الفم بالكامل · جلسة 1/1");
    assert.equal(scheduled.appointment?.appointmentDatetime.toISOString(), "2026-10-26T15:30:00.000Z");
    await prisma.treatmentSession.update({ where: { id: sessionId }, data: { status: "completed", performedAt: new Date(), notes: "Completed fixture" } });
    await recordSessionVisit(sessionId); await recordSessionVisit(sessionId);
    await syncSessionAppointment(sessionId); await refreshPlanStatus(BigInt(plan.id));
    assert.equal(await prisma.patientVisit.count({ where: { treatmentSessionId: sessionId } }), 1);
    assert.equal((await prisma.patientVisit.findUniqueOrThrow({ where: { treatmentSessionId: sessionId } })).summary, "غسل اسنان — جلسة 1");
    assert.equal((await prisma.treatmentPlan.findUniqueOrThrow({ where: { id: BigInt(plan.id) } })).status, "completed");
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: scheduled.appointmentId! } })).status, false);
    assert.equal(await prisma.dentalToothRecord.count({ where: { chart: { patientId: patient.id } } }), 0);
  } finally {
    await prisma.patient.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.delete({ where: { id: doctor.id } });
    await prisma.$disconnect();
  }
});
