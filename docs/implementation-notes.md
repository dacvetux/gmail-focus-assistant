# Implementation Notes

## 2026-04-21 - Phase 1 implementation

Implemented a first real version of Phase 1 inbox calming.

### Added
- expanded configuration for pattern groups and sender/domain preservation
- stronger classifier logic for:
  - finance
  - shipping
  - calendar
  - opportunities
  - important services
  - newsletters
  - ads
  - campaigns
  - Gmail promotions fallback
- preservation checks for manual labels and personal mail
- phase 1 decision logging to `Phase1Log`
- configurable max thread count

## 2026-04-21 - Phase 1 safety upgrade

Added safety and rollout controls for Phase 1.

### Added
- `CONFIG.dryRun`
- explicit `CONFIG.logSpreadsheetId`
- separate run entrypoints for dry-run and live mode
- log mode column so dry-run and live results are distinguishable
- removal of implicit active spreadsheet fallback

### Why
- safer rollout
- predictable logging destination
- easier testing before touching live mail

## 2026-04-21 - Phase 2 implementation

Implemented the first version of the workflow priority system.

### Added
- workflow labels in config: `1: to respond`, `2: FYI`, `3: notification`
- response, FYI, and notification pattern groups
- structural plus workflow dual-label decisions
- managed decision-label cleanup during live runs
- shared `DecisionLog` sheet for later phases
- Phase 2 run entrypoints

### Current tradeoff
- workflow inference is intentionally simple and pattern-driven
- this should be good enough for a first pass, but will need tuning from real inbox results

## 2026-04-21 - Validation and tuning support

Added practical validation and tuning hooks for Phases 1 and 2.

### Added
- `validatePhases1And2DryRun()`
- debug narrowing filters for thread ids, sender fragments, and subject fragments
- force override lists for important, commercial, and review senders

### Why
- faster iteration during dry-run validation
- easier false-positive correction without waiting for a larger redesign

## 2026-04-21 - Phase 3 initial implementation

Started the first working version of daily briefing.

### Added
- `generateMorningDigest()`
- `generateEveningDigest()`
- simple sectioned digest based on workflow labels
- `DigestLog` for digest run tracking
- optional digest email sending when not in dry-run mode and recipient is configured

### Current tradeoff
- digest formatting is intentionally simple and text-first for now
- good enough to validate the briefing workflow before adding ranking and richer summaries

## 2026-04-22 - Additional tuning and Phase 4 first implementation

Extended the rules and digest using real dry-run logs, then added a first safe AI review layer.

### Added
- extra commercial sender overrides for recurring review-bucket leaks
- stronger newsletter/ad/campaign patterns for missed commercial mail
- broader opportunity sender and subject coverage
- digest generation based on a candidate inbox pool plus fresh classification, not only pre-labeled threads
- section counts and cleaner sender display in digest output
- first Phase 4 AI review implementation in `ai.gs`
- AI confidence logging in `DecisionLog`
- dedicated Phase 4 dry-run and live entrypoints

### Safety model
- AI only runs for rule-based `Review/Ambiguous` threads
- AI output is constrained back into existing labels
- fallback keeps mail in review if the AI call fails or returns invalid output
- archive suggestions are only honored for commercial labels
- per-run AI volume is limited

### Current tradeoff
- AI classification is useful for reducing ambiguity, but still needs prompt tuning and review before it should be trusted broadly in live mode

## 2026-04-22 - Phase 5 first implementation

Started the first draft-only reply assistant.

### Added
- `drafts.gs` for reply-draft generation
- `generateDraftRepliesPhase5DryRun()`
- `generateDraftRepliesPhase5Live()`
- `DraftLog` sheet for draft review
- narrow source query focused on `1: to respond`
- bounded latest-message context for draft generation

### Safety model
- no auto-send
- dry-run available before creating Gmail drafts
- every generated draft is logged
- prompts instruct the model not to invent facts or over-claim actions

### Current tradeoff
- first version uses only bounded latest-message context, so some replies may be too generic or miss longer-thread nuance

## 2026-04-22 - Phase 5 tuning passes

Phase 5 required several same-day tuning passes after dry-run validation.

### Added or changed
- explicit no-candidate logging in `DraftLog`
- broader then later stricter candidate gating
- sender and subject exclusions for job alerts, promos, and other poor draft targets
- retry and fallback handling for transient Gemini draft-model failures
- newer flash/lite draft model stack
- forced draft generation for strongly actionable threads
- final strict gate limited to strongly actionable threads only
- debug-targeted dry-run entrypoint for validating one known good thread without reopening the broad gate

### Current tradeoff
- Phase 5 structure is now much safer and more predictable, but it still needs one successful end-to-end validation on a real actionable thread before it should be treated as stable

## 2026-04-23 - Phase 6 validation path and logging upgrade

Extended the initial Phase 6 skeleton so it can be validated on real known threads before the `6: awaiting reply` label is fully populated.

### Added or changed
- query-based Phase 6 entrypoints for dry-run and live validation
- richer Phase 6 analysis based on the latest meaningful message in a thread, not only the literal latest message
- conservative filtering for trivial acknowledgement-style messages
- `Reason` column in `FollowUpLog` for easier review of stale/fresh/closed decisions
- optional live-mode application of `6: awaiting reply` only for query-mode candidates that look like genuine waiting threads

### Current tradeoff
- meaningful-message detection is still heuristic and intentionally simple
- Phase 6 remains visibility-first; no follow-up drafting or sending is triggered from this path

## 2026-04-23 - Phase 6 digest surfacing

Added a small digest/report layer on top of the Phase 6 tracker.

### Added or changed
- `generateFollowUpDigestPhase6DryRun()`
- `generateFollowUpDigestPhase6Live()`
- stale `6: awaiting reply` threads can now appear as a dedicated digest section
- follow-up digest remains read-only apart from normal digest logging/email behavior

### Current tradeoff
- digest surfacing only sees threads already discoverable through the narrow Phase 6 input pool
- usefulness depends on the mailbox actually accumulating `6: awaiting reply` threads over time

## 2026-04-23 - Phase 7 operational run reporting

Started Phase 7 with a small operational reporting layer.

### Added or changed
- `RunLog` sheet for top-level run summaries
- Phase 1/2 and Phase 4 processing entrypoints now record processed-thread counts, outcome, and notes
- no-candidate and debug-filter situations are easier to spot without reading raw decision logs first

### Current tradeoff
- this first RunLog pass covers processing runs only; draft, follow-up, and digest runs still rely mainly on their dedicated logs plus return values

## 2026-04-23 - Expanded RunLog coverage

Extended the Phase 7 operational reporting layer across the later-phase entrypoints.

### Added or changed
- Phase 5 draft entrypoints now write top-level summaries to `RunLog`
- Phase 6 follow-up tracking entrypoints now write top-level summaries to `RunLog`
- digest entrypoints now write top-level summaries to `RunLog`
- `RunLog` now acts as a compact operational index across processing, drafting, follow-up tracking, and digesting

### Current tradeoff
- `RunLog` is intentionally summary-level and does not replace the detailed phase-specific sheets
- some run notes are heuristic strings meant for operator visibility, not strict machine contracts

## 2026-04-23 - RunLog wording cleanup and first new review-bucket tightening

Applied a small operational cleanup plus one concrete tuning pass based on fresh log output.

### Added or changed
- renamed the `RunLog` count header from `Created/Matched Items` to `Primary Count`
- shortened draft run outcome wording from `drafts-created-or-generated` to `drafts-generated`
- added several obvious commercial/newsletter sender domains seen in the current review bucket to `forceCommercialSenders`

### Why
- the old RunLog wording was accurate enough but clunky
- several review-bucket items were plainly commercial and not worth leaving in `Review/Ambiguous`

## 2026-04-23 - RunLog header migration and second review-bucket cleanup pass

Added a tiny sheet-header migration and another conservative tuning pass driven by the remaining review items.

### Added or changed
- `RunLog` now corrects the existing sheet header from `Created/Matched Items` to `Primary Count`
- expanded `forceCommercialSenders` with another batch of obvious promo/event/newsletter domains seen in recent review output
- expanded `notificationPatterns` for a few recurring non-commercial notification-style subjects
- added `families-noreply@google.com` and `invitations@linkedin.com` to `forceReviewSenders` to avoid burying potentially personal or human-relevant items under commercial cleanup

### Current tradeoff
- this remains a sender/domain-heavy tuning pass rather than a deeper classifier rewrite
- some borderline lifestyle/event senders may still require later preference decisions rather than hard-coded routing

## 2026-04-24 - RunLog verification, draft auth fix, and reporting cleanup

Validated the live spreadsheet directly, fixed a real Phase 5 authorization failure, and tightened one misleading reporting detail.

### Added or changed
- verified via the live log spreadsheet that current dry-run activity is represented in `RunLog` and matches `DraftLog` / `FollowUpLog`
- changed Phase 5 dry-run `RunLog` outcome wording from `drafts-generated` to `drafts-produced-for-review`
- added explicit Apps Script manifest scopes for:
  - `https://www.googleapis.com/auth/script.external_request`
  - `https://www.googleapis.com/auth/script.send_mail`
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/gmail.modify`
- reauthorized after the scope change so Gemini-backed draft generation could call `UrlFetchApp.fetch` successfully again
- fixed processing entry-point inference so Phase 2 wrappers now log correct Phase 2 names in `RunLog`
- removed temporary debug helper functions after spreadsheet verification was complete

### Why
- the previous dry-run wording implied real draft creation even though dry-run only produces reviewable draft content
- the missing external request scope caused hard failures in `DraftLog` for all AI-backed draft attempts
- operational logs are most useful when entry-point names are exact and trustworthy

## 2026-04-24 - Direct spreadsheet inspection path documented

Documented the now-proven local sheet inspection path.

### Added or changed
- noted that `gog` can inspect the production spreadsheet directly when local Google auth is available

### Why
- this is the fastest reliable operator path for checking `RunLog`, `DraftLog`, `FollowUpLog`, and `DigestLog` without temporary in-script debug helpers

## 2026-04-24 - Digest entrypoint cleanup and another conservative tuning pass

Tightened Phase 3 execution clarity and reduced another batch of misrouted opportunity/commercial mail.

### Added or changed
- added explicit Phase 3 digest entrypoints for dry-run/live morning and evening digest execution
- `RunLog` digest entry-point naming now reflects the explicit digest function used
- removed generic opportunity response matches like bare `role` / `position` that were over-promoting LinkedIn broadcast job suggestions into `1: to respond`
- added `g.shopifyemail.com` to conservative commercial overrides after fresh review-bucket inspection
- kept stronger response-style opportunity phrases like interview scheduling, recruiter-driven next steps, assessments, and direct application updates

### Why
- digest execution should be as explicit and operator-friendly as the later phase entrypoints
- LinkedIn broadcast suggestions should bias toward FYI unless they clearly look like direct recruiting workflow
- obvious store marketing mail should not survive in `Review/Ambiguous` after repeated real-log evidence

## 2026-04-24 - Finance alert tuning from live digest review

Applied one more conservative routing correction based on the refreshed morning digest.

### Added or changed
- added `sparkassepay.si` to forced important senders
- expanded finance patterns with `Blokada kartice` / card-block phrasing
- Sparkasse/card-block alerts should now route to `Important/Finance, 3: notification`

### Why
- a card-block alert is operationally important and should not sit in `Review/Ambiguous`

## 2026-04-24 - Phase 8 news layer started

Started the first version of a separate news lane inside Gmail Focus Assistant.

### Added or changed
- added a new structural label: `News/Digest`
- added sender/pattern-based news detection for sources like Reuters, Economist, LinkedIn publisher newsletters, and XING news-style traffic
- added dedicated entrypoints:
  - `generateNewsDigestMorningDryRun()`
  - `generateNewsDigestMorningLive()`
  - `generateNewsDigestEveningDryRun()`
  - `generateNewsDigestEveningLive()`
- added a news-thread selector and summary renderer for digest generation
- excluded `News/Digest` items from the main morning/evening action digest so read-later news does not crowd urgent triage sections

### Why
- some inbox content is genuinely "read later" news rather than urgent operational mail or generic commercial junk
- that content deserves a distinct lane and digest instead of being buried under `Commercial/Newsletters`
- the first version should stay explainable and conservative before any richer ranking or summarization is added

## 2026-04-24 - Phase 8 refinement pass

Applied a short cleanup pass after the first real news-digest validation.

### Added or changed
- excluded `messaging-digest-noreply@linkedin.com` from the news lane so LinkedIn message digests are not treated like publisher/news content
- added `marketing@lon.si` to conservative commercial overrides after it still appeared in the live review bucket

### Why
- LinkedIn messaging digests are product/activity noise, not news content
- repeated obvious marketing senders should not survive in `Review/Ambiguous` after live validation

## 2026-04-24 - Phase 9 tuning assistant started

Started the first recommendation-first tuning helper.

### Added or changed
- added a `TuningSuggestions` sheet with structured suggestion rows
- added `generateTuningSuggestionsPhase9DryRun()`
- added `generateTuningSuggestionsPhase9Live()`
- first suggestion pass scans recent `DecisionLog` rows and proposes conservative candidates for:
  - commercial overrides
  - shipping handling
  - finance handling
- added top-level `RunLog` reporting for tuning suggestion runs
- expanded suggestion rows to include `Example From` in addition to subject/reason so review is easier
- immediately applied the first two high-confidence suggestion outputs:
  - Samsung promo mail into `forceCommercialSenders`
  - Express One delivery mail into `forceShippingSenders`
- added a dedicated `docs/testing-checklist.md` runbook for repeatable checkpoint validation

### Why
- repeated manual sender patching does not scale
- the first version should suggest changes from evidence before any automatic rule mutation is considered

## 2026-04-25 - Draft safety tightened for no-reply senders

Added a simple but high-value reply-safety rule for Phase 5 drafting.

### Added or changed
- added `noreply@` and `no-reply@` style sender fragments to draft exclusion config
- added an explicit `isNoReplySender_()` guard in draft candidate selection
- added the same no-reply guard again during actual draft building so query-based or forced paths still refuse to generate reply drafts
- DraftLog now records a clear skip reason when a sender appears to be a no-reply address

### Why
- mail from no-reply/noreply addresses is overwhelmingly not intended for conversational reply handling
- this is a cheap, conservative safety win that reduces obviously bad draft suggestions before broader live Phase 5 use

## 2026-04-25 - First DecisionLog-backed digest windows added

Started the shift from mailbox-state digests to time-window digests backed by `DecisionLog`.

### Added or changed
- added new log-backed digest entrypoints for main and news reporting:
  - `generateMorningDigestFromLogsDryRun()` / `Live()`
  - `generateEveningDigestFromLogsDryRun()` / `Live()`
  - `generateNewsDigestMorningFromLogsDryRun()` / `Live()`
  - `generateNewsDigestEveningFromLogsDryRun()` / `Live()`
- added digest-window filtering over recent `DecisionLog` rows
- added first explicit digest windows:
  - morning: previous evening 19:00 -> current morning 07:30
  - evening: current-day 07:30 -> current-day 19:00
- added `RunLog` reporting under `digest-log-window` so log-backed runs are distinguishable from mailbox-state digest runs
- generalized recent `DecisionLog` reading so later features can scan beyond the previous 200-row cap

### Current tradeoff
- this first pass summarizes by logged applied labels and does not yet fold in follow-up windowing or richer thread de-duplication logic
- mailbox-state digest functions remain in place as fallback and comparison tools during transition
- once a few suggestions are clearly correct, folding them back into config is the fastest way to keep momentum without waiting for a richer approval UI

## 2026-04-24 - Phase 10 spreadsheet control surface started

Started the first sheet-based operator control layer.

### Added or changed
- added `setupControlSurfacePhase10()` to create the initial operator sheets:
  - `Preferences`
  - `DigestSettings`
  - `NewsSources`
  - `ApprovedRules`
- added `refreshConfigFromPreferencesPhase10()` to load a small set of sheet-backed preferences into runtime config
- added helper readers/creators for the new control-surface sheets
- started with a deliberately small preference set:
  - `dryRun`
  - `enableAiForReview`
  - `maxThreads`
  - digest thread limits
  - `digestRecipient`
  - `newsWorkflowLabel`

### Why
- the project is now mature enough to benefit from operator controls without editing code for every change
- a spreadsheet-native control surface is the fastest practical UI before building anything heavier

## 2026-04-25 - Phase 10 control surface moved from scaffold to live runtime input

Connected the new spreadsheet control surface to actual digest/news behavior and finalized the latest Phase 8 refinement in code.

### Added or changed
- `isNewsThread_()` now explicitly respects `CONFIG.newsExcludedSenders` before sender/pattern-based news matching
- `refreshConfigFromPreferencesPhase10()` now also loads `NewsSources` into runtime as:
  - `CONFIG.newsSenders`
  - `CONFIG.newsExcludedSenders`
- added digest-settings readers so `DigestSettings` now controls per-digest:
  - enabled/disabled state
  - lookback query
  - search/thread limit
- main and news digest entrypoints now read `DigestSettings` instead of relying on hard-coded `newer_than:1d`
- disabled digests now log a clear `digest-disabled` outcome in `RunLog`
- validated via the live spreadsheet that the digest/news behavior changed after deployment, including a reduced news-digest count consistent with the LinkedIn messaging exclusion path

### Why
- Phase 10 needed to become a real operator surface, not just sheet scaffolding
- news-source control belongs in the sheet if Phase 8 is going to stay maintainable
- digest timing/scope knobs are among the highest-value settings to expose before building any heavier UI

## 2026-04-26 - Phase 10 approved-rules runtime loop and marketplace tuning

Connected the spreadsheet approval layer to actual classification behavior and corrected a live tuning misread around willhaben.

### Added or changed
- `ApprovedRules` now seeds a `willhaben.at` shipping rule so marketplace / PayLivery traffic is treated as transactional shipping instead of finance
- `refreshConfigFromPreferencesPhase10()` now applies approved sender rules from the sheet into runtime for:
  - `forceCommercialSenders`
  - `forceImportantSenders`
  - `forceShippingSenders`
  - `forceFyiSenders`
  - `newsSenders`
  - `newsExcludedSenders`
- added `syncApprovedRulesFromTuningSuggestionsPhase10()` so operator-approved `TuningSuggestions` rows can be imported into `ApprovedRules`
- manual dry-run processing, digest, and tuning entrypoints now refresh sheet-backed config before running, so the control surface governs on-demand execution instead of only wrapper-based automation
- corrected Phase 9 marketplace logic:
  - `willhaben` / `PayLivery` now bias toward shipping suggestions
  - removed the overly broad finance signal from `buchung`
  - removed `PayLivery` from finance suggestion heuristics
- added a dedicated `marketplace-shipping-candidate` suggestion type for clearer operator review

### Why
- the spreadsheet needed to become a genuine approval surface, not just a passive note-taking sheet
- operator-approved tuning should affect runtime without requiring another code edit for each sender
- willhaben behaves more like marketplace/shipping traffic than finance in this inbox context, so the suggestion and routing model needed to reflect that
