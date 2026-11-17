# Current state — v2

## Prepared

- V1 source and documentation relocated intact to `archive/v1/`.
- Original baseline identified by commit and recovery tag.
- V2 architecture, decision contract, phased roadmap, migration and acceptance plans.
- Builder instructions separating planned work from implemented behavior.

## Not implemented

All v2 runtime components, JEV adapters, persistence schemas, fixtures, build tooling,
automated checks, operator integration, and deployment pipelines remain future work.
No v2 feature, benchmark, production migration, or JEV connectivity is verified.

## External state

No Gmail, workbook, Apps Script, trigger, credential, or production infrastructure
changes are part of this preparation. Archived claims of live behavior reflect the
May 2026 documentation, not a current production inspection.

## Next work

Start V2-P0 in the [roadmap](roadmap.md). API access/key availability and accepted
usage charges are confirmed; a protected gateway secret for `api.typesafe.ai` exists.
Confirm it is the JEV credential/service and inventory the existing deployment
read-only before writing an adapter.
Record evidence here as implementation proceeds; do not mark a whole phase complete
because one file or UI exists.
