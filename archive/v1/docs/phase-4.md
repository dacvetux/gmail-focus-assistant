# Phase 4 - Selective AI Classification

## Goal

Use AI only where rules are genuinely uncertain, so the assistant can reduce the review bucket without turning into a black-box inbox agent.

## Safety model

Phase 4 is intentionally narrow.

- AI only runs on threads that rules classified as `Review/Ambiguous`
- AI output is logged
- AI suggestions must map back into the existing structural and workflow labels
- archive is only allowed for clearly commercial results
- commercial AI results should normally not receive workflow labels
- if AI fails or is uncertain, the thread stays `Review/Ambiguous`
- start in dry-run first

## Status

Implemented and validated for v1 on 2026-04-22.

The current operating posture is intentionally narrow and conservative.

## First implementation

The first working version is log-first and conservative.

It:
- inspects sender, subject, and a bounded body excerpt
- asks Gemini for a JSON classification
- constrains output to existing labels only
- records AI confidence in `DecisionLog`
- suppresses workflow labels for commercial classifications
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

## Validation result

The first validation pass showed that:
- AI correctly reclassified obvious commercial mail out of the review bucket
- commercial AI results were cleaned up so they no longer carry workflow labels by default
- at least one previously ambiguous administrative message was upgraded into a sensible actionable important bucket
- no obvious dangerous upgrades were observed in the reviewed sample

## Remaining caveats

- confidence is still model-reported, not calibrated
- prompt tuning may still improve borderline newsletter versus useful FYI decisions
- future refinement belongs in Phase 7 continuous tuning rather than blocking Phase 4 closure
