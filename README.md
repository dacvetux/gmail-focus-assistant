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
- **Phase 8:** separate `News/Digest` lane with dedicated morning/evening news digests
- **Phase 9:** recommendation-first tuning suggestions via `TuningSuggestions`
- **Phase 10:** spreadsheet control surface with runtime-loaded preferences, digest/news settings, and approved-rule application

Recent operational status:
- `clasp run` execution and API-executable deployment are working again
- live wrapper automation and time triggers are in place
- approved sheet rules now affect runtime behavior
- operator-friendly approved-rule aliases such as `shipping-sender` are supported

## Principles

- important mail should be easy to see
- promotions should not dominate the inbox
- rules beat AI for obvious cases
- AI should be narrow, reviewable, and optional
- no auto-send
- preserve manual workflow labels
- keep behavior auditable through logs and docs

## Repository layout

- `apps-script/` Google Apps Script implementation
- `docs/` architecture, roadmap, phase notes, and runbooks
- `scripts/` local helper scripts
- `PROJECT_MEMORY.md` ongoing project state and decisions

## Key docs

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
