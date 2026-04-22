# Phase 4 - Selective AI Classification

## Goal

Use AI only where rules are genuinely uncertain, so the assistant can reduce the review bucket without turning into a black-box inbox agent.

## Safety model

Phase 4 is intentionally narrow.

- AI only runs on threads that rules classified as `Review/Ambiguous`
- AI output is logged
- AI suggestions must map back into the existing structural and workflow labels
- archive is only allowed for clearly commercial results
- if AI fails or is uncertain, the thread stays `Review/Ambiguous`
- start in dry-run first

## First implementation

The first working version is log-first and conservative.

It:
- inspects sender, subject, and a bounded body excerpt
- asks Gemini for a JSON classification
- constrains output to existing labels only
- records AI confidence in `DecisionLog`
- limits how many ambiguous threads can reach AI in one run

## Entry points

- `processInboxFocusPhase4AiReviewDryRun()`
- `processInboxFocusPhase4AiReviewLive()`

## Inputs

AI receives only ambiguous threads and only a bounded excerpt of the most recent message.

## Outputs

AI can suggest:
- one structural label
- one workflow label
- archive yes/no
- confidence
- short reason

## Current tradeoffs

- confidence is model-reported, not calibrated
- prompt quality matters a lot for borderline newsletters versus genuinely useful FYI mail
- live mode is still only as good as the surrounding review and logging discipline

## What to validate next

- whether AI reduces the review bucket meaningfully
- whether it incorrectly upgrades newsletters into important buckets
- whether archive suggestions are conservative enough
- whether the logged reasons are actually useful for prompt tuning
