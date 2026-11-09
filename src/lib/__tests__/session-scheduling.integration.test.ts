import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("plan times persist and linked appointments retain manual changes", { skip: !process.env.RUN_DB_TESTS }, async () => {
  const { prisma } = await import("../prisma");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { syncSessionAppointment } = await import("../treatment/session-appointment");
  const { sessionTimeInput } = await import("../treatment/session-datetime");
  const { serializeTreatmentPlan } = await import("../treatment/serializer");
  const doctor = await prisma.user.create({ data: { name: "Scheduling fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Scheduling fixture", gender: "female" } });
    const plan = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, {
      toothFdi: 11, treatmentType: "root_canal", sessions: [
        { sessionNumber: 1, scheduledDate: "2026-10-14", scheduledTime: "17:42" },
        { sessionNumber: 2, scheduledDate: "2026-10-21", scheduledTime: "00:30" },
        { sessionNumber: 3, scheduledDate: null, scheduledTime: "19:15" },
      ],
    });
    assert.deepEqual(plan.sessions?.map((s) => s.scheduledTime), ["17:42", "00:30", "19:15"]);
    const firstId = BigInt(plan.sessions![0].id);
    const secondId = BigInt(plan.sessions![1].id);
    const first = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: firstId }, include: { appointment: true } });
    assert.equal(first.appointment?.appointmentDatetime.toISOString(), "2026-10-14T14:42:00.000Z");
    const second = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: secondId }, include: { appointment: true } });
    assert.equal(second.appointment?.appointmentDatetime.toISOString(), "2026-10-20T21:30:00.000Z");
    assert.equal(await prisma.appointment.count({ where: { patientId: patient.id } }), 2);

    await prisma.treatmentSession.update({ where: { id: firstId }, data: { scheduledTime: "18:45" } });
    await syncSessionAppointment(firstId);
    await prisma.treatmentSession.update({ where: { id: firstId }, data: { scheduledDate: new Date("2026-10-15T00:00:00Z") } });
    await syncSessionAppointment(firstId);
    const changed = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: firstId }, include: { appointment: true } });
    assert.equal(changed.appointmentId, first.appointmentId);
    assert.equal(changed.appointment?.appointmentDatetime.toISOString(), "2026-10-15T15:45:00.000Z");
    assert.equal(changed.appointment?.bookingDate?.toISOString().slice(0, 10), "2026-10-15");

    // Older sessions keep their existing appointment clock during the upgrade.
    await prisma.treatmentSession.update({ where: { id: firstId }, data: { scheduledTime: null } });
    await syncSessionAppointment(firstId);
    assert.equal((await prisma.treatmentSession.findUniqueOrThrow({ where: { id: firstId } })).scheduledTime, "18:45");

    const before = sessionTimeInput();
    const defaultPlan = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, { toothFdi: 12, treatmentType: "cleaning" });
    const after = sessionTimeInput();
    assert.ok([before, after].includes(defaultPlan.sessions![0].scheduledTime!));
    const defaultSession = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: BigInt(defaultPlan.sessions![0].id) }, include: { appointment: true } });
    assert.equal(sessionTimeInput(defaultSession.appointment!.appointmentDatetime), defaultSession.scheduledTime);

    const reread = await prisma.treatmentPlan.findUniqueOrThrow({ where: { id: BigInt(plan.id) }, include: { sessions: true } });
    assert.equal(serializeTreatmentPlan(reread).sessions![0].scheduledTime, "18:45");
  } finally {
    await prisma.patient.deleteMany({ where: { doctorId: doctor.id } });
    await prisma.user.delete({ where: { id: doctor.id } });
    await prisma.$disconnect();
  }
});

const localCalendarDb = process.env.RUN_DB_TESTS === "1" && /(?:localhost|127\.0\.0\.1)/.test(process.env.DATABASE_URL ?? "");
test("backdated completed sessions appear on their actual clinic day in the appointment calendar", { skip: !localCalendarDb }, async () => {
  const { prisma } = await import("../prisma");
  const { createTreatmentPlanForPatient } = await import("../treatment/create-plan-service");
  const { syncSessionAppointment, recordSessionVisit } = await import("../treatment/session-appointment");
  const doctor = await prisma.user.create({ data: { name: "Calendar date fixture", phoneNumber: randomUUID(), password: "unused", type: "doctor" } });
  try {
    const patient = await prisma.patient.create({ data: { doctorId: doctor.id, name: "Backdated session fixture", gender: "male" } });
    const plan = await createTreatmentPlanForPatient(Number(doctor.id), patient.id, { toothFdi: 11, treatmentType: "root_canal", sessions: [{ sessionNumber: 1, scheduledDate: "2026-11-09", scheduledTime: "17:00" }, { sessionNumber: 2, scheduledDate: null }] });
    const id = BigInt(plan.sessions![0].id);
    const before = await prisma.treatmentSession.findUniqueOrThrow({ where: { id } });
    const performedAt = new Date("2026-11-07T21:30:00.000Z"); // Nov 8, 00:30 Baghdad.
    await prisma.treatmentSession.update({ where: { id }, data: { status: "completed", performedAt } });
    await recordSessionVisit(id);
    await syncSessionAppointment(id);
    const saved = await prisma.treatmentSession.findUniqueOrThrow({ where: { id }, include: { appointment: true, patientVisit: true } });
    assert.equal(saved.appointmentId, before.appointmentId);
    assert.equal(saved.scheduledDate?.toISOString().slice(0, 10), "2026-11-09");
    assert.equal(saved.appointment?.bookingDate?.toISOString().slice(0, 10), "2026-11-08");
    assert.equal(saved.appointment?.appointmentDatetime.toISOString(), performedAt.toISOString());
    assert.equal(saved.appointment?.status, false);
    assert.equal(saved.patientVisit?.visitDate.toISOString().slice(0, 10), "2026-11-08");
    assert.equal(await prisma.appointment.count({ where: { patientId: patient.id, bookingDate: new Date("2026-11-09") } }), 0);
    // Editing actual completion time and replaying sync updates the same appointment.
    const correctedAt = new Date("2026-11-06T20:59:00Z");
    await prisma.treatmentSession.update({ where: { id }, data: { performedAt: correctedAt } });
    await recordSessionVisit(id); await syncSessionAppointment(id); await syncSessionAppointment(id);
    assert.equal((await prisma.appointment.findUniqueOrThrow({ where: { id: saved.appointmentId! } })).bookingDate?.toISOString().slice(0, 10), "2026-11-06");
    // An unscheduled session completed yesterday also needs a calendar entry.
    const secondId = BigInt(plan.sessions![1].id);
    await prisma.treatmentSession.update({ where: { id: secondId }, data: { status: "completed", performedAt } });
    await syncSessionAppointment(secondId); await recordSessionVisit(secondId);
    const second = await prisma.treatmentSession.findUniqueOrThrow({ where: { id: secondId }, include: { appointment: true } });
    assert.equal(second.appointment?.bookingDate?.toISOString().slice(0, 10), "2026-11-08");
    assert.equal(second.appointment?.status, false);
    assert.equal(await prisma.appointment.count({ where: { patientId: patient.id } }), 2);
  } finally {
    await prisma.user.delete({ where: { id: doctor.id } });
    await prisma.$disconnect();
  }
});
