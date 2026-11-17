# Migration, archive and rollback

## Repository preparation (this change)

Preserve original source at `archive/v1/` and baseline tag
`legacy-v1-2026-05-14` -> `446856e9a8a2aa97dbd79f616d1b07c0128f1ce8`.
Root docs now describe v2. No source code, credentials, Google data or deployed
resources have been deleted or migrated. This branch is not a deployable release.
Do not mark the GitHub repository itself archived; it remains the active v2 project.

## Before any live cutover

1. Read-only inventory the actual deployed code/version, triggers, label taxonomy,
   workbook schemas, runtime rules, approvals and digest delivery settings.
2. Back up deployed code and workbook data to access-controlled operator storage,
   not public Git. The Git baseline alone does not back up live state.
3. Import copies into a separate staging workbook/project. Preserve original row
   identifiers/status/provenance in a legacy-ID mapping, not mutable row numbers.
4. Validate counts and conflicts; map legacy suggestions into v2 statuses. Do not
   auto-approve unknown or historical recommendations during import.
5. Maintain Gmail label names initially. Map structural/workflow values explicitly;
   preserve manual labels and the distinction between blank workflow, FYI and review.
6. Record operational owner, feature ownership, acceptance targets, soak duration,
   rollback window, and the concrete production change for explicit confirmation.

## Feature ownership and canary

Maintain an ownership table with classification writer, archive writer, draft
creator, main/news digest sender, follow-up label writer and scheduler for each
mailbox/cohort. V1 may serve remaining capabilities during a staged migration,
but not write the same labels or send the same digest window as v2.

After confirmation, snapshot current state, pause only the known conflicting v1
handlers, and verify the actual trigger inventory. Avoid legacy trigger installers
that remove every unmanaged clock trigger. Enable bounded v2 label-only canary
for an explicit cohort; exclude that cohort from all conflicting v1 writers.
If exclusions cannot be guaranteed, pause the conflicting writer entirely.
Keep archives, drafts and digest sending off until their independent gates pass.

Compare visible state, corrections, stale actions, job latency and errors against
predeclared targets. Expand cohort only with evidence. Retire v1 components only
after each replacement's parity gate; keep backup and rollback inventory intact.
Historical repair/backfill is separate, previewed work requiring explicit scope.

## Rollback

- Pause v2 scheduler/executor and drain or cancel pending plans; revoke worker
  submission access if needed. Never let pending approvals execute after rollback.
- Verify no v2 write remains in progress before restoring the appropriate v1
  handlers from the exact recorded inventory, not a guessed full trigger reset.
- Restore configuration revision/backups as needed. Repository recovery is a
  separate checkout/worktree of the legacy tag, not deployment from the archive path.
- For mailbox reversal, use operation-level before/after records. Reverse only if
  current state still equals the recorded post-state and no manual/new-message
  change intervened. Otherwise require review; never strip labels in bulk blindly.
- Drafts and sent digests are not undone by reverting Git. Do not delete drafts
  or resend a window automatically; reconcile with the operator.
- Preserve all audit history and record the reason, affected IDs and recovery state.

Production actions described here are a future runbook, not authorization to
perform them during repository preparation.
