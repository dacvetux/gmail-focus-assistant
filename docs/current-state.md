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
- **Phase 8:** separate `News/Digest` lane with dedicated digests
- **Phase 9:** recommendation-first tuning suggestions in `TuningSuggestions`
- **Phase 10:** sheet-backed control surface with runtime-loaded preferences, approved rules, review/import workflow, and status dashboard

Operationally live now:
- Apps Script API execution and `clasp run` are working again
- wrapper automation and managed triggers are installed
- automation-health auditing is live
- script timezone is corrected to `Europe/Ljubljana`
- approved sheet rules affect runtime behavior

## Conservative / intentionally limited areas

These parts are deliberately narrow:
- AI only reviews ambiguous mail
- reply help is draft-only
- no autonomous sending
- no silent rule mutation without review
- follow-up tracking is conservative and visibility-first
- tuning suggestions are recommendation-first, not auto-applied

## Current operator workflow

Primary operator surface: the Google Sheets workbook.

Important tabs:
- `Preferences`
- `DigestSettings`
- `NewsSources`
- `ApprovedRules`
- `TuningSuggestions`
- `ControlSurfaceStatus`
- `OperatorGuide`
- `AutomationHealthLog`

Current loop:
1. inspect `ControlSurfaceStatus`
2. review suggestions in `TuningSuggestions`
3. approve or reject as needed
4. import approved suggestions into `ApprovedRules`
5. refresh runtime config
6. validate with dry-runs and `RunLog`

## Recent important changes

- Willhaben was reclassified as marketplace/shipping instead of finance
- approved rules now form a real runtime loop rather than passive sheet data
- operator-friendly approved-rule aliases and add/remove actions are live
- automation-health auditing was added
- ambiguous mail no longer auto-gets `2: FYI`
- `Review/Ambiguous` now stays workflow-blank by default instead of inferring FYI from vague wording
- `fyi-sender` / `forceFyiSenders` now means explicit workflow-only FYI routing for intentionally informational senders
- news now defaults to `News/Digest` without a workflow label unless the operator explicitly re-enables FYI/notification in `Preferences`
- a live repair pass removed false FYI labels from historical mailbox threads
- a follow-up issue now tracks long-term FYI vs review semantics cleanup: **GitHub issue #8**

## Current roadmap focus

### Now
- finish Phase 10 **Option A** polish in Google Sheets
- tighten docs so operator guidance matches real runtime behavior
- keep validating the sharper workflow model: review = unresolved, FYI = explicit info-only, notification = transactional/system updates

### Next
- add lightweight escalation/notification for automation-health warnings
- continue tuning suggestion quality from live evidence

### Later
- once the Sheets workflow feels ~90% finalized, start **Option B** as a separate dedicated HTML UI phase

## Next 3 practical milestones

1. improve the control-surface operator UX until the review/import loop feels obvious
2. keep validating the sharper workflow-label semantics in live use
3. publish cleaner project documentation for first-time readers and operators
