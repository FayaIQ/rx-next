import { useEffect, type RefObject } from "react";

export const RX_TAB_FIELD_SELECTOR =
  "input:not([disabled]):not([type='hidden']):not([tabindex='-1']), textarea:not([disabled]):not([tabindex='-1']), select:not([disabled]):not([tabindex='-1'])";

export function getTabFields(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(RX_TAB_FIELD_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0
  );
}

export function focusNextTabField(root: HTMLElement, backwards: boolean) {
  const fields = getTabFields(root);
  if (!fields.length) return;

  const active = document.activeElement as HTMLElement | null;
  let idx = active ? fields.indexOf(active) : -1;

  // If focus is on a non-field inside root, start from ends
  if (idx === -1 && active && root.contains(active)) {
    idx = backwards ? fields.length : -1;
  }

  const next = backwards
    ? fields[(idx - 1 + fields.length) % fields.length]
    : fields[(idx + 1) % fields.length];
  next.focus();
}

/** Tab cycles only between inputs / textareas / selects inside `root`. */
export function useFieldsOnlyTab(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const el = rootRef.current;
      if (!el || !el.contains(document.activeElement)) return;
      e.preventDefault();
      focusNextTabField(el, e.shiftKey);
    }

    root.addEventListener("keydown", onKeyDown, true);
    return () => root.removeEventListener("keydown", onKeyDown, true);
  }, [rootRef]);
}
