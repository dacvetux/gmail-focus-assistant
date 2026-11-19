# New roadmap — Focuna v2

This replaces the legacy phase roadmap, preserved under `archive/v1/docs/`.
Phase numbers below are **V2-P0 through V2-P8**, not continuations of v1 Phases 1–12.
Repository/documentation preparation is complete. OAuth-independent V2-P0 discovery
is recorded and V2-P1 offline contracts/tooling are in progress; live Google inventory
remains blocked. Hosting direction is claw01 VPS (ADR-006), but the host is not yet
inspected and no v2 service is deployed. Other runtime deliverables remain planned.
Gates are sequential; no schedule or production readiness is implied.

## V2-P0 — Discovery and baseline

**Changes:** preserve v1 (prepared), establish actual integration/deployment facts.

- Confirm what JEV refers to, its provider/model, supported tasks, authentication,
  SDK/API or supported OpenClaw access, deployment constraints, usage limits, cost,
  data location, retention, and deletion behavior. TypeSafe System One identity,
  bearer endpoint, model listing and one synthetic choice call are verified and
  recorded in decisions.md; cost/privacy facts remain unresolved.
- D.C. confirmed API access/key availability and accepted that use incurs charges;
  the protected `TYPESAFE_API_KEY` gateway secret is restricted to `api.typesafe.ai`.
  TypeSafe is confirmed as the JEV API service; rate limits, pricing and an explicit
  operating budget remain open. Never reveal or copy its value into source.
- Confirm whether `decision_evaluate` actually routes to JEV and whether it can be
  called outside an agent session. Do not equate similarly named interfaces.
- Inventory existing Apps Script code version, Gmail labels, trigger ownership,
  workbook schemas, config/rules, logs, digest recipients/windows, and live settings
  read-only. Compare actual deployment with archived source; report drift.
- Define minimized data allowed to leave Google, retention, and worker ingress.
- Preflight claw01 for capacity, workload isolation, durable storage, backup/restore,
  monitoring, firewall/ingress, and an HTTPS route Apps Script can reach. VPN SSH
  management connectivity alone does not establish application reachability.
- Capture synthetic/anonymized examples for existing edge cases: FYI vs review,
  news vs commercial, no-reply, manual labels, sender aliases, and reply direction.
- Agree numerical rollout targets and sample coverage before comparing providers.

**Exit:** JEV capability/transport matrix, confirmed credential-to-provider mapping,
cost limit/operating budget, deployment inventory, baseline behavior matrix,
claw01 hosting/ingress/storage preflight, and concrete acceptance targets are
recorded. Unavailable JEV access blocks
the real adapter, not rules/core development using a mock. No production changes.

## V2-P1 — Contracts, domain foundation, and build tooling

**Depends on:** P0 facts or explicit documented mock-only boundary.

- Create the module layout in builder-handoff.md; use TypeScript for pure domain
  code and build a Google V8-compatible bundle without Node runtime imports
  (implemented: CommonJS build plus isolated Apps Script-style `.gs` bundle smoke test).
- Implement schemas for all records in decision-contract.md, exact hashing/signing
  canonicalization, stable label mappings, versioned config, typed error taxonomy.
- Validate JEV choice alternatives, finite probability/confidence bounds, and
  normalized distributions (implemented: absolute sum error <= 0.01); this semantic
  check supplements boundary JSON Schema validation.
- Bind provider results to the exact job, snapshot, config revision, and deadline
  (implemented by the offline domain validator).
- Gate execution on approval outcome, exact proposal digest, current snapshot/config,
  and non-expired timestamps (implemented as a pure domain invariant; durable approval
  storage and append-only history remain outstanding).
- Config revisions now require a verified content digest. Approval audit events have
  a sequence-linked digest chain and verifier; durable append-only storage, actor
  authentication, external chain checkpoints, retention and scoped authorization
  remain outstanding.
- Storage-neutral approval audit port now specifies atomic expected-head append,
  idempotent duplicate handling and read-after-append verification. Concrete storage
  and access-control adapters remain deferred pending deployment choice.
- Focuna HMAC v1 API wire contract and claw01 staging deployment/rollback design
  are documented in `docs/worker-api.md` and `docs/claw01-deployment.md` (ADR-007).
  No API server, signing adapters, nonce repository, keys, DNS route, or VPS service
  exist yet; first implementation is health plus job submit/poll only.
- Approval contracts identify actor type and narrow `proposal-execution` scope;
  the execution gate permits human approvals only. Identity authentication and
  broader config-publication permissions remain host-policy work.
- Canonical JSON and a strict host-supplied SHA-256 adapter seam are implemented;
  the Apps Script Utilities adapter hashes exact UTF-8 and normalizes signed bytes.
  Worker adapter, signatures, and key management remain outstanding.
- Establish package/lockfile, lint/typecheck, schema/fixture checks, automated unit
  checks, and a GitHub Actions workflow that uses no production credentials.
- Define operator identity, approval scopes, append-only audit, access controls,
  retention, configuration publication, and import-conflict rules.

**Exit:** offline fixture checks reject invalid schemas, stale revisions, coercion
traps, unknown operations and bad signatures. Domain bundle builds for both targets.
Schema/policy checks, config digest/parent checks, stale-import rejection, and the
dual-target domain bundle are implemented; signature/key management and durable
approval history remain.

## V2-P2 — Deterministic parity and read-only Google adapter

- Port rules by intent from classify.gs/config.gs, preserving manual labels and
  structural/workflow separation. Replace substring sender matching with parsed,
  boundary-aware address matching and explicit rule precedence/conflict detection.
- Implemented foundation: strict parsed-address normalization, normalized duplicate
  selector rejection, exact-sender precedence, and most-specific domain suffix
  selection. Full v1 rule parity and conflict-preview reporting remain outstanding.
- Implemented conservative evaluator slice: verified config digest, preserved-label
  abstention, approved sender-rule application, visible-review fallback, and no-reply
  response downgrade. Legacy pattern rule coverage remains to be ported.
- Shared `guardThreadDecision` is implemented for deterministic and future JEV
  candidates to enforce preservation, no-reply downgrade, and category/workflow rules.
- Snapshot fingerprints are computed and verified over canonical content; evaluator
  rejects duplicate evidence IDs and invalid preserved-label membership.
- Implement normalized thread snapshots, minimal meaningful-message context,
  bounded pagination/cursors, account identity, and change fingerprints.
- Import an exported copy of Preferences, DigestSettings, NewsSources and
  ApprovedRules into staging only; validate and produce an immutable revision.
- Implemented offline foundation: immutable parent-linked config revision preview
  with idempotent duplicate handling and added/removed/modified rule summaries.
  Importing actual Google exports and staged publication remain pending.
- Implemented preview-only legacy `ApprovedRules` mapper for unambiguous sender
  categories; ambiguous pattern-dependent/exclusion/substr targets require review,
  and every imported candidate requires a new explicit approval.
- Implement explainable rule results, preview diffs, and read-only decision logs.
- Report intended differences from v1 rather than reproducing known mistakes.

**Exit:** baseline cases pass offline; an authorized read-only staging pass shows
decisions without Gmail changes. No JEV dependency, drafts, send, or archive action.

## V2-P3 — JEV adapter and shadow assessment

- Implement the confirmed JEV adapter and durable single-worker job queue;
  authenticated submit/poll transport; mock adapter; restart-safe idempotency.
- Implemented offline/mock foundation: versioned choice question-set schema,
  result-to-job/question validation, and deterministic fixture provider. This is not
  the live JEV adapter, queue, or a budget-approved provider run.
- Implemented TypeSafe System One choice adapter against the verified public
  contract; fake-transport tests cover request/response mapping, state-size guard,
  usage parsing, and no automatic retries. It rejects malformed, future, or
  expired jobs before transport so stale work cannot incur a provider request.
  This adapter has not made a live call.
- Implemented idempotency-key derivation bound to account, snapshot, config digest,
  task, question set, provider, and model; durable unique-key queue semantics remain.
- Use question-based structural assessment followed by dependent workflow
  assessment where supported. Keep distributions and rubric semantics intact.
- Add schema/evidence validation, abstention, input boundaries, shared daily budget
  reservation, deadlines, caching and circuit breaker. Provider calls must not be
  retried automatically under the accepted Stage 1 policy.
- Implemented offline: `SqliteProviderBudget` atomically reserves the pinned model's
  worst-case $0.000252 call cost against the accepted $2/day and $25/month limits;
  unresolved reservations continue counting after crashes, and release requires
  explicit proof the request was never sent. This policy is not yet wired to a
  provider dispatcher; no retries are permitted by the current decision.
- Implemented offline: a SQLite fixed-window limiter counts requests per API key
  across process restarts. Its request/window limit must be supplied by deployment
  configuration; the API shell fails closed if rate-limiter storage fails.
- Implemented offline: terminal job timestamps now anchor 30-day content-free
  metadata pruning. Overdue jobs become terminal and payload expiry remains capped
  at 24 hours after that transition; a scheduled cleanup runner is still needed.
- Implemented offline: `assessment-maintenance.mjs` runs expiry, payload deletion,
  and metadata pruning as one bounded pass and exposes an unref'd non-overlapping
  interval runner. It is not started by any service entry point yet.
- Store both rule and JEV outputs for comparison. Add latency/cost/failure metrics.
- Run shadow only: model output cannot alter Gmail, active rules, or live approvals.

**Exit:** target sample coverage and predeclared quality targets met or documented
as unmet; replay, outage, injection and budget checks pass. Provider confidence is
not reported as empirical accuracy. Real-provider evaluation uses approved data only.

## V2-P4 — Review-first operator loop, SQL persistence, and HTML management UI

- Implement worker-owned SQLite repositories and migrations for config revisions,
  recommendations, approvals/audit, assessment jobs/results, and action journals.
  Keep Apps Script out of direct database connections; it uses the authenticated
  worker API. SQLite requires a single worker and verified durable-volume/backup
  hosting before deployment; PostgreSQL migration is a measured future option.
- Prepare an isolated claw01 runtime with persistent SQLite storage, HTTPS ingress,
  secret handling, monitoring, verified backups/restore, and documented install,
  upgrade, and rollback steps. Keep the service inactive until authentication and
  ingress are validated; do not interfere with existing VPS workloads.
- Implement the Focuna HMAC v1 protocol from the shared contract: strict raw-body
  digest verification, path/header validation, constant-time HMAC checks, bounded
  timestamps, atomic nonce replay store, signed request-bound responses, key
  rotation, and integration-specific rate limits. Use shared golden vectors across
  Apps Script and Node. Ship only health and assessment job submit/poll initially;
  keep config/approval mutations disabled until human identity is proven.
- Implemented offline: a strict protected-file key registry validates 32-byte
  secrets and allows multiple key IDs concurrently for rotation overlap. Secret
  provisioning, restart/reload procedure, revocation workflow, and host key storage
  remain deployment work.
- Add an Apps Script HTML Service management page backed by server handlers and the
  worker API. It must use existing identity, approval, and action policy gates; the
  UI itself grants no authority. Resolve web-app execution identity before exposing
  it to users.
- Add SQL-backed recommendation and approval records with stable IDs,
  snapshot/config binding, provenance, evidence links, expiry and correction capture.
- Implement `new -> approved | rejected | corrected | superseded | expired`;
  an approved recommendation becomes applied only after verified follow-through.
- Introduce dedicated news-source, routing, and workflow suggestion tasks using
  repeated evidence; preview rule coverage/conflicts before revision publication.
- Add one clear operator view: what changed, why, expected effect, approve/reject,
  and what remains manual. Do not create a parallel decision engine in the UI.

**Exit:** approved/rejected/stale/duplicate flows are demonstrated in staging on
the prepared claw01 service;
no unreviewed suggestion changes configuration or Gmail. Human approval endpoints
remain disabled until Apps Script operator identity and allowlist checks are
verified. Approval audit identifies the actor and exact proposal, not just a
mutable row number.

## V2-P5 — Controlled executor and classification cutover readiness

- Implement central policy, allowlisted action plans, preflight state re-read,
  intent journal, per-operation reconciliation, locking/leases, and kill switch.
- Enable deterministic and specifically approved **label-only** actions in staging.
  Validate managed-label ownership, no-reply guard, manual edits and new-message races.
- Implement commercial archiving separately: require an approved rule plus archive
  policy, preview impact, and record inverse operations. JEV alone cannot archive.
- Exercise recovery from partial writes and failed logging, not only clean runs.
- Prepare single-writer scheduling/cutover and runbook; do not execute production
  cutover until explicit confirmation and the acceptance record are present.

**Exit:** zero prohibited writes in verification, idempotent retry/recovery shown,
stale plans rejected, pause/rollback rehearsed. Start with bounded label-only canary;
archive enablement is a separate gate. V1 is not retired until remaining services
are replaced or explicitly retained as read-only with ownership documented.

## V2-P6 — Digests, follow-ups, and draft-only assistance

- Port main/news morning/evening digests using event/window identity, successful
  action history, current visibility, deterministic ranking and source links.
- Preserve Europe/Ljubljana timezone and DST behavior; validate mailbox-vs-log
  window differences and duplicate suppression across retries.
- Implement explicit waiting-on-them state from meaningful message direction,
  conservative stale/closed follow-ups, and operator correction.
- Add narrow reply-draft eligibility and a separate text-generation adapter;
  do not assume JEV is a text generator. Revalidate thread state before draft creation.
- Ensure no duplicate drafts or digest deliveries; resolve ambiguous delivery
  outcomes before retry. Digest sending is opt-in to configured recipients only.

**Exit:** all original goal categories have evidence-backed parity, intentional
differences are documented, no autonomous replies, and digest/follow-up/draft
canaries meet their separate acceptance gates before legacy service retirement.

## V2-P7 — Operational hardening and full migration

- Add queue/backlog, provider/budget, correction-rate and automation-health views;
  freshness checks, retention cleanup, archival, backup/restore and incident runbooks.
- Complete live export mapping, staged imports, rehearsal, explicit cutover,
  controlled soak, writer ownership, rollback window and archive-only retirement.
- Use time-bounded reconciliation jobs for historical labels only when explicitly
  requested; no automatic whole-mailbox repair during version migration.
- Measure worker SQL/Apps Script quota and latency under representative volume;
  migrate SQLite to PostgreSQL only with measured need and a new ADR.

**Exit:** backup restore and rollback rehearsed, operational owner assigned, agreed
soak window/quality targets satisfied, and live service inventory matches reality.

## V2-P8 — Optional expansion, not required for goal parity

- Consider narrowly scoped AI label automation only after operator-labeled evidence,
  calibration, explicit policy approval, monitoring and immediate rollback exist.
- Consider richer digest summaries, multilingual preference tuning and follow-up
  assistance with separate evaluations and data-access decisions.

**Exit per feature:** a written ADR, acceptance criteria, scope-specific approval,
and demonstrated benefit. No feature implicitly adds sending, deletion, or autonomous
rule activation.

## Dependency and delivery order

`P0 (claw01 preflight) -> P1 -> P2 -> P3 -> P4 (claw01 staging runtime)
-> P5 -> P6 -> P7`; P8 is optional.
P2 can proceed mock-only if JEV access is unresolved. P3 cannot pass its real-provider
gate using mocks. Deploy feature ownership separately during P5/P6; do not run two
writers or two digest senders against the same mailbox/window.
