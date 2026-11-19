# Architecture decisions and open facts

## ADR-001 — Preserve outcomes, replace decision plumbing

Accepted planning direction: retain Gmail labels, rules-first behavior, operator
review, digests, conservative follow-ups and draft-only help. Replace global mutable
config, phase-numbered orchestration, direct provider coupling and direct model-to-
action flow with typed/versioned records and distinct policy/execution boundaries.
Tradeoff: more explicit records and migration work, but replay and recovery become
possible. V1 remains archived, not incrementally repurposed as v2 runtime.

## ADR-002 — JEV is advisory intelligence, not an executor

Accepted planning direction: JEV assesses ambiguity and proposes learning; rules,
human approval and deterministic policy control behavior. Begin shadow then review.
Do not assume JEV generates text, explanations, calibrated correctness or tool actions.
The available OpenClaw `decision_evaluate` interface supports supplied-state boolean,
choice and score questions and states that results do not authorize actions.
Its selected provider and standalone accessibility have not been verified here.

P0 has confirmed the provider/API contract: TypeSafe System One, bearer auth,
`POST https://api.typesafe.ai/v1/systemone`, choice questions and model aliases via
`GET /v1/models`. One earlier billable request used synthetic state only and
returned a valid choice distribution. D.C. confirmed charges are expected/accepted,
but exact pricing/rate limits and an operating budget remain open. Retention and
external processing permission for email data are also unresolved. The protected
`TYPESAFE_API_KEY` remains gateway-managed and was not read or copied into source.

The TypeScript adapter is implemented against this contract and tested only with a
fake transport; no request from this adapter has been sent. Before passing real
email-derived state, require a policy-approved minimization limit, retention/data
processing decision, and budget/cost gate. The adapter accepts caller-prepared,
bounded state, makes one request, and does not retry automatically.

## ADR-003 — Keep Google writes local; offload decision work

Proposed implementation baseline: TypeScript pure domain; Apps Script V8 for Gmail/
UI/scheduling; Node worker for authenticated requests, JEV calls and durable SQL
storage. No Gmail write credentials in the worker. Single worker until shared
persistence and concurrency semantics are intentionally designed.

Tradeoff: an extra service and authenticated HTTPS ingress versus Apps Script time
limits and coupling to a provider. P0 must validate deployment owner, persistent
storage, approved ingress, budget and operational fit. This topology is conditional,
not evidence of an available server. No cloud infrastructure is provisioned here.

## ADR-005 — SQL-backed operational store and Apps Script HTML management UI

Accepted direction (2026-11-17, D.C.): use a relational SQL database as v2's
authoritative store for versioned configuration, recommendations, approvals, audit
events, assessment jobs/results, and action journals. Apps Script must not connect
to the database directly or hold database credentials; it calls an authenticated
worker API. The worker owns persistence and JEV calls, while Apps Script remains the
only Gmail reader/writer. Start with SQLite for a single-worker deployment and keep
the repository/migration boundary portable so a move to managed PostgreSQL can be
made if measured availability/concurrency needs justify it. This selects a logical
storage design, not a hosting provider or provisioned service.

Use an Apps Script HTML Service management page as the operator interface, backed
by server-side handlers that call the worker API. It must use the same version-bound
approval and policy gates as any other client; UI actions are never authority by
themselves. Keep credentials out of browser code. Resolve web-app execution
identity/access policy, worker authentication, hosting, backups, retention and
database migration operations before deploying any of these components. No
database, UI, or Google project has been provisioned or changed by this decision.

Tradeoff: normalized/queryable records and a focused operator UI, at the cost of
building an API and operating persistent storage. SQLite is appropriate only while
there is one worker and a verified durable volume/backup path; do not run replicas
against independent SQLite files. Sheets is no longer the v2 system of record.

## ADR-006 — Host the single-worker v2 service on claw01

Accepted direction (2026-11-19, D.C.): use the existing VPS `claw01` as the initial
host for the v2 decision worker and its SQL store, rather than provisioning Cloud
Run and Cloud SQL. Keep SQLite and a single active worker initially; SQLite must
live on verified persistent storage with a documented backup/restore procedure.
Apps Script remains the Gmail reader/writer, scheduler, and HTML Service UI; it
communicates with the worker through an authenticated HTTPS API implemented in
this project and reverse-proxied by the existing Caddy service after host review.
The hostname and DNS zone are still to be selected. No
Gmail credentials or database credentials go to the browser or JEV provider.

The ClawNet architecture inventory identifies `claw01` as `10.8.0.1` on the
OpenVPN mesh, with `d-c-system` at `10.8.0.2`. Read-only SSH connectivity from
`d-c-system` to `claw01` was verified by hostname query on 2026-11-19. This is
evidence of management connectivity only: it does not establish that Apps Script
can reach a worker endpoint, that any port/route is approved, or that the VPS has
capacity, durable storage, backup coverage, or an appropriate public ingress.

Before deployment, inspect the host and existing services read-only; identify disk
capacity, service ownership, existing FlyAwayz resources, firewall/ingress and
backup constraints. Select an isolated application path, service account, SQLite
volume, and backup/restore approach without interfering with existing workloads.
Do not assume Apps Script can route to the private VPN address. Choose and secure
an ingress that Apps Script can reach, define API authentication/key rotation and
TLS, and confirm web-app execution identity/operator access. No service, database,
firewall, DNS, or production state was changed by this ADR.

Tradeoff: avoids new managed-cloud service costs and reuses existing infrastructure,
but D.C. assumes VPS patching, monitoring, backup/restore, capacity, and availability
responsibility. Cloud Run/Cloud SQL remain possible future options only through a
new decision based on measured operational needs and costs.

## ADR-007 — Build the authenticated worker API in Focuna

Accepted direction (2026-11-19, D.C.): implement the Apps Script-to-worker API as
part of the Focuna v2 project, rather than depending on an OpenClaw/Gateway agent
tool as an implicit service endpoint. Serve it from claw01 behind authenticated
HTTPS through Caddy, after host/config/hostname preflight. Define strict versioned
JSON endpoints, HMAC-SHA-256 request authentication, signed request-bound responses,
timestamp and atomic nonce replay protection, key IDs/rotation, rate limits, and
database-backed idempotency. Full wire details and rollout checks are in
[`worker-api.md`](worker-api.md) and [`claw01-deployment.md`](claw01-deployment.md).

The shared HMAC key authenticates the Apps Script integration only. It does not
establish the human operator identity. Config publication and approval endpoints
must remain disabled until Apps Script independently verifies the active user and
authorization policy. Initial service implementation should ship health plus
assessment submit/poll only; later endpoints are gated by their corresponding
domain/policy implementation. HTTPS is required even with HMAC. Do not expose
worker or database ports directly.

The choice of Caddy as the reverse-proxy path is accepted at design level because
it already serves claw01, but no existing route/config has been inspected with
privileged access and no new public hostname is selected. Do not change Caddy,
firewall, DNS, or services until preflight passes. If a safe dedicated hostname
cannot be provided, return for a separate ingress decision rather than opening a
raw port or using the private VPN address from Apps Script.

Tradeoff: a project-owned protocol gives explicit compatibility, replay/idempotency
and key-rotation behavior, but requires implementation and independent security
verification in both Apps Script and Node. Keep protocol test vectors shared across
both runtimes; do not substitute TLS alone for caller authentication.

## ADR-004 — Delay broad autonomy

Accepted planning direction: keep model-origin actions review-first. Narrow AI
auto-label policies remain optional and are not prerequisites for parity. No
operator interface may bypass approval or action contracts. ADR-005 supersedes the
earlier Sheets-first and delayed-HTML UI direction for v2.

## Builder decision register

| Unresolved item | Resolve by | Effect if unavailable |
| --- | --- | --- |
| OpenClaw `decision_evaluate` mapping to standalone TypeSafe API | P0 | Keep the verified standalone adapter; do not assume tool/API equivalence |
| claw01 host capacity, isolation, durable volume, backup/restore, and reachable authenticated ingress | P0/pre-deployment | Keep runtime inactive; no hidden alternate deployment |
| Dedicated API hostname/DNS, privileged Caddy and Docker preflight, Apps Script reachability | P0/pre-deployment | Keep service inactive; do not expose worker or database ports |
| Apps Script web-app execution identity and allowlisted human operators | Before approval/config endpoints | Keep operator mutations disabled |
| Apps Script HTML web-app execution identity and allowlisted operators | Before UI deployment | Keep UI local/unpublished; no owner-privileged web endpoint |
| Actual deployed v1 version and feature ownership | P0 | Migration/cutover cannot proceed |
| Data minimization, retention and external processing policy | P0 | No real email submitted to JEV |
| Measurable quality targets/sample coverage/cost budget | P0 | No shadow-to-live promotion |
| Canonical hashes/signatures, approval identity and persistence schemas | P1 | No trusted network adapter or live executor |
| Draft text provider capability | P6 | Keep drafting disabled, not silently replaced |
| Production cohort, soak window and rollback owner | Before cutover | No production activation |

Update this file with dated evidence and decisions as facts become available.

## V2-P0 evidence — 2026-11-17

- TypeSafe public OpenAPI identifies a bearer-authenticated `POST /v1/systemone`
  supporting `noul`, `choice`, `score` (plus image-oriented `box`) questions, and
  `GET /v1/models`. `jev-latest` and `jev-preview` were listed for this account.
- Using the gateway-injected protected `TYPESAFE_API_KEY`, one deliberately
  synthetic shipping classification succeeded. Requested alias `jev-latest`
  resolved to `jev-1.14.0`; returned the expected `shipping` choice with a full
  probability distribution and usage of 382 input / 52 output tokens. This proves
  API reachability/authentication and a basic choice contract only—not accuracy,
  calibration, pricing, retention, or permission to send real email.
- D.C. confirmed API charges are expected/accepted. Exact price/rate limits and
  an operational budget remain open P0 facts. The smoke request was a billable
  provider call; no private mailbox content was sent.
- The repository's TypeSafe adapter was later added and tested with a fake
  transport only; it has made no network calls and does not read the Secret Store.
- `clasp deployments` succeeded after reauthentication and showed five deployment
  records, including one `@HEAD`. `clasp clone` read 15 live project files. All 14
  `.gs` source files match the Git-archived source byte-for-byte after clasp's
  `.js` extension mapping. No live source changes were made.
- Live Apps Script manifest timezone is `Europe/Belgrade`, while the archived
  manifest and `CONFIG` specify `Europe/Ljubljana`. Both are similar in the current
  region, but the mismatch must be reconciled deliberately before v2 window logic;
  this check did not inspect triggers or actual digest output.
- Google blocked clasp's shared OAuth client for Gmail/Sheets sensitive scopes.
  No Gmail messages, spreadsheet data, or runtime settings were read; live
  inventory remains deferred until an approved access path exists.
