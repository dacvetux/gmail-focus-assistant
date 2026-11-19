import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const domain = require("../../../dist/domain/src/index.js");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateSchema = ajv.compile(domain.assessmentSubmissionSchema);

/** Fail closed on contract drift, data-policy violations, or caller-made-up questions. */
export function createAssessmentSubmissionValidator({ configRepository, questionSetRepository, provider, model, clock = () => new Date() }) {
  if (!configRepository || !questionSetRepository || !provider || !model) {
    throw new TypeError("Submission validation dependencies are required");
  }
  const sha256Hex = text => createHash("sha256").update(text, "utf8").digest("hex");

  return function validateSubmission(submission, now = clock()) {
    if (!validateSchema(submission)) {
      const error = new Error("Assessment submission is invalid");
      error.code = "INVALID_RECORD";
      error.statusCode = 400;
      throw error;
    }
    const nowDate = now instanceof Date ? now : new Date(now);
    const nowIso = nowDate.toISOString();
    domain.assertAssessmentSubmissionPolicy(submission, sha256Hex, nowIso);

    const { job, snapshot, questionSet } = submission;
    const config = configRepository.getRevision(job.configRevision);
    if (!config) throw apiError(409, "STALE_SNAPSHOT");
    domain.assertConfigRevisionDigest(config, sha256Hex);
    const deterministic = domain.evaluateThreadRules(snapshot, config, sha256Hex);
    if (deterministic.category !== "review" || deterministic.workflow !== "none" ||
        deterministic.category !== submission.ruleEvidence.category ||
        deterministic.workflow !== submission.ruleEvidence.workflow ||
        deterministic.reasonCode !== submission.ruleEvidence.reasonCode ||
        deterministic.matchedRuleIds.length !== submission.ruleEvidence.matchedRuleIds.length ||
        deterministic.matchedRuleIds.some((id, index) => id !== submission.ruleEvidence.matchedRuleIds[index])) {
      throw apiError(403, "POLICY_REJECTED");
    }
    const expectedIdempotencyKey = domain.computeAssessmentIdempotencyKey(
      snapshot, config, job.task, questionSet.version, provider, model, sha256Hex,
    );
    if (job.provider !== provider || job.model !== model || job.idempotencyKey !== expectedIdempotencyKey) {
      throw apiError(400, "ASSESSMENT_INVALID");
    }
    const configuredQuestions = questionSetRepository.get(questionSet.version, job.task);
    if (!configuredQuestions || domain.canonicalJson(configuredQuestions) !== domain.canonicalJson(questionSet)) {
      throw apiError(400, "ASSESSMENT_INVALID");
    }
    const createdAt = Date.parse(job.createdAt);
    const deadlineAt = Date.parse(job.deadlineAt);
    if (Math.abs(nowDate.getTime() - createdAt) > 5 * 60 * 1000 || deadlineAt <= nowDate.getTime() ||
        deadlineAt > nowDate.getTime() + 72 * 60 * 60 * 1000) {
      throw apiError(400, "ASSESSMENT_INVALID");
    }
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(job.jobId)) throw apiError(400, "ASSESSMENT_INVALID");
  };
}

function apiError(statusCode, code) {
  const error = new Error(code);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}
