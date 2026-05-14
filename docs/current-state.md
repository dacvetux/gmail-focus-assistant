# Current State

This is the canonical live-state / operator-workflow document for the project. Keep `README.md` shorter and use `PROJECT_MEMORY.md` for chronology and lessons learned.

## What Focuna is

Focuna - Gmail Assistant is a rules-first Gmail automation system built on Google Apps Script.

It classifies inbox threads, applies structural + workflow labels, generates main/news digests, offers narrow draft-only assistance, tracks follow-up state conservatively, and logs behavior into a Google Sheets control surface for tuning and operations.

## What is live now

Implemented and actively usable:
- **Phases 1-4:** rules-first classification, workflow labeling, digests, selective AI review for ambiguous mail only
- **Phase 5:** narrow draft-only reply assistance
- **Phase 6:** visibility-first follow-up tracking and digest surfacing
- **Phase 7:** operational reporting via `RunLog`
- **Phase 8:** separate `News/Digest` lane with dedicated digests (shipped; residual polish now tracked under Phase 10)
- **Phase 9:** recommendation-first tuning suggestions in `TuningSuggestions` (shipped; residual polish now tracked under Phase 10)
- **Phase 10:** sheet-backed control surface with runtime-loaded preferences, approved rules, review/import workflow, validation checkpoint, status dashboard, and log rotation/archival (usable now; remaining polish is on hold)
- **Phase 11:** assisted-AI review surfaces are live via `AiRecommendations`, `generateAiRecommendationsPhase11()`, `generateAiNewsSourceRecommendationsPhase11()`, and `generateAiWorkflowRecommendationsPhase11()`, with approved direct-mapping recommendations now flowing through the normal operator loop

Operationally live now:
- Apps Script API execution and `clasp run` are working again
- wrapper automation and managed triggers are installed
- trigger inventory / cleanup support now exists for stale unmanaged clock triggers
- automation-health auditing is live
- script timezone is corrected to `Europe/Ljubljana`
- approved sheet rules affect runtime behavior
- targeted query-based reclassification helpers now exist for mailbox catch-up passes when older preserved threads need to reflect newer sender/routing rules
- mailbox-history analysis helpers now exist for Phase 10 live-soak work, including bucket-level scans and sender-specific drilldowns when semantics drift needs inspection

## Conservative / intentionally limited areas

These parts are deliberately narrow today:
- AI only reviews ambiguous mail
- reply help is draft-only
- no autonomous sending
- no silent rule mutation without review
- follow-up tracking is conservative and visibility-first
- tuning suggestions are recommendation-first, not auto-applied

Current broadening step:
- Phase 11 is now widening AI in review-first/operator-facing ways, still without allowing silent live rule mutation

## Current operator workflow

Primary operator surface: the Google Sheets workbook.

Important tabs:
- `Preferences`
- `DigestSettings`
- `NewsSources`
- `ApprovedRules`
- `TuningSuggestions`
- `TuningReviewQueue`
- `AiRecommendations`
  - review-first Phase 11 queue for AI-assisted recommendations
  - now includes source-helper provenance plus operator-action hints so general, news-source, and workflow-semantics suggestions are easier to review in one place
  - duplicate still-open recommendations are refreshed in place instead of being appended again, which keeps the queue cleaner during repeated helper runs
- `ControlSurfaceStatus`
- `ValidationStatus`
- `RecentRunSummary`
- `WorkflowAudit`
- `OperatorGuide`
- `AutomationHealthLog`

Current loop:
1. inspect `ControlSurfaceStatus` first for queue state, workflow-semantics warnings, and latest checkpoint status
2. review actionable rows in `AiRecommendations` and/or `TuningReviewQueue`
3. update the referenced source rows in `AiRecommendations` / `TuningSuggestions` as approved/rejected/superseded
4. run `runPhase10ReviewLoopOptionA()` to import approved tuning rows plus directly-applicable approved AI recommendations
5. run `runPhase10ValidationCheckpoint()`
6. optionally run `runPhase10ExtendedValidationCheckpoint()` when you want the heavier AI/tuning checks too
7. inspect `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, `TuningReviewQueue`, `AiRecommendations`, and `RunLog` only if `ControlSurfaceStatus` or the checkpoint suggests drift
8. use the `*Archive` sheets only when you need older log history beyond the active retention window

## Recent important changes

- Willhaben was reclassified as marketplace/shipping instead of finance
- approved rules now form a real runtime loop rather than passive sheet data
- operator-friendly approved-rule aliases and add/remove actions are live
- automation-health auditing was added
- trigger reinstall now reconciles stale unmanaged clock triggers instead of only deleting known managed handlers
- a new `ValidationStatus` sheet plus `runPhase10ValidationCheckpoint()` provide a one-shot fast Option A confidence pass after review/import changes
- `runPhase10ExtendedValidationCheckpoint()` keeps the heavier AI review + tuning-suggestion checks available without forcing them into every default checkpoint
- a new `RecentRunSummary` sheet plus `rebuildRecentRunSummaryPhase10()` provide a compact latest-run check for key wrappers and Phase 10 helper actions
- a new `WorkflowAudit` sheet plus `rebuildWorkflowAuditPhase10()` provide a compact recent-log check for review/FYI/notification/news semantics drift
- `ControlSurfaceStatus` now mirrors workflow warning buckets plus the latest Phase 10 checkpoint outcome, making the top-level dashboard more self-sufficient
- a new `TuningReviewQueue` sheet plus `rebuildTuningReviewQueuePhase10()` provide a compact actionable queue derived from `TuningSuggestions`
- ambiguous mail no longer auto-gets `2: FYI`
- `Review/Ambiguous` now stays workflow-blank by default instead of inferring FYI from vague wording
- `fyi-sender` / `forceFyiSenders` now means explicit workflow-only FYI routing for intentionally informational senders
- news now defaults to `News/Digest` without a workflow label unless the operator explicitly re-enables FYI/notification in `Preferences`
- a live repair pass removed false FYI labels from historical mailbox threads
- targeted catch-up reclassification is now available for sender/query slices where preserve-label behavior would otherwise keep older mailbox state from reflecting improved rules
- curated news-source handling was corrected in live use so TLDR, Economist, Telecompaper, and Zeteo-family mail route to `News/Digest`, while Google Play / Play Store mail is treated as important service/store traffic instead of news
- long-term FYI vs review semantics cleanup now lives directly inside active Phase 10 work rather than a separately open phase-tracking issue
- operational log rotation now archives older `DecisionLog`, `RunLog`, `DigestLog`, `AutomationHealthLog`, `DraftLog`, and `FollowUpLog` rows into matching `*Archive` sheets so the active tabs stay focused on recent activity
- Phase 11 has now started with `generateAiRecommendationsPhase11()`, `generateAiNewsSourceRecommendationsPhase11()`, and `generateAiWorkflowRecommendationsPhase11()`, splitting general sender/routing recommendations, news-source-specific recommendations, and workflow-semantics recommendations into separate review-first passes in `AiRecommendations`
- repeated runs of the same Phase 11 helper now refresh matching still-open `AiRecommendations` rows in place and log inserted vs refreshed counts, so the sheet behaves more like a queue than an append-only history
- approved Phase 11 recommendations with direct mappings can now be applied through the normal sheet review loop: `runPhase10ReviewLoopOptionA()` imports direct news/rule changes, and sender-specific notification semantics now have a durable `notification-sender` approved-rule path for operator-confirmed follow-through
- the current live dashboard confirms the new loop is wired in: `ControlSurfaceStatus` now reports `AiRecommendations` queue counts, and after live triage plus follow-through the queue is cleared (`new=0`, `approved-manual=0`) with 23 active approved rules
- the Phase 10/11 control-surface code is now split by responsibility: setup/UX lives in `control-surface-setup.gs`, checkpoint/audit helpers live in `control-surface-validation.gs`, and dashboard/review-loop/status logic remains in `control-surface-status.gs`
- operator-approved live routing now includes Reuters `dailybriefing@thomsonreuters.com` as an explicit `NewsSources` include and Linkin Park `noreply@linkinpark.com` as an approved commercial sender
- a focused post-approval cleanup pass was run live: Linkin Park recent mail reclassified successfully as commercial, while Reuters sender-history inspection confirms the explicit-news rule is the right long-term fix even though older preserved threads still need a broader catch-up pass if historical labels matter

## Current roadmap focus

### Now
- validate new `AiRecommendations` outputs in real use and tune candidate quality / prompt quality, especially keeping news-boundary cases in the dedicated news-source loop instead of the general one
- keep using the existing Sheets operator loop as the control point while Phase 11 grows around it, now including durable notification-sender follow-through when needed
- monitor whether more workflow-semantics recommendations deserve new direct-import paths versus staying review-first/manual
- leave remaining Phase 10 polish on hold unless it blocks the Phase 11 operator loop

### Next
- deepen **Phase 11** into AI-backed tuning suggestions, `NewsSources` recommendations, and workflow-semantics help
- add lightweight escalation/notification for automation-health warnings

### Later
- once the Sheets workflow feels ~90% finalized and Phase 11 is in place, start **Phase 12** as a separate dedicated HTML UI phase

## Next 3 practical milestones

1. watch the next live `AiRecommendations` batches and confirm the new notification/workflow judgments stay stable in real use
2. tune recommendation quality against real operator judgment, especially around workflow-semantics suggestions that still do not have a direct import path
3. decide whether to run a broader historical Reuters catch-up pass later, since sender-history validation still shows older `news-blank` preserved threads after the explicit-news approval
