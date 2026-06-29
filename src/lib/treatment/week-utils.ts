import { todayDateKey } from "@/lib/treatment/constants";

export function dateKeyFromDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** أسبوع يبدأ من الأحد وينتهي السبت */
export function weekRangeForDate(anchor = new Date()): {
  from: string;
  to: string;
  days: string[];
} {
  const d = new Date(anchor);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(dateKeyFromDate(day));
  }

  return { from: days[0]!, to: days[6]!, days };
}

export function shiftWeek(dateKey: string, weeks: number): string {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + weeks * 7);
  return dateKeyFromDate(d);
}

export function formatWeekDayShort(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ar-SY", {
    weekday: "short",
    numberingSystem: "latn",
  });
}

export function formatWeekDayLabel(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString("ar-SY", {
    weekday: "long",
    day: "numeric",
    month: "short",
    numberingSystem: "latn",
  });
}

export function currentWeekRange() {
  return weekRangeForDate(new Date(todayDateKey() + "T12:00:00"));
}
