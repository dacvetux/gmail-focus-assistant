# Focuna - Gmail Assistant

A rules-first Gmail assistant for calmer inboxes, focused visibility, selective AI, and draft-only email help.

Formerly called Gmail Focus Assistant.

## What it is

Focuna is a Gmail + Google Apps Script system that:
- classifies inbox threads with explainable rules first
- uses AI only for narrow ambiguous-review cases
- produces main and news digests
- offers draft-only reply assistance
- tracks follow-up state conservatively
- logs behavior into a spreadsheet for tuning and operations

It is intentionally **not** a black-box autonomous email agent.

## Current state

Implemented and in active use:
- **Phases 1-4:** rules-first classification, priority labeling, digests, selective AI review
- **Phase 5:** draft-only reply assistance in a narrow, validated form
- **Phase 6:** visibility-first follow-up tracking and digest surfacing
- **Phase 7:** operational reporting and live tuning via `RunLog`
- **Phase 8:** separate `News/Digest` lane with dedicated morning/evening news digests (shipped; remaining polish folded into Phase 10)
- **Phase 9:** recommendation-first tuning suggestions via `TuningSuggestions` (shipped; remaining polish folded into Phase 10)
- **Phase 10:** spreadsheet control surface with runtime-loaded preferences, approved-rule application, dashboard/validation helpers, targeted reclassification helpers, log rotation/archival, and the remaining live-operations polish (usable now; further polish is paused/on hold)
- **Phase 11:** assisted AI expansion is live through a review-first operator loop, with `AiRecommendations` feeding direct sheet-backed imports where safe and now supporting durable sender-level notification semantics through `ApprovedRules` when the operator confirms them
- **Phase 12 (planned):** dedicated HTML operator UI after the Sheets workflow is proven

Recent operational status:
- `clasp run` execution and API-executable deployment are working again
- live wrapper automation and time triggers are in place
- approved sheet rules now affect runtime behavior
- operator-friendly approved-rule aliases such as `shipping-sender`, `news-sender`, and `news-exclude-sender` are supported
- the Phase 10/11 operator loop now centers on `ControlSurfaceStatus`, `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, `TuningReviewQueue`, and `AiRecommendations`
- new Phase 11 helpers `generateAiRecommendationsPhase11()`, `generateAiNewsSourceRecommendationsPhase11()`, and `generateAiWorkflowRecommendationsPhase11()` write AI-assisted review-first recommendations into `AiRecommendations`, including helper provenance and operator follow-through hints; duplicate still-open recommendations are refreshed in place so the sheet behaves more like a queue than an append-only log
- approved Phase 11 recommendations with direct sheet mappings can now flow through `runPhase10ReviewLoopOptionA()`: direct news/rule changes are applied into `NewsSources` / `ApprovedRules`, and sender-specific notification semantics now have a durable `notification-sender` rule path when the operator chooses it
- the Phase 11 operator-loop integration was deployed live on 2026-05-13 and validated with `syncApprovedAiRecommendationsPhase11()`, `rebuildControlSurfaceStatusPhase10()`, and `runPhase10ReviewLoopOptionA()`; after triage plus manual follow-through, the live status surface now shows `AiRecommendations` cleared (`new=0`, `approved-manual=0`) and 23 active approved rules
- targeted reclassification helpers now exist for catch-up relabeling when older mailbox state is blocking newer rule improvements
- curated news handling was corrected recently so TLDR, Economist, Telecompaper, and Zeteo-style mail route to `News/Digest`, while Google Play / Play Store mail routes toward important service handling instead of news
- the operator-approved Reuters decision is now encoded live: `dailybriefing@thomsonreuters.com` is an explicit `NewsSources` include and loads into runtime `newsSenders`
- the operator-approved Linkin Park fix is now encoded live: `noreply@linkinpark.com` is an approved `commercial-sender`, so offer/store traffic no longer belongs in FYI-style handling
- a focused cleanup pass was run after those approvals: Linkin Park recent mail was reclassified live, and sender-history validation now shows one recent commercial classification plus older unlabeled historical store mail still available for broader catch-up later if needed

## Principles

- important mail should be easy to see
- promotions should not dominate the inbox
- rules beat AI for obvious cases
- AI should be narrow, reviewable, and optional
- when AI expands, it should expand as suggestion/support first, not silent automation
- no auto-send
- preserve manual workflow labels
- keep behavior auditable through logs and docs

## Repository layout

- `apps-script/` Google Apps Script implementation
- `docs/` architecture, roadmap, phase notes, and runbooks
- `scripts/` local helper scripts
- `PROJECT_MEMORY.md` ongoing project state and decisions

## Notes on current digest validation

- mailbox-state digest dry-runs can legitimately return `0` even after successful relabeling if the relevant mail falls outside the current morning/evening digest windows
- log-backed digest dry-runs are the better source of truth when validating time-window behavior after late-day classification changes
- targeted reclassification can be necessary when older threads are protected by preserve-label behavior and need to catch up to newer sender rules

## Key docs

- `docs/current-state.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/phases.md`
- `docs/implementation-notes.md`
- `docs/testing-checklist.md`
- `docs/deployment.md`
- `docs/first-run-checklist.md`
- `PROJECT_MEMORY.md`

## Scope / non-goals

- no autonomous sending
- no opaque AI-first handling of the whole inbox
- no silent rule mutation without review
- no attempt to replace manual judgment for important mail

## License

MIT, see `LICENSE`.
