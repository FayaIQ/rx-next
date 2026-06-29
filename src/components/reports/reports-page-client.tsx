"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, FileText, Smile, Wallet, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContent } from "@/components/ui/page-shell";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-teal-50 p-2 text-teal-700">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-xs text-rx-muted">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportsPageClient() {
  const month = new Date().toISOString().slice(0, 7);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", month],
    queryFn: async () => {
      const res = await fetch(`/api/reports/overview?month=${month}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
  });

  return (
    <>
      <AppHeader title="التقارير والإحصائيات" subtitle={`شهر ${data?.month ?? month}`} />
      <PageContent className="space-y-4">
        {isLoading || !data ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard label="مرضى جدد" value={data.summary.newPatients} icon={Users} />
              <StatCard label="وصفات" value={data.summary.prescriptions} icon={FileText} />
              <StatCard
                label="جلسات مكتملة"
                value={data.summary.completedSessions}
                icon={Smile}
              />
              <StatCard
                label="مواعيد ملغاة"
                value={data.summary.cancelledAppointments}
                icon={BarChart3}
              />
              <StatCard
                label="إيرادات"
                value={data.summary.totalIncome.toLocaleString("ar-SY")}
                icon={Wallet}
              />
              <StatCard
                label="صافي الدخل"
                value={data.summary.netIncome.toLocaleString("ar-SY")}
                icon={TrendingUp}
              />
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">خطط العلاج حسب النوع</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.treatmentBreakdown.length === 0 ? (
                  <p className="text-sm text-rx-muted">لا توجد خطط هذا الشهر.</p>
                ) : (
                  data.treatmentBreakdown.map(
                    (row: { type: string; label: string; count: number }) => (
                      <div key={row.type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{row.label}</span>
                          <span className="font-mono">{row.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-600"
                            style={{
                              width: `${Math.min(
                                100,
                                (row.count /
                                  Math.max(
                                    ...data.treatmentBreakdown.map(
                                      (r: { count: number }) => r.count
                                    )
                                  )) *
                                  100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )
                )}
              </CardContent>
            </Card>
          </>
        )}
      </PageContent>
    </>
  );
}
