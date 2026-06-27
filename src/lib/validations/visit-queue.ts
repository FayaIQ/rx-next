import { z } from "zod";
import { VISIT_STATUSES } from "@/lib/visit-queue/constants";

export const visitStatusSchema = z.object({
  visitStatus: z.enum(VISIT_STATUSES),
});
