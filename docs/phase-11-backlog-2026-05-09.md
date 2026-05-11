# Phase 11 backlog draft — 2026-05-09

Local draft backlog aligned with the current roadmap and repo state.

## Recommended GitHub issues to open

### 1. Validate and tune Phase 11 general recommendations
- review live `AiRecommendations` output quality against operator judgment
- measure false-positive/low-value recommendations
- tighten candidate selection and prompt wording
- confirm queue refresh behavior stays useful under repeated helper runs

### 2. Sharpen Phase 11 workflow-semantics recommendations
- focus on recurring ambiguity between `Review/Ambiguous`, `2: FYI`, and `3: notification`
- keep suggestions review-first and explainable
- document preferred operator follow-through for accepted recommendations

### 3. Improve production observability / local log inspection path
- restore a reliable local path for reading production `RunLog`, `DecisionLog`, `AutomationHealthLog`, and related Sheets tabs
- verify current auth/scopes/tooling for Gmail + Sheets inspection
- document the preferred operational inspection workflow

### 4. Decide and validate nightly Phase 10 maintenance wrapper rollout
- review the pending `runPhase10MaintenanceWrapper()` change in `apps-script/src/main.gs`
- if accepted, commit/deploy it
- verify that wrapper-triggered status refresh updates `RecentRunSummary`, `ControlSurfaceStatus`, and optionally `WorkflowAudit` as intended

## Suggested execution order
1. observability/log inspection path
2. Phase 11 recommendation quality pass
3. workflow-semantics recommendation tightening
4. nightly maintenance wrapper rollout

## Notes
- All previous GitHub issues appear closed, so the tracker currently understates active roadmap work.
- This draft is intentionally local only; opening public/remote issues should happen explicitly.