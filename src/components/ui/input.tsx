import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex w-full text-sm text-rx-text transition-colors placeholder:text-rx-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      fieldSize: {
        default:
          "h-11 rounded-xl border border-rx-border bg-rx-surface px-4 py-2 shadow-sm hover:border-slate-300 focus-visible:border-rx-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rx-primary/20",
        compact: "rx-input",
      },
    },
    defaultVariants: {
      fieldSize: "default",
    },
  }
);

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, fieldSize, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ fieldSize }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
