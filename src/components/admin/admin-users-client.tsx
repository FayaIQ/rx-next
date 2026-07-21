"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { TablePageLoading } from "@/components/ui/page-loading";
import { Pagination } from "@/components/ui/pagination";
import { usePaginationState } from "@/hooks/use-pagination-state";
import { adminApi, type AdminUserDto } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";
import { useLocale } from "@/i18n/locale-provider";

export function AdminUsersClient() {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");
  const { page, pageSize, onPageChange, onPageSizeChange } =
    usePaginationState(`${type}-${q}`);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", type, q, page, pageSize],
    queryFn: () =>
      adminApi.users({
        type: type || undefined,
        q: q || undefined,
        page,
        pageSize,
      }),
    placeholderData: keepPreviousData,
  });

  const users = data?.users ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? users.length;

  if (isLoading && !data) {
    return <TablePageLoading />;
  }

  return (
    <>
      <AppHeader
        title={t("admin.usersTitle")}
        subtitle={t("admin.userCount", { count: total })}
      />
      <PageContent className="space-y-6">
        <PageHeader
          title={t("admin.allUsers")}
          description={t("admin.allUsersDesc")}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={t("admin.searchPlaceholder")}
            className="max-w-md flex-1"
          />
          <div className="flex gap-2">
            {(
              [
                ["", "admin.filterAll"],
                ["doctor", "admin.filterDoctors"],
                ["secretary", "admin.filterSecretaries"],
              ] as const
            ).map(([val, labelKey]) => (
              <Button
                key={val}
                size="sm"
                variant={type === val ? "default" : "outline"}
                onClick={() => setType(val)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t("admin.noUsers")}
                description={t("admin.noUsersDesc")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("admin.name")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("admin.type")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("admin.phone")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("admin.subscription")}
                      </th>
                      <th className="px-5 py-3.5 text-right font-medium">
                        {t("admin.action")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {users.map((u: AdminUserDto) => (
                      <tr key={u.id}>
                        <td className="px-5 py-4 font-semibold">{u.name}</td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {u.type === "doctor"
                            ? t("admin.typeDoctor")
                            : t("admin.typeSecretary")}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" dir="ltr">
                          {u.phoneNumber}
                        </td>
                        <td className="px-5 py-4">
                          <SubscriptionBadge subscription={u.subscription} />
                        </td>
                        <td className="px-5 py-4">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/users/${u.id}`}>
                              {t("admin.details")}
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pagination && (
                  <Pagination
                    pagination={pagination}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
