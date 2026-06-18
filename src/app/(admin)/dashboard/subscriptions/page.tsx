import { AdminSubscriptionsClient } from "@/components/admin/admin-subscriptions-client";

type Props = { searchParams: Promise<{ filter?: string }> };

export default async function SubscriptionsPage({ searchParams }: Props) {
  const { filter } = await searchParams;
  return <AdminSubscriptionsClient initialFilter={filter ?? "all"} />;
}
