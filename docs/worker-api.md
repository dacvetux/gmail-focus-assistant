# Focuna worker API

Status: implementation contract for the claw01-hosted worker. It is not deployed.
The API is the only interface between Apps Script and worker-owned SQL/JEV state;
neither Apps Script nor browser code receives database credentials.

## Implementation status

Implemented offline so far: shared canonical path/signature-input/timestamp
primitives in `packages/domain/src/worker-api-auth.ts`, a Stage 1 assessment
payload schema/policy gate, Apps Script request signing and response verification
in `apps/google/src/worker-api-auth.ts`, Node request verification and response
signing in `apps/decision-worker/src/auth.mjs`, a transactional SQLite nonce
repository, and migrations for nonce and payload retention. A SQLite job repository,
Stage 1 validator and submit/poll handlers enforce caller scopes, account binding,
registered question sets, deterministic-review eligibility, retention bounds and
idempotency. `sqlite.mjs` provides durable connection settings and an atomic
numbered migration runner. Typecheck/build pass; Node syntax checks passed. The
injectable HTTP shell enforces request bounds, exact JSON content type, raw-body
authentication, loopback health, route dispatch, typed/redacted errors and signed
responses. SQLite fixed-window rate limiting and provider budget reservations are
implemented offline, but require deployment policy and are not connected to an
active dispatcher. The server does not listen or call JEV. Production key
provisioning/rotation, worker orchestration/provider execution, result retention
cleanup, startup/health supervision, and config/operator routes remain
unimplemented. Do not deploy or activate the worker based on this partial slice.

## Trust and deployment boundary

- Apps Script is the sole Gmail reader/writer and scheduled caller. The worker has
  no Gmail OAuth credentials and does not call Gmail.
- The HTML Service browser calls Apps Script server handlers only. Those handlers
  authenticate as the Focuna Apps Script integration to the worker and pass a
  human actor only when Apps Script has independently verified that identity.
- Worker runtime: one Node.js service on claw01, one SQLite database on a verified
  persistent local volume, one active writer. Caddy terminates public TLS and
  forwards only the approved API hostname/path to a loopback-bound worker.
- Apps Script cannot use claw01's private OpenVPN address as its API route. A DNS
  hostname and Caddy route must be chosen and validated before deployment. Never
  expose the worker's loopback port directly or publish PostgreSQL/SQLite ports.

## Version 1 endpoints

All paths are rooted at `/v1`. JSON is UTF-8, content type is exactly
`application/json`, bodies are limited to 256 KiB, and unknown properties are
rejected. No request data or identifiers containing mailbox content go in URLs.

| Method and path | Purpose | Access |
| --- | --- | --- |
| `GET /v1/health` | Minimal liveness/readiness (`ok`, API version, schema version); no host/process details | Caddy health check only; not public |
| `POST /v1/assessment-jobs` | Submit a minimized, schema-checked job; unique idempotency key returns the existing receipt | Apps Script integration |
| `GET /v1/assessment-jobs/{jobId}` | Poll a job/result; verify account ownership before lookup response | Apps Script integration |
| `GET /v1/config/revisions/{revision}` | Read an immutable config revision by opaque revision ID | Apps Script integration |
| `POST /v1/config/revision-previews` | Validate/diff a candidate revision without publishing | Apps Script integration; operator identity required |
| `POST /v1/config/revisions` | Publish a validated successor revision | Apps Script integration; independently verified human actor and explicit scope required |
| `GET /v1/operator/queue` | Read bounded recommendations and operational summaries | Apps Script integration; authorized operator required |
| `POST /v1/recommendations/{recommendationId}/decisions` | Append approve/reject/correct event bound to proposal digest, snapshot and config revision | Apps Script integration; independently verified human actor required |

Approval endpoints fail closed if Apps Script cannot establish the active human
identity or allowlist membership. A valid HMAC proves the calling integration,
not the identity of the person using the UI. Web-app execution identity and
allowlisted operator policy remain a deployment gate. Request/response schemas
must be versioned in `packages/domain/src/schemas.ts` before endpoint implementation.

Job status is `queued | running | completed | failed | expired`. Submission
returns `202` with `{jobId, idempotencyKey, status, createdAt, deadlineAt}`; a
duplicate idempotency key returns the original job receipt. Poll returns a
versioned envelope and only returns result content for the owning account. A
terminal provider failure is categorized and redacted; raw provider error bodies
are never returned. Rate limits, maximum polling frequency, and retention limits
are configured centrally and recorded in operational metrics.

The submit body is `{schemaVersion, job, snapshot, questionSet, ruleEvidence}`.
The question set must exactly equal its registered worker version. The server
recomputes the idempotency key from verified config/snapshot inputs. A duplicate
key with changed evidence/payload conflicts. Initial submission accepts
classification only, and only where deterministic rules yield unresolved review.
It never grants a Gmail action.

Stage 1 payload bounds: opaque `acct_`/`thr_` references and `e_` evidence IDs;
full parsed sender address; subject <=250 characters; exactly one latest inbound
excerpt <=4,000 characters and at most one preceding message <=2,000 characters;
total excerpts <=6,000 characters; Focuna-managed labels only and no preserved or
personal labels. Apps Script strips quoted history/signatures where detectable
before signing. Payload is retained only while active, with absolute queue expiry
<=72 hours; on terminal state set deletion no later than 24 hours. Content-free
result/audit metadata expires after 30 days. Cleanup and terminal transitions must
maintain these deadlines. TypeSafe's public model page currently lists `jev-1.14.0`
at $0.042 per million input tokens and free output, so 6,000 input tokens reserve
at most $0.000252; pin this version and still enforce the $2/day, $25/month caps.
Public privacy terms state no model training but do not specify a fixed API-input
retention period; confirm account-specific terms or enterprise ZDR before enabling
real-email provider calls.

The SQLite budget repository reserves $0.000252 (252 microdollars) atomically
against the accepted $2/day and $25/month limits before dispatch. Outstanding
reservations continue counting after a process crash; they are not automatically
released because the worker may have crashed after sending a paid request. A
reservation may be released only when dispatch is proven not to have occurred.
Settlement uses provider-reported usage or the reserved maximum when usage is
unavailable. The repository is implemented offline but is not connected to a
dispatcher; live execution remains disabled, and the provider-retention decision
remains unresolved.

## Request authentication: Focuna HMAC v1

HTTPS is mandatory but not the application authentication mechanism. Each caller
has a key ID and 32-byte random HMAC-SHA-256 secret. Apps Script stores the secret
in Script Properties; the worker reads it from a root-owned, mode-0600 secret file
or approved systemd credential. Neither value belongs in source, logs, URLs,
SQLite, or browser JavaScript.

Required headers:

```text
X-Focuna-Key-Id: <key id>
X-Focuna-Timestamp: <Unix seconds, decimal>
X-Focuna-Nonce: <base64url encoding of at least 16 random bytes>
X-Focuna-Content-SHA256: <lowercase hex SHA-256 of exact raw body bytes>
X-Focuna-Signature: <lowercase hex HMAC-SHA-256>
```

The signature input is UTF-8 with literal LF separators and no trailing LF:

```text
FOCUNA-HMAC-SHA256-V1\n<METHOD>\n<PATH>\n<TIMESTAMP>\n<NONCE>\n<BODY_SHA256>
```

`METHOD` is uppercase. `PATH` is the exact origin-form path, beginning with `/`;
query strings, fragments, dot segments, repeated slashes, backslashes and percent-
encoded path separators are rejected. The body digest is checked against the exact
received bytes before JSON parsing. No content compression is accepted. Hex input
is lowercase and length checked; signature comparison is constant-time.

The accepted timestamp window is 300 seconds in either direction. After signature
verification, atomically insert `(keyId, nonce)` into a unique replay table before
dispatching the handler. A reused nonce is rejected, including after a handler
error. Nonce rows expire after 15 minutes; cleanup is bounded and cannot remove
rows still within the timestamp acceptance window. The database transaction must
make replay checking and reservation atomic across concurrent requests. Replays
and bad signatures receive generic `401` responses without revealing whether a
key ID exists. Authentication happens before job lookup or any billable provider
call.

Apps Script retries use the same idempotency key but a fresh timestamp, nonce and
signature. The worker's unique job key prevents a second paid request.

## Signed responses

Responses are returned only over TLS and include:

```text
X-Focuna-Key-Id: <response signing key id>
X-Focuna-Timestamp: <Unix seconds>
X-Focuna-Request-Nonce: <request nonce>
X-Focuna-Content-SHA256: <lowercase hex SHA-256 of exact response bytes>
X-Focuna-Signature: <lowercase hex HMAC-SHA-256>
```

Response signature input uses LF-separated fields and no trailing LF:

```text
FOCUNA-RESPONSE-HMAC-SHA256-V1\n<STATUS>\n<REQUEST_NONCE>\n<TIMESTAMP>\n<BODY_SHA256>
```

The client checks timestamp skew, expected request nonce, body digest, key ID and
constant-time signature before parsing/using a response. Error bodies are bounded,
typed and contain no secrets, raw email excerpts, stack traces or provider payloads.

## Key lifecycle and operational controls

- Provision distinct random keys for each environment. Initial staging and
  production are not the same credential or database.
- Rotate with a short overlap: install a new key ID on the worker, update Script
  Properties, verify a signed health call, then revoke the old key. Never reuse a
  key ID for different secret bytes.
- Maintain key metadata (ID, creation/expiry/revocation time, allowed scopes) but
  never store key material in SQLite. Support immediate revocation.
- Limit caller scope by deployment/account; do not treat possession of a shared
  integration key as permission to approve a human decision.
- Apply Caddy request-size/time limits and a configured application rate limit by
  key ID. The durable fixed-window limiter runs after authentication; set its count
  and window based on measured Apps Script submit/poll behavior before staging.
  Do not log authorization/signature headers, bodies, message excerpts or secrets.
- Audit key ID, route, result category, request ID and latency only. Redact raw
  errors. Enforce retention for non-content audit records separately from excerpts.
- Stop-start/backups must not permit duplicate jobs: nonce uniqueness and
  idempotency constraints live in durable SQLite, not in memory.

## Implementation gates

1. Implement crypto adapters using Node `crypto` (worker) and Web Crypto-compatible
   Apps Script helpers; test against fixed public signing vectors.
2. Implement strict raw-body handling, path validation, constant-time comparisons,
   replay/idempotency repository contracts, and bounded typed errors.
3. Implement only job submit/poll first. Keep config publication and human approval
   endpoints disabled until identity and authorization gates are implemented.
4. Run the service on loopback in a local/staging environment with synthetic data;
   verify signed request and response, replay rejection, skew rejection, bad body
   digest, rotation overlap/revocation, duplicate job behavior and restart recovery.
5. Deploy to claw01 only after privileged read-only host inventory, DNS/TLS route,
   capacity/storage/backup, service isolation and rollback are verified.

No live mailbox payload is used in protocol tests. No JEV call occurs as a side
effect of health checks, authentication tests, or duplicate submissions.
