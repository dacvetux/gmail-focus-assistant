# Roadmap

## Completed foundation
- establish repository structure
- document architecture and phased plan
- implement safe phase 1 rules-first inbox classification
- implement phase 2 priority labeling
- implement phase 3 daily briefing
- implement phase 4 selective AI review for ambiguous mail only
- implement phase 5 draft-only assistance in a narrow, validated form
- implement phase 6 follow-up tracking in a visibility-first form
- start phase 7 operational reporting and conservative tuning

## Current active phase: Phase 10 - Preferences and control surface

Phases 8 and 9 are now treated as shipped base capabilities rather than separately open workstreams:
- **Phase 8:** separate `News/Digest` lane is implemented and operational
- **Phase 9:** recommendation-first tuning suggestions are implemented and operational

Any remaining Phase 8 / 9 refinement now rolls into **Phase 10 Option A** so there is one active operator-facing phase instead of three partially-open ones.

The main active roadmap focus is now **Phase 10 Option A**: making the Google Sheets control surface genuinely clear and usable in day-to-day operation while absorbing the remaining news/tuning polish.

### Current status update
- sheet-backed preferences, digest settings, and news-source controls are live
- approved sender rules now load from `ApprovedRules` into runtime config
- tuning suggestions can be promoted into approved rules via a sheet-based review loop
- `ApprovedRules` supports operator-friendly category aliases plus `add` / `remove` actions
- `ControlSurfaceStatus`, `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, `TuningReviewQueue`, `OperatorGuide`, and `AutomationHealthLog` are live
- automation-health auditing is live
- ambiguous mail no longer auto-gets `2: FYI`; review and FYI semantics are being cleaned up further
- `ControlSurfaceStatus` now also surfaces workflow-semantics warnings and the latest Phase 10 checkpoint status directly, so first-pass triage usually no longer requires opening `WorkflowAudit` or raw `RunLog`

### What is next inside Phase 10
- keep validating workflow-label semantics between `Review/Ambiguous`, `2: FYI`, and `3: notification` from live evidence
- keep validating `News/Digest` boundaries/defaults from live evidence now that the operator surface exposes the semantics more clearly
- continue tuning-suggestion quality improvements from live evidence
- do a short live-soak period to confirm the current Sheets loop feels stable and obvious in day-to-day use
- decide intentionally whether automation-health email escalation should stay disabled or get a real recipient/severity policy
- revisit the known log-backed digest duplicate-entry bug separately when resuming deeper digest internals work

### Phase 10 UX deployment path
- **Option A (now):** improve the existing Google Sheets control surface and treat it as the primary operator UI while workflow semantics are still evolving
- use this period to stabilize statuses, approval actions, validation rules, helper views, and operator terminology
- **graduation rule:** only move on once the operator workflow feels finalized and about 90% clear/ready in real use
- **Option B (later separate phase):** build a dedicated HTML UI (preferably starting with Apps Script HTML, sidebar, or web app) on top of the stabilized Sheets-backed model
- the HTML UI should crystallize a proven workflow, not invent one too early

## Next planned phase: Phase 11 - Assisted AI expansion
- widen AI into operator-facing recommendation loops after Phase 10 is stable enough
- start with AI-assisted `TuningSuggestions`, `NewsSources` proposals, and workflow-semantics recommendations
- prefer explanation, clustering, and suggestion quality over autonomy
- keep human approval as the control point for anything that changes runtime behavior
- do not let AI silently add rules, mutate preferences, or alter mailbox behavior in this phase

## Later
- strengthen follow-up intelligence once real waiting-on-them mailbox state exists
- add lightweight escalation/notification for automation-health warnings
- add accepted-suggestion semi-automation only after suggestion quality is trustworthy
- expand long-term analytics and preference-aware behavior
- continue tightening tuning suggestion quality from live evidence
- only after the Sheets workflow is proven: start a separate HTML UI phase (Option B)

## Non-goals for early versions
- full autonomous inbox management
- auto-send replies
- opaque AI-first decisioning on all mail
- immediate auto-mutation of rules without review
