# Testing Checklist

Use this as the current validation runbook for Focuna - Gmail Assistant.

For the compact Option A operator loop, run `runPhase10ValidationCheckpoint()` first. It refreshes config, rotates old operational log rows into `*Archive` sheets when enabled, runs the fast default dry-runs, writes a quick-pass summary to `ValidationStatus`, refreshes `RecentRunSummary` from `RunLog`, rebuilds `WorkflowAudit` from recent `DecisionLog` rows, refreshes `TuningReviewQueue` from actionable `TuningSuggestions` rows, and leaves `ControlSurfaceStatus` with top-level workflow-warning + latest-checkpoint signals.

When you explicitly want the heavier AI/tuning path too, run `runPhase10ExtendedValidationCheckpoint()` separately.

## Core processing

Run:
- `processInboxFocusPhase1DryRun()`
- `processInboxFocusPhase4AiReviewDryRun()`

Check:
- `DecisionLog`
- `RunLog`
- obvious commercial mail does not remain in `Review/Ambiguous`
- operational/finance/shipping/security alerts do not get buried
- AI fallback rows are visible and understandable when Gemini is unavailable

## Main digest

Run:
- `generateMorningDigestDryRun()`
- `generateEveningDigestDryRun()`

Check:
- `DigestLog`
- `RunLog`
- `Needs response` contains genuinely actionable items
- `Important notifications` contains finance/shipping/security/calendar/service changes
- `Opportunities` holds recruiter/job/opportunity traffic that is not urgent response-required
- `Review later` is small and understandable

## Phase 5 drafts

Run:
- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5DebugDryRun()` when validating one known thread
- `generateDraftRepliesForQueryPhase5DryRun(query)` for targeted validation

Check:
- `DraftLog`
- `RunLog`
- dry-run outcome should read `drafts-produced-for-review`
- broadcast mail should return `NO_DRAFT`
- human-origin recruiting/interview threads should produce reasonable drafts
- no `UrlFetchApp.fetch` permission errors should appear again

## Phase 6 follow-up

Run:
- `trackAwaitingRepliesPhase6DryRun()`
- `trackAwaitingRepliesForQueryPhase6DryRun(query)` for targeted validation
- `generateFollowUpDigestPhase6DryRun()`

Check:
- `FollowUpLog`
- `RunLog`
- `Reason` values are understandable
- stale/fresh/closed classification matches real thread state
- if mailbox state is sparse, confirm the blocker is lack of examples rather than code failure

## Phase 8 news layer

Run:
- `generateNewsDigestMorningDryRun()`
- `generateNewsDigestEveningDryRun()`

Check:
- `DecisionLog`
- `DigestLog`
- `RunLog`
- real news/newsletter content lands in `News/Digest`
- news only gets a workflow label if `Preferences.newsWorkflowLabel` is explicitly set
- ambiguous mail should remain plain `Review/Ambiguous` with no workflow label
- `2: FYI` should appear only for intentionally informational routing, not generic ambiguous wording
- `3: notification` should capture transactional/system/status updates that do not need a response
- main digest becomes cleaner after news is separated out
- LinkedIn messaging digests should not appear in `News/Digest`

## Phase 9 tuning assistant

Run:
- `generateTuningSuggestionsPhase9DryRun()`

Check:
- `TuningSuggestions`
- `RunLog`
- suggestions are conservative and evidence-based
- commercial/shipping/finance candidates are sensible
- no noisy flood of low-value suggestions

## Suggested validation order for a full checkpoint

Fast path:
1. `runPhase10ValidationCheckpoint()`
2. inspect `ControlSurfaceStatus` first, then `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, and `TuningReviewQueue` only where the dashboard suggests drift
3. confirm `log-rotation-last-status` / `log-rotation-retention-days` look sensible if the workbook has been running for a while
4. run `runPhase10ExtendedValidationCheckpoint()` only when you want the heavier AI/tuning checks too
5. drop into the detailed steps below only if a check fails or looks suspicious

Detailed path:

1. `processInboxFocusPhase1DryRun()`
2. `processInboxFocusPhase4AiReviewDryRun()`
3. `generateMorningDigestDryRun()`
4. `generateNewsDigestMorningDryRun()`
5. `generateTuningSuggestionsPhase9DryRun()`
6. targeted Phase 5 draft validation if there are promising threads
7. targeted Phase 6 query-mode validation if there are real waiting-on-them threads

## What to record after each checkpoint

Write down:
- false positives that should become overrides or patterns
- false negatives that should be promoted into important/service/finance/shipping/news handling
- AI 503 or retry behavior
- which digest sections look too noisy or too sparse
- whether new suggestions in `TuningSuggestions` are good enough to accept manually
- whether `ControlSurfaceStatus` gave enough signal to spot semantics drift without digging into raw logs
- whether active log tabs stayed compact enough and older rows were moved into the expected `*Archive` sheets
