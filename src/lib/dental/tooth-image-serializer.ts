import { fromDbId } from "@/lib/bigint";

export function serializeToothImage(image: {
  id: bigint;
  doctorId: bigint;
  patientId: bigint;
  toothFdi: number;
  imageUrl: string;
  imageType: string;
  caption: string | null;
  createdAt: Date | null;
}) {
  return {
    id: fromDbId(image.id),
    doctorId: fromDbId(image.doctorId),
    patientId: fromDbId(image.patientId),
    toothFdi: image.toothFdi,
    imageUrl: image.imageUrl,
    imageType: image.imageType,
    caption: image.caption,
    createdAt: image.createdAt?.toISOString() ?? null,
  };
}

export type ToothImageDto = ReturnType<typeof serializeToothImage>;
