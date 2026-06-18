import { AdminUserDetailClient } from "@/components/admin/admin-user-detail-client";

type Params = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Params) {
  const { id } = await params;
  return <AdminUserDetailClient userId={Number(id)} />;
}
