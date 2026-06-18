import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
};

export function StatCard({ label, value, hint, icon, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-rx-border/80 bg-rx-surface p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-rx-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-rx-text">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-rx-muted">{hint}</p>}
        </div>
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rx-primary-light text-rx-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
