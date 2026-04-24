# PROJECT_MEMORY.md - Gmail Focus Assistant

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
- Local repo created at `projects/gmail-focus-assistant`
- GitHub repo created and pushed: `https://github.com/dacvetux/gmail-focus-assistant`
- Initial scaffold committed
- Initial commit: `471ccc2` - `Initial scaffold for Gmail Focus Assistant`

### Included so far
- `README.md`
- `docs/architecture.md`
- `docs/phases.md`
- `docs/labels.md`
- `docs/roadmap.md`
- `docs/phase-1.md`
- `docs/phase-2.md`
- `docs/phase-3.md`
- `docs/testing-phase-1.md`
- `docs/deployment.md`
- `docs/first-run-checklist.md`
- `docs/implementation-notes.md`
- `apps-script/` starter structure

### Current code state
- phase 1 classifier implemented with concrete pattern families
- phase 1 Gmail actions helper implemented
- phase 1 logging implemented
- phase 1 dry-run and live modes implemented
- phase 2 workflow priority labeling implemented
- validation and tuning controls added for dry-run review
- phase 3 digest generation implemented and refined from live log review
- phase 4 selective AI review implemented and validated for ambiguous mail
- phase 5 first narrow draft-only implementation added for `1: to respond` threads
- phase 6 follow-up tracking implementation added with `FollowUpLog` output and query-based validation entrypoints
- `CONFIG.logSpreadsheetId` is now set to the main Gmail Focus Assistant log sheet
- main phase entrypoints exist

## Planned phases

1. Calm the inbox
2. Create a priority system
3. Safe daily briefing
4. Selective AI classification
5. Draft assistant
6. Follow-up memory
7. Continuous tuning

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
- set `CONFIG.logSpreadsheetId` to the main Gmail Focus Assistant log sheet in code
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
- used `gog` successfully to inspect the production log spreadsheet, which is now the preferred direct inspection path from the local environment when sheet auth is available

## Immediate next steps

1. start Phase 8 by adding a separate `News/Digest` lane plus morning/evening news digests inside Gmail Focus Assistant
2. start Phase 9 by building a recommendation-first tuning assistant that scans logs and proposes safe rule/config changes instead of hand-patching every sender
3. start Phase 10 by using the existing Google Sheets log workbook as the first control surface for preferences, digest settings, news sources, and tuning suggestions
4. keep Phase 6 visibility-first, with no automatic follow-up sending, until real waiting-on-them mailbox state is available
5. only consider semi-automatic rule application after the tuning assistant has proved reliable in suggestion mode

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
