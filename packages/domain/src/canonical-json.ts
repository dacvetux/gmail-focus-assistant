import { DomainError } from "./errors";

type JsonPrimitive = string | number | boolean | null;
export type CanonicalJson = JsonPrimitive | CanonicalJson[] | { [key: string]: CanonicalJson };

/** Stable JSON serialization for hash/signature inputs. Rejects ambiguous values. */
export function canonicalJson(value: unknown): string {
  return serialize(value, new Set<object>());
}

/**
 * Hash canonical JSON through a host-provided SHA-256 implementation. Keeping the
 * primitive injected avoids Node-only imports and lets Apps Script use Utilities.
 * The host adapter must UTF-8 encode the exact supplied string and return lowercase
 * hexadecimal bytes.
 */
export function canonicalSha256(value: unknown, sha256Hex: (canonicalText: string) => string): string {
  const digest = sha256Hex(canonicalJson(value));
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new DomainError("INVALID_RECORD", "SHA-256 provider must return exactly 64 lowercase hexadecimal characters");
  }
  return digest;
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
    if (Array.isArray(value)) {
      const items: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) throw new DomainError("INVALID_RECORD", "Canonical JSON rejects sparse arrays");
        items.push(serialize(value[index], ancestors));
      }
      if (Object.getOwnPropertySymbols(value).length > 0) throw new DomainError("INVALID_RECORD", "Canonical JSON rejects symbol properties");
      return `[${items.join(",")}]`;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new DomainError("INVALID_RECORD", "Canonical JSON accepts only plain objects");
    }
    const record = value as Record<string, unknown>;
    if (Object.getOwnPropertySymbols(value).length > 0) throw new DomainError("INVALID_RECORD", "Canonical JSON rejects symbol properties");
    for (const key of Object.getOwnPropertyNames(record)) {
      const descriptor = Object.getOwnPropertyDescriptor(record, key);
      if (!descriptor?.enumerable || descriptor.get || descriptor.set) {
        throw new DomainError("INVALID_RECORD", "Canonical JSON accepts only enumerable data properties");
      }
    }
    const keys = Object.keys(record).sort();
    for (const key of keys) {
      if (record[key] === undefined) throw new DomainError("INVALID_RECORD", `Undefined value at key: ${key}`);
    }
    return `{${keys.map(key => `${JSON.stringify(key)}:${serialize(record[key], ancestors)}`).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}
