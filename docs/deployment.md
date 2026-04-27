# Deployment

## Apps Script project

Deployed standalone Apps Script project:
- https://script.google.com/d/1Jt7QFAFbofI1wuKuvCnV91WTMV9jZ8U9zGpv9JfsPlA6hGt1bUzy3Rwg/edit

## Local deployment path

Apps Script source folder:
- `apps-script/`

Linked local clasp file:
- `apps-script/.clasp.json`

## Push workflow

From `apps-script/`:

```bash
clasp status
clasp push
```

Useful operational helpers after deploy:

```bash
clasp run listProjectTriggers
clasp run deleteUnmanagedClockTriggers
clasp run installAutomationTriggers
```

`installAutomationTriggers()` now reconciles the project clock-trigger set by deleting both managed wrappers and stale unmanaged clock triggers before recreating the intended schedule.

## First-run setup

In `src/config.gs`, set:
- `CONFIG.logSpreadsheetId`
- optionally `CONFIG.digestRecipient`

Recommended first settings:
- `dryRun: true`
- `maxThreads: 20`
- leave digest sending disabled initially

## First validation run

Run in Apps Script:
- `validatePhases1And2DryRun()`

Then inspect:
- `DecisionLog`

Next run:
- `generateMorningDigest()`

Then inspect:
- `DigestLog`

## Notes

- Keep `.clasp.json` local, do not commit it
- Prefer dry-run until classification looks stable
- Tune sender overrides before enabling live mode
