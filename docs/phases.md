# Build Phases

## Phase 1, calm the inbox
Status: implemented first working version on 2026-04-21
- classify obvious promos, newsletters, and campaigns
- auto-archive low-priority commercial mail
- keep transactional, personal, finance, shipping, calendar, and important alerts visible
- preserve manual labels and workflow labels
- log decisions for review and tuning

## Phase 2, create a priority system
Status: implemented first working version on 2026-04-21
- add labels for action, FYI, notifications, important services, finance, shipping, calendar, opportunities, and ambiguous review
- separate see-now from see-later mail
- infer workflow labels from message content
- apply structural and workflow labels together

## Phase 3, safe daily briefing
Status: initial implementation started on 2026-04-21
- morning digest of important new mail
- response-needed threads
- shipping, finance, and calendar changes
- optional evening digest of unresolved items
- digest log for review and tuning

## Phase 4, selective AI classification
Status: implemented and validated for v1 on 2026-04-22
- only process ambiguous mail with AI
- constrain AI output back into the existing structural and workflow labels
- log confidence and reasons for review
- keep the operational scope narrow and conservative

## Phase 5, draft assistant
Status: implemented and practically validated for a narrow v1 on 2026-04-23
- generate draft replies for selected labels or on-demand
- never auto-send
- unattended behavior remains intentionally sparse under a strict gate
- query-based on-demand drafting is the preferred practical path in the current deployment context

## Phase 6, follow-up memory
Status: narrow v1 implemented and lightly validated on 2026-04-23
- detect likely awaiting-reply threads conservatively
- support query-based validation when `6: awaiting reply` is sparsely populated
- log stale/fresh/closed decisions to `FollowUpLog`
- keep closure tasks visible without triggering automatic follow-up actions
- richer inference should wait until more real waiting-on-them examples are available

## Phase 7, continuous tuning
Status: next active phase
- adjust sender/domain rules
- improve exceptions and prompts
- review false positives and false negatives
- tighten operational reporting and checkpointing around dry-run/live behavior
