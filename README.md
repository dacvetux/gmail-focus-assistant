# Focuna v2 — Gmail decision assistant

**Status: architecture and builder preparation; v2 is not implemented or deployed.**

Focuna keeps important email visible, reduces commercial noise, separates news,
produces useful digests, offers draft-only reply help, and tracks follow-ups.
Version 2 preserves those goals while introducing JEV as a bounded decision AI,
separate from deterministic policy and Gmail execution.

## Start here

- [New roadmap](docs/roadmap.md): implementation order, deliverables, and exit gates.
- [Architecture](docs/architecture.md): responsibilities, runtime, and trust boundaries.
- [Builder handoff](docs/builder-handoff.md): first tasks and module layout.
- [Decision contracts](docs/decision-contract.md): inputs, outputs, and validation.
- [Migration and rollback](docs/migration.md): preserve v1 and prevent dual writers.
- [Acceptance plan](docs/acceptance.md): evidence required before each rollout stage.
- [Current state](docs/current-state.md): implemented versus planned.
- [Architecture decisions](docs/decisions.md): chosen direction and unresolved dependencies.

## Legacy baseline

The previous source and documents are preserved, unchanged, in [archive/v1](archive/v1/README.md).
Git tag `legacy-v1-2026-05-14` identifies original commit
`446856e9a8a2aa97dbd79f616d1b07c0128f1ce8` before relocation.
Archived deployment instructions are historical, not instructions to deploy v2.
Moving files in Git does not stop or update the existing Apps Script deployment.
Its live state has not been verified in this preparation change.

## Invariants

- Rules and explicit human choices precede AI; preserved/manual labels win.
- JEV produces evidence-linked assessments, never authorization or executable commands.
- Email content is untrusted data, not instructions for the assistant.
- Important mail and uncertain decisions remain visible.
- No autonomous replies, deletion, or silent rule changes.
- Digests may be sent only through explicitly configured digest delivery.
- Production cutover is separate work requiring D.C.'s explicit confirmation.

No v2 runtime directories or deployable placeholder implementation are included yet.
Builders create them in the phases below; do not deploy from the archive.
