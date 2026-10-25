import type { Prisma } from "@prisma/client";
import { fromDbId } from "@/lib/bigint";
import type { sessionNoteTemplateSchema } from "@/lib/treatment/session-note-template";
import type { z } from "zod";

type Db = Pick<Prisma.TransactionClient, "dentalSessionTemplate">;
export type SessionNoteTemplateInput = z.infer<typeof sessionNoteTemplateSchema>;

export async function saveSessionNoteTemplate(db: Db, doctorId: bigint, data: SessionNoteTemplateInput, id?: bigint) {
  if (id !== undefined) {
    const result = await db.dentalSessionTemplate.updateMany({ where: { id, doctorId }, data });
    if (!result.count) return null;
    return db.dentalSessionTemplate.findFirst({ where: { id, doctorId } });
  }
  return db.dentalSessionTemplate.create({ data: { ...data, doctorId } });
}

export async function deleteSessionNoteTemplate(db: Db, doctorId: bigint, id: bigint) {
  return (await db.dentalSessionTemplate.deleteMany({ where: { id, doctorId } })).count > 0;
}

export function serializeSessionNoteTemplate(row: { id: bigint; name: string; treatmentType: string | null; notes: string }) {
  return { id: fromDbId(row.id), name: row.name, treatmentType: row.treatmentType, notes: row.notes };
}
