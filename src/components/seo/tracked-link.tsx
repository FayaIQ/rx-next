"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type GtagWindow = Window & {
  gtag?: (command: "event", eventName: string, parameters: Record<string, string>) => void;
};

type TrackedLinkProps = ComponentProps<typeof Link> & {
  eventLabel: string;
  eventLocation: string;
  eventName?: "seo_cta_click" | "whatsapp_click";
};

export function TrackedLink({
  eventLabel,
  eventLocation,
  eventName = "seo_cta_click",
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        (window as GtagWindow).gtag?.("event", eventName, {
          cta_label: eventLabel,
          cta_location: eventLocation,
          destination: String(props.href),
        });
        onClick?.(event);
      }}
    />
  );
}
