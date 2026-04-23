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

Unattended/background mode:
- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5DebugDryRun()`
- `generateDraftRepliesPhase5Live()`

On-demand mode:
- `generateDraftForThreadIdPhase5DryRun(threadId)`
- `generateDraftForThreadIdPhase5Live(threadId)`
- `generateDraftRepliesForToRespondLabelPhase5DryRun()`
- `generateDraftRepliesForToRespondLabelPhase5Live()`
- `generateDraftRepliesForQueryPhase5DryRun(query)`
- `generateDraftRepliesForQueryPhase5Live(query)`

Preferred manual/on-demand path:
- prefer the query-based entrypoints over raw thread-id lookup in Apps Script
- Gmail search queries are more reliable in the current deployment context
- start broad enough to match real mailbox state, then narrow as needed

## Current tradeoffs

- uses only bounded context from the latest message, not full-thread reasoning
- strict gating is intentionally conservative and may miss some reply-worthy threads that are not yet labeled strongly enough
- current exclusions intentionally avoid many bulk opportunity digests and known non-human promotional senders because those are usually poor reply candidates
- does not yet tailor tone by sender relationship
- draft quality will need review and tuning
- model availability can still affect results, though fallback reduces single-model fragility
- preview model behavior may shift over time, so Phase 7 should revisit the chosen draft stack periodically

## Validation status

Phase 5 has now produced multiple useful end-to-end dry-run drafts on clearly reply-worthy threads.

Validated examples:
- thread `19daf77006243bc4`
  - from `Manuela Rath <Manuela.Rath@a1.at>`
  - subject `Einladung Bewerbungsgespräch Team Lead Network & Security Services @ A1`
  - result: concise, grounded confirmation draft suitable for manual review
- thread `19daeff098e33d9d`
  - from `Manuela Rath <Manuela.Rath@a1.at>`
  - subject `Team Lead Network & Security Services @ A1`
  - result: useful human-style reply draft appropriate for a recruiting/interview thread

A focused negative validation also succeeded:
- thread `19daee6c22c50335`
  - from `LinkedIn <jobs-listings@linkedin.com>`
  - result: `NO_DRAFT`
  - interpretation: some opportunity mail that looks actionable at classification time is still effectively broadcast mail and should not trigger a draft

This suggests the current narrow Phase 5 path works well on human-origin reply-needed threads and is conservatively rejecting at least some broadcast-style opportunity mail. That is a good sign for safety and usefulness.

A broader non-debug dry run then returned no candidates. The likely reason is that draft candidacy depended too heavily on currently applied Gmail labels, while dry-run classification evidence in `DecisionLog` was not enough on its own to make a thread eligible. The next tuning pass therefore keeps the gate strict but allows fresh classification decisions to admit human-origin opportunity threads, while explicitly excluding known broadcast recruiting senders.

A second broader dry run still returned no candidates, which pointed to a discovery problem rather than a drafting problem. Phase 5 search was therefore widened carefully: it now scans recent inbox threads plus recent threads already carrying relevant managed labels, then applies the same strict candidate gate. This should improve visibility without broadly loosening reply-draft eligibility.

Even after that search widening, broader unattended dry runs still produced no candidates in the current mailbox state. The best interpretation is that the current strict unattended mode is operating as a sparse, high-confidence safety layer, not as a frequently active drafting assistant.

## Recommended operating model

For now, Phase 5 should be understood as two related modes:

- **strict unattended mode**
  - conservative and possibly infrequent
  - useful when it fires, but not expected to fire often
- **on-demand mode**
  - likely the next practical product direction
  - user selects a thread, thread id, or very narrow label-defined slice
  - Phase 5 then generates a draft using the same draft-only safety model and logging path

This preserves the strongest current property of the system: good draft quality on clearly reply-worthy threads without pressure to make autonomous selection overly aggressive.

## What to validate next

- whether additional selected threads are actually good draft candidates
- whether generated drafts stay concise and useful across 2 to 3 more reply-worthy cases
- whether some auto-labeled opportunity mail is still really broadcast mail and should be excluded or downgraded
- whether the current strict gate is too narrow for everyday usefulness
- whether draft generation should stay strict and label-driven or move to on-demand only
