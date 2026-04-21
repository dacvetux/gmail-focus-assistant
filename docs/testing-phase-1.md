# Testing Phase 1

## Before running

1. Create a Google Sheet dedicated to logging
2. Copy its id into `CONFIG.logSpreadsheetId`
3. Keep `CONFIG.dryRun = true`
4. Start with a small `CONFIG.maxThreads` value, such as 20

## First test

Run:
- `processInboxFocusPhase1DryRun()`

Then review the `Phase1Log` sheet for:
- newsletters correctly identified
- ads correctly identified
- campaign mail correctly identified
- shipping / finance / calendar mail staying visible
- anything that should have been preserved but was marked for archive

## Tuning checklist

Look for:
- false positives, important mail classified as commercial
- false negatives, obvious commercial mail left in review
- domains that should be added to important sender preservation
- senders that deserve direct commercial rules

## Going live

Only after dry-run results look good:
- keep the spreadsheet id set
- optionally raise `CONFIG.maxThreads`
- run `processInboxFocusPhase1Live()`

## Rollback mindset

If anything looks risky:
- stop live runs
- go back to dry-run
- adjust patterns and sender/domain rules
- rerun on a small slice
