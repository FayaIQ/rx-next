import assert from "node:assert/strict";
import { test } from "node:test";

// Read-only checks against a seeded database; no clinic records are changed.
test("shared medicine search includes unimported catalog entries and isolates doctor libraries", {
  skip: !process.env.RUN_DB_TESTS,
}, async (t) => {
  const { prisma } = await import("../prisma");
  const { searchMedicineLibrary } = await import("../medicine-library-search");
  try {
    const shared = await prisma.defaultMedicine.findFirst();
    if (!shared) return t.skip("Seed the shared medicine catalog first");
    const maxDoctor = await prisma.user.aggregate({ _max: { id: true } });
    const emptyDoctorId = (maxDoctor._max.id ?? 0n) + 1n;
    const result = await searchMedicineLibrary(emptyDoctorId, shared.name, 999, 20);
    assert.ok(result.medicines.length > 0);
    assert.ok(result.medicines.every((medicine) => medicine.catalogId && medicine.id < 0));
    assert.equal(result.pagination.page, result.pagination.totalPages);

    const [imported] = await prisma.$queryRaw<Array<{ id: bigint; catalogId: bigint; doctorId: bigint; name: string }>>`
      SELECT m.id, d.id AS "catalogId", m.doctor_id AS "doctorId", m.name
      FROM medicines m JOIN default_medicines d ON m.name = d.name
        AND m.type = COALESCE(d.type, '') AND m.dosage = COALESCE(d.dosage, '')
      LIMIT 1
    `;
    if (imported) {
      const owned = await searchMedicineLibrary(imported.doctorId, imported.name, 1, 100);
      assert.ok(owned.medicines.some((medicine) => medicine.id === Number(imported.id)));
      assert.ok(owned.medicines.every((medicine) => medicine.catalogId !== Number(imported.catalogId)));
      const privateIds = owned.medicines.filter((medicine) => !medicine.catalogId).map((medicine) => BigInt(medicine.id));
      assert.equal(await prisma.medicine.count({ where: { id: { in: privateIds }, doctorId: imported.doctorId } }), privateIds.length);
    }
  } finally {
    await prisma.$disconnect();
  }
});
