import { prisma } from "@/lib/prisma";

const TOOTH_NOTES_RE = /سن\s*(\d{1,2})/;

export function parseToothFdiFromNotes(notes: string | null | undefined): number | null {
  if (!notes?.trim()) return null;
  const match = notes.match(TOOTH_NOTES_RE);
  if (!match?.[1]) return null;
  const fdi = Number(match[1]);
  return Number.isFinite(fdi) ? fdi : null;
}

export async function loadTreatmentToothMap(
  appointmentIds: Array<bigint | number>
): Promise<Map<string, number>> {
  if (appointmentIds.length === 0) return new Map();

  const sessions = await prisma.treatmentSession.findMany({
    where: {
      appointmentId: { in: appointmentIds.map((id) => BigInt(id)) },
    },
    select: {
      appointmentId: true,
      plan: { select: { toothFdi: true } },
    },
  });

  const map = new Map<string, number>();
  for (const session of sessions) {
    if (session.appointmentId) {
      map.set(session.appointmentId.toString(), session.plan.toothFdi);
    }
  }
  return map;
}
