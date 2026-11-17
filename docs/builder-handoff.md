# Builder handoff

## First implementation slice

1. Read the roadmap and resolve V2-P0 integration facts. Keep original deployment
   untouched. Record unresolved facts, not guessed endpoints or successful status.
2. Add synthetic snapshots and baseline cases from the acceptance plan.
3. Implement schema validation, immutable config, parsed sender matching and rule
   results as pure functions. Build and verify offline before Google integration.
4. Add a mock decision adapter. Implement the real adapter only from confirmed
   JEV documentation and credentials supplied through an approved secret path.
5. Progress through phase gates; update current-state.md with evidence each time.

The first offline P1 slice currently lives under `packages/domain/src/` with
runtime JSON schemas, stable label mapping, typed domain errors and canonical JSON.
`npm test` runs schema/policy/canonicalization checks without connecting to Google
or TypeSafe. Expand remaining record schemas before declaring P1 complete.

## Proposed layout to create in V2-P1

```text
packages/domain/       schemas, snapshots, rules, label mapping, policy, action plans
packages/decisions/    JEV capability adapter, question sets, validation, mock provider
apps/google/          Apps Script collector, Sheets repos, scheduler, Gmail executor
apps/decision-worker/ authenticated API, durable assessment jobs, provider execution
fixtures/             synthetic/anonymized inputs and expected policy outcomes
tests/                contract, rules, policy, recovery and adapter verification
scripts/              build, bundle, fixture verification, documentation checks
docs/                 current plan, ADRs, operational runbooks and actual evidence
archive/v1/           immutable behavioral reference, never an import/deploy target
```

These paths are planned, not present implementation. Avoid empty scaffolds that
suggest runtime availability. Build only the modules needed for the current phase.

## Legacy behavior mapping

| Legacy source | V2 destination / change |
| --- | --- |
| config.gs, preferences.gs | Config schema, validated publication, immutable revisions; migrate operator rules rather than copying private defaults |
| classify.gs | Pure rules with parsed addresses, explicit priority, shared preserve/no-reply guards |
| ai.gs | Split candidate selection, task/question definitions, provider adapter and validation; replace direct Gemini coupling |
| ai-recommendations.gs, tuning.gs | Typed proposals, stable IDs, feedback, conflict previews and version-bound approval/import |
| actions.gs | Gmail executor plus intent/action journal; reconcile partial work before retry |
| main.gs | Small bounded scheduler handlers, job coordination and shared budgets; remove phase-numbered runtime API |
| digest.gs | Event/window-based deduplication, main/news lanes, configured delivery |
| followup.gs | Explicit waiting state with meaningful-message direction and corrections |
| drafts.gs | Separate text provider and draft-only executor, eligibility and deduplication |
| control-surface-*.gs | Split operator views, validation, queue status and operational metrics |

## Readiness rules

- Unit/contract checks are offline by default; no fixture may contact a mailbox.
- Integration checks target staging and must state exactly which side effects occur.
- A build that passes is not proof of Gmail permission, JEV access or production parity.
- Keep all provider calls behind one adapter; Gmail writes behind one executor.
- Result distributions and confidence are distinct from observed correctness.
- Approval of a sender rule is not a blanket approval of historical reclassification.
- Maintain rollback plans and migration compatibility for existing label names.

## Completion report for each phase

State delivered modules and contract versions, acceptance evidence, measured
outcomes, deliberate v1 differences, outstanding dependencies, migration effect,
and rollback procedure. Link the relevant GitHub commit/PR and update current-state.md.
