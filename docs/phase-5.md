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
- searches a recent inbox pool rather than relying on a single label match
- prioritizes likely reply candidates using labels plus current classifier output
- sends the latest message context to Gemini
- can fall back across multiple draft-generation models on transient failures
- generates a plain-text reply draft
- logs the generated draft text
- logs an explicit no-candidates row when nothing matched
- can run in dry-run mode before creating Gmail drafts

## Entry points

- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5Live()`

## Current tradeoffs

- uses only bounded context from the latest message, not full-thread reasoning
- candidate selection is heuristic and may still miss some useful reply candidates while staying conservative
- current exclusions intentionally avoid many bulk opportunity digests and known non-human promotional senders because those are usually poor reply candidates
- does not yet tailor tone by sender relationship
- draft quality will need review and tuning
- model availability can still affect results, though fallback reduces single-model fragility

## What to validate next

- whether the selected threads are actually good draft candidates
- whether generated drafts are concise and useful
- whether the current sender/subject exclusions remove too many useful opportunities or just the noisy digests
- whether draft generation should stay heuristic-driven or move to on-demand only
