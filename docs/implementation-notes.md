# Implementation Notes

## 2026-04-21 - Phase 1 implementation

Implemented a first real version of Phase 1 inbox calming.

### Added
- expanded configuration for pattern groups and sender/domain preservation
- stronger classifier logic for:
  - finance
  - shipping
  - calendar
  - opportunities
  - important services
  - newsletters
  - ads
  - campaigns
  - Gmail promotions fallback
- preservation checks for manual labels and personal mail
- phase 1 decision logging to `Phase1Log`
- configurable max thread count

## 2026-04-21 - Phase 1 safety upgrade

Added safety and rollout controls for Phase 1.

### Added
- `CONFIG.dryRun`
- explicit `CONFIG.logSpreadsheetId`
- separate run entrypoints for dry-run and live mode
- log mode column so dry-run and live results are distinguishable
- removal of implicit active spreadsheet fallback

### Why
- safer rollout
- predictable logging destination
- easier testing before touching live mail

## 2026-04-21 - Phase 2 implementation

Implemented the first version of the workflow priority system.

### Added
- workflow labels in config: `1: to respond`, `2: FYI`, `3: notification`
- response, FYI, and notification pattern groups
- structural plus workflow dual-label decisions
- managed decision-label cleanup during live runs
- shared `DecisionLog` sheet for later phases
- Phase 2 run entrypoints

### Current tradeoff
- workflow inference is intentionally simple and pattern-driven
- this should be good enough for a first pass, but will need tuning from real inbox results

## 2026-04-21 - Validation and tuning support

Added practical validation and tuning hooks for Phases 1 and 2.

### Added
- `validatePhases1And2DryRun()`
- debug narrowing filters for thread ids, sender fragments, and subject fragments
- force override lists for important, commercial, and review senders

### Why
- faster iteration during dry-run validation
- easier false-positive correction without waiting for a larger redesign

## 2026-04-21 - Phase 3 initial implementation

Started the first working version of daily briefing.

### Added
- `generateMorningDigest()`
- `generateEveningDigest()`
- simple sectioned digest based on workflow labels
- `DigestLog` for digest run tracking
- optional digest email sending when not in dry-run mode and recipient is configured

### Current tradeoff
- digest formatting is intentionally simple and text-first for now
- good enough to validate the briefing workflow before adding ranking and richer summaries

## 2026-04-22 - Additional tuning and Phase 4 first implementation

Extended the rules and digest using real dry-run logs, then added a first safe AI review layer.

### Added
- extra commercial sender overrides for recurring review-bucket leaks
- stronger newsletter/ad/campaign patterns for missed commercial mail
- broader opportunity sender and subject coverage
- digest generation based on a candidate inbox pool plus fresh classification, not only pre-labeled threads
- section counts and cleaner sender display in digest output
- first Phase 4 AI review implementation in `ai.gs`
- AI confidence logging in `DecisionLog`
- dedicated Phase 4 dry-run and live entrypoints

### Safety model
- AI only runs for rule-based `Review/Ambiguous` threads
- AI output is constrained back into existing labels
- fallback keeps mail in review if the AI call fails or returns invalid output
- archive suggestions are only honored for commercial labels
- per-run AI volume is limited

### Current tradeoff
- AI classification is useful for reducing ambiguity, but still needs prompt tuning and review before it should be trusted broadly in live mode

## 2026-04-22 - Phase 5 first implementation

Started the first draft-only reply assistant.

### Added
- `drafts.gs` for reply-draft generation
- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5Live()`
- `DraftLog` sheet for draft review
- narrow source query focused on `1: to respond`
- bounded latest-message context for draft generation

### Safety model
- no auto-send
- dry-run available before creating Gmail drafts
- every generated draft is logged
- prompts instruct the model not to invent facts or over-claim actions

### Current tradeoff
- first version uses only bounded latest-message context, so some replies may be too generic or miss longer-thread nuance

## 2026-04-22 - Phase 5 tuning passes

Phase 5 required several same-day tuning passes after dry-run validation.

### Added or changed
- explicit no-candidate logging in `DraftLog`
- broader then later stricter candidate gating
- sender and subject exclusions for job alerts, promos, and other poor draft targets
- retry and fallback handling for transient Gemini draft-model failures
- newer flash/lite draft model stack
- forced draft generation for strongly actionable threads
- final strict gate limited to strongly actionable threads only
- debug-targeted dry-run entrypoint for validating one known good thread without reopening the broad gate

### Current tradeoff
- Phase 5 structure is now much safer and more predictable, but it still needs one successful end-to-end validation on a real actionable thread before it should be treated as stable

## 2026-04-23 - Phase 6 validation path and logging upgrade

Extended the initial Phase 6 skeleton so it can be validated on real known threads before the `6: awaiting reply` label is fully populated.

### Added or changed
- query-based Phase 6 entrypoints for dry-run and live validation
- richer Phase 6 analysis based on the latest meaningful message in a thread, not only the literal latest message
- conservative filtering for trivial acknowledgement-style messages
- `Reason` column in `FollowUpLog` for easier review of stale/fresh/closed decisions
- optional live-mode application of `6: awaiting reply` only for query-mode candidates that look like genuine waiting threads

### Current tradeoff
- meaningful-message detection is still heuristic and intentionally simple
- Phase 6 remains visibility-first; no follow-up drafting or sending is triggered from this path

## 2026-04-23 - Phase 6 digest surfacing

Added a small digest/report layer on top of the Phase 6 tracker.

### Added or changed
- `generateFollowUpDigestPhase6DryRun()`
- `generateFollowUpDigestPhase6Live()`
- stale `6: awaiting reply` threads can now appear as a dedicated digest section
- follow-up digest remains read-only apart from normal digest logging/email behavior

### Current tradeoff
- digest surfacing only sees threads already discoverable through the narrow Phase 6 input pool
- usefulness depends on the mailbox actually accumulating `6: awaiting reply` threads over time
