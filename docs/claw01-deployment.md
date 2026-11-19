# claw01 worker deployment design and runbook

Status: preparation only. The v2 worker is not implemented, and nothing has been
installed or exposed on claw01. This runbook is for a future isolated staging
deployment; it does not authorize production Gmail cutover or VPS mutations.

## Target layout

- Application checkout: `/opt/focuna-worker/current` (release-owned, not shared
  with FlyAwayz or other existing workloads).
- Persistent SQLite data: `/var/lib/focuna-worker/focuna.sqlite3` on verified
  persistent local storage; mode `0600`, service-owned. Never place it in the Git
  checkout, a container overlay filesystem, or a public/shared mount.
- Secrets: root-owned mode-`0600` credential file or systemd credentials; HMAC key
  material is not stored in SQLite, the repo, shell history, or logs.
- Runtime: non-login `focuna-worker` service identity; systemd service, loopback
  listener only, `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`,
  `ProtectHome=true`, `UMask=0077`, explicit writable data directory, restart
  limits and resource bounds.
- Ingress: existing Caddy, only after read-only inspection confirms safe route
  ownership. A dedicated DNS hostname and certificate are required. Caddy forwards
  HTTPS to the loopback worker; firewall does not expose the worker port or SQL.
- Backups: SQLite online backup or a quiesced consistent snapshot, encrypted and
  access-controlled, retention defined, restore periodically verified. Backups
  must not include HMAC secrets in the same archive.

All paths, unit names, ports, hostname, Caddy snippet and resource limits are
proposals until host inspection confirms they do not collide with existing
services. Do not create files/units or alter firewall/Caddy before that check.

## Staging deployment sequence

1. **Read-only inventory:** with authorized admin inspection, record current Caddy
   routes/certificates, Docker/Compose services, listeners/process owners, firewall
   rules, storage/mounts, backups, CPU/RAM/disk limits, and existing service paths.
   Coordinate with the owner of any conflicting workload.
2. **Resolve ingress:** select a dedicated hostname under an owner-controlled
   domain; confirm DNS resolves to the VPS and the existing Caddy policy permits
   the route. Keep the service unreachable if DNS/certificate validation fails.
3. **Prepare rollback:** snapshot any config that must change, validate backup
   location/mode, and document exact rollback commands before applying one change.
4. **Build offline:** install locked dependencies, build the worker and validate
   migrations in an isolated disposable SQLite file. No live secrets or mailbox
   data are needed for build/contract tests.
5. **Provision isolated foundations:** service identity, data path, secret file,
   migrations and disabled systemd unit. Use a dedicated DB migration command; the
   application runtime must not modify schema.
6. **Verify locally:** service remains loopback-bound; run synthetic signed health,
   auth, nonce replay, request/response signature, restart, and SQLite backup/restore
   checks. Confirm no JEV request occurs in health or protocol checks.
7. **Enable ingress:** back up Caddy config; add only the approved hostname route;
   validate config and TLS, reload Caddy, then verify external HTTPS and request
   authentication. Never expose a readiness endpoint with host details.
8. **Observe and document:** check service health, logs for secrets/content, disk
   growth, backup completion and restoration. Update this runbook and ClawNet
   inventory/changelog with actual—not planned—state.

## Rollback

Disable the Focuna systemd unit first, then remove/disable only its dedicated Caddy
route and reload after validation. Preserve the SQLite file and backup for forensic
or retry use; do not delete data during rollback. Restore only the exact prior
Caddy snapshot if the route change caused unrelated impact. Revoke the worker HMAC
key if exposure is suspected. Verify existing FlyAwayz, PostgreSQL, Caddy and
security services remain healthy. Record deployed commit, migration versions,
backup identity, checks and rollback result. No Gmail triggers or V1 Apps Script
deployments are modified by worker rollback.

## Readiness gates

- Host privileged inventory and workload owner review complete.
- App API schemas/auth implementation and synthetic security checks pass.
- Dedicated hostname, DNS, TLS and Apps Script egress path verified.
- Durable SQLite location, free-space headroom, backup and restore verified.
- HMAC key provisioning/rotation and Apps Script caller identity documented.
- Service runs as non-root, loopback-only behind Caddy, with bounded resources.
- Exact commit, install/migration/start/health/rollback commands recorded.

Until all gates pass, keep the worker inactive and do not ingest real mail or make
provider calls.
