# First Run Checklist

## 1. Create log spreadsheet
- create a Google Sheet for logging
- copy the spreadsheet id

## 2. Configure script
Edit `src/config.gs`:
- set `logSpreadsheetId`
- keep `dryRun: true`
- set `maxThreads: 20`
- leave `digestRecipient` empty for now

## 3. Optional narrow validation
If you want a smaller first slice, set one of:
- `debugSenderIncludes`
- `debugSubjectIncludes`
- `debugSampleThreads`

## 4. Run validation
Run:
- `validatePhases1And2DryRun()`

Check `DecisionLog` for:
- important mail preserved
- commercial mail correctly identified
- sensible workflow labels
- obvious false positives

## 5. Tune
Adjust if needed:
- `forceImportantSenders`
- `forceCommercialSenders`
- `forceReviewSenders`
- pattern lists

## 6. Test digest
Run:
- `generateMorningDigest()`

Check `DigestLog` for:
- useful grouping
- missing important items
- noisy sections

## 7. Only later go live
When dry-run looks good:
- optionally set `digestRecipient`
- run `processInboxFocusPhase2Live()`
