# Phase 2 - Priority System

## Goal

Separate see-now mail from see-later mail by adding workflow-level priority labels on top of the structural labels introduced in Phase 1.

## What Phase 2 adds

### Workflow labels
- `1: to respond`
- `2: FYI`
- `3: notification`
- `Review/Ambiguous`

### Structural labels remain
- `Important/Services`
- `Important/Finance`
- `Important/Shipping`
- `Important/Calendar`
- `Important/Opportunities`
- `Commercial/Newsletters`
- `Commercial/Ads`
- `Commercial/Campaigns`

## Decision model

Phase 2 now applies up to two labels to a thread:

1. a structural label, describing what kind of mail it is
2. a workflow label, describing how it should feel in triage

Examples:
- calendar invite -> `Important/Calendar` + `1: to respond`
- shipping update -> `Important/Shipping` + `3: notification`
- opportunity mail -> `Important/Opportunities` + `2: FYI`
- important service alert -> `Important/Services` + inferred workflow label
- ambiguous mail -> `Review/Ambiguous` + usually `2: FYI`

## Workflow inference

### `1: to respond`
Used for messages that appear to request action or a reply.
Examples of signals:
- please reply
- let me know
- can you
- action required
- RSVP
- review and respond

### `2: FYI`
Used for informational mail that should remain visible but is not clearly actionable.
Examples of signals:
- FYI
- for your information
- heads up
- sharing this

### `3: notification`
Used for status-style or alert-style messages.
Examples of signals:
- system alert
- status update
- security alert
- password reset
- verification code
- incident

## Label management behavior

Phase 2 introduces managed decision labels.
When a live run applies new workflow or structural labels, older managed decision labels are removed unless they are still part of the current decision.

This keeps the decision state cleaner over time.

## Safety

Phase 2 keeps the same safety model as Phase 1:
- dry-run supported
- explicit log spreadsheet required
- no AI involved
- no sending behavior

## Logging

Logging now writes to `DecisionLog` and records:
- timestamp
- mode
- thread id
- sender
- subject
- reason
- applied labels
- archived yes/no

## Entry points

- `processInboxFocusPhase2()`
- `processInboxFocusPhase2DryRun()`
- `processInboxFocusPhase2Live()`

## Expected effect

After Phase 2, inbox review should become faster because mail is not only reduced, but also sorted into mental buckets:
- reply soon
- good to know
- system or service notification
- review later
