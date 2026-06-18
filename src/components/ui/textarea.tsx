import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-xl border border-rx-border bg-rx-surface px-4 py-3 text-sm text-rx-text shadow-sm transition-colors placeholder:text-rx-muted-foreground",
        "hover:border-slate-300 focus-visible:border-rx-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rx-primary/20",
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
