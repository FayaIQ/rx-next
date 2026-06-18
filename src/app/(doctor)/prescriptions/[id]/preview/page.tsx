import { auth } from "@/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toUserId } from "@/lib/user-id";
import { loadPrescriptionDocument } from "@/lib/prescription-document-data";
import { PrescriptionDocument } from "@/components/prescription/prescription-document";

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

  return (
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/home">رجوع</Link>
        </Button>
        <Button asChild>
          <Link href={`/prescriptions/${id}/print`}>طباعة</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/api/prescriptions/${id}/download-pdf`} target="_blank">
            تحميل PDF
          </Link>
        </Button>
      </div>

      <PrescriptionDocument data={data} className="mx-auto" />
    </div>
  );
}
