import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { toUserId } from "@/lib/user-id";
import { loadPatientFile } from "@/lib/patient-file/load-patient-file";
import { PatientDentalPrintClient } from "./print-client";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
};

export default async function PatientDentalPrintPage({
  params,
  searchParams,
}: Params) {
  const session = await auth();
  if (!session?.user || session.user.type !== "doctor") {
    redirect("/auth/signin");
  }

  const doctorId = toUserId(session.user.id);
  const { id } = await params;
  const { auto } = await searchParams;
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();

  const file = await loadPatientFile(doctorId, patientId);
  if (!file) notFound();

  const teeth =
    file.dentalChart?.teeth.filter(
      (t) => t.status !== "healthy" || t.notes
    ) ?? [];

  return (
    <PatientDentalPrintClient
      patientId={patientId}
      patientName={file.patient.name}
      chartNotes={file.dentalChart?.notes ?? null}
      teeth={teeth}
      treatmentPlans={file.treatmentPlans.map((p) => ({
        id: p.id,
        toothFdi: p.toothFdi,
        treatmentType: p.treatmentType,
        sessions: p.sessions ?? [],
      }))}
      autoPrint={auto !== "0"}
    />
  );
}
