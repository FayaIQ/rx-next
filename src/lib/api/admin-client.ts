import type { PaginationMeta } from "@/lib/pagination";

export type { PaginationMeta };

async function handleResponse<T>(res: Response | Promise<Response>): Promise<T> {
  const response = await res;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "فشل الطلب");
  return data as T;
}

export type AdminUserDto = {
  id: number;
  name: string;
  phoneNumber: string;
  type: string;
  doctorId: number | null;
  doctorName: string | null;
  isConfirmed: boolean;
  createdAt: string | null;
  patientsCount: number;
  secretariesCount: number;
  subscription: {
    id: number;
    planType: string;
    status: string;
    startsAt: string;
    endsAt: string;
    isActive: boolean;
    packageName: string | null;
  } | null;
};

export type AdminPackageDto = {
  id: number;
  name: string;
  price: number;
  description: string;
  duration: number;
  durationUnit: string;
  planType: string;
  isTrial: boolean;
  isActive: boolean;
};

export const adminApi = {
  stats: () =>
    handleResponse<{
      stats: Record<string, number>;
      demographics: Array<{ gender: string; count: number }>;
      appointmentsChart: Array<{ date: string; count: number }>;
    }>(fetch("/api/dashboard/stats")),

  users: (params?: { type?: string; q?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set("type", params.type);
    if (params?.q) sp.set("q", params.q);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    const q = sp.toString();
    return handleResponse<{ users: AdminUserDto[]; pagination: PaginationMeta }>(
      fetch(`/api/dashboard/users${q ? `?${q}` : ""}`)
    );
  },

  user: (id: number) =>
    handleResponse<{
      user: AdminUserDto;
      subscriptionHistory: Array<Record<string, unknown>>;
    }>(fetch(`/api/dashboard/users/${id}`)),

  doctors: (tab?: string, params?: { page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (tab) sp.set("tab", tab);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    const q = sp.toString();
    return handleResponse<{ doctors: AdminUserDto[]; pagination: PaginationMeta }>(
      fetch(`/api/dashboard/doctors${q ? `?${q}` : ""}`)
    );
  },

  createDoctor: (body: Record<string, unknown>) =>
    handleResponse<{ doctor: AdminUserDto }>(
      fetch("/api/dashboard/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  secretaries: (params?: { q?: string; page?: number; pageSize?: number }) => {
    const sp = new URLSearchParams();
    if (params?.q) sp.set("q", params.q);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    const q = sp.toString();
    return handleResponse<{
      secretaries: AdminUserDto[];
      pagination: PaginationMeta;
    }>(fetch(`/api/dashboard/secretaries${q ? `?${q}` : ""}`));
  },

  createSecretary: (body: Record<string, unknown>) =>
    handleResponse<{ secretary: AdminUserDto }>(
      fetch("/api/dashboard/secretaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  packages: () =>
    handleResponse<{ packages: AdminPackageDto[] }>(
      fetch("/api/dashboard/packages")
    ),

  createPackage: (body: Record<string, unknown>) =>
    handleResponse<{ package: AdminPackageDto }>(
      fetch("/api/dashboard/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  updatePackage: (id: number, body: Record<string, unknown>) =>
    handleResponse<{ package: AdminPackageDto }>(
      fetch(`/api/dashboard/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  subscriptions: (
    filter?: string,
    params?: { page?: number; pageSize?: number }
  ) => {
    const sp = new URLSearchParams();
    if (filter) sp.set("filter", filter);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    const q = sp.toString();
    return handleResponse<{
      subscriptions: AdminUserDto[];
      pagination: PaginationMeta;
    }>(fetch(`/api/dashboard/subscriptions${q ? `?${q}` : ""}`));
  },

  activateSubscription: (userId: number, body: Record<string, unknown>) =>
    handleResponse<{ subscription: Record<string, unknown> }>(
      fetch(`/api/dashboard/subscriptions/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ),

  cancelSubscription: (userId: number) =>
    handleResponse<{ success: boolean }>(
      fetch(`/api/dashboard/subscriptions/${userId}/cancel`, {
        method: "POST",
      })
    ),

  subscriptionHistory: (userId: number) =>
    handleResponse<{ history: Array<Record<string, unknown>> }>(
      fetch(`/api/dashboard/subscriptions/${userId}`)
    ),
};
