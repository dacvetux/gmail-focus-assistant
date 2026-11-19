/** Durable assessment-job repository for better-sqlite3. */
export class SqliteAssessmentJobRepository {
  constructor(database) {
    this.database = database;
    this.byIdempotency = database.prepare("SELECT record_json, payload_json FROM assessment_jobs WHERE idempotency_key = ?");
    this.insertJob = database.prepare(`
      INSERT INTO assessment_jobs (
        job_id, idempotency_key, account_ref, snapshot_fingerprint, config_revision,
        provider, model, task, status, created_at, deadline_at, record_json,
        payload_json, payload_expires_at
      ) VALUES (
        @jobId, @idempotencyKey, @accountRef, @snapshotFingerprint, @configRevision,
        @provider, @model, @task, 'queued', @createdAt, @deadlineAt, @recordJson,
        @payloadJson, @payloadExpiresAt
      )
    `);
    this.byJobAndAccount = database.prepare(`
      SELECT j.record_json, j.status, r.record_json AS result_json
      FROM assessment_jobs AS j LEFT JOIN assessment_results AS r ON r.job_id = j.job_id
      WHERE j.job_id = ? AND j.account_ref = ?
    `);
    this.deleteExpiredPayloads = database.prepare(`
      UPDATE assessment_jobs SET payload_json = NULL
      WHERE payload_json IS NOT NULL AND payload_expires_at <= ?
    `);
    this.expireQueuedJobs = database.prepare(`
      UPDATE assessment_jobs SET status = 'expired', payload_expires_at = MIN(payload_expires_at, ?), terminal_at = ?
      WHERE status IN ('queued', 'running') AND deadline_at <= ?
    `);
    this.markTerminal = database.prepare(`
      UPDATE assessment_jobs SET status = ?, payload_expires_at = MIN(payload_expires_at, ?), terminal_at = ?
      WHERE job_id = ? AND status IN ('queued', 'running')
    `);
    this.insertResult = database.prepare(`
      INSERT INTO assessment_results (job_id, completed_at, record_json) VALUES (?, ?, ?)
    `);
    this.pruneResults = database.prepare(`
      DELETE FROM assessment_results WHERE job_id IN (
        SELECT job_id FROM assessment_jobs WHERE status IN ('completed', 'failed', 'expired')
        AND payload_json IS NULL AND terminal_at <= ?
      )
    `);
    this.pruneJobs = database.prepare(`
      DELETE FROM assessment_jobs WHERE status IN ('completed', 'failed', 'expired')
      AND payload_json IS NULL AND terminal_at <= ?
    `);
  }

  findByIdempotencyKey(key) {
    const row = this.byIdempotency.get(key);
    if (!row) return undefined;
    return { job: JSON.parse(row.record_json), payload: row.payload_json ? JSON.parse(row.payload_json) : undefined };
  }

  /** Atomic insert; the DB unique key is the final concurrency/idempotency guard. */
  insertQueued(job, payload, payloadExpiresAt) {
    const write = this.database.transaction(() => {
      const existing = this.findByIdempotencyKey(job.idempotencyKey);
      if (existing) return { inserted: false, job: existing.job, payload: existing.payload };
      this.insertJob.run({
        jobId: job.jobId,
        idempotencyKey: job.idempotencyKey,
        accountRef: job.accountRef,
        snapshotFingerprint: job.snapshotFingerprint,
        configRevision: job.configRevision,
        provider: job.provider,
        model: job.model,
        task: job.task,
        createdAt: job.createdAt,
        deadlineAt: job.deadlineAt,
        recordJson: JSON.stringify(job),
        payloadJson: JSON.stringify(payload),
        payloadExpiresAt,
      });
      return { inserted: true, job };
    });
    return write.immediate();
  }

  getForAccount(jobId, accountRef) {
    const row = this.byJobAndAccount.get(jobId, accountRef);
    if (!row) return undefined;
    return { job: JSON.parse(row.record_json), status: row.status, result: row.result_json ? JSON.parse(row.result_json) : undefined };
  }

  expirePayloads(nowIso) {
    return this.deleteExpiredPayloads.run(nowIso).changes;
  }

  expireOverdueJobs(nowIso) {
    const deleteAfter = new Date(Date.parse(nowIso) + 24 * 60 * 60 * 1000).toISOString();
    return this.expireQueuedJobs.run(deleteAfter, nowIso, nowIso).changes;
  }

  finish(jobId, status, result, completedAt) {
    if (!["completed", "failed", "expired"].includes(status)) throw new TypeError("Terminal job status is required");
    const deleteAfter = new Date(Date.parse(completedAt) + 24 * 60 * 60 * 1000).toISOString();
    const finish = this.database.transaction(() => {
      if (status === "completed") this.insertResult.run(jobId, completedAt, JSON.stringify(result));
      const updated = this.markTerminal.run(status, deleteAfter, completedAt, jobId).changes;
      if (updated !== 1) throw new Error("Assessment job is not active or does not exist");
      return true;
    });
    return finish.immediate();
  }

  pruneContentFreeMetadata(cutoffIso) {
    const prune = this.database.transaction(() => {
      this.pruneResults.run(cutoffIso);
      return this.pruneJobs.run(cutoffIso).changes;
    });
    return prune.immediate();
  }
}
