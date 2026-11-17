import { DomainError } from "./errors";

type JsonPrimitive = string | number | boolean | null;
export type CanonicalJson = JsonPrimitive | CanonicalJson[] | { [key: string]: CanonicalJson };

/** Stable JSON serialization for hash/signature inputs. Rejects ambiguous values. */
export function canonicalJson(value: unknown): string {
  return serialize(value, new Set<object>());
}

function serialize(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new DomainError("INVALID_RECORD", "Canonical JSON rejects non-finite numbers");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value !== "object") {
    throw new DomainError("INVALID_RECORD", `Canonical JSON rejects ${typeof value}`);
  }
  if (ancestors.has(value)) throw new DomainError("INVALID_RECORD", "Canonical JSON rejects cyclic values");

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map(item => serialize(item, ancestors)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new DomainError("INVALID_RECORD", "Canonical JSON accepts only plain objects");
    }
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    for (const key of keys) {
      if (record[key] === undefined) throw new DomainError("INVALID_RECORD", `Undefined value at key: ${key}`);
    }
    return `{${keys.map(key => `${JSON.stringify(key)}:${serialize(record[key], ancestors)}`).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
