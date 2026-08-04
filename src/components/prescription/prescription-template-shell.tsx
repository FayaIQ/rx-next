"use client";

import type { RecipeSettingsDto } from "@/lib/api/rx-client";
import { getRecipeTemplate, type RecipeTemplateId } from "@/lib/recipe-templates";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale-provider";

type Props = {
  settings: RecipeSettingsDto;
  logoUrl?: string | null;
  className?: string;
};

function DoctorBlock({
  settings,
  logoUrl,
  light = false,
}: {
  settings: RecipeSettingsDto;
  logoUrl?: string | null;
  light?: boolean;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <h1
          className={cn(
            "truncate text-base font-bold leading-tight sm:text-lg",
            light ? "text-white" : undefined
          )}
        >
          {settings.doctorName}
        </h1>
        <p
          className={cn(
            "text-xs opacity-90 sm:text-sm",
            light ? "text-white/90" : "opacity-80"
          )}
        >
          {settings.doctorSpecialty}
        </p>
        {settings.additionalText1 && (
          <p
            className={cn(
              "text-[10px] opacity-75 sm:text-xs",
              light && "text-white/80"
            )}
          >
            {settings.additionalText1}
          </p>
        )}
        {[settings.phoneNumber, settings.email, settings.address]
          .filter(Boolean)
          .map((line, i) => (
            <p
              key={i}
              className={cn(
                "text-[10px] opacity-70 sm:text-xs",
                light && "text-white/75"
              )}
            >
              {line}
            </p>
          ))}
      </div>
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={t("home.logoAlt")}
          className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
        />
      )}
    </div>
  );
}

function AcademicShell({ settings, logoUrl }: Props) {
  const { t } = useLocale();
  const color = settings.color;
  const services = settings.services
    ?.split(/\r?\n/)
    .map((service) => service.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join(" • ");
  const contact = [settings.phoneNumber, settings.address || settings.email]
    .filter(Boolean)
    .join(" • ");

  return (
    <>
      <div
        className="absolute inset-x-0 top-0 h-[0.65%]"
        style={{ background: `linear-gradient(90deg, #1e293b, ${color})` }}
      />

      {logoUrl && (
        <div className="absolute left-[7%] top-[4.6%] flex h-[10%] w-[14%] items-center justify-center rounded-[10px] border border-slate-300 bg-white p-2 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={t("home.logoAlt")}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      <header className="absolute left-[22%] right-[8%] top-[2.6%] text-center">
        <p className="truncate text-[0.86em] font-extrabold" style={{ color }}>
          {settings.clinicName || "RX Clinic"}
        </p>
        <h1 className="mt-0.5 truncate text-[1.5em] font-black leading-[1.12] text-slate-900">
          {settings.doctorName}
        </h1>
        <p className="mt-0.5 truncate text-[0.86em] font-extrabold" style={{ color }}>
          {settings.doctorSpecialty}
        </p>
        {settings.professionalTitle && (
          <p className="mx-auto mt-0.5 max-w-[94%] truncate text-[0.62em] leading-tight text-slate-600">
            {settings.professionalTitle}
          </p>
        )}
      </header>

      {settings.licenseNumber && (
        <div className="absolute left-[22%] right-[8%] top-[15.2%] text-center">
          <p className="inline-flex max-w-full truncate rounded border border-slate-200 bg-slate-50 px-1.5 py-px text-[0.59em] font-bold leading-tight text-slate-600">
            {t("recipe.academicLicense")}&nbsp;
            <span dir="ltr">{settings.licenseNumber}</span>
          </p>
        </div>
      )}

      {services && (
        <p className="absolute left-[8%] right-[8%] top-[18.5%] truncate text-center text-[0.59em] leading-tight text-slate-500">
          {services}
        </p>
      )}

      <div className="absolute left-[8%] right-[8%] top-[20.8%] h-px bg-slate-300" />
      <div
        className="absolute left-[8%] right-[8%] top-[21.5%] h-0.5"
        style={{ backgroundColor: color }}
      />

      <div
        className="absolute left-[8%] right-[8%] top-[23.55%] grid grid-cols-[1.45fr_1fr_1.05fr] gap-[1.8%] text-[0.68em] font-bold text-slate-700"
        dir="rtl"
      >
        <AcademicPatientField label={t("recipe.labelPatient")} />
        <AcademicPatientField label={t("recipe.labelAgeGender")} />
        <AcademicPatientField label={t("recipe.labelDate")} />
      </div>
      <div className="absolute left-[8%] right-[8%] top-[26.5%] h-px bg-slate-200" />
      {[43, 56, 69].map((top) => (
        <div
          key={top}
          className="absolute left-[8%] right-[8%] border-b border-dashed border-slate-200"
          style={{ top: `${top}%` }}
        />
      ))}

      {contact && (
        <footer
          className="absolute bottom-[4.3%] left-[8%] right-[8%] truncate border-t pt-1 text-center text-[0.63em] leading-tight text-slate-500"
          style={{ borderColor: color }}
        >
          {settings.phoneNumber && (
            <strong className="text-sky-900" dir="ltr">
              {settings.phoneNumber}
            </strong>
          )}
          {settings.phoneNumber && (settings.address || settings.email) && " • "}
          {settings.address || settings.email}
        </footer>
      )}
    </>
  );
}

function AcademicPatientField({ label }: { label: string }) {
  return (
    <div className="flex min-w-0 items-end gap-1 whitespace-nowrap">
      <span>{label}:</span>
      <span className="h-[1em] min-w-0 flex-1 border-b border-dotted border-slate-400" />
    </div>
  );
}

function ClassicShell({ settings, logoUrl }: Props) {
  const color = settings.color;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-2 rounded border-2"
        style={{ borderColor: `${color}44` }}
      />
      <div
        className="pointer-events-none absolute inset-x-2 top-2 flex items-center justify-between rounded-t px-4 py-3 sm:px-5 sm:py-4"
        style={{ height: "16%", backgroundColor: color, color: "#fff" }}
      >
        <DoctorBlock settings={settings} logoUrl={logoUrl} light />
      </div>
      <div
        className="pointer-events-none absolute inset-x-2"
        style={{
          top: "calc(16% + 8px)",
          height: "7%",
          backgroundColor: `${color}0d`,
          borderBottom: `1px solid ${color}22`,
        }}
      />
    </>
  );
}

function ModernShell({ settings, logoUrl }: Props) {
  const color = settings.color;
  return (
    <>
      <div
        className="pointer-events-none absolute top-0 bottom-0 right-0 w-[6%]"
        style={{ backgroundColor: color }}
      />
      <div
        className="pointer-events-none absolute rounded-xl border-2"
        style={{
          borderColor: `${color}22`,
          left: "10%",
          right: "4%",
          top: "12%",
          bottom: "6%",
        }}
      />
      <div className="pointer-events-none absolute inset-x-[10%] top-0 px-4 pt-4 sm:px-5 sm:pt-5">
        <DoctorBlock settings={settings} logoUrl={logoUrl} />
      </div>
    </>
  );
}

function ElegantShell({ settings, logoUrl }: Props) {
  const { t } = useLocale();
  const color = settings.color;
  return (
    <>
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-[5%] h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[5%] left-[8%] right-[8%] h-0.5"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-[8%] px-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="h-px w-8 sm:w-10" style={{ backgroundColor: color }} />
          <span className="text-lg font-bold" style={{ color }}>
            RX
          </span>
          <span className="h-px w-8 sm:w-10" style={{ backgroundColor: color }} />
        </div>
        <h1 className="text-base font-bold sm:text-lg">{settings.doctorName}</h1>
        <p className="text-xs opacity-80 sm:text-sm">{settings.doctorSpecialty}</p>
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={t("home.logoAlt")} className="mx-auto mt-2 h-10 object-contain" />
        )}
      </div>
    </>
  );
}

function MedicalShell({ settings, logoUrl }: Props) {
  const { t } = useLocale();
  const color = settings.color;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3 text-white sm:px-5 sm:py-4"
        style={{ height: "17%", backgroundColor: color }}
      >
        <div className="min-w-0">
          <h1 className="truncate text-base font-bold sm:text-lg">
            {settings.doctorName}
          </h1>
          <p className="text-xs opacity-90 sm:text-sm">{settings.doctorSpecialty}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-2xl font-light opacity-90">✚</span>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={t("home.logoAlt")} className="h-10 w-10 object-contain" />
          )}
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-[6%] bottom-[6%] top-[18%] opacity-60"
        style={{
          backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      />
    </>
  );
}

function MinimalShell({ settings, logoUrl }: Props) {
  const color = settings.color;
  return (
    <>
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-[10%] h-px"
        style={{ backgroundColor: `${color}44` }}
      />
      <div className="pointer-events-none absolute inset-x-[8%] top-[4%]">
        <DoctorBlock settings={settings} logoUrl={logoUrl} />
      </div>
    </>
  );
}

export function PrescriptionTemplateShell({ settings, logoUrl, className }: Props) {
  const requestedTemplate = (settings.designTemplate ?? "classic") as RecipeTemplateId;
  const templateId = getRecipeTemplate(requestedTemplate).id;

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[5]", className)}>
      {templateId === "academic" && (
        <AcademicShell settings={settings} logoUrl={logoUrl} />
      )}
      {templateId === "modern" && (
        <ModernShell settings={settings} logoUrl={logoUrl} />
      )}
      {templateId === "elegant" && (
        <ElegantShell settings={settings} logoUrl={logoUrl} />
      )}
      {templateId === "medical" && (
        <MedicalShell settings={settings} logoUrl={logoUrl} />
      )}
      {templateId === "minimal" && (
        <MinimalShell settings={settings} logoUrl={logoUrl} />
      )}
      {(templateId === "classic" || !templateId) && (
        <ClassicShell settings={settings} logoUrl={logoUrl} />
      )}
    </div>
  );
}
