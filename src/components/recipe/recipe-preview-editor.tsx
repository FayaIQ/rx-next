"use client";

import { useState } from "react";
import {
  PrescriptionDocument,
  type PrescriptionDocumentData,
} from "@/components/prescription/prescription-document";
import { DraggableBlock, type PositionKey } from "./draggable-block";
import {
  itemsBoxSize,
  PrescriptionItemsContent,
} from "@/components/recipe/prescription-items-box";
import { fieldFontSize } from "@/lib/patient-field-layout";
import { formatAge, formatPrescriptionDate, genderLabel } from "@/lib/patient-utils";
import { fontFamilyCss } from "@/lib/recipe-settings";
import { paperDimensions } from "@/lib/recipe-paper";

type Props = {
  data: PrescriptionDocumentData;
  onPositionChange: (key: PositionKey, x: number, y: number) => void;
  onItemsSizeChange: (width: number, height: number) => void;
  onFieldPositionChange?: (fieldId: number, x: number, y: number) => void;
};

const LABELS: Record<PositionKey, string> = {
  patient: "اسم المريض",
  ageGender: "العمر / الجنس",
  phone: "الهاتف",
  date: "التاريخ",
  items: "التشخيص / الأدوية",
};

export function RecipePreviewEditor({
  data,
  onPositionChange,
  onItemsSizeChange,
  onFieldPositionChange,
}: Props) {
  const [selected, setSelected] = useState<PositionKey | string | null>(null);
  const s = data.settings;
  const isImageMode = s.designMode === "image";
  const itemsSize = itemsBoxSize(s);
  const dims = paperDimensions(s.paperSize);

  function move(key: PositionKey, x: number, y: number) {
    onPositionChange(key, x, y);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-xl border border-rx-border bg-slate-100 p-3 sm:p-4">
        <div
          className="relative mx-auto inline-block"
          data-recipe-canvas
          style={{
            width: dims.width,
            height: dims.height,
            color: s.color,
            fontFamily: fontFamilyCss(s.fontFamily),
            fontSize: `${s.fontSize}px`,
          }}
        >
          <PrescriptionDocument
            data={data}
            className="shadow-lg"
            editorMode
          />

          <div className="pointer-events-none absolute inset-0">
            <div className="pointer-events-auto relative h-full min-h-full w-full">
              {s.printName && (
                <DraggableBlock
                  id="patient"
                  label={LABELS.patient}
                  x={s.designPatientX}
                  y={s.designPatientY}
                  selected={selected === "patient"}
                  onSelect={setSelected}
                  onMove={(x, y) => move("patient", x, y)}
                >
                  <span className="font-medium">{data.patientName}</span>
                </DraggableBlock>
              )}

              {(s.printAge || s.printGender) && (
                <DraggableBlock
                  id="ageGender"
                  label={LABELS.ageGender}
                  x={s.designAgeX}
                  y={s.designAgeY}
                  selected={selected === "ageGender"}
                  onSelect={setSelected}
                  onMove={(x, y) => move("ageGender", x, y)}
                >
                  <span className="flex gap-3 text-sm">
                    {s.printAge && data.patientBirthdate && (
                      <span>{formatAge(data.patientBirthdate)}</span>
                    )}
                    {s.printGender && (
                      <span>
                        {genderLabel(data.patientGender as "male" | "female")}
                      </span>
                    )}
                  </span>
                </DraggableBlock>
              )}

              {s.printPhone && data.patientPhone && (
                <DraggableBlock
                  id="phone"
                  label={LABELS.phone}
                  x={s.designPhoneX}
                  y={s.designPhoneY}
                  selected={selected === "phone"}
                  onSelect={setSelected}
                  onMove={(x, y) => move("phone", x, y)}
                >
                  <span className="text-sm" dir="ltr">
                    {data.patientPhone}
                  </span>
                </DraggableBlock>
              )}

              <DraggableBlock
                id="date"
                label={LABELS.date}
                x={s.designDateX}
                y={s.designDateY}
                selected={selected === "date"}
                onSelect={setSelected}
                onMove={(x, y) => move("date", x, y)}
              >
                <span className="text-sm">
                  {formatPrescriptionDate(data.prescriptionDate)}
                </span>
              </DraggableBlock>

              <DraggableBlock
                id="items"
                label={LABELS.items}
                x={s.designItemsX}
                y={s.designItemsY}
                anchor="top-start"
                widthPct={itemsSize.width}
                heightPct={itemsSize.height}
                selected={selected === "items"}
                onSelect={setSelected}
                onMove={(x, y) => move("items", x, y)}
                onResize={onItemsSizeChange}
              >
                <div className="text-sm">
                  <PrescriptionItemsContent data={data} settings={s} />
                </div>
              </DraggableBlock>

              {data.printableFields?.map((field) => (
                <DraggableBlock
                  key={field.id}
                  id={`field-${field.id}`}
                  label={field.name}
                  x={field.designX}
                  y={field.designY}
                  selected={selected === `field-${field.id}`}
                  onSelect={setSelected}
                  onMove={(x, y) => onFieldPositionChange?.(field.id, x, y)}
                >
                  <span style={{ fontSize: fieldFontSize(field.size) }}>
                    {isImageMode ? (
                      field.value
                    ) : (
                      <>
                        <span className="font-medium">{field.name}:</span>{" "}
                        {field.value}
                      </>
                    )}
                  </span>
                </DraggableBlock>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
