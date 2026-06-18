import { toDbId, fromDbId } from "./bigint";

export function toUserId(value: unknown): number {
  const id = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Invalid user id");
  }
  return id;
}

export function toOptionalUserId(value: unknown): number | null {
  if (value == null || value === "") return null;
  return toUserId(value);
}

export function userIdToDb(value: number | string): bigint {
  return toDbId(value);
}

export { toDbId, fromDbId };
