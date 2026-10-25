import { z } from "zod";
import { TREATMENT_TYPES } from "@/lib/treatment/constants";

export const sessionNoteTemplateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  treatmentType: z.enum(TREATMENT_TYPES.map((type) => type.id)).nullable().optional(),
  notes: z.string().trim().min(1).max(2000),
});

/** Preserve the doctor's existing notes; applying the same template twice is a no-op. */
export function appendSessionTemplate(notes: string, template: string): string {
  const current = notes.trim();
  const addition = template.trim();
  const result = !current ? addition : current === addition || current.endsWith(`\n\n${addition}`)
    ? current : `${current}\n\n${addition}`;
  if (result.length > 2000) throw new Error("SESSION_NOTE_TOO_LONG");
  return result;
}
