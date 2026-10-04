import { z } from "zod";

export const manualVisitCreateSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  summary: z.string().max(500).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  clientRequestId: z.string().uuid().optional(),
}).refine((body) => Boolean(body.summary?.trim() || body.notes?.trim()), {
  message: "أدخل ملخص الزيارة أو ملاحظاتها",
});
