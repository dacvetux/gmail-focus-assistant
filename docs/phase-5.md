# Phase 5 - Draft Assistant

## Goal

Generate reply drafts for threads that likely need a response, without ever sending mail automatically.

## Safety model

Phase 5 is draft-only.

- no auto-send
- drafts are created only for candidate threads
- start with the `1: to respond` label as the main input
- log every generated draft to `DraftLog`
- keep prompts concise and grounded in the visible thread content

## First implementation

The first working version is intentionally narrow.

It:
- searches a recent inbox pool, but only admits threads that pass a strict actionable gate
- allows draft generation for:
  - threads already labeled `1: to respond`
  - `Important/Calendar` plus `1: to respond`
  - `Important/Services` plus `1: to respond`
- sends the latest message context to Gemini
- uses a newer flash-first draft model stack with fallback to lighter flash models on transient failures
- force-generates drafts for those strongly actionable threads
- generates a plain-text reply draft
- logs the generated draft text
- logs an explicit no-candidates row when nothing matched
- can run in dry-run mode before creating Gmail drafts

## Entry points

- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5Live()`

## Current tradeoffs

- uses only bounded context from the latest message, not full-thread reasoning
- strict gating is intentionally conservative and may miss some reply-worthy threads that are not yet labeled strongly enough
- current exclusions intentionally avoid many bulk opportunity digests and known non-human promotional senders because those are usually poor reply candidates
- does not yet tailor tone by sender relationship
- draft quality will need review and tuning
- model availability can still affect results, though fallback reduces single-model fragility
- preview model behavior may shift over time, so Phase 7 should revisit the chosen draft stack periodically

## What to validate next

- whether the selected threads are actually good draft candidates
- whether generated drafts are concise and useful
- whether the current sender/subject exclusions remove too many useful opportunities or just the noisy digests
- whether draft generation should stay heuristic-driven or move to on-demand only
