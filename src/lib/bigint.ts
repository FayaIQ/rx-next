export function toDbId(value: number | string | bigint): bigint {
  if (typeof value === "bigint") return value;
  return BigInt(value);
}

export function fromDbId(value: bigint | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

export function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (
    value !== null &&
    typeof value === "object" &&
    "toFixed" in value &&
    typeof (value as { toFixed: unknown }).toFixed === "function"
  ) {
    return (value as { toString: () => string }).toString();
  }
  return value;
}

export function serializeForJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, jsonReplacer)) as T;
}

// PostgreSQL BigInt — JSON.stringify لا يدعمه افتراضياً
declare global {
  interface BigInt {
    toJSON(): number;
  }
}

if (typeof BigInt.prototype.toJSON === "undefined") {
  BigInt.prototype.toJSON = function toJSON() {
    return Number(this);
  };
}
