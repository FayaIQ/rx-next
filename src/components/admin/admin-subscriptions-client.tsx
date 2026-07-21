"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Plus, CreditCard } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsPageLoading } from "@/components/ui/page-loading";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi, type AdminUserDto } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { ActivateSubscriptionDialog } from "@/components/admin/activate-subscription-dialog";
import { useLocale } from "@/i18n/locale-provider";

export function AdminSubscriptionsClient({
  initialFilter = "all",
}: {
  initialFilter?: string;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState(initialFilter);
  const [activateUser, setActivateUser] = useState<AdminUserDto | null>(null);
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(filter);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions", filter, page, pageSize],
    queryFn: () =>
      adminApi.subscriptions(filter === "all" ? undefined : filter, {
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const cancelMutation = useMutation({
    mutationFn: (userId: number) => adminApi.cancelSubscription(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      toast.success(t("admin.cancelled"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = data?.subscriptions ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? list.length;
  const dateLocale = locale === "en" ? "en-GB" : "ar-IQ";

  if (isLoading && !data) {
    return <CardsPageLoading />;
  }

  return (
    <>
      <AppHeader
        title={t("admin.subscriptionsTitle")}
        subtitle={t("admin.subscriptionCount", { count: total })}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title={t("admin.manageSubscriptions")}
          description={t("admin.manageSubscriptionsDesc")}
        />

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "admin.filterAll"],
              ["active", "admin.filterActive"],
              ["trial", "admin.filterTrial"],
              ["expired", "admin.filterExpired"],
            ] as const
          ).map(([key, labelKey]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {t(labelKey)}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="divide-y p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : list.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title={t("admin.noSubscriptions")}
                description={t("admin.noSubscriptionsDesc")}
              />
            ) : (
              list.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 p-5 transition-colors hover:bg-rx-bg-subtle/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-rx-muted" dir="ltr">
                      {u.phoneNumber}
                    </p>
                    <div className="mt-1">
                      <SubscriptionBadge subscription={u.subscription} />
                    </div>
                    {u.subscription?.endsAt && (
                      <p className="mt-1 text-xs text-rx-muted">
                        {t("admin.endsAt", {
                          date: new Date(u.subscription.endsAt).toLocaleDateString(
                            dateLocale
                          ),
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setActivateUser(u)}>
                      <Plus size={14} />
                      {t("admin.activate")}
                    </Button>
                    {u.subscription?.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(t("admin.confirmCancel"))) {
                            cancelMutation.mutate(u.id);
                          }
                        }}
                      >
                        {t("admin.cancel")}
                      </Button>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/dashboard/users/${u.id}`}>
                        {t("admin.history")}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
            {pagination && (
              <Pagination
                pagination={pagination}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
              />
            )}
          </CardContent>
        </Card>

        {activateUser && (
          <ActivateSubscriptionDialog
            user={activateUser}
            onClose={() => setActivateUser(null)}
          />
        )}
      </PageContent>
    </>
  );
}
