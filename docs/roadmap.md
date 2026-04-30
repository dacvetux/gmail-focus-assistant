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
- active operational logs can now be rotated into `*Archive` sheets via Phase 10 log-maintenance helpers so the main workbook tabs stay usable over time
- automation-health auditing is live
- ambiguous mail no longer auto-gets `2: FYI`; review and FYI semantics are being cleaned up further
- `ControlSurfaceStatus` now also surfaces workflow-semantics warnings and the latest Phase 10 checkpoint status directly, so first-pass triage usually no longer requires opening `WorkflowAudit` or raw `RunLog`
- targeted query-based reclassification helpers now exist for catch-up repairs when improved rules need to be applied to older preserved mailbox threads
- curated news-source handling has been corrected in live use for TLDR, Economist, Telecompaper, and Zeteo-family mail, while Google Play / Play Store mail now routes toward important service handling instead of news

### What is next inside Phase 10
- keep validating workflow-label semantics between `Review/Ambiguous`, `2: FYI`, and `3: notification` from live evidence
- keep validating `News/Digest` boundaries/defaults from live evidence now that curated news sender handling has been corrected further
- continue tuning-suggestion quality improvements from live evidence
- live-soak the new log rotation/archival behavior so `RunLog`, `AutomationHealthLog`, `DigestLog`, and related tabs stay compact without hiding useful recent context
- do a short live-soak period to confirm the current Sheets loop feels stable and obvious in day-to-day use
- decide intentionally whether automation-health email escalation should stay disabled or get a real recipient/severity policy
- revisit the known log-backed digest duplicate-entry bug separately when resuming deeper digest internals work

### Phase 10 UX deployment path
- **Option A (now):** improve the existing Google Sheets control surface and treat it as the primary operator UI while workflow semantics are still evolving
- use this period to stabilize statuses, approval actions, validation rules, helper views, operator terminology, and log-maintenance behavior
- **graduation rule:** only move on once the operator workflow feels finalized and about 90% clear/ready in real use
- do not start a separate HTML UI inside Phase 10; first prove the workflow in Sheets

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

## Phase 12 - Dedicated HTML UI
- after the Sheets workflow is proven, build a separate HTML UI phase on top of the stabilized Sheets-backed/runtime-backed model
- prefer starting with Apps Script HTML, sidebar, or web app, but keep the implementation choice open until the operator workflow is genuinely settled
- the HTML UI should crystallize a proven workflow, not invent one too early

## Non-goals for early versions
- full autonomous inbox management
- auto-send replies
- opaque AI-first decisioning on all mail
- immediate auto-mutation of rules without review
