import { isDeepStrictEqual } from "node:util";

const JOB_ID = /^[A-Za-z0-9_-]{16,80}$/;
const SUBMIT_SCOPE = "assessment:submit";
const READ_SCOPE = "assessment:read";

/** Build only the assessment submit/poll routes; no provider call is made here. */
export function createAssessmentJobHandlers({ repository, validateSubmission, clock = () => new Date() }) {
  if (!repository || typeof validateSubmission !== "function") throw new TypeError("Assessment job dependencies are required");
  const handlers = new Map();

  handlers.set("POST /v1/assessment-jobs", async ({ body, identity }) => {
    requireScope(identity, SUBMIT_SCOPE);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw apiError(400, "INVALID_RECORD");
    validateSubmission(body, clock());

    const { job } = body;
    requireAccount(identity, job.accountRef);
    const existing = repository.findByIdempotencyKey(job.idempotencyKey);
    if (existing) {
      if (!sameIdempotentJob(existing.job, job) || !sameSubmissionPayload(existing.payload, body)) throw apiError(409, "CONFIG_CONFLICT");
      const current = repository.getForAccount(existing.job.jobId, job.accountRef);
      return { status: 200, body: receipt(current?.job ?? existing.job, current?.status ?? "queued") };
    }

    const created = new Date(clock()).toISOString();
    const maxQueueExpiry = new Date(Date.parse(created) + 72 * 60 * 60 * 1000).toISOString();
    const expiresAt = Date.parse(job.deadlineAt) < Date.parse(maxQueueExpiry) ? job.deadlineAt : maxQueueExpiry;
    const inserted = repository.insertQueued(job, body, expiresAt);
    if (!inserted.inserted && (!sameIdempotentJob(inserted.job, job) || !sameSubmissionPayload(inserted.payload, body))) {
      throw apiError(409, "CONFIG_CONFLICT");
    }
    return { status: inserted.inserted ? 202 : 200, body: receipt(inserted.job, "queued") };
  });

  handlers.set("GET /v1/assessment-jobs/:jobId", async ({ params, identity }) => {
    requireScope(identity, READ_SCOPE);
    if (!JOB_ID.test(params.jobId)) throw apiError(404, "NOT_FOUND");
    const accountRefs = Array.isArray(identity.accountRefs) ? identity.accountRefs : [];
    const records = accountRefs.map(accountRef => repository.getForAccount(params.jobId, accountRef)).filter(Boolean);
    if (records.length !== 1) throw apiError(404, "NOT_FOUND");
    const { job, status, result } = records[0];
    return { status: 200, body: { schemaVersion: "focuna.v2", jobId: job.jobId, status, result: result ?? null } };
  });

  return handlers;
}

function requireScope(identity, required) {
  if (!identity?.scopes?.includes(required)) throw apiError(403, "POLICY_REJECTED");
}

function requireAccount(identity, accountRef) {
  if (!Array.isArray(identity.accountRefs) || !identity.accountRefs.includes(accountRef)) {
    throw apiError(404, "NOT_FOUND");
  }
}

function sameIdempotentJob(existing, incoming) {
  return existing.accountRef === incoming.accountRef &&
    existing.snapshotFingerprint === incoming.snapshotFingerprint &&
    existing.configRevision === incoming.configRevision &&
    existing.provider === incoming.provider && existing.model === incoming.model &&
    existing.task === incoming.task && existing.idempotencyKey === incoming.idempotencyKey;
}

function sameSubmissionPayload(existing, incoming) {
  if (!existing) return false;
  return isDeepStrictEqual(existing.snapshot, incoming.snapshot) &&
    isDeepStrictEqual(existing.questionSet, incoming.questionSet) &&
    isDeepStrictEqual(existing.ruleEvidence, incoming.ruleEvidence);
}

function receipt(job, status) {
  return {
    schemaVersion: "focuna.v2",
    jobId: job.jobId,
    idempotencyKey: job.idempotencyKey,
    status,
    createdAt: job.createdAt,
    deadlineAt: job.deadlineAt,
  };
}

function apiError(statusCode, code) {
  const error = new Error(code);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

