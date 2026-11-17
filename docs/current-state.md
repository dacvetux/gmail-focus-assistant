# Current state — v2

## Prepared

- V1 source and documentation relocated intact to `archive/v1/`.
- Original baseline identified by commit and recovery tag.
- V2 architecture, decision contract, phased roadmap, migration and acceptance plans.
- Builder instructions separating planned work from implemented behavior.
- V2-P0 discovery started: TypeSafe Jev API key/model endpoint verified using one
  synthetic billable choice request; all 14 live Apps Script source files match v1.
- Live deployment inventory read-only: five deployment records (one `@HEAD`); no
  code, deployment, trigger, Gmail or Sheets changes made.

## Not implemented

Google adapters/executors, JEV adapter integration, durable persistence, approval
workflow, operator UI, digests, drafts, follow-ups, and deployment pipelines remain
future work. Initial offline schemas, tooling and checks are described below. JEV API
authentication/reachability has been smoke-checked with synthetic state; decision
quality, retention, pricing and budget are not yet verified. No production migration
has occurred.

V2-P1 offline contract/tooling slice is underway: machine-readable schemas for all
initial records, core types, legacy label mapping, typed errors, canonical JSON,
semantic JEV choice-distribution validation, and offline test/CI setup have been
added. Assessment results are also bound to the originating job, snapshot, config
revision and deadline. Config revisions now carry verifiable content digests, and
approval events have a sequence/previous-digest chain verifier. Remaining work
includes durable approval workflow persistence, signatures/key management, and
complete tooling verification. The offline execution gate binds an approved record
to the exact proposal digest and current snapshot/config revisions.
Canonical JSON and the SHA-256 adapter seam reject ambiguous input values; the pure
domain now builds and smoke-loads as a Google V8-compatible `.gs` bundle. Production
runtime digest adapters, signatures, and key management are still to be supplied.
Sender normalization, duplicate-selector rejection, and exact/specific-domain rule
precedence are implemented with synthetic coverage; full v1 rules parity remains
future work.
OAuth-independent P0 evidence is documented; live Gmail/Sheets inventory is
explicitly deferred.

## External state

No Gmail, workbook, Apps Script, trigger, credential, or production infrastructure
changes are part of this preparation. Archived claims of live behavior reflect the
May 2026 documentation, not a current production inspection.

The live Apps Script manifest uses `Europe/Belgrade`; archived source says
`Europe/Ljubljana`. Read-only Gmail/Sheets inventory remains unavailable because
Google blocked clasp's shared OAuth client for the additional sensitive scopes.
No Gmail or workbook data has been accessed; continue with synthetic fixtures.

## Next work

Continue mock/offline V2-P1 and V2-P2 work. API access/key availability and accepted
usage charges are confirmed; a protected gateway secret for `api.typesafe.ai` exists.
Jev is identified as TypeSafe's System One model, and one synthetic API choice call
succeeded. P0 still lacks confirmed operating price/budget and live Gmail/Sheets
inventory; those remain deferred until an approved read-only access path exists.
Review the timezone discrepancy before designing digest-window parity.
Record evidence here as implementation proceeds; do not mark a whole phase complete
because one file or UI exists.
