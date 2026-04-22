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
Status: first safe implementation started on 2026-04-22
- generate draft replies for selected labels or on-demand
- never auto-send
- start with a narrow draft-only flow for `1: to respond`

## Phase 6, follow-up memory
- detect sent mail awaiting reply
- remind about stale open loops
- keep closure tasks visible

## Phase 7, continuous tuning
- adjust sender/domain rules
- improve exceptions and prompts
- review false positives and false negatives
