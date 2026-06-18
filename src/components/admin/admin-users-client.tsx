"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContent, PageHeader } from "@/components/ui/page-shell";
import { adminApi, type AdminUserDto } from "@/lib/api/admin-client";
import { SubscriptionBadge } from "@/components/admin/subscription-badge";

export function AdminUsersClient() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", type, q],
    queryFn: () => adminApi.users({ type: type || undefined, q: q || undefined }),
  });

  const users = data?.users ?? [];

  return (
    <>
      <AppHeader title="المستخدمون" subtitle={`${users.length} مستخدم`} />
      <PageContent className="space-y-6">
        <PageHeader
          title="جميع المستخدمين"
          description="أطباء وسكرتارية مسجّلون في النظام"
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="بحث بالاسم أو الهاتف..."
            className="max-w-md flex-1"
          />
          <div className="flex gap-2">
            {[
              ["", "الكل"],
              ["doctor", "أطباء"],
              ["secretary", "سكرتارية"],
            ].map(([val, label]) => (
              <Button
                key={val}
                size="sm"
                variant={type === val ? "default" : "outline"}
                onClick={() => setType(val)}
              >
                {label}
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
                title="لا يوجد مستخدمون"
                description="جرّب تغيير معايير البحث"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="rx-table w-full text-sm">
                  <thead>
                    <tr className="border-b border-rx-border text-rx-muted">
                      <th className="px-5 py-3.5 text-right font-medium">الاسم</th>
                      <th className="px-5 py-3.5 text-right font-medium">النوع</th>
                      <th className="px-5 py-3.5 text-right font-medium">الهاتف</th>
                      <th className="px-5 py-3.5 text-right font-medium">الاشتراك</th>
                      <th className="px-5 py-3.5 text-right font-medium">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rx-border/60">
                    {users.map((u: AdminUserDto) => (
                      <tr key={u.id}>
                        <td className="px-5 py-4 font-semibold">{u.name}</td>
                        <td className="px-5 py-4 text-rx-text-secondary">
                          {u.type === "doctor" ? "طبيب" : "سكرتير"}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs" dir="ltr">
                          {u.phoneNumber}
                        </td>
                        <td className="px-5 py-4">
                          <SubscriptionBadge subscription={u.subscription} />
                        </td>
                        <td className="px-5 py-4">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/users/${u.id}`}>تفاصيل</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
