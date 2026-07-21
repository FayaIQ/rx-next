"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContent } from "@/components/ui/page-shell";
import { ConsultationRecordForm } from "@/components/secretary/consultation-record-form";
import { WaitingRoomBoard } from "@/components/waiting-room/waiting-room-board";
import { fetchAppointmentsOfflineFirst } from "@/lib/data/offline-api";
import { rxApi } from "@/lib/api/rx-client";
import {
  financeCategoryLabel,
  formatMoney,
  paymentMethodLabel,
} from "@/lib/finance/constants";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function SecretaryDeskPage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const today = todayKey();
  const dateLocale = locale === "en" ? "en-GB" : "ar-IQ";

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
      numberingSystem: "latn",
    });
  }

  function formatTodayLabel() {
    return new Date().toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      numberingSystem: "latn",
    });
  }

  const invalidateDesk = () => {
    queryClient.invalidateQueries({ queryKey: ["secretary-desk"] });
    queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    queryClient.invalidateQueries({ queryKey: ["finance-transactions"] });
  };

  const { data: settingsData } = useQuery({
    queryKey: ["finance-settings"],
    queryFn: () => rxApi.finances.getSettings(),
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["secretary-desk", "appointments", today],
    queryFn: async () => ({
      appointments: await fetchAppointmentsOfflineFirst({
        date: today,
        status: "active",
      }),
    }),
  });

  const { data: todayTxData, isLoading: txLoading } = useQuery({
    queryKey: ["secretary-desk", "consultations", today],
    queryFn: () =>
      rxApi.finances.listTransactions({
        type: "income",
        from: today,
        to: today,
        pageSize: 100,
      }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["secretary-desk", "summary", today],
    queryFn: () => rxApi.finances.getSummary({ from: today, to: today }),
  });

  const settings = settingsData?.settings;
  const appointments = appointmentsData?.appointments ?? [];
  const consultations = todayTxData?.transactions ?? [];
  const summary = summaryData?.summary;

  return (
    <>
      <AppHeader
        title={t("secretary.deskTitle")}
        subtitle={t("secretary.deskSubtitle", { date: formatTodayLabel() })}
      />
      <PageContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={Stethoscope}
            label={t("secretary.consultationsToday")}
            value={String(consultations.length)}
            tone="primary"
          />
          <StatCard
            icon={Wallet}
            label={t("secretary.incomeToday")}
            value={formatMoney(summary?.totalIncome ?? 0, settings?.currency)}
            tone="income"
          />
          <StatCard
            icon={CalendarDays}
            label={t("secretary.appointmentsToday")}
            value={String(appointments.length)}
            tone="neutral"
          />
        </div>

        <WaitingRoomBoard role="secretary" onChanged={invalidateDesk} />

        <Card className="border-rx-primary/20 shadow-sm ring-1 ring-rx-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope size={18} className="text-rx-primary" />
              {t("secretary.recordConsultation")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ConsultationRecordForm
              settings={settings}
              onSuccess={invalidateDesk}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{t("secretary.recordedToday")}</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/secretary/finances">{t("secretary.fullFinances")}</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {txLoading ? (
              <p className="text-sm text-rx-muted">{t("common.loading")}</p>
            ) : consultations.length === 0 ? (
              <p className="py-6 text-center text-sm text-rx-muted">
                {t("secretary.noConsultationsToday")}
              </p>
            ) : (
              consultations.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-rx-border/80 px-3 py-2.5"
                >
                  <Badge variant="default">{t("secretary.consultationBadge")}</Badge>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="text-sm font-semibold">
                      {tx.patient?.name ?? t("secretary.patient")}
                      {" — "}
                      {financeCategoryLabel(tx.type, tx.category)}
                    </p>
                    <p className="text-xs text-rx-muted">
                      {formatTime(
                        tx.createdAt ?? `${tx.transactionDate}T12:00:00`
                      )}{" "}
                      · {paymentMethodLabel(tx.paymentMethod)}
                      {tx.description ? ` · ${tx.description}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">
                    +{formatMoney(tx.amount, settings?.currency)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/secretary/patients">
              <Users size={14} />
              {t("nav.patients")}
            </Link>
          </Button>
        </div>
      </PageContent>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Stethoscope;
  label: string;
  value: string;
  tone: "primary" | "income" | "neutral";
}) {
  const color =
    tone === "income"
      ? "text-emerald-600"
      : tone === "primary"
        ? "text-rx-primary"
        : "text-slate-700";

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-rx-muted">{label}</p>
          <p className={cn("mt-1 text-xl font-bold", color)}>{value}</p>
        </div>
        <Icon size={26} className={cn("opacity-80", color)} />
      </CardContent>
    </Card>
  );
}
