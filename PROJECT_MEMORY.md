# PROJECT_MEMORY.md - Gmail Focus Assistant

This file tracks the project state, decisions, progress, and next steps.

## Goal

Build a rules-first Gmail assistant that makes the inbox calmer and more focused on what is actually important.

Core intent:
- important mail should be visible at first glance
- promotions and newsletters should not dominate the inbox
- rules should handle obvious cases
- AI should only help on ambiguous cases
- reply generation must stay draft-only

## Current status

### Repository
- Local repo created at `projects/gmail-focus-assistant`
- GitHub repo created and pushed: `https://github.com/dacvetux/gmail-focus-assistant`
- Initial scaffold committed
- Initial commit: `471ccc2` - `Initial scaffold for Gmail Focus Assistant`

### Included so far
- `README.md`
- `docs/architecture.md`
- `docs/phases.md`
- `docs/labels.md`
- `docs/roadmap.md`
- `docs/phase-1.md`
- `docs/phase-2.md`
- `docs/phase-3.md`
- `docs/testing-phase-1.md`
- `docs/deployment.md`
- `docs/first-run-checklist.md`
- `docs/implementation-notes.md`
- `apps-script/` starter structure

### Current code state
- phase 1 classifier implemented with concrete pattern families
- phase 1 Gmail actions helper implemented
- phase 1 logging implemented
- phase 1 dry-run and live modes implemented
- phase 2 workflow priority labeling implemented
- validation and tuning controls added for dry-run review
- phase 3 digest generation implemented and refined from live log review
- phase 4 selective AI review implemented and validated for ambiguous mail
- phase 5 first narrow draft-only implementation added for `1: to respond` threads
- `CONFIG.logSpreadsheetId` is now set to the main Gmail Focus Assistant log sheet
- main phase entrypoints exist

## Planned phases

1. Calm the inbox
2. Create a priority system
3. Safe daily briefing
4. Selective AI classification
5. Draft assistant
6. Follow-up memory
7. Continuous tuning

## Decisions already made

- This project should not be a black-box inbox agent
- Rules-first architecture is preferred over AI-first processing
- Promotions, newsletters, and campaigns should usually be archived after labeling
- Important transactional mail should remain visible
- Personal and manual workflow labels must override automation
- AI should be narrow, optional, and logged
- No autonomous sending
- Ambiguous mail should be reviewable, not silently hidden
- Phase 1 should default to dry-run until validated
- Logging should use an explicit spreadsheet id
- Structural labels and workflow labels should both exist in Phase 2
- Validation should support narrow inbox slices and sender-level overrides
- Phase 3 should start with a simple text digest before richer summarization

## Progress log

### 2026-04-21
- created local repo and GitHub repo
- added architecture, phases, labels, roadmap, and contribution docs
- implemented first real version of Phase 1
- documented Phase 1 behavior and implementation notes
- added dry-run mode and explicit logging configuration
- added Phase 1 testing guide
- implemented first real version of Phase 2
- documented workflow-priority label model
- added validation helpers and false-positive tuning controls
- started Phase 3 daily briefing implementation
- deployed the Apps Script project with clasp
- documented deployment and first-run checklist
- reviewed first dry-run results and applied a major false-positive tuning pass
- applied a second tuning pass for shipping overrides, opportunity invites, and remaining commercial clutter
- applied a final light tuning pass plus Phase 3 digest refinement

### 2026-04-22
- reviewed real DecisionLog and DigestLog output from the log spreadsheet
- reduced obvious commercial mail leaking into the review bucket
- improved digest generation so dry-run summaries no longer depend only on pre-labeled Gmail threads
- pushed updated Apps Script code to the deployed project with clasp
- started Phase 4 with a narrow Gemini-based classifier for ambiguous mail only
- added AI confidence logging and dedicated Phase 4 dry-run/live entrypoints
- tightened Phase 4 so AI-classified commercial mail no longer gets workflow labels by default
- validated Phase 4 output and accepted it as complete for v1 with a narrow operational scope

## Immediate next steps

1. rerun `generateDraftRepliesPhase5DryRun()` and inspect `DraftLog`
2. validate whether the broader heuristic candidate selection produces genuinely reply-worthy threads
3. decide which thread types should be excluded from automatic draft creation
4. decide whether Phase 5 should stay heuristic/label-driven or become on-demand only
5. decide which labels should be visible in the Gmail sidebar by default

## Open questions

- Which labels should be visible in Gmail sidebar by default?
- Which opportunity/job emails should stay visible versus be FYI?
- Should LinkedIn/XING digests be archived immediately or routed to FYI?
- Should calendar invites and updates get their own label or rely on existing workflow labels?
- What level of AI use feels acceptable for privacy and cost?
- Should commercial labels remain visible in the sidebar or be hidden after rollout?

## Notes for future work

- Prefer incremental changes over a huge rewrite
- Test on small inbox slices before broad automation
- Keep logs and examples of false positives / false negatives
- Avoid hidden complexity early
- Bias toward explainable automation
- Add safety features before scaling automation scope
