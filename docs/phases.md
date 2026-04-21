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
- morning digest of important new mail
- response-needed threads
- shipping, finance, and calendar changes
- optional evening digest of unresolved items

## Phase 4, selective AI classification
- only process ambiguous mail with AI
- classify as important, review, no action, or draft candidate
- log decisions for review

## Phase 5, draft assistant
- generate draft replies for selected labels or on-demand
- never auto-send

## Phase 6, follow-up memory
- detect sent mail awaiting reply
- remind about stale open loops
- keep closure tasks visible

## Phase 7, continuous tuning
- adjust sender/domain rules
- improve exceptions and prompts
- review false positives and false negatives
