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
        {(settings.phoneNumber || settings.email || settings.address) && (
          <p
            className={cn(
              "text-[10px] opacity-70 sm:text-xs",
              light && "text-white/75"
            )}
          >
            {[settings.phoneNumber, settings.email, settings.address]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
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
            ℞
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
  const templateId = (settings.designTemplate ?? "classic") as RecipeTemplateId;
  getRecipeTemplate(templateId);

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-[5]", className)}>
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
