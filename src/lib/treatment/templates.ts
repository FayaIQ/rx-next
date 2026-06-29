import type { TreatmentTypeId } from "@/lib/treatment/constants";
import { todayDateKey } from "@/lib/treatment/constants";

export type TreatmentTemplate = {
  id: string;
  label: string;
  treatmentType: TreatmentTypeId;
  totalSessions: number;
  /** Days after first session for each subsequent session */
  intervalDays: number;
};

export const TREATMENT_TEMPLATES: TreatmentTemplate[] = [
  {
    id: "root_canal_standard",
    label: "علاج جذر — 3 جلسات (أسبوعي)",
    treatmentType: "root_canal",
    totalSessions: 3,
    intervalDays: 7,
  },
  {
    id: "crown_standard",
    label: "تاج — جلستان",
    treatmentType: "crown",
    totalSessions: 2,
    intervalDays: 7,
  },
  {
    id: "implant_standard",
    label: "زرعة — 4 جلسات",
    treatmentType: "implant",
    totalSessions: 4,
    intervalDays: 14,
  },
  {
    id: "caries_standard",
    label: "تسوس — جلستان",
    treatmentType: "caries",
    totalSessions: 2,
    intervalDays: 3,
  },
  {
    id: "cleaning_single",
    label: "تنظيف — جلسة واحدة",
    treatmentType: "cleaning",
    totalSessions: 1,
    intervalDays: 0,
  },
];

function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function buildSessionsFromTemplate(template: TreatmentTemplate) {
  const start = todayDateKey();
  return Array.from({ length: template.totalSessions }, (_, i) => ({
    sessionNumber: i + 1,
    scheduledDate:
      i === 0 ? start : addDays(start, template.intervalDays * i),
    notes: null as string | null,
  }));
}
