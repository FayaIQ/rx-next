"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppointmentDto } from "@/lib/api/rx-client";
import { cn } from "@/lib/utils";
import { useLocale, type Locale, type TranslateFn } from "@/i18n/locale-provider";

const MAX_VISIBLE = 3;

type Props = {
  month: Date;
  selectedDate: string;
  todayKey: string;
  appointmentsByDay: Map<string, AppointmentDto[]>;
  onSelectDate: (dateKey: string) => void;
  onMonthChange: (month: Date) => void;
  onToday: () => void;
};

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMonthGrid(month: Date): (string | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const pad = first.getDay();

  const cells: (string | null)[] = Array.from({ length: pad }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateKey(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dateLocale(locale: Locale) {
  return locale === "en" ? "en-GB" : "ar-IQ";
}

function formatMonthLabel(month: Date, locale: Locale): string {
  return month.toLocaleDateString(dateLocale(locale), {
    month: "long",
    year: "numeric",
    numberingSystem: "latn",
  });
}

function formatTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(dateLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

function firstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName.trim();
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

type DayCellProps = {
  dayNum: number;
  appointments: AppointmentDto[];
  isSelected: boolean;
  isToday: boolean;
  onSelect: () => void;
  t: TranslateFn;
  locale: Locale;
};

function DayCell({
  dayNum,
  appointments,
  isSelected,
  isToday,
  onSelect,
  t,
  locale,
}: DayCellProps) {
  const visible = appointments.slice(0, MAX_VISIBLE);
  const hiddenCount = appointments.length - visible.length;
  const hasAppointments = appointments.length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-h-[5.25rem] flex-col rounded-xl border p-1.5 text-right transition-all sm:min-h-[6.5rem] sm:p-2",
        isSelected
          ? "border-rx-primary bg-rx-primary text-white shadow-md ring-2 ring-rx-primary/25"
          : isToday
            ? "border-rx-primary/45 bg-rx-primary/6 shadow-sm"
            : hasAppointments
              ? "border-rx-border/80 bg-rx-surface hover:border-rx-primary/35 hover:shadow-sm"
              : "border-transparent bg-rx-bg-subtle/45 hover:bg-rx-bg-subtle"
      )}
    >
      <div className="mb-1 flex w-full items-center justify-end">
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold leading-none sm:size-7 sm:text-sm",
            isSelected
              ? "bg-white/20 text-white"
              : isToday
                ? "bg-rx-primary text-white"
                : hasAppointments
                  ? "text-rx-text"
                  : "text-rx-muted"
          )}
        >
          {dayNum}
        </span>
      </div>

      {hasAppointments ? (
        <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden">
          {visible.map((ap) => (
            <div
              key={ap.id || ap.appointmentDatetime + String(ap.patientId)}
              className={cn(
                "flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] leading-tight sm:gap-1.5 sm:px-1.5 sm:py-1 sm:text-[10px]",
                isSelected
                  ? "bg-white/15 text-white"
                  : ap.status
                    ? "bg-rx-primary/10 text-rx-text"
                    : "bg-rx-bg-subtle text-rx-muted"
              )}
            >
              <span
                className={cn(
                  "shrink-0 font-mono text-[8px] font-bold sm:text-[9px]",
                  isSelected ? "text-white/90" : "text-rx-primary"
                )}
                dir="ltr"
              >
                {formatTime(ap.appointmentDatetime, locale)}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-medium",
                  !ap.status && "line-through opacity-70"
                )}
              >
                {firstName(ap.patient?.name ?? t("appointments.patient"))}
              </span>
            </div>
          ))}

          {hiddenCount > 0 && (
            <span
              className={cn(
                "mt-auto text-center text-[8px] font-semibold sm:text-[9px]",
                isSelected ? "text-white/80" : "text-rx-muted"
              )}
            >
              {t("appointments.moreHidden", { count: hiddenCount })}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-1 items-end justify-center pb-0.5">
          <span className="text-[9px] text-rx-muted/50 sm:text-[10px]">—</span>
        </div>
      )}
    </button>
  );
}

export function AppointmentCalendar({
  month,
  selectedDate,
  todayKey,
  appointmentsByDay,
  onSelectDate,
  onMonthChange,
  onToday,
}: Props) {
  const { t, locale } = useLocale();
  const cells = buildMonthGrid(month);
  const monthKey = `${month.getFullYear()}-${month.getMonth()}`;
  const isCurrentMonth =
    todayKey.startsWith(
      `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`
    );

  const weekdays = [
    t("appointments.weekdaySun"),
    t("appointments.weekdayMon"),
    t("appointments.weekdayTue"),
    t("appointments.weekdayWed"),
    t("appointments.weekdayThu"),
    t("appointments.weekdayFri"),
    t("appointments.weekdaySat"),
  ];

  function shiftMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    onMonthChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => shiftMonth(-1)}
            aria-label={t("appointments.prevMonth")}
          >
            <ChevronRight size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => shiftMonth(1)}
            aria-label={t("appointments.nextMonth")}
          >
            <ChevronLeft size={16} />
          </Button>
        </div>

        <h2 className="text-sm font-semibold text-rx-text sm:text-base">
          {formatMonthLabel(month, locale)}
        </h2>

        <Button
          variant={isCurrentMonth ? "default" : "outline"}
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs"
          onClick={onToday}
        >
          {t("appointments.today")}
        </Button>
      </div>

      <div
        className="grid grid-cols-7 gap-1 sm:gap-1.5"
        key={monthKey}
      >
        {weekdays.map((name) => (
          <div
            key={name}
            className="py-1 text-center text-[10px] font-semibold text-rx-muted sm:text-xs"
          >
            {name}
          </div>
        ))}

        {cells.map((dateKey, i) => {
          if (!dateKey) {
            return (
              <div
                key={`empty-${i}`}
                className="min-h-[5.25rem] rounded-xl bg-transparent sm:min-h-[6.5rem]"
              />
            );
          }

          const dayAppointments = appointmentsByDay.get(dateKey) ?? [];
          const dayNum = Number(dateKey.slice(8, 10));

          return (
            <DayCell
              key={dateKey}
              dayNum={dayNum}
              appointments={dayAppointments}
              isSelected={dateKey === selectedDate}
              isToday={dateKey === todayKey}
              onSelect={() => onSelectDate(dateKey)}
              t={t}
              locale={locale}
            />
          );
        })}
      </div>
    </div>
  );
}
