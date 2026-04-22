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
- searches recent threads labeled `1: to respond`
- sends the latest message context to Gemini
- generates a plain-text reply draft
- logs the generated draft text
- logs an explicit no-candidates row when nothing matched
- can run in dry-run mode before creating Gmail drafts

## Entry points

- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5Live()`

## Current tradeoffs

- uses only bounded context from the latest message, not full-thread reasoning
- does not yet distinguish between human reply-needed mail and labels that were applied too broadly
- does not yet tailor tone by sender relationship
- draft quality will need review and tuning

## What to validate next

- whether the selected threads are actually good draft candidates
- whether generated drafts are concise and useful
- whether any thread types should be excluded from automatic draft generation
- whether draft generation should stay label-driven or move to on-demand only
