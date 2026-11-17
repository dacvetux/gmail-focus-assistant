# New roadmap — Focuna v2

This replaces the legacy phase roadmap, preserved under `archive/v1/docs/`.
Phase numbers below are **V2-P0 through V2-P8**, not continuations of v1 Phases 1–12.
Repository/documentation preparation is complete. OAuth-independent V2-P0 discovery
is recorded and V2-P1 offline contracts/tooling are in progress; live Google inventory
remains blocked. Other runtime deliverables remain planned. Gates are sequential; no
schedule or production readiness is implied.

## V2-P0 — Discovery and baseline

**Changes:** preserve v1 (prepared), establish actual integration/deployment facts.

- Confirm what JEV refers to, its provider/model, supported tasks, authentication,
  SDK/API or supported OpenClaw access, deployment constraints, usage limits, cost,
  data location, retention, and deletion behavior. Record evidence in decisions.md.
- D.C. confirmed API access/key availability and accepted that use incurs charges;
  the protected `TYPESAFE_API_KEY` gateway secret is restricted to `api.typesafe.ai`.
  Confirm that this is the JEV credential/service, then document rate limits, pricing
  and an explicit operating budget. Never reveal or copy its value into source.
- Confirm whether `decision_evaluate` actually routes to JEV and whether it can be
  called outside an agent session. Do not equate similarly named interfaces.
- Inventory existing Apps Script code version, Gmail labels, trigger ownership,
  workbook schemas, config/rules, logs, digest recipients/windows, and live settings
  read-only. Compare actual deployment with archived source; report drift.
- Define minimized data allowed to leave Google, retention, and worker ingress.
- Capture synthetic/anonymized examples for existing edge cases: FYI vs review,
  news vs commercial, no-reply, manual labels, sender aliases, and reply direction.
- Agree numerical rollout targets and sample coverage before comparing providers.

**Exit:** JEV capability/transport matrix, confirmed credential-to-provider mapping,
cost limit/operating budget, deployment inventory, baseline behavior
matrix, and concrete acceptance targets are recorded. Unavailable JEV access blocks
the real adapter, not rules/core development using a mock. No production changes.

## V2-P1 — Contracts, domain foundation, and build tooling

**Depends on:** P0 facts or explicit documented mock-only boundary.

- Create the module layout in builder-handoff.md; use TypeScript for pure domain
  code and build a Google V8-compatible bundle without Node runtime imports.
- Implement schemas for all records in decision-contract.md, exact hashing/signing
  canonicalization, stable label mappings, versioned config, typed error taxonomy.
- Validate JEV choice alternatives, finite probability/confidence bounds, and
  normalized distributions (implemented: absolute sum error <= 0.01); this semantic
  check supplements boundary JSON Schema validation.
- Bind provider results to the exact job, snapshot, config revision, and deadline
  (implemented by the offline domain validator).
- Canonical JSON and a strict host-supplied SHA-256 adapter seam are implemented;
  the host must hash the exact canonical text as UTF-8. Runtime adapters, signatures,
  and key management remain outstanding.
- Establish package/lockfile, lint/typecheck, schema/fixture checks, automated unit
  checks, and a GitHub Actions workflow that uses no production credentials.
- Define operator identity, approval scopes, append-only audit, access controls,
  retention, configuration publication, and import-conflict rules.

**Exit:** offline fixture checks reject invalid schemas, stale revisions, coercion
traps, unknown operations and bad signatures. Domain bundle builds for both targets.

## V2-P2 — Deterministic parity and read-only Google adapter

- Port rules by intent from classify.gs/config.gs, preserving manual labels and
  structural/workflow separation. Replace substring sender matching with parsed,
  boundary-aware address matching and explicit rule precedence/conflict detection.
- Implement normalized thread snapshots, minimal meaningful-message context,
  bounded pagination/cursors, account identity, and change fingerprints.
- Import an exported copy of Preferences, DigestSettings, NewsSources and
  ApprovedRules into staging only; validate and produce an immutable revision.
- Implement explainable rule results, preview diffs, and read-only decision logs.
- Report intended differences from v1 rather than reproducing known mistakes.

**Exit:** baseline cases pass offline; an authorized read-only staging pass shows
decisions without Gmail changes. No JEV dependency, drafts, send, or archive action.

## V2-P3 — JEV adapter and shadow assessment

- Implement the confirmed JEV adapter and durable single-worker job queue;
  authenticated submit/poll transport; mock adapter; restart-safe idempotency.
- Use question-based structural assessment followed by dependent workflow
  assessment where supported. Keep distributions and rubric semantics intact.
- Add schema/evidence validation, abstention, input boundaries, shared daily budget
  reservation, bounded retries/backoff, deadlines, caching and circuit breaker.
- Store both rule and JEV outputs for comparison. Add latency/cost/failure metrics.
- Run shadow only: model output cannot alter Gmail, active rules, or live approvals.

**Exit:** target sample coverage and predeclared quality targets met or documented
as unmet; replay, outage, injection and budget checks pass. Provider confidence is
not reported as empirical accuracy. Real-provider evaluation uses approved data only.

## V2-P4 — Review-first operator loop and learning

- Add Sheets-backed recommendation and approval records with stable IDs,
  snapshot/config binding, provenance, evidence links, expiry and correction capture.
- Implement `new -> approved | rejected | corrected | superseded | expired`;
  an approved recommendation becomes applied only after verified follow-through.
- Introduce dedicated news-source, routing, and workflow suggestion tasks using
  repeated evidence; preview rule coverage/conflicts before revision publication.
- Add one clear operator view: what changed, why, expected effect, approve/reject,
  and what remains manual. Avoid a separate HTML UI at this stage.

**Exit:** approved/rejected/stale/duplicate flows are demonstrated in staging;
no unreviewed suggestion changes configuration or Gmail. Approval audit identifies
the actor and exact proposal, not just a mutable row number.

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
- Measure Sheets/Apps Script quota and latency under representative volume;
  migrate persistence only with measured need and a new ADR.

**Exit:** backup restore and rollback rehearsed, operational owner assigned, agreed
soak window/quality targets satisfied, and live service inventory matches reality.

## V2-P8 — Optional expansion, not required for goal parity

- Build HTML operator UI only when Sheets workflows and identity/approval contracts
  are stable; consume existing services instead of creating another decision engine.
- Consider narrowly scoped AI label automation only after operator-labeled evidence,
  calibration, explicit policy approval, monitoring and immediate rollback exist.
- Consider richer digest summaries, multilingual preference tuning and follow-up
  assistance with separate evaluations and data-access decisions.

**Exit per feature:** a written ADR, acceptance criteria, scope-specific approval,
and demonstrated benefit. No feature implicitly adds sending, deletion, or autonomous
rule activation.

## Dependency and delivery order

`P0 -> P1 -> P2 -> P3 -> P4 -> P5 -> P6 -> P7`; P8 is optional.
P2 can proceed mock-only if JEV access is unresolved. P3 cannot pass its real-provider
gate using mocks. Deploy feature ownership separately during P5/P6; do not run two
writers or two digest senders against the same mailbox/window.
