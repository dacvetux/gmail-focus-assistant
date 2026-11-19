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
