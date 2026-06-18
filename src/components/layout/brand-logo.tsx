import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  /** Use on dark backgrounds (sidebar, auth panel) */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
  subtitle?: string;
  className?: string;
};

const sizes = {
  sm: { box: "h-9 w-9", img: 36, text: "text-base" },
  md: { box: "h-11 w-11", img: 44, text: "text-lg" },
  lg: { box: "h-14 w-14", img: 56, text: "text-xl" },
  xl: { box: "h-20 w-20", img: 80, text: "text-2xl" },
};

export function BrandLogo({
  variant = "light",
  size = "md",
  showName = true,
  subtitle,
  className,
}: BrandLogoProps) {
  const s = sizes[size];
  const src =
    variant === "dark"
      ? "/brand/logo-dark-bg.png"
      : "/brand/logo.png";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative shrink-0 overflow-hidden rounded-xl",
          s.box,
          variant === "light" && "bg-white shadow-sm ring-1 ring-rx-border/60"
        )}
      >
        <Image
          src={src}
          alt="RX Clinic"
          width={s.img}
          height={s.img}
          className="h-full w-full object-contain"
          priority
        />
      </div>
      {showName && (
        <div className="min-w-0">
          <p
            className={cn(
              "font-bold leading-tight",
              s.text,
              variant === "dark" ? "text-white" : "text-rx-text"
            )}
          >
            RX Clinic
          </p>
          {subtitle && (
            <p
              className={cn(
                "truncate text-xs",
                variant === "dark" ? "text-white/65" : "text-rx-muted"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
