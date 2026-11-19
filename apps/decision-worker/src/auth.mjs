import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  workerRequestSignatureInput,
  workerResponseSignatureInput,
  workerApiTimestampIsFresh,
} = require("../../../dist/domain/src/worker-api-auth.js");

export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_CLOCK_SKEW_SECONDS = 300;
const NONCE_RETENTION_SECONDS = 900;

/** Verify an already-bounded raw request before route lookup or provider calls. */
export async function authenticateWorkerRequest(request, rawBody, keyRegistry, nonceStore, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!Buffer.isBuffer(rawBody) || rawBody.byteLength > MAX_BODY_BYTES) throw authError();
  const headers = readHeaders(request.headers);
  if (!workerApiTimestampIsFresh(headers.timestamp, nowSeconds, MAX_CLOCK_SKEW_SECONDS)) throw authError();

  const key = keyRegistry.get(headers.keyId);
  if (!key || key.revokedAt || !Buffer.isBuffer(key.secret) || key.secret.byteLength !== 32) throw authError();

  const bodySha256 = createHash("sha256").update(rawBody).digest("hex");
  if (bodySha256 !== headers.contentSha256) throw authError();
  const signatureInput = workerRequestSignatureInput(request.method, request.url, {
    keyId: headers.keyId,
    timestamp: headers.timestamp,
    nonce: headers.nonce,
    contentSha256: headers.contentSha256,
  });
  const expected = createHmac("sha256", key.secret).update(signatureInput, "utf8").digest();
  const supplied = Buffer.from(headers.signature, "hex");
  if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected)) throw authError();

  const expiresAt = Number(headers.timestamp) + NONCE_RETENTION_SECONDS;
  const reserved = await nonceStore.reserve(headers.keyId, headers.nonce, expiresAt);
  if (!reserved) throw authError();
  return { keyId: headers.keyId, principal: key.principal, scopes: [...key.scopes], nonce: headers.nonce };
}

/** Sign exact response bytes and bind them to the originating request nonce. */
export function signWorkerResponse(status, requestNonce, bodyBytes, keyId, secret, timestamp = String(Math.floor(Date.now() / 1000))) {
  if (!Buffer.isBuffer(bodyBytes) || !Buffer.isBuffer(secret) || secret.byteLength !== 32) throw new TypeError("Invalid response signing input");
  const bodySha256 = createHash("sha256").update(bodyBytes).digest("hex");
  const signatureInput = workerResponseSignatureInput(status, requestNonce, timestamp, bodySha256);
  const signature = createHmac("sha256", secret).update(signatureInput, "utf8").digest("hex");
  return {
    "X-Focuna-Key-Id": keyId,
    "X-Focuna-Timestamp": timestamp,
    "X-Focuna-Request-Nonce": requestNonce,
    "X-Focuna-Content-SHA256": bodySha256,
    "X-Focuna-Signature": signature,
  };
}

function readHeaders(headers) {
  const value = name => {
    const raw = headers[`x-focuna-${name}`];
    if (typeof raw !== "string" || raw.length === 0 || raw.includes(",")) throw authError();
    return raw;
  };
  const parsed = {
    keyId: value("key-id"),
    timestamp: value("timestamp"),
    nonce: value("nonce"),
    contentSha256: value("content-sha256"),
    signature: value("signature"),
  };
  if (!/^[a-f0-9]{64}$/.test(parsed.signature)) throw authError();
  return parsed;
}

function authError() {
  const error = new Error("Unauthorized");
  error.statusCode = 401;
  error.code = "UNAUTHORIZED";
  return error;
}
