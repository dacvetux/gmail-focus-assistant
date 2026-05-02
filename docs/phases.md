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
Status: started on 2026-04-23
- adjust sender/domain rules
- improve exceptions and prompts
- review false positives and false negatives
- tighten operational reporting and checkpointing around dry-run/live behavior
- keep rollout visibility improving before broadening automation

## Phase 8, news layer
Status: shipped usable base on 2026-04-24; remaining refinement absorbed into Phase 10 on 2026-04-27
- add a separate `News/Digest` lane for read-later news/newsletter content
- keep news distinct from urgent workflow mail and generic commercial junk
- add morning and evening news digest entrypoints
- start with explainable sender/pattern rules before any richer ranking or summarization
- further boundary/default/operator-control polish now lives under Phase 10 instead of keeping Phase 8 open separately

## Phase 9, tuning assistant
Status: shipped usable base on 2026-04-24; remaining refinement absorbed into Phase 10 on 2026-04-27
- scan recent logs for repeated review-bucket leaks and misroutes
- write recommendation-first suggestions into a `TuningSuggestions` sheet
- keep the first version advisory only; do not auto-mutate rules yet
- surface commercial, shipping, and finance candidates before expanding into richer suggestion types
- further suggestion-quality/workflow/runtime-loop polish now lives under Phase 10 instead of keeping Phase 9 open separately

## Phase 10, spreadsheet control surface
Status: shipped usable operator base; active from 2026-04-24 through 2026-05-02, then left open but on hold while Phase 11 begins
- use the existing Google Sheets workbook as the first operator UI
- create tabs such as `Preferences`, `DigestSettings`, `NewsSources`, and `ApprovedRules`
- load a small set of core preferences back into runtime config
- keep the first version simple and spreadsheet-native before any richer standalone GUI
- add log rotation/archival for long-running operational sheets so logs stay readable and workbook performance stays acceptable over time
- own the remaining news-boundary, tuning-quality, workflow-semantics, validation, and operator UX polish so only one phase stays open at a time

## Phase 11, assisted AI expansion
Status: opened on 2026-05-02; initial implementation started with review-first AI recommendations written to `AiRecommendations`
- expand AI from narrow ambiguous-mail review into additional operator-facing recommendation surfaces
- initial shipped slice: `generateAiRecommendationsPhase11()` batches a small set of sender/routing candidates, asks Gemini for review-first recommendations, and writes them to `AiRecommendations` without mutating runtime behavior
- add AI-assisted tuning suggestions that can propose clearer rule candidates, group similar leaks, and explain why a suggestion exists
- add AI-assisted `NewsSources` proposals to recommend likely `news` / `exclude` entries for operator review
- improve AI help with workflow semantics, especially distinguishing `Review/Ambiguous`, `2: FYI`, and `3: notification`
- add AI-assisted digest shaping and noisy-sender detection to improve section placement and reduce operator cleanup work
- keep the whole phase review-first: AI may suggest, summarize, cluster, and explain, but must not silently mutate runtime rules or live behavior
- only consider limited semi-automation later, and only for high-confidence cases after suggestion quality is proven in real use

## Phase 12, dedicated HTML UI
Status: planned on 2026-04-29; starts only after the Sheets workflow is proven and the Phase 11 AI/operator loop is in place
- build a dedicated HTML operator UI on top of the stabilized Sheets-backed/runtime-backed model
- likely start with Apps Script HTML, sidebar, or web app, but keep the exact surface flexible until the workflow is settled
- mirror and streamline proven operator actions rather than inventing a new workflow too early
- keep the spreadsheet as a reliable fallback/admin surface even after the HTML UI exists
