# Current state — v2

## Prepared

- V1 source and documentation relocated intact to `archive/v1/`.
- Original baseline identified by commit and recovery tag.
- V2 architecture, decision contract, phased roadmap, migration and acceptance plans.
- Builder instructions separating planned work from implemented behavior.
- V2-P0 discovery started: TypeSafe Jev API key/model endpoint verified using one
  synthetic billable choice request; all 14 live Apps Script source files match v1.
- Live deployment inventory read-only: five deployment records (one `@HEAD`); no
  code, deployment, trigger, Gmail or Sheets changes made.

## Not implemented

Google adapters/executors, JEV adapter integration, runtime SQL repositories/API,
approval workflow, HTML management UI, digests, drafts, follow-ups, and deployment
pipelines remain future work. An initial SQLite schema migration is now defined and
tested in-memory; no database or worker has been deployed. Initial offline schemas,
tooling and checks are described below. JEV API
authentication/reachability has been smoke-checked with synthetic state; decision
quality, retention, pricing and budget are not yet verified. No production migration
has occurred.

V2-P1 offline contract/tooling slice is underway: machine-readable schemas for all
initial records, core types, legacy label mapping, typed errors, canonical JSON,
semantic JEV choice-distribution validation, and offline test/CI setup have been
added. Assessment results are also bound to the originating job, snapshot, config
revision and deadline. Config revisions now carry verifiable content digests, and
approval events have a sequence/previous-digest chain verifier. Remaining work
includes durable approval workflow persistence, signatures/key management, and
complete tooling verification. The offline execution gate binds an approved record
to the exact proposal digest and current snapshot/config revisions.
Approval records now carry a scope and actor type; only a human proposal-execution
approval passes the pure gate. A storage-neutral append/CAS interface verifies
chains and idempotent approval IDs; host identity authentication and a durable
append-only adapter remain unimplemented.
Canonical JSON and the SHA-256 adapter seam reject ambiguous input values; the pure
domain now builds and smoke-loads as a Google V8-compatible `.gs` bundle. Production
Apps Script `Utilities.computeDigest` SHA-256 adapter is implemented and fake-runtime
tested; worker-runtime digest adapter, signatures, and key management remain open.
Sender normalization, duplicate-selector rejection, and exact/specific-domain rule
precedence are implemented with synthetic coverage; full v1 rules parity remains
future work. A first deterministic evaluator now verifies config digests, blocks
threads with preserved labels, uses approved sender rules, defaults unmatched mail
to visible review, and downgrades no-reply `to-respond` to notification. Pattern-rule
coverage and source-by-source parity have not yet been ported. Those safety guards
are now shared as a pure policy function for future JEV candidates, so model results
cannot bypass preservation, no-reply, or structural/workflow consistency checks.
Thread snapshots now use SHA-256 fingerprints over canonical content and validate
preserved-label membership and unique evidence IDs before rule evaluation.
V2-P3 mock-only groundwork now includes versioned choice question sets, exact
question/alternative result validation, and a deterministic fixture provider that
fails closed when a matching fixture is absent. Assessment idempotency keys now bind
account, snapshot, config digest, task, question-set, provider, and model. It uses
synthetic snapshots only; no JEV requests are made and no durable queue exists.
The TypeSafe System One adapter is also prepared and fake-transport tested; it has
not made live calls. It rejects invalid, future-dated, and expired jobs before
transport, preventing stale work from reaching the potentially billable provider.
Real email processing still requires approved data-minimization/retention policy
and a concrete usage budget.
Config imports now have a pure diff preview: exact duplicate revisions are
idempotent, successor revisions must name the current parent, reused revision IDs
with changed content conflict, and rule additions/removals/modifications are listed
without publication. A legacy `ApprovedRules` preview translates only clear FYI,
notification, shipping, and news sender meanings; all candidates require reapproval,
while pattern-dependent categories, exclusions, and substring targets are surfaced
for review rather than activated.
OAuth-independent P0 evidence is documented; live Gmail/Sheets inventory is
explicitly deferred.

Architecture decision ADR-005 (2026-11-17): SQL is the planned authoritative store
for v2 operational records, owned by the decision worker; Apps Script must use its
authenticated API and must not hold database credentials. Start with single-worker
SQLite on verified durable storage, preserving a migration boundary to PostgreSQL.
The operator UI will use Apps Script HTML Service and existing approval gates.
SQLite hosting/backups, worker API authentication, and Apps Script web-app execution
identity/access policy remain unresolved. SQL DDL is tested offline only; no live
data or infrastructure was touched.

## External state

No Gmail, workbook, Apps Script, trigger, credential, or production infrastructure
changes are part of this preparation. Archived claims of live behavior reflect the
May 2026 documentation, not a current production inspection.

The live Apps Script manifest uses `Europe/Belgrade`; archived source says
`Europe/Ljubljana`. Read-only Gmail/Sheets inventory remains unavailable because
Google blocked clasp's shared OAuth client for the additional sensitive scopes.
No Gmail or workbook data has been accessed; continue with synthetic fixtures.

## Next work

Continue mock/offline V2-P1 and V2-P2 work. API access/key availability and accepted
usage charges are confirmed; a protected gateway secret for `api.typesafe.ai` exists.
Jev is identified as TypeSafe's System One model, and one synthetic API choice call
succeeded. P0 still lacks confirmed operating price/budget and live Gmail/Sheets
inventory; those remain deferred until an approved read-only access path exists.
Review the timezone discrepancy before designing digest-window parity.
Record evidence here as implementation proceeds; do not mark a whole phase complete
because one file or UI exists.

ADR-006 (2026-11-19): D.C. selected the existing claw01 VPS as the v2 worker/SQL
host instead of adding Cloud Run and Cloud SQL costs. The ClawNet architecture repo
records claw01 at VPN IP 10.8.0.1 and d-c-system at 10.8.0.2. Read-only SSH from
this development environment reached the host and returned hostname `Claw01`.
This confirms only management connectivity. Host capacity, isolation, persistent
storage, backups, HTTPS ingress reachable from Apps Script, service identity,
monitoring, and rollback remain unverified. No VPS or Google resources were changed;
the v2 runtime is still not implemented or deployed.

## claw01 read-only preflight — 2026-11-19

SSH over the documented VPN reached `Claw01`. Unprivileged inspection found the
root filesystem is 38 GiB with about 19 GiB free, uptime about 31 days, and active
Caddy, Docker, OpenVPN, CrowdSec, Fail2Ban, and node-exporter services. Caddy listens
on public HTTP/HTTPS ports; the existing PostgreSQL listener is bound to loopback
and VPN address `10.8.0.1`. Several loopback/VPN listeners and Docker bridge
interfaces are already present. `openclaw-node.service` is installed but inactive.
Existing FlyAwayz backup timers are present.

Preflight is incomplete: the SSH account's non-interactive sudo requires a password,
so Docker Compose/container inventory, listener process ownership, protected service
files, and root-owned application paths could not be inspected. Do not infer free
capacity or a safe port/path from the partial inventory. No services, files,
firewall rules, databases, or deployments were changed. Before selecting ingress or
installing anything, complete authorized read-only privileged inspection and map
existing Caddy routes and workload ownership. Host reachability from Apps Script
is also unverified.

ADR-007 (2026-11-19): D.C. accepted a project-owned authenticated HTTPS API behind
Caddy for Apps Script-to-worker traffic. `docs/worker-api.md` specifies Focuna HMAC
v1 request/response signing, canonical bytes, timestamp and atomic nonce replay
protection, key IDs/rotation, initial endpoints, and fail-closed human-identity
requirements. `docs/claw01-deployment.md` specifies isolated service/storage,
preflight, staging deployment, and rollback. These are design documents only: no
API implementation, signing adapter, key, hostname, Caddy route, DNS, or VPS service
exists. ClawNet records the integration as planned, not deployed; privileged host
preflight remains incomplete.

Authenticated API implementation slice (2026-11-19): shared Focuna HMAC v1
canonicalization/timestamp primitives, Apps Script request signing, Node request
verification/response signing, and the durable SQLite nonce-table migration are
implemented offline. Typecheck and build passed. No nonce repository, HTTP server,
route handler, Apps Script response verifier, rate limiter, key provisioning, or
host deployment exists yet. The partial auth code is not deployable; synthetic
protocol vectors/security tests are still needed before a listener is exposed.
Auth primitives advanced: Apps Script now also verifies signed responses bound to
its request nonce; the worker has a transactionally unique SQLite nonce repository
that removes expired entries and reserves new nonces under `BEGIN IMMEDIATE`.
Still absent: HTTP server/body parser and route handlers, API key loading/rotation,
rate limiting, and an executable protocol/security test suite. No runtime listener.

The Node HTTP shell is now implemented in `apps/decision-worker/src/http-server.mjs`:
request size/time bounds, exact JSON content type, authenticated request handling,
loopback health, injected route dispatch/rate limiting, sanitized errors and signed
responses. Syntax checks, TypeScript typecheck and build passed; tests were not run.
The shell is not started, has no production route handlers, no concrete rate limiter,
no key loader/rotation, and does not yet persist assessment jobs. It is not deployable.

ADR-008 (2026-11-19): D.C. accepted progressive Stage 1 shadow payload/spend policy:
full sender address, subject <=250 chars, latest inbound excerpt <=4,000 chars,
optional preceding message <=2,000 chars, no recipients/display names/attachments/
full history/Gmail IDs/personal labels; active payloads expire within 24h terminal
or 72h queued; metadata 30 days; $25/month and $2/day with 6,000/500 token limits,
pre-call cost reservation, and no retries. Provider no-training/retention terms and
exact prices still need verification; real provider execution remains disabled.

The first submit/poll logic is implemented offline: strict schema and payload policy,
question-set/config/idempotency binding, ambiguous-review-only eligibility,
account-scoped handlers, SQLite job persistence, 72-hour queued payload expiry, and
numbered migration application. Node syntax checks, TypeScript typecheck/build passed;
tests were not run. The server has not been started and has no provider dispatcher,
concrete rate limiter, budget reservation, terminal-retention cleanup, startup key
loader/rotation, or integration-ready endpoint composition. This remains unready for
VPS deployment.

## TypeSafe terms and pricing review — 2026-11-19

Read the public [Jev models/pricing documentation](https://docs.typesafe.ai/models),
[TypeSafe privacy policy](https://typesafe.ai/privacy), and API docs. The models page
lists Jev 1.14 (`jev-1.14.0`) at $42 per billion input tokens ($0.042/M); output
is free. It states billing is per input token and organization rate limits are
visible in the developer console. At the accepted 6,000-input-token maximum, the
worst-case model charge is $0.000252 per assessment; require reservation of that
maximum before each call, pin the versioned model ID, and keep the accepted $2/day
and $25/month hard caps. Alias pricing/version can change, so do not price against
an unpinned alias.

The public privacy policy says TypeSafe will not train/fine-tune on API input and
uses service providers; it retains personal data as long as reasonably necessary
for service/business purposes, with deletion measures upon request when no longer
needed. It does not state a fixed API-input retention period. The Jev docs point to
zero-data-retention (ZDR) details for enterprise customers, and state the service is
hosted in the United States. Thus the no-training requirement is publicly supported,
but the accepted fixed/shortest-retention requirement is not yet verified for this
account. No provider or mailbox request was made during this review.

Decision required before real email/provider calls: accept standard terms with
retention described only as “reasonably necessary,” or require provider-confirmed
ZDR/a fixed maximum retention period. Keep provider execution disabled pending that
choice and confirmation of which plan/terms apply to this API account.

## Offline budget gate — 2026-11-19

Implemented migration `004_provider_budget_reservations.sql` and
`SqliteProviderBudget`: atomic reservations use integer microdollars, pin the
worst-case `jev-1.14.0` request cost at 252 microdollars, and enforce the accepted
$2/day and $25/month limits. Crash-ambiguous reservations remain held; release is
allowed only with explicit proof that dispatch did not happen. Settlement rejects
charges above the reserved amount and leaves the reservation held. This is a
storage primitive only: no worker dispatcher or live TypeSafe call path is wired.
The token-cost helper rounds TypeSafe input usage upward to microdollars and enforces
the accepted 6,000-token call limit. `node --check`, typecheck, build, and
`git diff --check` passed; tests were not run. The next
blocker before real email is still provider-confirmed retention/ZDR for this account.

## Durable API rate limiting — 2026-11-19

Added migration `005_api_rate_limits.sql` and `SqliteFixedWindowRateLimiter`, a
per-key fixed-window counter that survives restarts and runs after successful
authentication in the HTTP shell. Limits are injected as deployment policy rather
than guessed; cleanup is bounded to one old window per request. `node --check`,
typecheck, build, and `git diff --check` passed. No request listener or provider
dispatcher was started.

## Terminal-based retention — 2026-11-19

Migration `006_assessment_terminal_retention.sql` and the SQLite assessment
repository now record `terminal_at` when jobs finish or expire. Content-free
results/jobs are pruned 30 days after terminal time (not submit time), and expired
payloads are scheduled for deletion within 24 hours after terminal. No cleanup
scheduler has been wired yet. `node --check`, typecheck, build, and `git diff --check`
passed; tests were not run.

## Protected API-key registry — 2026-11-19

Added a strict JSON key registry loader. It opens without following symlinks,
requires a regular <=64 KiB file with no group/other permissions, rejects unknown
fields and duplicate IDs, and validates every secret is exactly 32 bytes. Multiple
IDs allow staged rotation overlap; no credentials were generated or installed.
Provisioning, revocation/reload procedure, and host secret-file setup remain
deployment work.
