import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex w-full text-sm text-rx-text transition-colors placeholder:text-rx-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      fieldSize: {
        default:
          "min-h-[100px] rounded-xl border border-rx-border bg-rx-surface px-4 py-3 shadow-sm hover:border-slate-300 focus-visible:border-rx-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rx-primary/20",
        compact: "rx-textarea min-h-0",
      },
    },
    defaultVariants: {
      fieldSize: "default",
    },
  }
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof textareaVariants>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, fieldSize, ...props }, ref) => (
    <textarea
      className={cn(textareaVariants({ fieldSize }), className)}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
