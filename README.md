# Gmail Focus Assistant

A rules-first Gmail assistant designed to make the inbox calmer, more focused, and more useful.

## Goal

Make important mail visible at first glance while pushing promotions, newsletters, and low-value updates out of the way.

This project is intentionally **not** a black-box full-AI email agent. It uses:
- deterministic Gmail and Apps Script rules first
- selective AI only for ambiguous cases
- draft-only reply assistance
- auditable logs and documentation

## Principles

- Important mail should be easy to see
- Promotions should not dominate the inbox
- Rules beat AI for obvious cases
- AI should be narrow, reviewable, and optional
- No auto-send
- Preserve manual workflow labels

## Planned Phases

1. Inbox calming and visibility control
2. Priority labeling system
3. Daily briefing and digest
4. Selective AI classification
5. Draft assistant
6. Follow-up memory
7. Continuous tuning

## Repository layout

- `docs/` project docs and design notes
- `apps-script/` Google Apps Script source
- `scripts/` local helper scripts
- `PROJECT_MEMORY.md` ongoing project state and decisions

## Roadmap

See `docs/roadmap.md` for the phased build direction.

## License

MIT, see `LICENSE`.

## Status

Scaffold created. Architecture and implementation docs are included. Code is starter-level and intended to be expanded phase by phase.
