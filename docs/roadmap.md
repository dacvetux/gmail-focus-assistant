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

## Current active phase: Phase 11 - Assisted AI expansion

Phase 10 is still open for later polish, but it is intentionally on hold for now while the next review-first AI layer starts.

Phases 8 and 9 are now treated as shipped base capabilities rather than separately open workstreams:
- **Phase 8:** separate `News/Digest` lane is implemented and operational
- **Phase 9:** recommendation-first tuning suggestions are implemented and operational

Any remaining Phase 8 / 9 refinement now rolls into **Phase 10 Option A** so there is one active operator-facing phase instead of three partially-open ones.

The main active roadmap focus is now **Phase 11**: widening AI into operator-facing recommendation loops without allowing silent runtime mutation.

### Current status update
- sheet-backed preferences, digest settings, and news-source controls are live
- approved sender rules now load from `ApprovedRules` into runtime config
- tuning suggestions can be promoted into approved rules via a sheet-based review loop
- `ApprovedRules` supports operator-friendly category aliases plus `add` / `remove` actions
- `ControlSurfaceStatus`, `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, `TuningReviewQueue`, `OperatorGuide`, and `AutomationHealthLog` are live
- `AiRecommendations` is now the first Phase 11 surface; `generateAiRecommendationsPhase11()` writes general AI-assisted operator recommendations there, `generateAiNewsSourceRecommendationsPhase11()` handles curated-news include/exclude review separately, and `generateAiWorkflowRecommendationsPhase11()` handles review/FYI/notification semantics separately
- `AiRecommendations` should increasingly behave like a real operator queue, not just a dump table; helper provenance and follow-through hints now travel with each row
- active operational logs can now be rotated into `*Archive` sheets via Phase 10 log-maintenance helpers so the main workbook tabs stay usable over time
- automation-health auditing is live
- ambiguous mail no longer auto-gets `2: FYI`; review and FYI semantics are being cleaned up further
- `ControlSurfaceStatus` now also surfaces workflow-semantics warnings and the latest Phase 10 checkpoint status directly, so first-pass triage usually no longer requires opening `WorkflowAudit` or raw `RunLog`
- targeted query-based reclassification helpers now exist for catch-up repairs when improved rules need to be applied to older preserved mailbox threads
- curated news-source handling has been corrected in live use for TLDR, Economist, Telecompaper, and Zeteo-family mail, while Google Play / Play Store mail now routes toward important service handling instead of news

### What is next inside Phase 11
- validate the first `AiRecommendations` outputs against real mailbox evidence and tune candidate selection / prompt quality
- expand the dedicated AI-assisted `NewsSources` path so it can explicitly suggest `news` vs `exclude` rows for operator review without polluting the generic sender loop
- continue expanding the dedicated workflow-semantics path so recurring ambiguous senders can surface review-first `FYI` / `notification` / `to-respond` recommendations with clearer operator follow-through
- add AI help for workflow semantics, especially `Review/Ambiguous` vs `2: FYI` vs `3: notification`
- keep all AI outputs recommendation-first: write suggestions, explanations, and clustering only; no silent config or mailbox mutation
- resume remaining Phase 10 polish later only where the Phase 11 loop exposes real operator pain

### Phase 10 status while Phase 11 is active
- the Sheets operator workflow remains the live base and stays usable as-is
- remaining Phase 10 polish is intentionally paused unless it blocks Phase 11 work
- Phase 11 should build on the proven Sheets/runtime model rather than replacing it

### Phase 10 UX deployment path
- **Option A (now):** improve the existing Google Sheets control surface and treat it as the primary operator UI while workflow semantics are still evolving
- use this period to stabilize statuses, approval actions, validation rules, helper views, operator terminology, and log-maintenance behavior
- **graduation rule:** only move on once the operator workflow feels finalized and about 90% clear/ready in real use
- do not start a separate HTML UI inside Phase 10; first prove the workflow in Sheets

## Active phase details: Phase 11 - Assisted AI expansion
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
