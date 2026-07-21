"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Stethoscope } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";

export default function PatientPortalPage() {
  const params = useParams();
  const token = String(params.token);
  const { t, locale } = useLocale();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["patient-portal", token],
    queryFn: async () => {
      const res = await fetch(`/api/portal/${token}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">{t("portal.loading")}</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <p className="text-center text-sm text-red-700">{t("portal.invalidLink")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-sm text-teal-700">{data.clinicName}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {t("portal.welcome", { name: data.patientName })}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t("portal.title")}</p>
        </header>

        {data.instructions?.trim() ? (
          <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Stethoscope size={16} className="text-teal-700" />
              {t("portal.instructions")}
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {data.instructions}
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Calendar size={16} className="text-teal-700" />
            {t("portal.upcomingAppointments")}
          </h2>
          {data.appointments.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              {t("portal.noAppointments")}
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.appointments.map(
                (a: {
                  id: number;
                  date: string | null;
                  time: string;
                  notes: string | null;
                }) => (
                  <li key={a.id} className="rounded-lg border px-3 py-2">
                    <p className="font-medium">
                      {a.date} ·{" "}
                      {new Date(a.time).toLocaleTimeString(
                        locale === "en" ? "en-GB" : "ar-IQ",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </p>
                    {a.notes ? (
                      <p className="text-xs text-slate-600">{a.notes}</p>
                    ) : null}
                  </li>
                )
              )}
            </ul>
          )}
        </section>

        {data.treatmentSessions.length > 0 ? (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              {t("portal.upcomingSessions")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.treatmentSessions.map(
                (s: {
                  id: number;
                  sessionNumber: number;
                  date: string | null;
                  toothFdi: number;
                  label: string;
                }) => (
                  <li key={s.id} className="rounded-lg border px-3 py-2">
                    {t("portal.sessionLine", {
                      label: s.label,
                      fdi: s.toothFdi,
                      number: s.sessionNumber,
                    })}
                    {s.date ? ` · ${s.date}` : ""}
                  </li>
                )
              )}
            </ul>
          </section>
        ) : null}

        {data.clinicPhone ? (
          <p className="text-center text-xs text-slate-500">
            {t("portal.contact")}{" "}
            <span dir="ltr">{data.clinicPhone}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
