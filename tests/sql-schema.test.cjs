const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");

test("initial SQLite schema enforces identity, references, policy enums, and audit append-only", () => {
  const sql = fs.readFileSync("apps/decision-worker/migrations/001_initial.sql", "utf8");
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(sql);
    const addConfig = db.prepare(`INSERT INTO config_revisions
      (revision, parent_revision, digest, published_at, published_by, record_json)
      VALUES (?, NULL, ?, ?, ?, ?)`);
    addConfig.run("cfg-1", "a".repeat(64), "2026-01-01T00:00:00Z", "operator-1", "{}");

    const addJob = db.prepare(`INSERT INTO assessment_jobs
      (job_id, idempotency_key, account_ref, snapshot_fingerprint, config_revision,
       provider, model, task, status, created_at, deadline_at, record_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const values = ["job-1", "key-1", "acct-1", `sha256:${"b".repeat(64)}`, "cfg-1",
      "typesafe-systemone", "jev-latest", "classification", "queued",
      "2026-01-01T00:00:00Z", "2026-01-01T00:01:00Z", "{}"]; 
    addJob.run(...values);
    assert.throws(() => addJob.run("job-2", ...values.slice(1)), /UNIQUE/);
    assert.throws(() => addJob.run("job-bad", "key-bad", ...values.slice(2, 8), "unknown", ...values.slice(9)), /CHECK/);

    const addApproval = db.prepare(`INSERT INTO approvals
      (approval_id, proposal_id, proposal_digest, actor, actor_type, scope, outcome, occurred_at, record_json)
      VALUES (?, ?, ?, ?, 'human', 'proposal-execution', 'approved', ?, '{}')`);
    addApproval.run("approval-1", "proposal-1", "c".repeat(64), "operator-1", "2026-01-01T00:00:00Z");
    db.prepare(`INSERT INTO approval_audit_events
      (sequence, event_id, approval_id, previous_digest, event_digest, occurred_at, record_json)
      VALUES (1, 'event-1', 'approval-1', NULL, ?, ?, '{}')`).run("d".repeat(64), "2026-01-01T00:00:00Z");
    assert.throws(() => db.exec("UPDATE approval_audit_events SET event_id='rewritten' WHERE sequence=1"), /append-only/);
    assert.throws(() => db.exec("DELETE FROM approval_audit_events WHERE sequence=1"), /append-only/);
    assert.equal(db.prepare("SELECT count(*) AS count FROM approval_audit_events").get().count, 1);
  } finally {
    db.close();
  }
});
