"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  UserCog,
  CreditCard,
  Clock,
  CalendarCheck,
  TrendingUp,
} from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { adminApi } from "@/lib/api/admin-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";

export function AdminDashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
  });

  const stats = data?.stats;
  const chart = data?.appointmentsChart ?? [];
  const maxCount = Math.max(...chart.map((c) => c.count), 1);

  const cards = stats
    ? [
        {
          label: "الأطباء",
          value: stats.doctorsCount,
          href: "/dashboard/doctors",
          icon: <Stethoscope size={20} />,
        },
        {
          label: "السكرتارية",
          value: stats.secretariesCount,
          href: "/dashboard/secretaries",
          icon: <UserCog size={20} />,
        },
        {
          label: "المرضى",
          value: stats.patientsCount,
          href: "/dashboard/users",
          icon: <Users size={20} />,
        },
        {
          label: "اشتراكات نشطة",
          value: stats.activeSubs,
          href: "/dashboard/subscriptions?filter=active",
          icon: <CreditCard size={20} />,
        },
        {
          label: "تجارب مجانية",
          value: stats.trialSubs,
          href: "/dashboard/subscriptions?filter=trial",
          icon: <Clock size={20} />,
        },
        {
          label: "منتهية",
          value: stats.expiredSubs,
          href: "/dashboard/subscriptions?filter=expired",
          icon: <TrendingUp size={20} />,
        },
        {
          label: "أطباء جدد (أسبوع)",
          value: stats.newDoctorsWeek,
          icon: <Stethoscope size={20} />,
        },
        {
          label: "مواعيد (أسبوع)",
          value: stats.appointmentsWeek,
          icon: <CalendarCheck size={20} />,
        },
      ]
    : [];

  return (
    <>
      <AppHeader title="لوحة التحكم" subtitle="نظرة عامة على النظام" />
      <PageContent className="space-y-6">
        <PageHeader
          title="الإحصائيات"
          description="ملخص سريع لأداء المنصة"
        />

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((card) => (
                <div key={card.label} className="relative">
                  <StatCard
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                  />
                  {"href" in card && card.href && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="absolute bottom-4 left-4 h-auto p-0 text-xs text-rx-primary"
                    >
                      <Link href={card.href}>عرض التفاصيل ←</Link>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card hover>
                <CardHeader>
                  <CardTitle>المواعيد — آخر 7 أيام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex h-44 items-end gap-2">
                    {chart.map((item) => (
                      <div
                        key={item.date}
                        className="flex flex-1 flex-col items-center gap-2"
                      >
                        <span className="text-xs font-medium text-rx-text">
                          {item.count}
                        </span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-rx-primary to-teal-400 transition-all"
                          style={{
                            height: `${Math.max((item.count / maxCount) * 120, 8)}px`,
                          }}
                          title={`${item.count} موعد`}
                        />
                        <span className="text-[10px] text-rx-muted">
                          {item.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card hover>
                <CardHeader>
                  <CardTitle>توزيع المرضى حسب الجنس</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(data?.demographics ?? []).map((d) => {
                    const maxDemo = Math.max(
                      ...(data?.demographics ?? []).map((x) => x.count),
                      1
                    );
                    const pct = Math.min((d.count / maxDemo) * 100, 100);
                    return (
                      <div key={d.gender}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="font-medium">
                            {d.gender === "male" ? "ذكر" : "أنثى"}
                          </span>
                          <span className="text-rx-muted">{d.count}</span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-rx-bg-subtle">
                          <div
                            className="h-full rounded-full bg-rx-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PageContent>
    </>
  );
}
