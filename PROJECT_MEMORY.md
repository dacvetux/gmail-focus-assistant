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
- Initial scaffold committed
- Initial commit: `471ccc2` - `Initial scaffold for Gmail Focus Assistant`

### Included so far
- `README.md`
- `docs/architecture.md`
- `docs/phases.md`
- `docs/labels.md`
- `apps-script/` starter structure

### Current code state
- starter phase 1 classifier exists
- starter Gmail actions helper exists
- digest placeholder exists
- AI placeholder exists
- main phase 1 entrypoint exists

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

## Immediate next steps

1. Add GitHub-ready repo hygiene
   - `.gitignore`
   - license
   - roadmap / contribution notes

2. Expand phase 1 classifier
   - more sender/domain rules
   - preserve important categories and manual labels
   - logging of decisions

3. Design phase 2 labels in more detail
   - exact visible vs hidden behavior
   - review bucket policy

4. Add digest specification for phase 3
   - morning briefing format
   - optional evening unresolved-items digest

5. Create publishing path
   - create GitHub remote
   - push repo

## Open questions

- Which labels should be visible in Gmail sidebar by default?
- Which opportunity/job emails should stay visible versus be FYI?
- Should LinkedIn/XING digests be archived immediately or routed to FYI?
- Should calendar invites and updates get their own label or rely on existing workflow labels?
- What level of AI use feels acceptable for privacy and cost?

## Notes for future work

- Prefer incremental changes over a huge rewrite
- Test on small inbox slices before broad automation
- Keep logs and examples of false positives / false negatives
- Avoid hidden complexity early
- Bias toward explainable automation
