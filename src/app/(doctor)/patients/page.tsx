import { PatientsPageClient } from "@/components/patients/patients-page";
import { requireSubscription } from "@/lib/auth-server";
import { toUserId } from "@/lib/user-id";
import { listLegacyBatches } from "@/lib/legacy-import/read";

export default async function PatientsPage() {
  const session = await requireSubscription();
  const batches = await listLegacyBatches(toUserId(session.user.id));
  const archiveCount = batches.filter(b => !b.nativeCompletedAt).reduce((n, b) => n + (b.stats.entities.Patients?.ready ?? 0) + (b.stats.entities.Patients?.review ?? 0), 0);
  return <PatientsPageClient archiveCount={archiveCount} />;
}
