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
- **Phase 10:** spreadsheet control surface with runtime-loaded preferences, approved-rule application, dashboard/validation helpers, targeted reclassification helpers, and log rotation/archival
- **Phase 11:** review-first AI operator support through `AiRecommendations`, with safe direct imports into `NewsSources` / `ApprovedRules`
- **Phase 12 (planned):** dedicated HTML operator UI after the Sheets workflow is proven

For the live operational picture, operator workflow, and next milestones, treat **`docs/current-state.md` as canonical**.

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

- `docs/current-state.md` — canonical live state and operator workflow
- `docs/architecture.md` — system structure and runtime/control-surface layering
- `docs/roadmap.md` — phase-level direction
- `docs/phases.md` — historical phase breakdown
- `docs/implementation-notes.md` — detailed engineering history
- `docs/testing-checklist.md` — validation and live-check routines
- `docs/deployment.md` — deployment/runbook notes
- `docs/first-run-checklist.md` — setup checklist
- `PROJECT_MEMORY.md` — project memory / decision chronology, not the canonical ops doc

## Scope / non-goals

- no autonomous sending
- no opaque AI-first handling of the whole inbox
- no silent rule mutation without review
- no attempt to replace manual judgment for important mail

## License

MIT, see `LICENSE`.
