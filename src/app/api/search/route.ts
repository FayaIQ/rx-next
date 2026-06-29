import { prisma } from "@/lib/prisma";
import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk, apiError } from "@/lib/api/response";
import { toDbId, fromDbId } from "@/lib/bigint";
import { treatmentTypeLabel } from "@/lib/treatment/constants";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return apiError("اكتب حرفين على الأقل للبحث");

  const doctorDbId = toDbId(ctx.doctorId);
  const contains = { contains: q, mode: "insensitive" as const };

  const [patients, prescriptions, appointments, sessions] = await Promise.all([
    prisma.patient.findMany({
      where: {
        doctorId: doctorDbId,
        OR: [{ name: contains }, { phone: contains }, { diagnosis: contains }],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: {
        doctorId: doctorDbId,
        OR: [
          { diagnosis: contains },
          { items: { some: { name: contains } } },
          ...(Number.isFinite(Number(q))
            ? [{ prescriptionNumber: Number(q) }]
            : []),
        ],
      },
      include: { patient: { select: { id: true, name: true } } },
      take: 8,
      orderBy: { prescriptionDate: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId: doctorDbId,
        OR: [
          { notes: contains },
          { patient: { name: contains } },
        ],
      },
      include: { patient: { select: { id: true, name: true } } },
      take: 8,
      orderBy: { appointmentDatetime: "desc" },
    }),
    prisma.treatmentSession.findMany({
      where: {
        doctorId: doctorDbId,
        OR: [{ notes: contains }, { plan: { notes: contains } }],
      },
      include: {
        patient: { select: { id: true, name: true } },
        plan: { select: { toothFdi: true, treatmentType: true } },
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return apiOk({
    patients: patients.map((p) => ({
      id: fromDbId(p.id),
      name: p.name,
      phone: p.phone,
      href: `/patients/${fromDbId(p.id)}/record`,
    })),
    prescriptions: prescriptions.map((rx) => ({
      id: fromDbId(rx.id),
      patientId: fromDbId(rx.patientId),
      patientName: rx.patient.name,
      prescriptionNumber: rx.prescriptionNumber,
      diagnosis: rx.diagnosis,
      href: `/home?id=${fromDbId(rx.id)}`,
    })),
    appointments: appointments.map((a) => ({
      id: fromDbId(a.id),
      patientId: fromDbId(a.patientId),
      patientName: a.patient.name,
      datetime: a.appointmentDatetime.toISOString(),
      href: `/dates`,
    })),
    treatments: sessions.map((s) => ({
      id: fromDbId(s.id),
      patientId: fromDbId(s.patientId),
      patientName: s.patient.name,
      toothFdi: s.plan.toothFdi,
      label: treatmentTypeLabel(s.plan.treatmentType),
      href: `/dental/${fromDbId(s.patientId)}?tooth=${s.plan.toothFdi}`,
    })),
  });
}
