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

## Current implementation

Phases 1 through 4 now have working v1 implementations, with Phase 4 kept intentionally narrow and conservative, and Phase 5 started in a draft-only mode. See:
- `docs/phase-1.md`
- `docs/phase-2.md`
- `docs/phase-3.md`
- `docs/phase-4.md`
- `docs/phase-5.md`
- `docs/testing-phase-1.md`
- `docs/deployment.md`
- `docs/first-run-checklist.md`
- `docs/implementation-notes.md`
- `PROJECT_MEMORY.md`

## License

MIT, see `LICENSE`.

## Status

Phases 1 through 4 are implemented in a usable v1 form. Phase 5 is structurally implemented in a strict draft-only mode and is awaiting one successful targeted end-to-end draft validation before it can be considered stable.
