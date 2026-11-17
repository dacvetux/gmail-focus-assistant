# Phase 1 - Inbox Calming

## Goal

Reduce first-sight inbox clutter by labeling and archiving obvious low-priority commercial mail while keeping important and transactional mail visible.

## What Phase 1 does

### Preserves visibility for
- personal mail already marked with `CATEGORY_PERSONAL`
- manually managed workflow labels like `1: to respond`, `2: FYI`, `6: awaiting reply`
- already-important labels such as finance, shipping, calendar, and opportunities
- trusted important sender domains like GitHub, Google, PayPal, NLB, eZdrav, Post, and incident alerts

### Labels and keeps visible
- `Important/Finance`
- `Important/Shipping`
- `Important/Calendar`
- `Important/Opportunities`
- `Important/Services`
- `Review/Ambiguous`

### Labels and archives
- `Commercial/Newsletters`
- `Commercial/Ads`
- `Commercial/Campaigns`

### Uses these rule families
- finance patterns, for invoices, payments, receipts, bills, order confirmations
- shipping patterns, for tracking, customs, shipped, delivered, parcels
- calendar patterns, for invitations and meeting updates
- opportunity patterns, for jobs, recruiting, careers, CV-related messages
- important sender/domain allowlist
- newsletter, ad, and campaign pattern detection
- Gmail `CATEGORY_PROMOTIONS` as a fallback signal for archiving ads

## Safety features

### Dry-run first
Phase 1 now supports dry-run mode.

When dry-run is enabled:
- no labels are applied
- nothing is archived
- the intended decisions are logged

This makes it possible to test classification safely before touching the live inbox.

### Explicit log spreadsheet
Logging now requires a configured spreadsheet id:
- set `CONFIG.logSpreadsheetId`

This is safer and more predictable than relying on an active spreadsheet context.

## Logging

Phase 1 logs each processed thread with:
- timestamp
- mode (`dry-run` or `live`)
- thread id
- sender
- subject
- reason
- applied label
- archived yes/no

The implementation writes to a sheet named `Phase1Log` in the configured spreadsheet.

## Entry points

Main functions:
- `processInboxFocusPhase1()` uses `CONFIG.dryRun`
- `processInboxFocusPhase1DryRun()` forces dry-run mode
- `processInboxFocusPhase1Live()` forces live mode

## Recommended rollout

1. Create a dedicated Google Sheet for logs
2. Set `CONFIG.logSpreadsheetId`
3. Run `processInboxFocusPhase1DryRun()` on a small inbox slice
4. Review `Phase1Log`
5. Tune false positives and false negatives
6. Only then run `processInboxFocusPhase1Live()`

## Current limitations

- pattern-based only, no AI yet
- review bucket may still be broad until more sender/domain rules are added
- no built-in sampling controls yet beyond query and max thread count

## Success criteria

Phase 1 is considered successful when:
- obvious newsletters, ads, and campaigns mostly leave the inbox automatically
- shipping, finance, calendar, and service mail remain visible
- manual workflow labels are not disturbed
- ambiguous mail is surfaced instead of silently hidden
- dry-run review catches mistakes before live rollout
