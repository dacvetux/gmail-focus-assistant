import { DomainError } from "./errors";

export interface WorkerRequestAuthHeaders {
  keyId: string;
  timestamp: string;
  nonce: string;
  contentSha256: string;
  signature: string;
}

export function canonicalWorkerApiPath(path: string): string {
  if (!path.startsWith("/") || path === "//" || path.includes("?") || path.includes("#") ||
      path.includes("\\") || path.includes("%") || path.includes("//")) {
    invalid("Worker API path is not canonical");
  }
  const segments = path.split("/");
  if (segments.some(segment => segment === "." || segment === "..")) invalid("Worker API path contains a dot segment");
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) invalid("Worker API path contains unsupported characters");
  if (path.length > 512) invalid("Worker API path is too long");
  return path;
}

export function workerRequestSignatureInput(
  method: string,
  path: string,
  headers: Omit<WorkerRequestAuthHeaders, "signature">,
): string {
  if (method !== method.toUpperCase() || !/^(GET|POST|PUT|DELETE)$/.test(method)) invalid("Worker API method is not canonical");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(headers.keyId)) invalid("Worker API key ID is invalid");
  if (!/^[0-9]{1,12}$/.test(headers.timestamp)) invalid("Worker API timestamp is invalid");
  if (!/^[A-Za-z0-9_-]{22,128}$/.test(headers.nonce)) invalid("Worker API nonce is invalid");
  if (!/^[a-f0-9]{64}$/.test(headers.contentSha256)) invalid("Worker API body digest is invalid");
  return [
    "FOCUNA-HMAC-SHA256-V1",
    method,
    canonicalWorkerApiPath(path),
    headers.timestamp,
    headers.nonce,
    headers.contentSha256,
  ].join("\n");
}

export function workerResponseSignatureInput(status: number, requestNonce: string, timestamp: string, bodySha256: string): string {
  if (!Number.isInteger(status) || status < 100 || status > 599) invalid("Worker API response status is invalid");
  if (!/^[A-Za-z0-9_-]{22,128}$/.test(requestNonce)) invalid("Worker API response nonce is invalid");
  if (!/^[0-9]{1,12}$/.test(timestamp)) invalid("Worker API response timestamp is invalid");
  if (!/^[a-f0-9]{64}$/.test(bodySha256)) invalid("Worker API response digest is invalid");
  return ["FOCUNA-RESPONSE-HMAC-SHA256-V1", String(status), requestNonce, timestamp, bodySha256].join("\n");
}

export function workerApiTimestampIsFresh(timestamp: string, nowSeconds: number, maxSkewSeconds = 300): boolean {
  if (!/^[0-9]{1,12}$/.test(timestamp) || !Number.isSafeInteger(nowSeconds) || maxSkewSeconds < 0) return false;
  const issuedAt = Number(timestamp);
  return Number.isSafeInteger(issuedAt) && Math.abs(nowSeconds - issuedAt) <= maxSkewSeconds;
}

function invalid(message: string): never {
  throw new DomainError("INVALID_RECORD", message);
}
