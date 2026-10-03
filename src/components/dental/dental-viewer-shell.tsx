"use client";

import { FdiDentalViewer } from "@/components/dental/fdi-dental-viewer";
import type { TreatmentPlanMarker } from "@/lib/dental/treatment-plan-markers";

type ToothRecord = {
  toothFdi: number;
  status: string;
  statuses?: string[];
  notes?: string | null;
};

type Props = {
  teeth: ToothRecord[];
  selectedFdi: number | null;
  onSelect: (fdi: number) => void;
  showAnnotations?: boolean;
  treatmentPlanMarkers?: TreatmentPlanMarker[];
};

export function DentalViewerShell(props: Props) {
  return (
    <FdiDentalViewer
      teeth={props.teeth}
      selectedFdi={props.selectedFdi}
      onSelect={props.onSelect}
      treatmentPlanMarkers={props.treatmentPlanMarkers}
    />
  );
}
