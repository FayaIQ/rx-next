import { requireSubscription } from "@/lib/auth-server";
import { toUserId } from "@/lib/user-id";
import { listLegacyBatches } from "@/lib/legacy-import/read";
import { LegacyArchiveClient } from "@/components/patients/legacy-archive-client";

export default async function LegacyImportsPage() {
  const session = await requireSubscription();
  const doctorId = toUserId(session.user.id);
  return <LegacyArchiveClient doctorId={doctorId} batches={await listLegacyBatches(doctorId)} />;
}
