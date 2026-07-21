"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

type SearchResults = {
  patients: Array<{ id: number; name: string; phone: string | null; href: string }>;
  prescriptions: Array<{
    id: number;
    patientName: string;
    prescriptionNumber: number | null;
    diagnosis: string | null;
    href: string;
  }>;
  appointments: Array<{
    id: number;
    patientName: string;
    datetime: string;
    href: string;
  }>;
  treatments: Array<{
    id: number;
    patientName: string;
    toothFdi: number;
    label: string;
    href: string;
  }>;
};

export function GlobalSearch() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", q],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json as SearchResults;
    },
    enabled: open && q.trim().length >= 2,
  });

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(var(--rx-nav-pill-offset)+0.75rem)] left-4 z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-lg hover:bg-slate-50"
      >
        <Search size={16} />
        {t("search.label")}
        <kbd className="hidden rounded bg-slate-100 px-1.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
    );
  }

  const hasResults =
    data &&
    (data.patients.length > 0 ||
      data.prescriptions.length > 0 ||
      data.appointments.length > 0 ||
      data.treatments.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search size={18} className="text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="p-4 text-center text-sm text-slate-500">
              {t("search.minChars")}
            </p>
          ) : isFetching ? (
            <p className="p-4 text-center text-sm text-slate-500">{t("search.searching")}</p>
          ) : !hasResults ? (
            <p className="p-4 text-center text-sm text-slate-500">{t("search.noResults")}</p>
          ) : (
            <>
              {data!.patients.length > 0 ? (
                <SearchGroup
                  title={t("search.patients")}
                  items={data!.patients.map((p) => ({
                    key: p.id,
                    label: p.name,
                    sub: p.phone,
                    href: p.href,
                  }))}
                  onPick={() => setOpen(false)}
                  router={router}
                />
              ) : null}
              {data!.prescriptions.length > 0 ? (
                <SearchGroup
                  title={t("search.prescriptions")}
                  items={data!.prescriptions.map((p) => ({
                    key: p.id,
                    label: `#${p.prescriptionNumber} — ${p.patientName}`,
                    sub: p.diagnosis,
                    href: p.href,
                  }))}
                  onPick={() => setOpen(false)}
                  router={router}
                />
              ) : null}
              {data!.treatments.length > 0 ? (
                <SearchGroup
                  title={t("search.treatments")}
                  items={data!.treatments.map((tr) => ({
                    key: tr.id,
                    label: t("search.treatmentTooth", {
                      name: tr.patientName,
                      fdi: tr.toothFdi,
                    }),
                    sub: tr.label,
                    href: tr.href,
                  }))}
                  onPick={() => setOpen(false)}
                  router={router}
                />
              ) : null}
              {data!.appointments.length > 0 ? (
                <SearchGroup
                  title={t("search.appointments")}
                  items={data!.appointments.map((a) => ({
                    key: a.id,
                    label: a.patientName,
                    sub: new Date(a.datetime).toLocaleString(
                      locale === "en" ? "en-GB" : "ar-IQ"
                    ),
                    href: a.href,
                  }))}
                  onPick={() => setOpen(false)}
                  router={router}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchGroup({
  title,
  items,
  onPick,
  router,
}: {
  title: string;
  items: Array<{ key: number; label: string; sub: string | null; href: string }>;
  onPick: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="mb-2">
      <p className="px-2 py-1 text-xs font-bold text-slate-500">{title}</p>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={cn(
            "flex w-full flex-col rounded-lg px-3 py-2 text-right text-sm hover:bg-slate-100"
          )}
          onClick={() => {
            router.push(item.href);
            onPick();
          }}
        >
          <span className="font-medium">{item.label}</span>
          {item.sub ? <span className="text-xs text-slate-500">{item.sub}</span> : null}
        </button>
      ))}
    </div>
  );
}
