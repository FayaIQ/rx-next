import { todayDateKey } from "@/lib/treatment/constants";

export function reportMonthRange(monthKey = todayDateKey().slice(0, 7)) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) throw new Error("الشهر غير صالح");
  const [year, month] = monthKey.split("-").map(Number);
  const fromDate = new Date(Date.UTC(year, month - 1, 1));
  const nextDate = new Date(Date.UTC(year, month, 1));
  return {
    key: monthKey,
    timestampRange: {
      gte: new Date(`${fromDate.toISOString().slice(0, 10)}T00:00:00+03:00`),
      lt: new Date(`${nextDate.toISOString().slice(0, 10)}T00:00:00+03:00`),
    },
    dateRange: { gte: fromDate, lt: nextDate },
  };
}
