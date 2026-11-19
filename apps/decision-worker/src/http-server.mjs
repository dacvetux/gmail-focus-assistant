import { createServer } from "node:http";
import { TextDecoder } from "node:util";
import { authenticateWorkerRequest, MAX_BODY_BYTES, signWorkerResponse } from "./auth.mjs";

const REQUEST_TIMEOUT_MS = 15_000;
const SAFE_ERROR_CODES = new Set([
  "INVALID_RECORD", "ASSESSMENT_INVALID", "POLICY_REJECTED", "STALE_SNAPSHOT",
  "CONFIG_CONFLICT", "NOT_FOUND", "RATE_LIMITED", "UNAVAILABLE",
]);

/**
 * Create (but do not listen on) the loopback-only worker HTTP server.
 * handlers is a Map of exact "METHOD /path" keys to application functions.
 */
export function createWorkerHttpServer({ keyRegistry, nonceStore, responseKey, handlers, rateLimiter }) {
  if (!keyRegistry || !nonceStore || !responseKey || !(handlers instanceof Map) || !rateLimiter) {
    throw new TypeError("Worker HTTP server dependencies are required");
  }
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy());

    let identity;
    let body;
    try {
      body = await readBody(request);
      if (isHealthRequest(request)) {
        if (!isLoopback(request.socket.remoteAddress)) return writeJson(response, 404, { error: "NOT_FOUND" });
        return writeJson(response, 200, { ok: true, apiVersion: "v1", schemaVersion: "focuna.v2" });
      }

      identity = await authenticateWorkerRequest(request, body, keyRegistry, nonceStore);
      if (request.headers["content-encoding"] || request.headers["content-type"] !== "application/json") {
        return writeSignedJson(response, 415, { error: "INVALID_RECORD" }, identity.nonce, responseKey);
      }
      if (request.method === "GET" && body.length !== 0) {
        return writeSignedJson(response, 400, { error: "INVALID_RECORD" }, identity.nonce, responseKey);
      }
      if (!await rateLimiter.consume(identity.keyId)) {
        return writeSignedJson(response, 429, { error: "RATE_LIMITED" }, identity.nonce, responseKey);
      }

      let parsedBody;
      try {
        const text = body.length === 0 ? "" : new TextDecoder("utf-8", { fatal: true }).decode(body);
        parsedBody = body.length === 0 ? undefined : JSON.parse(text);
      } catch (_error) {
        return writeSignedJson(response, 400, { error: "INVALID_RECORD" }, identity.nonce, responseKey);
      }
      const route = resolveHandler(handlers, request.method, request.url);
      if (!route) return writeSignedJson(response, 404, { error: "NOT_FOUND" }, identity.nonce, responseKey);

      const result = await route.handler({ request, body: parsedBody, identity, params: route.params });
      const status = Number.isInteger(result?.status) ? result.status : 200;
      return writeSignedJson(response, status, result?.body ?? {}, identity.nonce, responseKey);
    } catch (error) {
      const status = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
      const code = SAFE_ERROR_CODES.has(error?.code) ? error.code : status === 401 ? "UNAUTHORIZED" : "UNAVAILABLE";
      if (identity?.nonce) return writeSignedJson(response, status, { error: code }, identity.nonce, responseKey);
      return writeJson(response, status === 413 ? 413 : status === 401 ? 401 : 400, { error: code });
    }
  });
  server.headersTimeout = 10_000;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  return server;
}

function isHealthRequest(request) {
  return request.method === "GET" && request.url === "/v1/health";
}

function resolveHandler(handlers, method, path) {
  for (const [pattern, handler] of handlers.entries()) {
    const separator = pattern.indexOf(" ");
    if (separator < 0 || pattern.slice(0, separator) !== method) continue;
    const template = pattern.slice(separator + 1).split("/");
    const actual = path.split("/");
    if (template.length !== actual.length) continue;
    const params = {};
    let matches = true;
    for (let index = 0; index < template.length; index += 1) {
      const expected = template[index];
      if (expected.startsWith(":")) {
        if (!actual[index]) { matches = false; break; }
        params[expected.slice(1)] = actual[index];
      } else if (expected !== actual[index]) {
        matches = false;
        break;
      }
    }
    if (matches) return { handler, params };
  }
  return undefined;
}

function isLoopback(address) {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        const error = new Error("Request too large");
        error.statusCode = 413;
        error.code = "INVALID_RECORD";
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function writeJson(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": bytes.byteLength });
  response.end(bytes);
}

function writeSignedJson(response, status, body, nonce, responseKey) {
  const bytes = Buffer.from(JSON.stringify(body), "utf8");
  const headers = signWorkerResponse(status, nonce, bytes, responseKey.keyId, responseKey.secret);
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": bytes.byteLength,
    ...headers,
  });
  response.end(bytes);
}
