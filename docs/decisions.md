# Architecture decisions and open facts

## ADR-001 — Preserve outcomes, replace decision plumbing

Accepted planning direction: retain Gmail labels, rules-first behavior, Sheets-first
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

P0 must resolve: JEV identity/version, documentation, supported access, hosting,
auth, limits, usage accounting, retention and external data-processing permission.
Do not build against an invented URL. If JEV cannot be reached as intended, document
an alternative deployment ADR and retain the mock boundary without pretending success.

## ADR-003 — Keep Google writes local; offload decision work

Proposed implementation baseline: TypeScript pure domain; Apps Script V8 for Gmail/
Sheets/scheduling; Node worker for async JEV calls and durable SQLite assessment
jobs. Google owns operational approvals/action history; worker owns computation jobs.
No Gmail write credentials in the worker. Single worker until shared persistence
and concurrency semantics are intentionally designed.

Tradeoff: an extra service and authenticated HTTPS ingress versus Apps Script time
limits and coupling to a provider. P0 must validate deployment owner, persistent
storage, approved ingress, budget and operational fit. This topology is conditional,
not evidence of an available server. No cloud infrastructure is provisioned here.

## ADR-004 — Delay UI replacement and broad autonomy

Accepted planning direction: stabilize the existing operator model in Sheets first.
HTML UI and narrow AI auto-label policies are optional P8 work, not prerequisites
for parity. No new interface may bypass approval or action contracts.

## Builder decision register

| Unresolved item | Resolve by | Effect if unavailable |
| --- | --- | --- |
| JEV provider/API and OpenClaw relationship | P0 | Real adapter blocked; mock/core can proceed |
| Approved worker hosting, reachable authenticated ingress, durable volume | P0 | Revise ADR-003; no hidden alternate deployment |
| Actual deployed v1 version and feature ownership | P0 | Migration/cutover cannot proceed |
| Data minimization, retention and external processing policy | P0 | No real email submitted to JEV |
| Measurable quality targets/sample coverage/cost budget | P0 | No shadow-to-live promotion |
| Canonical hashes/signatures, approval identity and persistence schemas | P1 | No trusted network adapter or live executor |
| Draft text provider capability | P6 | Keep drafting disabled, not silently replaced |
| Production cohort, soak window and rollback owner | Before cutover | No production activation |

Update this file with dated evidence and decisions as facts become available.
