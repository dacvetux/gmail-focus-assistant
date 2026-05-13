# Architecture

## Overview

Focuna is a rules-first Gmail automation system built on Google Apps Script with a Google Sheets operator control surface.

The system is deliberately split into two modes:
- **runtime automation** that reads Gmail, classifies threads, applies labels, drafts replies, and writes logs
- **operator control** that reviews state in Sheets, approves changes, and refreshes runtime behavior without silent AI mutation

## Core design principles

- deterministic rules should handle obvious cases first
- workflow labels and structural labels are different things
- operator-approved sheet data may affect runtime behavior
- AI broadens the system through review-first suggestions before direct automation
- no autonomous sending
- logs and control surfaces should make behavior explainable

## Runtime layers

### 1. Classification and routing

Primary code paths:
- `apps-script/src/classify.gs`
- `apps-script/src/config.gs`
- `apps-script/src/actions.gs`
- `apps-script/src/main.gs`

Responsibilities:
- inspect inbox threads and recent message content
- apply sender overrides, pattern rules, Gmail-category fallbacks, and preserve-label rules
- choose structural labels such as important/commercial/news/review
- choose workflow labels such as `to-respond`, `notification`, or `FYI`
- apply/archive decisions and log outcomes

The classifier remains rules-first. AI is not the default classifier for the inbox.

### 2. Digest and follow-up generation

Primary code paths:
- `apps-script/src/digest.gs`
- `apps-script/src/followup.gs`
- `apps-script/src/drafts.gs`

Responsibilities:
- build main and news digests
- surface follow-up visibility conservatively
- create draft-only reply assistance where enabled
- use logs as the preferred operational truth for time-window reporting

### 3. Logging and operational history

Primary code paths:
- `apps-script/src/actions.gs`
- parts of `apps-script/src/preferences.gs`

Primary sheets/logs:
- `DecisionLog`
- `RunLog`
- `DigestLog`
- `FollowUpLog`
- `DraftLog`
- `AutomationHealthLog`
- matching `*Archive` sheets

Responsibilities:
- preserve auditable operational history
- support tuning and validation
- keep active sheets small via rotation/archival

## Operator control-surface layers

### 4. Sheet-backed runtime configuration

Primary sheets:
- `Preferences`
- `DigestSettings`
- `NewsSources`
- `ApprovedRules`

Primary code paths:
- `apps-script/src/preferences.gs`
- `apps-script/src/config.gs`

Responsibilities:
- expose editable runtime settings in Sheets
- translate operator-approved rows into runtime config arrays
- support explicit sender/routing overrides such as commercial, important, shipping, FYI, notification, and news inclusion/exclusion
- refresh in-memory runtime config from sheet state

This is the key bridge between the operator workbook and live automation behavior.

### 5. Review queues and operator dashboards

Primary sheets:
- `TuningSuggestions`
- `TuningReviewQueue`
- `AiRecommendations`
- `ControlSurfaceStatus`
- `ValidationStatus`
- `RecentRunSummary`
- `WorkflowAudit`
- `OperatorGuide`

Responsibilities:
- show what needs review
- separate raw recommendation history from compact actionable queues
- show current next action without requiring raw log inspection first
- keep the default operator loop short: review -> approve/reject -> import -> validate

### 6. AI-assisted recommendation layer

Primary code path:
- `apps-script/src/ai.gs`
- import/apply helpers in `apps-script/src/preferences.gs`

Responsibilities:
- generate review-first recommendations into `AiRecommendations`
- keep general sender/routing suggestions, news-source suggestions, and workflow-semantics suggestions distinguishable
- refresh duplicate still-open recommendations in place so the queue stays usable
- allow only explicitly supported direct-import paths to mutate runtime sheets

Important constraint:
- AI suggestions are not the same thing as runtime behavior
- runtime behavior changes only after the operator approves a row and the system has a defined import path

## Automation wrappers and scheduling

Primary code path:
- `apps-script/src/main.gs`

Responsibilities:
- install/list/delete managed triggers
- run wrapper entrypoints for processing, digests, validation, and automation-health checks
- serialize critical paths with locks
- write operational summaries into `RunLog`

Wrappers are the stable operational shell around the lower-level helpers.

## Current control loop

1. runtime automation processes Gmail and writes logs
2. tuning/AI helpers generate review-first suggestions into sheet queues
3. operator reviews rows in Sheets
4. approved rows are imported into `NewsSources` / `ApprovedRules` when a direct path exists
5. runtime config is refreshed from sheet state
6. validation/status surfaces confirm the resulting system state

## Architectural boundaries

### Runtime behavior may be changed by:
- config defaults in code
- sheet-backed preferences
- approved-rule/news-source imports
- explicit operator-triggered helper actions

### Runtime behavior may not be changed by:
- AI output alone
- unreviewed queue rows
- draft helpers
- implicit silent mutation outside the review loop

## Main technical debt areas

- `apps-script/src/preferences.gs` is still too monolithic and contains several distinct subsystems
- phase-based function naming remains useful historically but increases long-term cognitive load
- some rule/import paths are still branch-heavy instead of table-driven
- architecture documentation had lagged behind the real control-surface system and should continue to be kept in sync with the live workflow
