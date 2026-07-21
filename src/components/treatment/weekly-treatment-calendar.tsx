"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rxApi } from "@/lib/api/rx-client";
import { TREATMENT_TYPES } from "@/lib/treatment/constants";
import {
  currentWeekRange,
  shiftWeek,
  weekRangeForDate,
} from "@/lib/treatment/week-utils";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";
import { tTreatmentType } from "@/lib/i18n-labels";

export function WeeklyTreatmentCalendar() {
  const { t, locale } = useLocale();
  const dateLocale = locale === "ar" ? "ar-IQ" : "en-GB";
  const initial = currentWeekRange();
  const [anchor, setAnchor] = useState(initial.from);
  const [treatmentFilter, setTreatmentFilter] = useState<string>("");

  const week = useMemo(
    () => weekRangeForDate(new Date(`${anchor}T12:00:00`)),
    [anchor]
  );

  const { data, isLoading } = useQuery({
    queryKey: ["treatment-sessions-week", week.from, week.to, treatmentFilter],
    queryFn: () =>
      rxApi.treatment.weekSessions({
        from: week.from,
        to: week.to,
        treatmentType: treatmentFilter || undefined,
      }),
  });

  const byDate = data?.byDate ?? {};

  function formatDayShort(dateKey: string) {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(dateLocale, {
      weekday: "short",
      numberingSystem: "latn",
    });
  }

  function formatDayLabel(dateKey: string) {
    return new Date(`${dateKey}T12:00:00`).toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "short",
      numberingSystem: "latn",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setAnchor(shiftWeek(anchor, -1))}
            aria-label={t("treatment.prevWeek")}
          >
            <ChevronRight size={18} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnchor(currentWeekRange().from)}
          >
            {t("treatment.thisWeek")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-9"
            onClick={() => setAnchor(shiftWeek(anchor, 1))}
            aria-label={t("treatment.nextWeek")}
          >
            <ChevronLeft size={18} />
          </Button>
        </div>

        <select
          value={treatmentFilter}
          onChange={(e) => setTreatmentFilter(e.target.value)}
          className="h-9 rounded-lg border border-rx-border bg-white px-3 text-sm text-rx-text"
        >
          <option value="">{t("treatment.allTypes")}</option>
          {TREATMENT_TYPES.map((type) => (
            <option key={type.id} value={type.id}>
              {tTreatmentType(t, type.id)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-rx-muted">
        {formatDayLabel(week.from)} — {formatDayLabel(week.to)}
      </p>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {week.days.map((day) => (
            <div
              key={day}
              className="h-40 animate-pulse rounded-xl border border-rx-border bg-rx-bg-subtle"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {week.days.map((day) => {
            const sessions = byDate[day] ?? [];
            const todayKey = new Date().toISOString().slice(0, 10);
            const highlight = day === todayKey;

            return (
              <div
                key={day}
                className={cn(
                  "flex min-h-[9rem] flex-col rounded-xl border bg-white shadow-sm",
                  highlight
                    ? "border-teal-300 ring-1 ring-teal-200"
                    : "border-slate-200"
                )}
              >
                <div
                  className={cn(
                    "border-b px-3 py-2 text-center",
                    highlight ? "bg-teal-50" : "bg-slate-50"
                  )}
                >
                  <p className="text-xs font-medium text-slate-500">
                    {formatDayShort(day)}
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {day.slice(8)}
                  </p>
                </div>

                <ul className="flex-1 divide-y divide-slate-100 p-1">
                  {sessions.length === 0 ? (
                    <li className="px-2 py-4 text-center text-xs text-slate-400">
                      {t("treatment.noSessions")}
                    </li>
                  ) : (
                    sessions.map((s) => (
                      <li key={s.id} className="group px-2 py-1.5">
                        <div className="flex items-start gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {s.patientName}
                            </p>
                            <p className="truncate text-[0.65rem] text-slate-500">
                              {s.treatmentType
                                ? tTreatmentType(t, s.treatmentType)
                                : s.treatmentLabel}{" "}
                              · {t("treatment.toothDot", { fdi: s.toothFdi })}
                            </p>
                          </div>
                          <Link
                            href={`/dental/${s.patientId}?tooth=${s.toothFdi}`}
                            className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-teal-700 group-hover:opacity-100"
                            title={t("treatment.openChart")}
                          >
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
