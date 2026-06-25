import type { PaginationMeta } from "@/lib/pagination";

export type { PaginationMeta };

export type PatientDto = {
  id: number;
  name: string;
  gender: "male" | "female";
  birthdate: string | null;
  diagnosis: string | null;
  phone: string | null;
  doctorId: number;
  age: string;
  visitCount: number;
  lastVisit: string | null;
  createdAt: string;
  updatedAt: string;
  fieldValues?: Array<{
    patientFieldId: number;
    value: string;
  }>;
};

export type MedicineDto = {
  id: number;
  doctorId: number;
  name: string;
  type: string | null;
  dosage: string | null;
  quantity: string | null;
  period: string | null;
  timeOfUse: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicinePresetDto = {
  id: number;
  doctorId: number;
  medicineKey: string;
  name: string;
  type: string;
  dosage: string;
  quantity: string;
  period: string;
  timeOfUse: string;
  usageCount: number;
  lastUsedAt: string;
};

export type PatientFieldDto = {
  id: number;
  name: string;
  size: "larg" | "medium" | "small";
  isActive: boolean;
  isPrintable: boolean;
  isPersonal: boolean;
  designX: number | null;
  designY: number | null;
};

export type PrescriptionDto = {
  id: number;
  patientId: number;
  doctorId: number;
  prescriptionDate: string;
  diagnosis: string | null;
  xrayImage: string | null;
  analysisImage: string | null;
  prescriptionNumber: number;
  patientName?: string;
  items: Array<{
    id: number;
    name: string;
    type: string | null;
    dosage: string | null;
    quantity: string | null;
    period: string | null;
    timeOfUse: string | null;
  }>;
  fieldValues: Array<{
    patientFieldId: number;
    value: string;
  }>;
  updatedAt?: string | null;
  patient?: PatientDto;
};

export type AppointmentDto = {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentDatetime: string;
  bookingDate: string | null;
  notes: string | null;
  status: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  patient?: {
    id: number;
    name: string;
    phone: string | null;
    gender: string;
    age: string;
  };
};
export type RecipeSettingsDto = {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorSpecialty: string;
  additionalText1: string | null;
  phoneNumber: string | null;
  email: string | null;
  address: string | null;
  fontFamily: string;
  fontSize: string;
  opacity: number;
  paperSize: string;
  color: string;
  logoPath: string | null;
  designImagePath: string | null;
  designMode: string;
  designTemplate: string;
  designImageScale: number;
  designPatientX: number;
  designPatientY: number;
  designAgeX: number;
  designAgeY: number;
  designDateX: number;
  designDateY: number;
  designItemsX: number;
  designItemsY: number;
  designItemsWidth: number;
  designItemsHeight: number;
  showGender: boolean;
  showAge: boolean;
  showPhone: boolean;
  printName: boolean;
  printAge: boolean;
  printGender: boolean;
  printPhone: boolean;
  printDiagnosis: boolean;
  designPhoneX: number;
  designPhoneY: number;
};

async function handleResponse<T>(res: Response | Promise<Response>): Promise<T> {
  const response = await res;
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "فشل الطلب");
  }
  return data as T;
}

export const rxApi = {
  patients: {
    list: (params?: { q?: string; page?: number; pageSize?: number }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.page) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      const q = sp.toString();
      return handleResponse<{ patients: PatientDto[]; pagination: PaginationMeta }>(
        fetch(`/api/patients${q ? `?${q}` : ""}`)
      );
    },
    get: (id: number) =>
      handleResponse<{ patient: PatientDto }>(fetch(`/api/patients/${id}`)),
    checkPhone: (phone: string, excludeId?: number) => {
      const params = new URLSearchParams({ phone });
      if (excludeId != null) params.set("excludeId", String(excludeId));
      return handleResponse<{
        exists: boolean;
        patientName: string | null;
      }>(fetch(`/api/patients/check-phone?${params}`));
    },
    create: (body: Record<string, unknown>) =>
      handleResponse<{
        patient: PatientDto;
        phoneDuplicate?: boolean;
        duplicatePatientName?: string | null;
      }>(
        fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    update: (id: number, body: Record<string, unknown>) =>
      handleResponse<{
        patient: PatientDto;
        phoneDuplicate?: boolean;
        duplicatePatientName?: string | null;
      }>(
        fetch(`/api/patients/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    delete: (id: number) =>
      handleResponse<{ success: boolean }>(
        fetch(`/api/patients/${id}`, { method: "DELETE" })
      ),
  },
  dental: {
    getChart: (patientId: number) =>
      handleResponse<{
        patient: { id: number; name: string };
        chart: {
          id: number;
          patientId: number;
          doctorId: number;
          notes: string | null;
          updatedAt: string | null;
          teeth: Array<{
            toothFdi: number;
            status: string;
            notes: string | null;
            updatedAt: string | null;
          }>;
        };
      }>(fetch(`/api/patients/${patientId}/dental-chart`)),
    saveChart: (patientId: number, body: Record<string, unknown>) =>
      handleResponse<{
        chart: {
          id: number;
          patientId: number;
          doctorId: number;
          notes: string | null;
          updatedAt: string | null;
          teeth: Array<{
            toothFdi: number;
            status: string;
            notes: string | null;
            updatedAt: string | null;
          }>;
        };
      }>(
        fetch(`/api/patients/${patientId}/dental-chart`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
  },
  medicines: {
    list: (params?: { q?: string; page?: number; pageSize?: number }) => {
      const sp = new URLSearchParams();
      if (params?.q) sp.set("q", params.q);
      if (params?.page) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      const q = sp.toString();
      return handleResponse<{ medicines: MedicineDto[]; pagination: PaginationMeta }>(
        fetch(`/api/medicines${q ? `?${q}` : ""}`)
      );
    },
    create: (body: Record<string, unknown>) =>
      handleResponse<{ medicine: MedicineDto }>(
        fetch("/api/medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    update: (id: number, body: Record<string, unknown>) =>
      handleResponse<{ medicine: MedicineDto }>(
        fetch(`/api/medicines/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    delete: (id: number) =>
      handleResponse<{ success: boolean }>(
        fetch(`/api/medicines/${id}`, { method: "DELETE" })
      ),
    defaultCategories: () =>
      handleResponse<{
        categories: Array<{
          id: number;
          name: string;
          medicinesCount: number;
        }>;
      }>(fetch("/api/medicines/default-categories")),
    includeCategory: (categoryId: number) =>
      handleResponse<{ added: number }>(
        fetch(`/api/medicines/default-categories/${categoryId}/include`, {
          method: "POST",
        })
      ),
    presets: (params?: { name?: string; type?: string }) => {
      const sp = new URLSearchParams();
      if (params?.name) sp.set("name", params.name);
      if (params?.type !== undefined) sp.set("type", params.type);
      const q = sp.toString();
      return handleResponse<{ presets: MedicinePresetDto[] }>(
        fetch(`/api/medicines/presets${q ? `?${q}` : ""}`)
      );
    },
  },
  fields: {
    list: () =>
      handleResponse<{ fields: PatientFieldDto[] }>(fetch("/api/fields")),
    listAll: () =>
      handleResponse<{ fields: PatientFieldDto[] }>(
        fetch("/api/fields?all=1")
      ),
    create: (body: Record<string, unknown>) =>
      handleResponse<{ field: PatientFieldDto }>(
        fetch("/api/fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    update: (id: number, body: Record<string, unknown>) =>
      handleResponse<{ field: PatientFieldDto }>(
        fetch(`/api/fields/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    toggle: (id: number, toggle: "active" | "printable") =>
      handleResponse<{ field: PatientFieldDto }>(
        fetch(`/api/fields/${id}/toggle`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toggle }),
        })
      ),
    updatePosition: (id: number, designX: number, designY: number) =>
      handleResponse<{ field: PatientFieldDto }>(
        fetch(`/api/fields/${id}/position`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ designX, designY }),
        })
      ),
    delete: (id: number) =>
      handleResponse<{ success: boolean }>(
        fetch(`/api/fields/${id}`, { method: "DELETE" })
      ),
  },
  recipeSettings: {
    get: () =>
      handleResponse<{ settings: RecipeSettingsDto }>(
        fetch("/api/recipe-settings")
      ),
    update: (body: RecipeSettingsDto) =>
      handleResponse<{ settings: RecipeSettingsDto }>(
        fetch("/api/recipe-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    upload: async (kind: "logo" | "design", file: File) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      return handleResponse<{ settings: RecipeSettingsDto; path: string }>(
        fetch("/api/recipe-settings/upload", { method: "POST", body: form })
      );
    },
  },
  settings: {
    getProfile: () =>
      handleResponse<{
        profile: {
          id: number;
          name: string;
          phoneNumber: string;
          profileImage: string | null;
        };
      }>(fetch("/api/settings/profile")),
    updateProfile: (body: Record<string, unknown>) =>
      handleResponse<{ profile: { id: number; name: string; phoneNumber: string } }>(
        fetch("/api/settings/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    listInvites: () =>
      handleResponse<{
        invites: Array<{
          id: number;
          code: string;
          used: boolean;
          expiresAt: string | null;
          createdAt: string | null;
        }>;
      }>(fetch("/api/settings/secretary-invites")),
    createInvite: () =>
      handleResponse<{ invite: { id: number; code: string } }>(
        fetch("/api/settings/secretary-invites", { method: "POST" })
      ),
  },
  prescriptions: {
    list: (params?: { page?: number; pageSize?: number; q?: string }) => {
      const sp = new URLSearchParams();
      if (params?.page) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      if (params?.q) sp.set("q", params.q);
      const q = sp.toString();
      return handleResponse<{
        prescriptions: PrescriptionDto[];
        pagination: PaginationMeta;
      }>(fetch(`/api/prescriptions${q ? `?${q}` : ""}`));
    },
    nextNumber: () =>
      handleResponse<{ prescriptionNumber: number }>(
        fetch("/api/prescriptions/next-number")
      ),
    get: (id: number) =>
      handleResponse<{ prescription: PrescriptionDto }>(
        fetch(`/api/prescriptions/${id}`)
      ),
    create: (body: Record<string, unknown>) =>
      handleResponse<{ prescription: PrescriptionDto }>(
        fetch("/api/prescriptions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    update: (id: number, body: Record<string, unknown>) =>
      handleResponse<{ prescription: PrescriptionDto }>(
        fetch(`/api/prescriptions/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    delete: (id: number) =>
      handleResponse<{ success: boolean }>(
        fetch(`/api/prescriptions/${id}`, { method: "DELETE" })
      ),
    uploadImage: async (
      id: number,
      kind: "xray" | "analysis",
      file: File
    ) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file);
      return handleResponse<{ prescription: PrescriptionDto; path: string }>(
        fetch(`/api/prescriptions/${id}/upload-image`, {
          method: "POST",
          body: form,
        })
      );
    },
    deleteImage: (id: number, kind: "xray" | "analysis") =>
      handleResponse<{ prescription: PrescriptionDto }>(
        fetch(`/api/prescriptions/${id}/image?kind=${kind}`, {
          method: "DELETE",
        })
      ),
  },
  appointments: {
    list: (params?: {
      date?: string;
      from?: string;
      to?: string;
      bookingFrom?: string;
      bookingTo?: string;
      status?: string;
      paginate?: boolean;
      page?: number;
      pageSize?: number;
    }) => {
      const sp = new URLSearchParams();
      if (params?.date) sp.set("date", params.date);
      if (params?.from) sp.set("from", params.from);
      if (params?.to) sp.set("to", params.to);
      if (params?.bookingFrom) sp.set("bookingFrom", params.bookingFrom);
      if (params?.bookingTo) sp.set("bookingTo", params.bookingTo);
      if (params?.status) sp.set("status", params.status);
      if (params?.paginate) sp.set("paginate", "1");
      if (params?.page) sp.set("page", String(params.page));
      if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
      const q = sp.toString();
      return handleResponse<{
        appointments: AppointmentDto[];
        pagination?: PaginationMeta;
      }>(fetch(`/api/appointments${q ? `?${q}` : ""}`));
    },
    get: (id: number) =>
      handleResponse<{ appointment: AppointmentDto }>(
        fetch(`/api/appointments/${id}`)
      ),
    create: (body: Record<string, unknown>) =>
      handleResponse<{ appointment: AppointmentDto }>(
        fetch("/api/appointments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    update: (id: number, body: Record<string, unknown>) =>
      handleResponse<{ appointment: AppointmentDto }>(
        fetch(`/api/appointments/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      ),
    delete: (id: number) =>
      handleResponse<{ success: boolean }>(
        fetch(`/api/appointments/${id}`, { method: "DELETE" })
      ),
    toggleStatus: (id: number) =>
      handleResponse<{ appointment: AppointmentDto }>(
        fetch(`/api/appointments/${id}/toggle-status`, { method: "PATCH" })
      ),
  },
};
