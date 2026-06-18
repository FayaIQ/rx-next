import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { toUserId } from "@/lib/user-id";
import { loadPrescriptionDocument } from "@/lib/prescription-document-data";
import PrescriptionPrintClient from "./print-client";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
};

export default async function PrescriptionPrintPage({
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
  const data = await loadPrescriptionDocument(doctorId, Number(id));

  if (!data) notFound();

  return (
    <PrescriptionPrintClient
      data={data}
      prescriptionId={Number(id)}
      autoPrint={auto !== "0"}
    />
  );
}
