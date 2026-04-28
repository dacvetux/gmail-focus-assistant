# Current State

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
- **Phase 10:** sheet-backed control surface with runtime-loaded preferences, approved rules, review/import workflow, validation checkpoint, and status dashboard

Operationally live now:
- Apps Script API execution and `clasp run` are working again
- wrapper automation and managed triggers are installed
- trigger inventory / cleanup support now exists for stale unmanaged clock triggers
- automation-health auditing is live
- script timezone is corrected to `Europe/Ljubljana`
- approved sheet rules affect runtime behavior

## Conservative / intentionally limited areas

These parts are deliberately narrow today:
- AI only reviews ambiguous mail
- reply help is draft-only
- no autonomous sending
- no silent rule mutation without review
- follow-up tracking is conservative and visibility-first
- tuning suggestions are recommendation-first, not auto-applied

Planned next broadening step:
- Phase 11 will widen AI in review-first/operator-facing ways, but still not allow silent live rule mutation

## Current operator workflow

Primary operator surface: the Google Sheets workbook.

Important tabs:
- `Preferences`
- `DigestSettings`
- `NewsSources`
- `ApprovedRules`
- `TuningSuggestions`
- `TuningReviewQueue`
- `ControlSurfaceStatus`
- `ValidationStatus`
- `RecentRunSummary`
- `WorkflowAudit`
- `OperatorGuide`
- `AutomationHealthLog`

Current loop:
1. inspect `ControlSurfaceStatus` first for queue state, workflow-semantics warnings, and latest checkpoint status
2. review actionable rows in `TuningReviewQueue`
3. update the referenced source rows in `TuningSuggestions` as approved/rejected/superseded
4. import approved suggestions into `ApprovedRules`
5. run `runPhase10ValidationCheckpoint()`
6. optionally run `runPhase10ExtendedValidationCheckpoint()` when you want the heavier AI/tuning checks too
7. inspect `ValidationStatus`, `RecentRunSummary`, `WorkflowAudit`, `TuningReviewQueue`, and `RunLog` only if `ControlSurfaceStatus` or the checkpoint suggests drift

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
- long-term FYI vs review semantics cleanup now lives directly inside active Phase 10 work rather than a separately open phase-tracking issue

## Current roadmap focus

### Now
- do a short live-soak on the strengthened Phase 10 **Option A** Sheets workflow
- carry the remaining Phase 8 news-boundary/default cleanup inside Phase 10 from live evidence
- carry the remaining Phase 9 suggestion-quality cleanup inside Phase 10 from live evidence
- keep docs aligned with the now-shipped operator dashboard/validation flow
- keep validating the sharper workflow model: review = unresolved, FYI = explicit info-only, notification = transactional/system updates

### Next
- finish Phase 10 Option A until the Sheets workflow is stable and obvious
- then start **Phase 11** for assisted AI expansion: AI-backed tuning suggestions, `NewsSources` recommendations, and workflow-semantics help
- add lightweight escalation/notification for automation-health warnings

### Later
- once the Sheets workflow feels ~90% finalized, start **Option B** as a separate dedicated HTML UI phase

## Next 3 practical milestones

1. live-soak the current control-surface workflow and confirm the new dashboard signals are sufficient in day-to-day use
2. keep validating the sharper workflow-label semantics in live use
3. decide whether automation-health email escalation should remain disabled or get a real recipient/severity policy
