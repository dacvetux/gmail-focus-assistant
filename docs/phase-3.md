# Phase 3 - Daily Briefing

## Goal

Summarize what matters so the user can review the inbox in minutes instead of scanning everything manually.

## First implementation

Phase 3 started with a simple digest generator that groups recent labeled mail into sections.

## Current implementation

The digest now groups recent labeled mail into four more useful sections:
- Needs response
- Important notifications
- Opportunities
- Review later

## Inputs

The digest relies on workflow and structural labels created in earlier phases:
- `1: to respond`
- `3: notification`
- `Important/Shipping`
- `Important/Finance`
- `Important/Opportunities`
- `Review/Ambiguous`

## Entry points

- `generateMorningDigest()`
- `generateEveningDigest()`

## Current behavior

- builds a text digest from recent labeled threads
- prioritizes by recency
- deduplicates threads across combined sections
- logs the digest run to `DigestLog`
- in dry-run mode, only logs and returns the digest
- in live mode, can send the digest if `CONFIG.digestRecipient` is set

## Why this version is more useful

It is still intentionally simple, but better aligned with actual inbox triage:
- reply-needed mail first
- operational and logistics notifications grouped together
- opportunities separated from noise
- remaining review bucket visible but lower priority

## Current limitations

- no HTML formatting yet
- no true importance scoring beyond recency and labels
- no AI summarization yet
- review section may still be noisy until more sender tuning is done

## Next likely improvements

- stronger ranking inside each section
- better special handling for calendar and personal items
- daily digest templates tuned to user preference
- optional AI summarization for long threads
