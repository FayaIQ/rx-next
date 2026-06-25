import { DentalChartClient } from "@/components/dental/dental-chart-client";

export const dynamic = "force-dynamic";

export default async function DentalPatientChartPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  return <DentalChartClient patientId={Number(patientId)} />;
}
