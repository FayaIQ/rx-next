import { requireDoctorApi, isApiError } from "@/lib/api/doctor-auth";
import { apiOk } from "@/lib/api/response";
import {
  listMedicinePresets,
  listMedicinePresetsForMedicine,
} from "@/lib/medicine-preset-service";

export async function GET(request: Request) {
  const ctx = await requireDoctorApi();
  if (isApiError(ctx)) return ctx;

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const type = searchParams.get("type");

  if (name) {
    const presets = await listMedicinePresetsForMedicine(
      ctx.doctorId,
      name,
      type ?? undefined
    );
    return apiOk({ presets });
  }

  const presets = await listMedicinePresets(ctx.doctorId);
  return apiOk({ presets });
}
