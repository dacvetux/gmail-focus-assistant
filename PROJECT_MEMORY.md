# PROJECT_MEMORY.md - Focuna - Gmail Assistant

This file tracks the project state, decisions, progress, and next steps.

## Goal

Build a rules-first Gmail assistant that makes the inbox calmer and more focused on what is actually important.

Core intent:
- important mail should be visible at first glance
- promotions and newsletters should not dominate the inbox
- rules should handle obvious cases
- AI should only help on ambiguous cases
- reply generation must stay draft-only

## Current status

### Repository
- Local repo exists at `/home/cvetko/.openclaw/workspace/assistant/gmail-focus-assistant`
- GitHub repo: `https://github.com/dacvetux/gmail-focus-assistant`
- Product/documentation name: `Focuna - Gmail Assistant`
- Default branch: `main`

### Current code state
- **Phases 1-4:** implemented and actively usable (rules-first classification, workflow labeling, digests, selective AI review)
- **Phase 5:** narrow draft-only reply assistance is practically validated; on-demand query-based drafting is the preferred path
- **Phase 6:** visibility-first follow-up tracking is implemented, with broader waiting-state intelligence intentionally deferred
- **Phase 7:** operational reporting is live via `RunLog`
- **Phase 8:** separate `News/Digest` lane and dedicated news digests are shipped
- **Phase 9:** recommendation-first tuning suggestions are shipped
- **Phase 10:** Sheets control surface is live with runtime-loaded preferences, approved rules, review/import workflow, validation helpers, workflow audit, status dashboards, and log rotation/archival
- **Phase 11:** active roadmap phase; AI-assisted operator recommendations are live through `AiRecommendations`, including general, news-source, and workflow-semantics helper entrypoints, and approved direct-mapping rows now feed into the normal Phase 10 review/apply loop
- **Phase 12:** planned later as a dedicated HTML UI after the Sheets workflow is proven

### Operational state
- `clasp run` and Apps Script execution API deployment are working
- wrapper-based live automation and managed time triggers are in place
- approved sheet rules affect runtime behavior
- log-backed digest architecture is the accepted automation path
- the latest deployed change is the 2026-05-13 Phase 11 operator-loop integration in `apps-script/src/preferences.gs`, plus matching README/current-state documentation updates

## Planned phases

1. Calm the inbox
2. Create a priority system
3. Safe daily briefing
4. Selective AI classification
5. Draft assistant
6. Follow-up memory
7. Continuous tuning
8. Separate news lane
9. Recommendation-first tuning assistant
10. Spreadsheet operator control surface
11. Assisted AI expansion
12. Dedicated HTML UI

## Decisions already made

- This project should not be a black-box inbox agent
- Rules-first architecture is preferred over AI-first processing
- Promotions, newsletters, and campaigns should usually be archived after labeling
- Important transactional mail should remain visible
- Personal and manual workflow labels must override automation
- AI should be narrow, optional, and logged
- No autonomous sending
- Ambiguous mail should be reviewable, not silently hidden
- Phase 1 should default to dry-run until validated
- Logging should use an explicit spreadsheet id
- Structural labels and workflow labels should both exist in Phase 2
- Validation should support narrow inbox slices and sender-level overrides
- Phase 3 should start with a simple text digest before richer summarization

## Progress log

### 2026-04-21
- created local repo and GitHub repo
- added architecture, phases, labels, roadmap, and contribution docs
- implemented first real version of Phase 1
- documented Phase 1 behavior and implementation notes
- added dry-run mode and explicit logging configuration
- added Phase 1 testing guide
- implemented first real version of Phase 2
- documented workflow-priority label model
- added validation helpers and false-positive tuning controls
- started Phase 3 daily briefing implementation
- deployed the Apps Script project with clasp
- documented deployment and first-run checklist
- reviewed first dry-run results and applied a major false-positive tuning pass
- applied a second tuning pass for shipping overrides, opportunity invites, and remaining commercial clutter
- applied a final light tuning pass plus Phase 3 digest refinement

### 2026-04-22
- reviewed real DecisionLog and DigestLog output from the log spreadsheet
- reduced obvious commercial mail leaking into the review bucket
- improved digest generation so dry-run summaries no longer depend only on pre-labeled Gmail threads
- pushed updated Apps Script code to the deployed project with clasp
- started Phase 4 with a narrow Gemini-based classifier for ambiguous mail only
- added AI confidence logging and dedicated Phase 4 dry-run/live entrypoints
- tightened Phase 4 so AI-classified commercial mail no longer gets workflow labels by default
- validated Phase 4 output and accepted it as complete for v1 with a narrow operational scope
- documented Phase 4 completion and pushed that state to GitHub
- started Phase 5 as a draft-only assistant with `DraftLog` logging and Gemini-backed draft generation
- set `CONFIG.logSpreadsheetId` to the main Focuna - Gmail Assistant log sheet in code
- iteratively tightened Phase 5 after dry-run logs showed noisy bulk newsletters, promos, and job alerts entering the draft flow
- added sender and subject exclusions, stricter actionable gating, retry/fallback model handling, and a newer flash/lite model stack for drafts
- simplified Phase 5 to a strict gate that only admits strongly actionable threads
- added a debug dry-run path that can bypass the strict gate for explicitly filtered test threads
- set a Phase 5 debug thread filter for focused validation on thread `19db437c601fdf1b`
- validated that thread `19db437c601fdf1b` was a poor Phase 5 debug candidate because the model correctly returned `NO_DRAFT` for an administrative membership/consent email
- identified a stronger reply-worthy debug candidate from DecisionLog: thread `19daf77006243bc4` from `Manuela Rath <Manuela.Rath@a1.at>` with subject `Einladung Bewerbungsgespräch Team Lead Network & Security Services @ A1`
- updated `CONFIG.debugSampleThreads` to use `19daf77006243bc4` for the next Phase 5 debug validation
- found a Phase 5 debug-run failure caused by Gmail object lookup errors while iterating the broader inbox pool during debug mode
- patched `drafts.gs` so debug mode resolves configured debug thread ids directly and safely skips unreadable threads/messages instead of crashing
- ran `generateDraftRepliesPhase5DebugDryRun()` successfully against thread `19daf77006243bc4`

### 2026-05-03
- continued Phase 11 by making `AiRecommendations` behave more like a queue: duplicate still-open recommendations are now refreshed in place instead of being appended again
- updated helper logging so Phase 11 runs now distinguish inserted vs refreshed recommendation rows
- pushed the updated Apps Script code live with `clasp push`
- validated the live news-source helper after deploy; Reuters (`dailybriefing@thomsonreuters.com`) refreshed cleanly as an existing still-open `newsSenders` recommendation instead of creating duplicate queue noise
- updated project docs and workspace memory to capture the new queue semantics and deployment state
- applied the accepted operator decisions live through the Phase 10 control surface: `upsertNewsSourcePhase10` enabled Reuters `dailybriefing@thomsonreuters.com` as an explicit news source at row 13, and `upsertApprovedRulePhase10` added `noreply@linkinpark.com` as an approved `commercial-sender` at row 11
- refreshed runtime config and confirmed `dailybriefing@thomsonreuters.com` is now loaded in the live `newsSenders` set
- ran a smaller sender-specific cleanup/validation cycle that finished successfully: recent Linkin Park mail reclassified live (`processedThreads: 1`) and recent Reuters mail reclassified live (`processedThreads: 12`)
- post-run sender inspection showed the Linkin Park fix taking effect on recent traffic (`commercial: 1`, `other: 3` older unlabeled store threads), while Reuters still shows a large preserved historical `news-blank` tail (`50` sampled rows), confirming the explicit-news rule is correct but broader historical catch-up should stay optional and separate
- rebuilt the cleanup/status surfaces after the operator pass: `RecentRunSummary` ended with `missingFamilies: 0` and `staleFamilies: 4`, `WorkflowAudit` ended with `warningCount: 0` and `newsBlankCount: 12`, and `ControlSurfaceStatus` reported `No actionable tuning suggestions right now.`
- confirmed one genuinely useful end-to-end Phase 5 draft in `DraftLog` for `Manuela Rath <Manuela.Rath@a1.at>` / `Einladung Bewerbungsgespräch Team Lead Network & Security Services @ A1`
- accepted this as the first successful Phase 5 end-to-end validation, while keeping the gate intentionally strict pending a few more targeted checks
- validated two additional focused debug cases on 2026-04-23:
  - `19daeff098e33d9d` (`Manuela Rath <Manuela.Rath@a1.at>` / `Team Lead Network & Security Services @ A1`) produced a good usable draft
  - `19daee6c22c50335` (`LinkedIn <jobs-listings@linkedin.com>`) correctly produced `NO_DRAFT`, suggesting some opportunity mail labeled `1: to respond` is still effectively broadcast mail
- concluded that Phase 5 currently behaves well on human-origin reply-needed threads and conservatively rejects broadcast-style opportunity mail
- a broader non-debug dry run with normal candidate selection returned no candidates, which exposed that Phase 5 was relying too much on current Gmail labels even when `DecisionLog` showed draft-worthy dry-run classifications
- tightened the opportunity draft exclusions to explicitly reject LinkedIn/XING/Experteer broadcast senders in Phase 5
- widened strict candidate selection slightly so fresh classification decisions can admit human-origin `Important/Opportunities, 1: to respond` threads even if Gmail labels were not physically applied in prior dry-runs
- a second broader dry run still returned no candidates, which suggested the remaining bottleneck was search-pool discovery rather than gating or draft generation quality
- widened Phase 5 search discovery to scan recent inbox threads plus recent threads already carrying relevant managed labels (`1: to respond`, `Important/Services`, `Important/Calendar`, `Important/Opportunities`) before applying the same strict candidate gate
- even after the discovery widening, broader unattended dry runs still returned no candidates in the current mailbox state
- concluded that Phase 5 background mode is currently best understood as intentionally sparse, high-confidence automation rather than a frequently firing assistant
- next product direction is to keep the strict unattended gate and explore an on-demand draft flow for user-selected threads or very narrow label-based inputs
- implemented initial on-demand Phase 5 entrypoints for a specific thread id and for the `1: to respond` label slice, reusing the same draft builder, logging path, and draft-only safety model
- after thread-id lookup proved unreliable in Apps Script, added a query-based on-demand Phase 5 entrypoint as a more robust fallback for user-selected drafting
- validated the query-based on-demand path successfully against Manuela Rath / A1 recruiting threads and accepted it as the preferred manual targeting method in the current deployment context
- implemented Phase 6 as a narrow visibility-first follow-up tracker with `FollowUpLog`, query-based validation entrypoints, and reason logging
- pushed the updated Apps Script code with clasp on 2026-04-23
- manually validated Phase 6 query-mode logging on real A1-related threads; results were conservatively `closed-or-replied`, which is acceptable for the sampled threads because the latest meaningful message appeared to be external
- accepted Phase 6 as implemented but only lightly validated, with broader waiting-state inference deferred until clearer real examples exist
- ended the checkpoint with Phase 5 practically validated, Phase 6 implemented and lightly validated, and the project ready either for digest surfacing of stale follow-ups or for Phase 7 tuning/ops cleanup
- added a small Phase 6 follow-up digest layer so stale `6: awaiting reply` threads can surface in summaries without broadening automation
- started Phase 7 with `RunLog` operational reporting for processing runs, then expanded it across draft, follow-up, and digest entrypoints
- tightened `RunLog` wording (`Primary Count`, `drafts-generated`) and added another concrete review-bucket cleanup pass using real dry-run evidence

### 2026-04-24
- verified the live log spreadsheet directly and confirmed that `RunLog` rows match current dry-run activity across processing, Phase 5 drafts, and Phase 6 follow-up checks
- found that Phase 5 dry-run reporting was misleading because `RunLog` said `drafts-generated` even when dry-run entries were only produced for review; changed dry-run outcome wording to `drafts-produced-for-review`
- found and fixed a manifest/auth gap for Gemini-backed draft generation: `UrlFetchApp.fetch` required explicit `script.external_request` scope plus reauthorization
- confirmed the scope fix on a fresh dry run: `DraftLog` no longer shows `UrlFetchApp.fetch` permission errors and Phase 5 again produces reviewable draft bodies on real threads
- found and fixed a small Phase 2 operational reporting bug where Phase 2 wrappers could log to `RunLog` with Phase 1-style entry-point names
- added explicit dry-run/live entrypoints for morning and evening digests so Phase 3 execution mode now matches the clarity of later phases
- tightened opportunity-response matching so broadcast LinkedIn "you may be a fit" job suggestions are less likely to land in `1: to respond`
- expanded conservative commercial overrides again, including Shopify marketing mail seen in the live review bucket
- started Phase 8 with a separate `News/Digest` label path, sender/pattern-based news detection, and dedicated morning/evening news digest entrypoints
- the first Phase 8 design keeps news out of the main action digest while preserving explainable rule-based routing and digest logging
- started Phase 9 with a recommendation-first tuning assistant that writes structured suggestions into a `TuningSuggestions` sheet instead of auto-mutating rules
- accepted the first two high-confidence Phase 9 suggestions by promoting Samsung promo mail into commercial overrides and Express One delivery mail into shipping handling
- added a reusable `docs/testing-checklist.md` runbook so future checkpoint validation is easier to repeat consistently
- started Phase 10 with a spreadsheet-native control surface that creates `Preferences`, `DigestSettings`, `NewsSources`, and `ApprovedRules` sheets plus a first small config-loading path back into runtime
- used `gog` successfully to inspect the production log spreadsheet, which is now the preferred direct inspection path from the local environment when sheet auth is available
- began limited live use on 2026-04-25 for Phase 1/2 processing plus digest paths, and confirmed via `RunLog` / `DigestLog` that live runs completed successfully
- concluded that once processing runs frequently during the day, the current mailbox-state-based digest architecture becomes incomplete because already processed/labeled/archived mail falls out of the digest source pool
- accepted the next architectural direction: keep frequent live processing conservative, but move automated morning/evening/news digests toward explicit time-window summaries backed primarily by `DecisionLog` instead of current inbox state
- accepted the next automation direction: add Apps Script wrapper entrypoints for frequent live processing and later for digest windows, but only after the log-backed digest path exists

### 2026-05-11
- repaired local `clasp` auth after an `invalid_grant` failure and revalidated the main dry-run / validation entrypoints, including the full `runPhase10ValidationCheckpoint()` path
- refreshed stale/missing `RecentRunSummary` families by running the review loop plus evening wrapper catch-up runs until the status surface returned to zero missing / zero stale families
- continued Phase 11 by running the three AI recommendation helpers and reviewing fresh queue output across general, news-source, and workflow-semantics paths
- added a new general no-reply workflow rule: senders whose address/display text looks like `noreply`, `no-reply`, `do-not-reply`, or similar can no longer end up in `1: to respond`; such cases now downgrade to non-reply workflow handling, defaulting to `3: notification` unless explicit FYI semantics fit better
- aligned the Phase 11 workflow-semantics helper with that same rule so no-reply-like senders no longer produce `prefer-to-respond` recommendations; after deployment, examples like Google Drive share requests and Google Photos action-required notices shifted toward `prefer-notification`
- pushed the updated Apps Script project live with `clasp push` and confirmed fresh dry-runs still execute successfully after the rule change

### 2026-05-13
- continued Phase 11 by wiring approved `AiRecommendations` into the existing Phase 10 operator loop inside `runPhase10ReviewLoopOptionA()`
- added live import helpers for direct-mapping AI recommendations, including queue reads, row status updates, import-note generation, and duplicate note suppression
- kept workflow-semantics recommendations (`prefer-notification`, `prefer-to-respond`) manual-only at first so they would stay visibly pending instead of silently mutating runtime behavior
- expanded `ControlSurfaceStatus` so the top-level dashboard now includes `AiRecommendations` counts and next-action guidance alongside tuning and approved-rule state
- pushed the Phase 11 operator-loop integration live with `clasp push`
- validated the live deploy with `syncApprovedAiRecommendationsPhase11()`, `rebuildControlSurfaceStatusPhase10()`, and `runPhase10ReviewLoopOptionA()`
- confirmed the live status surface is coherent after deploy and initially reported 47 new `AiRecommendations` waiting for review
- updated repo docs and workspace/project memory to reflect the deployed operator-loop milestone
- triaged the live 47-row `AiRecommendations` queue into 15 approved / 14 rejected / 18 superseded rows using a conservative sender-by-sender pass grounded in live sheet evidence
- the Phase 11 operator loop then auto-applied 12 safe direct-mapping approvals and left exactly 3 workflow-semantics approvals needing explicit follow-through (`drive-shares-dm-noreply@google.com` → notification, `noreply@wetransfer.com` → notification + important, `noreply-photos@google.com` → notification)
- added a new durable `notification-sender` approved-rule category / runtime config path so sender-specific notification semantics can now be encoded without forcing a structural label
- completed live follow-through for those 3 remaining semantics judgments: Google Drive shares and Google Photos now use `notification-sender`, while WeTransfer now uses `important-sender` for the desired important + notification behavior
- after that follow-through, the live control surface shows `AiRecommendations` cleared (`newCount=0`, `approvedManualCount=0`) and 23 active approved rules
- notable triage outcomes: ARTE weekly newsletter was accepted as a news source; Reuters duplicates were superseded because Reuters was already live; Alibaba news/FYI suggestions were rejected as the better framing is commercial, not curated news/FYI; `news@mail.xing.com` stayed explicitly excluded
- ran a documentation/code cleanup pass immediately afterward: `README.md` was shortened into a pointer-oriented overview, `docs/current-state.md` was made explicitly canonical for live ops state, and `docs/architecture.md` was rewritten to reflect the real sheet-backed control-surface/runtime architecture
- broke up the old `apps-script/src/preferences.gs` monolith by extracting Phase 11 AI recommendation import/apply logic into `apps-script/src/ai-recommendations.gs` and the control-surface setup/status/validation/dashboard subsystem into `apps-script/src/control-surface-status.gs`
- replaced several branch-heavy mappings with table-driven registries (`PHASE11_AI_RECOMMENDATION_IMPORTERS_`, `PHASE11_MANUAL_PROPOSED_CHANGES_`, `APPROVED_RULE_CONFIG_FIELD_BY_CATEGORY_`) to make future extension safer and easier

## Immediate next steps

1. keep the dedicated Phase 11 news-source and workflow-semantics recommendation loops cleanly separated from the generic sender loop
2. tune recommendation quality against real operator judgment while only adding new direct-import/runtime paths when repeated cases justify them
3. restore direct local observability for production logs by re-enabling a reliable Gmail/Sheets inspection path from the local environment
4. decide when to run broader historical catch-up passes versus leaving older preserved mailbox state alone

## Recent decisions and lessons

- limited live use confirmed the system is viable in production, but it exposed that mailbox-state digests become incomplete once live processing runs more frequently during the day
- the correct digest architecture for automation is now explicit time-window reporting backed primarily by `DecisionLog`, with mailbox-state digests retained as fallback/validation during the transition
- the improved log-window notes in `RunLog` (window label plus local and UTC timestamps) materially improved live operability and should be kept as the standard format
- duplicate suppression for log-backed digests is harder than expected: row-level dedupe and final render-level dedupe were both insufficient for at least one visible duplicate case, which strongly suggests the remaining bug is in section candidate construction rather than raw log reading or final formatting
- the duplicate-visible-entry problem is documented in GitHub issue `#1`
- the agreed automation-wrapper/trigger phase is documented in GitHub issue `#2`
- safe Apps Script live wrappers were implemented in commit `a8fec34` (`Add safe live automation wrappers`) and validated successfully in production for frequent processing plus morning main/news digests
- the wrapper layer now refreshes sheet-backed config before each run, adds overlap protection with `LockService`, and produces wrapper-level `RunLog` records that make trigger behavior easier to audit
- the successful wrapper-validation milestone is documented in GitHub issue `#3`
- the proposed staged trigger rollout and concrete schedule are documented in GitHub issue `#4`
- the rollout is now active: evening wrappers were validated successfully and `installAutomationTriggers()` created 12 managed wrapper-based time triggers
- issue `#5` now includes the completion update for evening-wrapper validation plus trigger installation
- a first post-rollout live tuning pass was applied in commit `16de8f9` (`Tune sender overrides from live log review`) and documented in GitHub issue `#6`
- local and deployed Apps Script execution setup is now fixed for `clasp run`: the project was linked to standard GCP project `gen-lang-client-0280209098`, manifest execution API access was enabled, `clasp` was re-authenticated with a user OAuth client, and the API executable was redeployed successfully
- a live Phase 4 dry-run failure on 2026-04-26 turned out not to be Gemini but a stale Gmail label handle; classification now uses defensive label-name extraction so one bad label object cannot crash a full AI-review run
- Phase 10 moved another step forward on 2026-04-26: `ApprovedRules` now loads into runtime config during refresh, manual dry-runs also refresh sheet-backed config before execution, and a new `syncApprovedRulesFromTuningSuggestionsPhase10()` path lets operator-approved tuning rows flow into runtime without another code edit
- later the same morning, the approval loop was widened further: `ApprovedRules` gained operator-friendly aliases like `shipping-sender` plus `add` / `remove` actions, tuning-import provenance became clearer, and the live `willhaben.at` shipping rule now comes from the sheet approval loop rather than hardcoded config
- willhaben was explicitly reclassified as marketplace/shipping rather than finance for this inbox context; the control surface now seeds `willhaben.at` into approved shipping rules, shipping heuristics recognize `PayLivery` / `willhaben`, and Phase 9 now uses a dedicated marketplace-shipping suggestion category instead of a finance suggestion for that traffic
- on 2026-04-26, automation-health monitoring was added as a first operational safety layer: a new `AutomationHealthLog` sheet plus `auditAutomationHealth()` now compare wrapper runs against the expected trigger schedule and flag missing, late, failed, or overlap-skipped executions
- the same investigation exposed a more important operational bug: the Apps Script manifest timezone was still `America/New_York`; it has now been corrected to `Europe/Ljubljana`, and managed triggers were reinstalled so wrapper schedules line up with the intended local morning/evening windows
- Phase 10 UX direction is now explicit: keep improving the Google Sheets control surface until the operator workflow is finalized and about 90% clear/ready, while also adding practical workbook maintenance such as log rotation/archival for long-running operational sheets
- on 2026-04-29, the roadmap was adjusted so the dedicated HTML UI is no longer treated as a later branch of Phase 10; it is now explicitly deferred to **Phase 12**, after Phase 11 assisted-AI expansion and after the Sheets workflow is proven in real use
- the first concrete Option A UX pass is now implemented in the live workbook: `setupControlSurfacePhase10()` / `upgradeControlSurfacePhase10OptionA()` now ensure `TuningSuggestions` and `OperatorGuide`, apply header notes, freeze/style key sheets, add dropdown validation for review/action fields, and document the operator workflow directly inside the spreadsheet
- the next Option A step is now live too: a `ControlSurfaceStatus` dashboard sheet plus `rebuildControlSurfaceStatusPhase10()` and `runPhase10ReviewLoopOptionA()` make the review/import loop much clearer by summarizing pending tuning work and combining approved-suggestion import with runtime refresh in one operator-oriented action
- the tuning-review queue is now less noisy: `generateTuningSuggestionsPhase9_()` suppresses repeated open `no-suggestions` rows, `pruneTuningSuggestionsQueuePhase10()` can clean existing duplicates, and `ControlSurfaceStatus` now treats retained `no-suggestions` rows as informational placeholders rather than actionable review items
- suggestion quality was then tightened against the actual last-500-row evidence window: the Phase 9 heuristics now skip senders already covered by approved rules and better recognize obvious single-example commercial/FYI/service cases, which immediately surfaced new actionable commercial candidates like `club@66north.com` and `news@news.conrad.si`
- FYI semantics were cleaned up on 2026-04-26: ambiguous mail no longer auto-gets `2: FYI`, the AI fallback and review-learning logic were updated accordingly, and a live repair pass removed false FYI labels from 34 existing mailbox threads
- on 2026-04-27 the workflow model was tightened again: `Review/Ambiguous` now stays workflow-blank, while `forceFyiSenders` / `fyi-sender` now mean explicit workflow-only FYI routing rather than using FYI as a structural label
- news now defaults to `News/Digest` without a workflow label, so FYI is reserved for intentionally informational mail rather than being the implicit home for news items
- the live Sheet control surface now makes workflow semantics explicit, including a visible `newsWorkflowLabel` preference and status rows for review-default vs news-default behavior
- optional automation-health email escalation was added on 2026-04-27 via sheet-backed preferences, but it is disabled by default, requires an explicit recipient, and deduplicates identical alerts to avoid spam
- the latest Option A polish pass turned `ControlSurfaceStatus` into more of an operator checklist with explicit `operator-step-1/2/3` rows, while `OperatorGuide` now includes a fast-commands section for the main review/import helpers
- on 2026-05-03, the first operator-approved Phase 11 recommendations were successfully converted into live Phase 10 control-surface state: Reuters became an explicit news source, Linkin Park became an approved commercial sender, and a smaller sender-specific cleanup pass proved much more practical than the earlier broad reclassification attempts
- on 2026-05-11, the workflow model was tightened again: no-reply-like senders (`noreply`, `no-reply`, `do-not-reply`, and similar variants in sender address/display text) are now categorically blocked from `1: to respond` and instead fall back to non-reply workflows, with Phase 11 workflow recommendation logic kept consistent with that rule

## Open questions

- Which labels should be visible in Gmail sidebar by default?
- Which opportunity/job emails should stay visible versus be FYI?
- Should LinkedIn/XING digests be archived immediately or routed to FYI?
- Should calendar invites and updates get their own label or rely on existing workflow labels?
- What level of AI use feels acceptable for privacy and cost?
- Should commercial labels remain visible in the sidebar or be hidden after rollout?

## Notes for future work

- Prefer incremental changes over a huge rewrite
- Test on small inbox slices before broad automation
- Keep logs and examples of false positives / false negatives
- Avoid hidden complexity early
- Bias toward explainable automation
- Add safety features before scaling automation scope
- build operator-friendly controls in the spreadsheet before investing in a separate GUI
- treat automatic rule adaptation as an accepted-suggestions follow-on, not the first version
