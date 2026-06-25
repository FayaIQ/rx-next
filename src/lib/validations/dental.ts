import { z } from "zod";
import { FDI_ALL, TOOTH_STATUSES } from "@/lib/dental/constants";

const statusIds = TOOTH_STATUSES.map((s) => s.id) as [string, ...string[]];

export const dentalToothRecordSchema = z.object({
  toothFdi: z.number().refine((n) => (FDI_ALL as readonly number[]).includes(n), {
    message: "رقم السن غير صالح (نظام FDI)",
  }),
  status: z.enum(statusIds),
  notes: z.string().nullable().optional(),
});

export const dentalChartUpdateSchema = z.object({
  notes: z.string().nullable().optional(),
  teeth: z.array(dentalToothRecordSchema).default([]),
});

export type DentalChartUpdateInput = z.infer<typeof dentalChartUpdateSchema>;
