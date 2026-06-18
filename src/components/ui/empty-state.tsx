import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-rx-border bg-rx-bg-subtle/50 px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rx-primary-light text-rx-primary">
          <Icon size={28} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="text-base font-semibold text-rx-text">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-rx-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
