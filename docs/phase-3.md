# Phase 3 - Daily Briefing

## Goal

Summarize what matters so the user can review the inbox in minutes instead of scanning everything manually.

## First implementation

Phase 3 starts with a simple digest generator that groups recent labeled mail into three sections:
- Needs response
- Notifications
- FYI

## Inputs

The digest relies on workflow labels created in Phase 2:
- `1: to respond`
- `3: notification`
- `2: FYI`

## Entry points

- `generateMorningDigest()`
- `generateEveningDigest()`

## Current behavior

- builds a text digest from recent labeled threads
- logs the digest run to `DigestLog`
- in dry-run mode, only logs and returns the digest
- in live mode, can send the digest if `CONFIG.digestRecipient` is set

## Why this first version is useful

It is intentionally simple, but already gives a compact review surface:
- what needs response
- what changed or needs awareness
- what is informational but worth seeing

## Current limitations

- no HTML formatting yet
- no per-section caps beyond the current simple limit
- no deduping across sections yet
- no smart ranking inside sections yet
- no AI summarization yet

## Next likely improvements

- stronger prioritization inside each section
- better section rules for finance, shipping, and calendar
- daily digest templates tuned to user preference
- optional AI summarization for long threads
