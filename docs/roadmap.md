# Roadmap

## Completed foundation
- establish repository structure
- document architecture and phased plan
- implement safe phase 1 rules-first inbox classification
- implement phase 2 priority labeling
- implement phase 3 daily briefing
- implement phase 4 selective AI review for ambiguous mail only
- implement phase 5 draft-only assistance in a narrow, validated form
- implement phase 6 follow-up tracking in a visibility-first form
- start phase 7 operational reporting and conservative tuning

## Next phase: Phase 8 - News layer
- add a separate `News/Digest` lane inside Gmail Focus Assistant
- distinguish read-later news/newsletters from urgent mail and generic commercial junk
- add morning and evening news digest entrypoints
- keep the first version explainable and label-driven

## After that: Phase 9 - Tuning assistant
- scan `DecisionLog`, `RunLog`, `DigestLog`, and related sheets for repeated misroutes
- generate recommendation-first tuning suggestions instead of mutating rules silently
- identify candidates for commercial overrides, finance/service routing, opportunity demotion, and retry/backoff tuning

## After that: Phase 10 - Preferences and control surface
- use the existing Google Sheets workbook as the first GUI/control surface
- add tabs such as `Preferences`, `DigestSettings`, `NewsSources`, and `TuningSuggestions`
- let operators review or approve safe tuning suggestions without editing code directly

## Later
- strengthen follow-up intelligence once real waiting-on-them mailbox state exists
- add accepted-suggestion semi-automation only after suggestion quality is trustworthy
- expand long-term analytics and preference-aware behavior
- shift automated morning/evening digests from mailbox-state reads toward explicit time-window, `DecisionLog`-backed reporting once frequent live processing is scheduled
- add Apps Script automation wrappers for frequent live processing and digest windows after the log-backed digest path exists

## Non-goals for early versions
- full autonomous inbox management
- auto-send replies
- opaque AI-first decisioning on all mail
- immediate auto-mutation of rules without review
