import type { ToothStatusId } from "./constants";

/** Healthy is exclusive; existing restorations and root-canal treatment coexist. */
export function toggleToothStatus(current: ToothStatusId[], next: ToothStatusId) {
  let statuses: ToothStatusId[];
  if (next === "healthy") statuses = ["healthy"];
  else {
    statuses = current.filter((status) => status !== "healthy" && status !== next);
    if (!current.includes(next)) statuses.push(next);
    if (!statuses.length) statuses = ["healthy"];
  }
  return { statuses, status: statuses[statuses.length - 1] };
}
