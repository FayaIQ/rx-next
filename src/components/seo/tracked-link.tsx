"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters: Record<string, string>) => void;
};

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventLabel: string;
  eventLocation: string;
};

export function TrackedLink({
  eventLabel,
  eventLocation,
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        (window as GtagWindow).gtag?.("event", "seo_cta_click", {
          cta_label: eventLabel,
          cta_location: eventLocation,
          destination: String(props.href),
        });
        onClick?.(event);
      }}
    />
  );
}
