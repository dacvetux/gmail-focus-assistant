# Builder instructions — Focuna v2

Read `docs/current-state.md`, `docs/roadmap.md`, `docs/architecture.md`,
`docs/decision-contract.md`, and `docs/migration.md` before implementation.

- This branch prepares a new version; documentation is not evidence of working code.
- Treat `archive/v1/` as read-only reference. Do not refactor, run, or deploy it.
- Use v2 phase identifiers (V2-P0, V2-P1, etc.), not legacy phase numbers.
- Work phase by phase. Record actual evidence and blockers in current-state.md.
- Do not invent a JEV endpoint, model identifier, SDK, authentication scheme, or
  relationship to OpenClaw. Resolve the V2-P0 integration discovery first.
- JEV must never possess Gmail write credentials or authorize an action.
- All mutations go through policy validation and an auditable action plan.
- Reuse behavior and fixtures from v1, not its global configuration or phase wrappers.
- Keep real mail, workbook IDs, OAuth material, local deployment links, and secrets
  out of new fixtures/configuration. Use synthetic or explicitly anonymized samples.
- Complete the relevant acceptance gates. Do not change production, disable its
  triggers, backfill mail, or migrate live data without explicit confirmation.
- Document each implementation change and its rollback. Never describe shadow or
  dry-run validation as live deployment.
