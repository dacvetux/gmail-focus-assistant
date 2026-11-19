import { constants } from "node:fs";
import { open } from "node:fs/promises";

const KEY_ID = /^[A-Za-z0-9._-]{1,100}$/;

/** Load a strict key registry from a non-symlink file inaccessible to group/other. */
export async function loadFileKeyRegistry(path) {
  if (typeof path !== "string" || path.length === 0) throw new TypeError("Credential file path is required");
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let raw;
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > 64 * 1024 || (metadata.mode & 0o077) !== 0) {
      throw new Error("Credential file must be a small regular file with mode 0600 or stricter");
    }
    raw = await handle.readFile({ encoding: "utf8" });
  } finally {
    await handle.close();
  }
  let document;
  try {
    document = JSON.parse(raw);
  } catch (_error) {
    throw new Error("Credential file is not valid JSON");
  }
  if (!isRecord(document) || !hasExactKeys(document, ["keys"]) || !Array.isArray(document.keys) || document.keys.length === 0) {
    throw new Error("Credential file must contain a non-empty keys array");
  }

  const registry = new Map();
  for (const entry of document.keys) {
    if (!isRecord(entry) || !hasExactKeys(entry, ["keyId", "secretBase64", "principal", "scopes", "accountRefs"], ["revokedAt"])) {
      throw new Error("Credential entry has an invalid shape");
    }
    if (typeof entry.keyId !== "string" || !KEY_ID.test(entry.keyId) || registry.has(entry.keyId)) {
      throw new Error("Credential key ID is invalid or duplicated");
    }
    if (typeof entry.secretBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.secretBase64)) {
      throw new Error("Credential secret must be standard base64");
    }
    const secret = Buffer.from(entry.secretBase64, "base64");
    if (secret.byteLength !== 32 || secret.toString("base64") !== entry.secretBase64) {
      throw new Error("Credential secret must encode exactly 32 bytes");
    }
    if (typeof entry.principal !== "string" || entry.principal.length === 0 || entry.principal.length > 120) {
      throw new Error("Credential principal is invalid");
    }
    if (!validStringList(entry.scopes, 1, 20) || !validStringList(entry.accountRefs, 0, 100)) {
      throw new Error("Credential scopes or account references are invalid");
    }
    let revokedAt;
    if (entry.revokedAt !== undefined) {
      if (typeof entry.revokedAt !== "string" || !Number.isFinite(Date.parse(entry.revokedAt))) {
        throw new Error("Credential revocation timestamp is invalid");
      }
      revokedAt = entry.revokedAt;
    }
    registry.set(entry.keyId, {
      keyId: entry.keyId,
      secret,
      principal: entry.principal,
      scopes: [...entry.scopes],
      accountRefs: [...entry.accountRefs],
      ...(revokedAt ? { revokedAt } : {}),
    });
  }
  return registry;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, required, optional = []) {
  const actual = Object.keys(value);
  return required.every(key => Object.hasOwn(value, key)) &&
    actual.every(key => required.includes(key) || optional.includes(key));
}

function validStringList(value, minimum, maximum) {
  return Array.isArray(value) && value.length >= minimum && value.length <= maximum &&
    value.every(item => typeof item === "string" && item.length > 0 && item.length <= 120) &&
    new Set(value).size === value.length;
}
