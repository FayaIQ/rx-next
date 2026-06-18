import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rx-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-rx-primary text-white shadow-sm hover:bg-rx-primary-hover hover:shadow-md",
        secondary:
          "border border-rx-border bg-rx-surface text-rx-text shadow-sm hover:bg-rx-bg-subtle hover:border-slate-300",
        outline:
          "border-2 border-rx-primary/20 bg-transparent text-rx-primary hover:bg-rx-primary-light",
        ghost: "text-rx-text-secondary hover:bg-slate-100 hover:text-rx-text",
        danger:
          "bg-rx-danger text-white shadow-sm hover:bg-red-700 hover:shadow-md",
        success:
          "bg-rx-success text-white shadow-sm hover:bg-emerald-700",
        accent:
          "bg-rx-accent text-white shadow-sm hover:bg-teal-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-6 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
