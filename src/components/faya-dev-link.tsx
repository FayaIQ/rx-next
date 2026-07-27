import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const FAYA_DEV_URL = "https://faya.dev";

export function FayaDevLink({
  children = "Faya Dev",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={FAYA_DEV_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "font-medium underline-offset-4 transition hover:underline",
        className
      )}
    >
      {children}
    </a>
  );
}

export function LinkedFayaDevText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(/(Faya Dev)/gi);

  return (
    <>
      {parts.map((part, index) =>
        /^Faya Dev$/i.test(part) ? (
          <FayaDevLink key={`${part}-${index}`} className={className}>
            {part}
          </FayaDevLink>
        ) : (
          part
        )
      )}
    </>
  );
}
