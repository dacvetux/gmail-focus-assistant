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

### Suggested next improvement after Phase 1 validation
- expand sender/domain rules based on real false positives and false negatives
- add optional sampling or sender filtering for narrower test runs
- design phase 2 priority behavior in more detail
