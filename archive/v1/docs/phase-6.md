# Phase 6 - Follow-up Memory

## Goal

Keep open loops visible after the user has already replied, especially when the other side has not answered yet.

Phase 6 should help answer questions like:
- who am I waiting on?
- which conversations have gone stale?
- what needs a nudge or closure decision?

## Safety model

Phase 6 is visibility-first, not action-first.

- no automatic sending
- no automatic follow-up messages
- no silent thread mutations beyond clearly scoped labels in live mode
- stale-thread surfacing should be reviewable
- dry-run should exist before any live label changes

## Core v1 concept

Phase 6 v1 should detect threads where:

1. the user appears to have sent the latest meaningful message
2. the thread still represents an open loop
3. enough time has passed without a reply

Those threads should then be surfaced as follow-up candidates.

## Recommended workflow model

Use existing workflow labels where possible:

- `6: awaiting reply`
  - thread is currently waiting on someone else
- `7: actioned`
  - loop is done for now

Phase 6 should focus on maintaining `6: awaiting reply` visibility and detecting when those threads become stale.

## Phase 6 v1 detection rules

A thread is a follow-up candidate when all of the following are true:

1. the thread is not clearly commercial or low-value
2. the latest meaningful message appears to be from the user
3. there is no newer external reply after that user message
4. the thread is older than a configurable threshold
5. the thread is not already clearly closed

## Practical first implementation

Start narrow.

### Input pool

Search recent threads from:
- `label:"6: awaiting reply"`
- optionally `label:"1: to respond"` only if manually converted workflows need checking
- optionally sent-mail-linked recent conversation slices for later expansion

### Initial stale thresholds

Recommended starting thresholds:
- 3 days for recruiting / opportunities
- 5 days for services / coordination
- 7 days default fallback

For v1, it is acceptable to start with one simple threshold, for example:
- stale after 5 days

## What to log

Add a dedicated `FollowUpLog` sheet.

Suggested columns:
- Timestamp
- Mode
- Thread ID
- From
- Subject
- Current Labels
- Last Message Date
- Last Message Sender Type
- Days Since Last Message
- Suggested Status
- Reason
- Reason

## Suggested statuses

For v1, keep statuses simple:
- `waiting-fresh`
- `waiting-stale`
- `closed-or-replied`
- `skipped`

## Live-mode behavior

In live mode, keep behavior conservative.

Recommended first live behavior:
- apply or keep `6: awaiting reply` where appropriate
- optionally add a stale marker only through logs first, not a new Gmail label yet
- do not remove labels aggressively until behavior is well understood

## Entry points

Implemented v1 entrypoints:
- `trackAwaitingRepliesPhase6DryRun()`
- `trackAwaitingRepliesPhase6Live()`
- `trackAwaitingRepliesForQueryPhase6DryRun(query)`
- `trackAwaitingRepliesForQueryPhase6Live(query)`
- `generateFollowUpDigestPhase6DryRun()`
- `generateFollowUpDigestPhase6Live()`

The query-based entrypoints exist specifically to validate Phase 6 on known threads even when `6: awaiting reply` is still sparsely populated.

The follow-up digest entrypoints provide a small surfacing layer for stale `6: awaiting reply` threads without widening automation.

## Key implementation questions

- how do we detect that the latest meaningful message is from the user?
- what exact sender identities count as the user?
- should Phase 6 rely mainly on existing `6: awaiting reply` labels first, or infer waiting state from raw thread history?
- when should stale waiting threads appear in Phase 3 digests?
- should stale follow-up ever create a dedicated Gmail label, or remain log/digest-only?

## Recommended v1 scope

Keep Phase 6 intentionally narrow:

1. inspect threads already labeled `6: awaiting reply`
2. allow narrow query-based validation on known candidate threads
3. determine staleness from the latest meaningful message, ignoring trivial acknowledgements where possible
4. log stale candidates to `FollowUpLog` with a human-readable reason
5. optionally surface stale candidates in digest output

This avoids premature complexity while building the core memory loop.

## Recommendation

Do not start with full sent-mail graph reasoning.

Instead:
- treat `6: awaiting reply` as the main anchor
- implement reliable stale detection first
- add richer inference only after the log output looks trustworthy
