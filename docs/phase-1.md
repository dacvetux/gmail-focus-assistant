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

## Logging

Phase 1 logs each processed thread with:
- timestamp
- thread id
- sender
- subject
- reason
- applied label
- archived yes/no

The current implementation writes to a sheet named `Phase1Log`.

## Entry point

Main function:
- `processInboxFocusPhase1()`

## Current limitations

- pattern-based only, no AI yet
- no dry-run mode yet
- logging currently relies on Apps Script spreadsheet context and should be improved in a later iteration
- review bucket may still be broad until more sender/domain rules are added

## Success criteria

Phase 1 is considered successful when:
- obvious newsletters, ads, and campaigns mostly leave the inbox automatically
- shipping, finance, calendar, and service mail remain visible
- manual workflow labels are not disturbed
- ambiguous mail is surfaced instead of silently hidden
