import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import { toUserId } from "@/lib/user-id";
import { loadPrescriptionDocument } from "@/lib/prescription-document-data";
import { PrescriptionPreviewClient } from "./preview-client";

type Params = { params: Promise<{ id: string }> };

export default async function PrescriptionPreviewPage({ params }: Params) {
  const session = await auth();
  if (!session?.user || session.user.type !== "doctor") {
    redirect("/auth/signin");
  }
  const doctorId = toUserId(session.user.id);

  const { id } = await params;
  const data = await loadPrescriptionDocument(doctorId, Number(id));

  if (!data) notFound();

  return <PrescriptionPreviewClient id={id} data={data} />;
}
