"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailPageLoading } from "@/components/ui/page-loading";
import { PageContent } from "@/components/ui/page-shell";
import { adminApi } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { useLocale } from "@/i18n/locale-provider";

export function AdminUserDetailClient({ userId }: { userId: number }) {
  const { t, locale } = useLocale();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => adminApi.user(userId),
  });

  const user = data?.user;
  const history = data?.subscriptionHistory ?? [];
  const dateLocale = locale === "en" ? "en-GB" : "ar-IQ";

  if (isLoading && !data) {
    return <DetailPageLoading />;
  }

  return (
    <>
      <AppHeader title={t("admin.userDetailTitle")} />
      <PageContent className="space-y-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/users">
            <ArrowRight size={14} />
            {t("admin.backToUsers")}
          </Link>
        </Button>

        {user ? (
          <>
            <Card hover>
              <CardHeader>
                <CardTitle className="text-xl">{user.name}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-rx-bg-subtle p-3">
                  <p className="text-xs text-rx-muted">{t("admin.type")}</p>
                  <p className="font-medium">
                    {user.type === "doctor"
                      ? t("admin.typeDoctor")
                      : t("admin.typeSecretary")}
                  </p>
                </div>
                <div className="rounded-xl bg-rx-bg-subtle p-3">
                  <p className="text-xs text-rx-muted">{t("admin.phone")}</p>
                  <p className="font-mono font-medium" dir="ltr">
                    {user.phoneNumber}
                  </p>
                </div>
                {user.doctorName && (
                  <div className="rounded-xl bg-rx-bg-subtle p-3">
                    <p className="text-xs text-rx-muted">{t("admin.doctor")}</p>
                    <p className="font-medium">{user.doctorName}</p>
                  </div>
                )}
                <div className="rounded-xl bg-rx-bg-subtle p-3">
                  <p className="text-xs text-rx-muted">{t("admin.patients")}</p>
                  <p className="font-medium">{user.patientsCount}</p>
                </div>
                <div className="rounded-xl bg-rx-bg-subtle p-3 sm:col-span-2">
                  <p className="mb-1 text-xs text-rx-muted">
                    {t("admin.currentSubscription")}
                  </p>
                  <SubscriptionBadge subscription={user.subscription} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("admin.subscriptionHistory")}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-rx-border/60 p-0">
                {history.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title={t("admin.noHistory")}
                    description={t("admin.noHistoryDesc")}
                  />
                ) : (
                  history.map((s) => {
                    const sub = s as {
                      id: number;
                      planType: string;
                      status: string;
                      startsAt: string;
                      endsAt: string;
                      packageName: string | null;
                      notes: string | null;
                    };
                    return (
                      <div key={sub.id} className="p-5 text-sm">
                        <p className="font-semibold text-rx-text">
                          {sub.packageName ?? sub.planType} — {sub.status}
                        </p>
                        <p className="mt-1 text-rx-muted">
                          {new Date(sub.startsAt).toLocaleDateString(dateLocale)} →{" "}
                          {new Date(sub.endsAt).toLocaleDateString(dateLocale)}
                        </p>
                        {sub.notes && (
                          <p className="mt-1 text-rx-text-secondary">{sub.notes}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <EmptyState
            icon={FileText}
            title={t("admin.userNotFound")}
            description={t("admin.userNotFoundDesc")}
          />
        )}
      </PageContent>
    </>
  );
}
