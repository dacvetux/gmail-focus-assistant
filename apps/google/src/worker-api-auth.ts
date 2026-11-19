import {
  canonicalWorkerApiPath,
  workerApiTimestampIsFresh,
  workerRequestSignatureInput,
  workerResponseSignatureInput,
} from "../../../packages/domain/src/worker-api-auth";

export interface AppsScriptHmacUtilitiesPort {
  Charset: { UTF_8: unknown };
  computeHmacSha256Signature(value: string, key: number[], charset: unknown): number[];
  base64DecodeWebSafe(value: string): number[];
  base64EncodeWebSafe(value: string): string;
  getUuid(): string;
}

export interface WorkerRequestHeaders {
  "X-Focuna-Key-Id": string;
  "X-Focuna-Timestamp": string;
  "X-Focuna-Nonce": string;
  "X-Focuna-Content-SHA256": string;
  "X-Focuna-Signature": string;
}

/** Create Focuna HMAC v1 headers for an exact Apps Script request body string. */
export function createWorkerRequestHeaders(
  utilities: AppsScriptHmacUtilitiesPort,
  sha256Hex: (text: string) => string,
  method: string,
  path: string,
  rawBody: string,
  keyId: string,
  secretBase64Url: string,
  timestampSeconds = Math.floor(Date.now() / 1000),
): WorkerRequestHeaders {
  const canonicalPath = canonicalWorkerApiPath(path);
  if (path !== canonicalPath || path.includes("?")) throw new Error("Worker API path must be canonical and have no query");
  const timestamp = String(timestampSeconds);
  const nonce = utilities.base64EncodeWebSafe(`${utilities.getUuid()}${utilities.getUuid()}`).replace(/=+$/g, "");
  const keyBytes = utilities.base64DecodeWebSafe(secretBase64Url);
  if (keyBytes.length !== 32 || nonce.length < 22) throw new Error("Invalid worker API credential or nonce");
  const contentSha256 = sha256Hex(rawBody);
  const headers = { keyId, timestamp, nonce, contentSha256 };
  const input = workerRequestSignatureInput(method, canonicalPath, headers);
  const signature = utilities.computeHmacSha256Signature(
    input,
    keyBytes,
    utilities.Charset.UTF_8,
  ).map(byte => ((byte + 256) % 256).toString(16).padStart(2, "0")).join("");
  return {
    "X-Focuna-Key-Id": keyId,
    "X-Focuna-Timestamp": timestamp,
    "X-Focuna-Nonce": nonce,
    "X-Focuna-Content-SHA256": contentSha256,
    "X-Focuna-Signature": signature,
  };
}

/** Verify a signed response before Apps Script parses or acts on its body. */
export function verifyWorkerResponse(
  utilities: AppsScriptHmacUtilitiesPort,
  sha256Hex: (text: string) => string,
  response: { status: number; body: string; headers: Record<string, string | undefined> },
  expectedRequestNonce: string,
  keysById: Record<string, string>,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const headers = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), value]));
  const keyId = headers["x-focuna-key-id"];
  const timestamp = headers["x-focuna-timestamp"];
  const nonce = headers["x-focuna-request-nonce"];
  const digest = headers["x-focuna-content-sha256"];
  const signature = headers["x-focuna-signature"];
  if (!keyId || !timestamp || nonce !== expectedRequestNonce || !digest || !signature) return false;
  if (!workerApiTimestampIsFresh(timestamp, nowSeconds, 300) || !/^[a-f0-9]{64}$/.test(digest) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const secret = keysById[keyId];
  if (!secret) return false;
  let keyBytes: number[];
  try { keyBytes = utilities.base64DecodeWebSafe(secret); } catch (_error) { return false; }
  if (keyBytes.length !== 32 || sha256Hex(response.body) !== digest) return false;
  const input = workerResponseSignatureInput(response.status, nonce, timestamp, digest);
  const expected = utilities.computeHmacSha256Signature(input, keyBytes, utilities.Charset.UTF_8);
  const supplied = signature.match(/../g)?.map(byte => parseInt(byte, 16)) ?? [];
  if (expected.length !== supplied.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= ((expected[index] + 256) % 256) ^ supplied[index];
  return difference === 0;
}
