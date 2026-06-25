import {
  itemsBoxStyle,
  PrescriptionItemsContent,
} from "@/components/recipe/prescription-items-box";
import type { PrescriptionDocumentData } from "@/components/prescription/prescription-document";
import type { RecipeSettingsDto } from "@/lib/recipe-settings";
import { fieldFontSize } from "@/lib/patient-field-layout";
import { formatAge, formatPrescriptionDate, genderLabel } from "@/lib/patient-utils";

export function PositionedPrescriptionBlocks({
  data,
  settings,
}: {
  data: PrescriptionDocumentData;
  settings: RecipeSettingsDto;
}) {
  const printableFields =
    data.printableFields?.filter((field) => field.value.trim()) ?? [];
  const valueOnlyFields = settings.designMode === "image";

  return (
    <>
      {settings.printName && (
        <div
          className="absolute z-10 font-medium whitespace-nowrap"
          style={{
            left: `${settings.designPatientX}%`,
            top: `${settings.designPatientY}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {data.patientName}
        </div>
      )}

      {(settings.printAge || settings.printGender) && (
        <div
          className="absolute z-10 flex gap-3 whitespace-nowrap text-[length:inherit]"
          style={{
            left: `${settings.designAgeX}%`,
            top: `${settings.designAgeY}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {settings.printAge && data.patientBirthdate && (
            <span>{formatAge(data.patientBirthdate)}</span>
          )}
          {settings.printGender && (
            <span>
              {genderLabel(data.patientGender as "male" | "female")}
            </span>
          )}
        </div>
      )}

      {settings.printPhone && data.patientPhone && (
        <div
          className="absolute z-10 whitespace-nowrap text-[length:inherit]"
          style={{
            left: `${settings.designPhoneX}%`,
            top: `${settings.designPhoneY}%`,
            transform: "translate(-50%, -50%)",
          }}
          dir="ltr"
        >
          {data.patientPhone}
        </div>
      )}

      <div
        className="absolute z-10 whitespace-nowrap text-[length:inherit]"
        style={{
          left: `${settings.designDateX}%`,
          top: `${settings.designDateY}%`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {formatPrescriptionDate(data.prescriptionDate)}
      </div>

      {printableFields.map((field) => (
        <div
          key={field.id}
          className="absolute z-10 whitespace-nowrap"
          style={{
            left: `${field.designX}%`,
            top: `${field.designY}%`,
            transform: "translate(-50%, -50%)",
            fontSize: fieldFontSize(field.size),
          }}
        >
          {valueOnlyFields ? (
            field.value
          ) : (
            <>
              <span className="font-medium">{field.name}:</span> {field.value}
            </>
          )}
        </div>
      ))}

      <div
        className="absolute z-10 overflow-hidden break-words [overflow-wrap:anywhere]"
        style={itemsBoxStyle(settings)}
      >
        <PrescriptionItemsContent data={data} settings={settings} />
      </div>
    </>
  );
}
