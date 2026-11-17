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

## ADR-004 — Delay broad autonomy

Accepted planning direction: keep model-origin actions review-first. Narrow AI
auto-label policies remain optional and are not prerequisites for parity. No
operator interface may bypass approval or action contracts. ADR-005 supersedes the
earlier Sheets-first and delayed-HTML UI direction for v2.

## Builder decision register

| Unresolved item | Resolve by | Effect if unavailable |
| --- | --- | --- |
| OpenClaw `decision_evaluate` mapping to standalone TypeSafe API | P0 | Keep the verified standalone adapter; do not assume tool/API equivalence |
| Approved worker hosting, reachable authenticated ingress, durable volume | P0 | Revise ADR-003; no hidden alternate deployment |
| SQLite hosting, durable-volume guarantee, backup/restore and worker API identity | Before SQL runtime deployment | Keep schema offline; do not deploy stateful services |
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
