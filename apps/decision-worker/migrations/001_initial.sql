-- Focuna v2 operational store, SQLite single-worker baseline.
-- Persist only minimized/necessary records; retention policy must be configured before live use.
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE config_revisions (
  revision TEXT PRIMARY KEY,
  parent_revision TEXT REFERENCES config_revisions(revision),
  digest TEXT NOT NULL UNIQUE CHECK (length(digest) = 64),
  published_at TEXT NOT NULL,
  published_by TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TABLE recommendations (
  recommendation_id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL,
  config_revision TEXT NOT NULL REFERENCES config_revisions(revision),
  status TEXT NOT NULL CHECK (status IN ('new', 'approved', 'rejected', 'corrected', 'superseded', 'expired', 'applied')),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TABLE approvals (
  approval_id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  proposal_digest TEXT NOT NULL CHECK (length(proposal_digest) = 64),
  actor TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'service')),
  scope TEXT NOT NULL CHECK (scope = 'proposal-execution'),
  outcome TEXT NOT NULL CHECK (outcome IN ('approved', 'rejected', 'corrected')),
  occurred_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TABLE approval_audit_events (
  sequence INTEGER PRIMARY KEY CHECK (sequence > 0),
  event_id TEXT NOT NULL UNIQUE,
  approval_id TEXT NOT NULL UNIQUE REFERENCES approvals(approval_id),
  previous_digest TEXT CHECK (previous_digest IS NULL OR length(previous_digest) = 64),
  event_digest TEXT NOT NULL UNIQUE CHECK (length(event_digest) = 64),
  occurred_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TRIGGER approval_audit_no_update
BEFORE UPDATE ON approval_audit_events BEGIN
  SELECT RAISE(ABORT, 'approval audit events are append-only');
END;
CREATE TRIGGER approval_audit_no_delete
BEFORE DELETE ON approval_audit_events BEGIN
  SELECT RAISE(ABORT, 'approval audit events are append-only');
END;

CREATE TABLE assessment_jobs (
  job_id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  account_ref TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL,
  config_revision TEXT NOT NULL REFERENCES config_revisions(revision),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  task TEXT NOT NULL CHECK (task IN ('classification', 'workflow', 'rule-suggestion')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed', 'expired')),
  created_at TEXT NOT NULL,
  deadline_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);
CREATE INDEX assessment_jobs_status_created ON assessment_jobs(status, created_at);

CREATE TABLE assessment_results (
  job_id TEXT PRIMARY KEY REFERENCES assessment_jobs(job_id),
  completed_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TABLE action_plans (
  plan_id TEXT PRIMARY KEY,
  snapshot_fingerprint TEXT NOT NULL,
  config_revision TEXT NOT NULL REFERENCES config_revisions(revision),
  policy_revision TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('planned', 'applying', 'applied', 'partial', 'failed', 'stale')),
  expires_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json))
);

CREATE TABLE action_events (
  event_id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES action_plans(plan_id),
  operation_index INTEGER NOT NULL CHECK (operation_index >= 0),
  status TEXT NOT NULL CHECK (status IN ('planned', 'applying', 'applied', 'partial', 'failed', 'stale')),
  occurred_at TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK (json_valid(record_json)),
  UNIQUE(plan_id, operation_index, status, occurred_at)
);
