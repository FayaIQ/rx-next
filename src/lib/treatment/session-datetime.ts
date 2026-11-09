/** All session date/time inputs use the clinic's Baghdad clock. */
export function sessionDateTimeInput(date = new Date()): string {
  return `${sessionVisitDate(date).toISOString().slice(0, 10)}T${sessionTimeInput(date)}`;
}

/** datetime-local has no offset: interpret the chosen value in Baghdad, not the device zone. */
export function sessionDateTimeFromInput(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return new Date(NaN);
  const date = new Date(`${value}:00+03:00`);
  return Number.isFinite(date.getTime()) && sessionDateTimeInput(date) === value ? date : new Date(NaN);
}

/** Scheduled session times use the clinic's Baghdad clock on client and server. */
export function sessionTimeInput(date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
}

export function sessionAppointmentDatetime(scheduledDate: Date, scheduledTime: string): Date {
  const key = scheduledDate.toISOString().slice(0, 10);
  return new Date(`${key}T${scheduledTime}:00+03:00`);
}

/** Visit dates are calendar days at the clinic, including sessions after midnight. */
export function sessionVisitDate(performedAt: Date): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(performedAt);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return new Date(`${part("year")}-${part("month")}-${part("day")}T00:00:00.000Z`);
}
