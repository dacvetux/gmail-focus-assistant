# Testing Phases 1 and 2

## Before running

1. Create a Google Sheet dedicated to logging
2. Copy its id into `CONFIG.logSpreadsheetId`
3. Keep `CONFIG.dryRun = true`
4. Start with a small `CONFIG.maxThreads` value, such as 20
5. Optionally narrow testing with:
   - `CONFIG.debugSampleThreads`
   - `CONFIG.debugSenderIncludes`
   - `CONFIG.debugSubjectIncludes`

## First validation run

Run:
- `validatePhases1And2DryRun()`

Then review the `DecisionLog` sheet for:
- newsletters correctly identified
- ads correctly identified
- campaign mail correctly identified
- shipping / finance / calendar mail staying visible
- workflow labels making sense
- anything that should have been preserved but was marked for archive

## Tuning checklist

Look for:
- false positives, important mail classified as commercial
- false negatives, obvious commercial mail left in review
- domains that should be added to important sender preservation
- senders that deserve direct commercial rules
- senders that should be forced into review before automation
- workflow labels that should be changed from FYI to notification or to respond

## Tuning controls

Use these config arrays:
- `forceImportantSenders`
- `forceCommercialSenders`
- `forceReviewSenders`

These are intended as practical tuning hooks while the rules mature.

## Going live

Only after dry-run results look good:
- keep the spreadsheet id set
- optionally raise `CONFIG.maxThreads`
- run `processInboxFocusPhase2Live()`

## Rollback mindset

If anything looks risky:
- stop live runs
- go back to dry-run
- adjust patterns and sender/domain rules
- rerun on a small slice
