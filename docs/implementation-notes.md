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

### Known caveats
- `SpreadsheetApp.getActiveSpreadsheet()` may not exist in some trigger contexts, so the logging path will likely need a dedicated configured spreadsheet id next
- `Review/Ambiguous` will collect a fair amount of mail until rules get tuned further
- sender/domain logic is intentionally conservative for important services and transactional mail

### Suggested next improvement after Phase 1 validation
- add dry-run mode
- add configured log spreadsheet id
- expand sender/domain rules based on real false positives and false negatives
