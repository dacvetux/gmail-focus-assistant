# Implementation Notes

## 2026-04-21 - Phase 1 implementation

Implemented a first real version of Phase 1 inbox calming.

### Added
- expanded configuration for pattern groups and sender/domain preservation
- stronger classifier logic for:
  - finance
  - shipping
  - calendar
  - opportunities
  - important services
  - newsletters
  - ads
  - campaigns
  - Gmail promotions fallback
- preservation checks for manual labels and personal mail
- phase 1 decision logging to `Phase1Log`
- configurable max thread count

## 2026-04-21 - Phase 1 safety upgrade

Added safety and rollout controls for Phase 1.

### Added
- `CONFIG.dryRun`
- explicit `CONFIG.logSpreadsheetId`
- separate run entrypoints for dry-run and live mode
- log mode column so dry-run and live results are distinguishable
- removal of implicit active spreadsheet fallback

### Why
- safer rollout
- predictable logging destination
- easier testing before touching live mail

## 2026-04-21 - Phase 2 implementation

Implemented the first version of the workflow priority system.

### Added
- workflow labels in config: `1: to respond`, `2: FYI`, `3: notification`
- response, FYI, and notification pattern groups
- structural plus workflow dual-label decisions
- managed decision-label cleanup during live runs
- shared `DecisionLog` sheet for later phases
- Phase 2 run entrypoints

### Current tradeoff
- workflow inference is intentionally simple and pattern-driven
- this should be good enough for a first pass, but will need tuning from real inbox results

### Suggested next improvement after Phase 2 validation
- tune workflow inference using observed false positives and false negatives
- define which workflow labels should be surfaced most prominently in the Gmail sidebar
- design Phase 3 digest output around the new workflow labels
