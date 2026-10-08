import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromDbId } from "@/lib/bigint";
import { buildPaginationMeta } from "@/lib/pagination";

/** Search the doctor's library and shared catalog without exposing other doctors' medicines. */
export async function searchMedicineLibrary(doctorId: bigint, q: string, page: number, pageSize: number) {
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const matches = Prisma.sql`
    SELECT m.id, NULL::bigint AS "catalogId", m.name, m.type, m.dosage,
      m.quantity, m.period, m.time_of_use AS "timeOfUse",
      m.created_at AS "createdAt", m.updated_at AS "updatedAt"
    FROM medicines m
    WHERE m.doctor_id = ${doctorId} AND m.name ILIKE ${pattern}
    UNION ALL
    SELECT -d.id, d.id AS "catalogId", d.name, d.type, d.dosage,
      d.quantity, d.period, d.time_of_use AS "timeOfUse",
      d.created_at AS "createdAt", d.updated_at AS "updatedAt"
    FROM default_medicines d
    WHERE d.name ILIKE ${pattern}
      AND NOT EXISTS (
        SELECT 1 FROM medicines own
        WHERE own.doctor_id = ${doctorId} AND own.name = d.name
          AND own.type = COALESCE(d.type, '') AND own.dosage = COALESCE(d.dosage, '')
      )
  `;
  const [count] = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total FROM (${matches}) matches
  `;
  const pagination = buildPaginationMeta(page, pageSize, Number(count.total));
  const rows = await prisma.$queryRaw<Array<{
    id: bigint; catalogId: bigint | null; name: string;
    type: string | null; dosage: string | null; quantity: string | null;
    period: string | null; timeOfUse: string | null;
    createdAt: Date | null; updatedAt: Date | null;
  }>>`
    SELECT * FROM (${matches}) matches
    ORDER BY name ASC, id ASC
    LIMIT ${pageSize} OFFSET ${(pagination.page - 1) * pageSize}
  `;
  return {
    medicines: rows.map((row) => ({
      ...row,
      // Catalog IDs use a separate key space; these rows cannot be edited or deleted.
      id: fromDbId(row.id),
      catalogId: row.catalogId === null ? undefined : fromDbId(row.catalogId),
      doctorId: fromDbId(doctorId),
      type: row.type || null, dosage: row.dosage || null, quantity: row.quantity || null,
      period: row.period || null, timeOfUse: row.timeOfUse || null,
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    })),
    pagination,
  };
}
