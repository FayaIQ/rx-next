import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { toUserId } from "@/lib/user-id";
import { loadPatientFile } from "@/lib/patient-file/load-patient-file";
import { PatientSummaryPrintClient } from "./print-client";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
};

export default async function PatientSummaryPrintPage({
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

  return (
    <PatientSummaryPrintClient
      patientId={patientId}
      patientName={file.patient.name}
      phone={file.patient.phone ?? null}
      timeline={file.timeline}
      autoPrint={auto !== "0"}
    />
  );
}
