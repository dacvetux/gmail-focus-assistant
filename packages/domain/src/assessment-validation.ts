import { DomainError } from "./errors";
import { Approval, AssessmentJob, AssessmentResult, ChoiceQuestionSet, DecisionProposal } from "./contracts";
import { canonicalSha256 } from "./canonical-json";

/** Maximum absolute error allowed when a provider's choice distribution sums to 1. */
export const CHOICE_DISTRIBUTION_TOLERANCE = 0.01;

export function assertAssessmentResultForQuestionSet(
  job: AssessmentJob,
  result: AssessmentResult,
  questionSet: ChoiceQuestionSet,
): void {
  assertAssessmentResultMatchesJob(job, result);
  if (job.questionSetVersion !== questionSet.version || job.task !== questionSet.task) {
    invalid("Assessment job does not match the question-set version or task");
  }
  const questionIds = questionSet.questions.map(question => question.id);
  if (questionIds.length === 0 || new Set(questionIds).size !== questionIds.length || questionIds.some(id => !id)) {
    invalid("Question set must have unique non-empty question IDs");
  }
  const answers = Object.keys(result.answers);
  if (answers.length !== questionIds.length || questionIds.some(id => !Object.prototype.hasOwnProperty.call(result.answers, id))) {
    invalid("Assessment answers must exactly match the question-set IDs");
  }
  for (const question of questionSet.questions) {
    if (question.alternatives.length < 2 || new Set(question.alternatives).size !== question.alternatives.length) {
      invalid(`Question ${question.id} must define at least two unique alternatives`);
    }
    validateChoiceAssessment(result.answers[question.id], question.alternatives);
  }
}

export interface ChoiceAssessmentInput {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

/** Bind an accepted provider result to its exact immutable assessment input. */
export function assertAssessmentResultMatchesJob(
  job: Pick<AssessmentJob, "jobId" | "snapshotFingerprint" | "configRevision" | "createdAt" | "deadlineAt">,
  result: Pick<AssessmentResult, "jobId" | "snapshotFingerprint" | "configRevision" | "completedAt">,
): void {
  if (result.jobId !== job.jobId) invalid("Assessment result job ID does not match the submitted job");
  if (result.snapshotFingerprint !== job.snapshotFingerprint || result.configRevision !== job.configRevision) {
    throw new DomainError("STALE_SNAPSHOT", "Assessment result is bound to a different snapshot or config revision");
  }

  const createdAt = Date.parse(job.createdAt);
  const deadlineAt = Date.parse(job.deadlineAt);
  const completedAt = Date.parse(result.completedAt);
  if (![createdAt, deadlineAt, completedAt].every(Number.isFinite) || deadlineAt < createdAt) {
    invalid("Assessment job/result timestamps are invalid");
  }
  if (completedAt < createdAt) invalid("Assessment result predates its job");
  if (completedAt > deadlineAt) {
    throw new DomainError("ASSESSMENT_INVALID", "Assessment result completed after the job deadline");
  }
}

/** Ensure an approval authorizes only its exact, still-current proposal. */
export function assertApprovalForExecution(
  approval: Pick<Approval, "proposalId" | "proposalDigest" | "actorType" | "scope" | "outcome" | "occurredAt">,
  proposal: DecisionProposal,
  current: { snapshotFingerprint: string; configRevision: string; now: string },
  sha256Hex: (canonicalText: string) => string,
): void {
  if (approval.proposalId !== proposal.proposalId) invalid("Approval proposal ID does not match the proposal");
  if (approval.scope !== "proposal-execution") {
    throw new DomainError("POLICY_REJECTED", "Approval scope does not authorize proposal execution");
  }
  if (approval.actorType !== "human") {
    throw new DomainError("POLICY_REJECTED", "A service identity cannot approve proposal execution");
  }
  if (approval.outcome !== "approved") {
    throw new DomainError("POLICY_REJECTED", "Only an approved proposal can authorize execution");
  }
  if (approval.proposalDigest !== canonicalSha256(proposal, sha256Hex)) {
    throw new DomainError("POLICY_REJECTED", "Approval digest does not match the exact proposal");
  }
  if (proposal.snapshotFingerprint !== current.snapshotFingerprint || proposal.configRevision !== current.configRevision) {
    throw new DomainError("STALE_SNAPSHOT", "Proposal snapshot or config revision is no longer current");
  }

  const approvedAt = Date.parse(approval.occurredAt);
  const expiresAt = Date.parse(proposal.expiresAt);
  const now = Date.parse(current.now);
  if (![approvedAt, expiresAt, now].every(Number.isFinite) || approvedAt > expiresAt || approvedAt > now) {
    invalid("Approval/proposal timestamps are invalid or approval occurred after expiry");
  }
  if (now >= expiresAt) throw new DomainError("STALE_SNAPSHOT", "Approved proposal has expired");
}

/** Validate semantic constraints that JSON Schema cannot express (notably sums). */
export function validateChoiceAssessment(
  answer: unknown,
  allowedAlternatives: readonly string[],
  tolerance = CHOICE_DISTRIBUTION_TOLERANCE,
): asserts answer is ChoiceAssessmentInput {
  if (!isRecord(answer) || answer.type !== "choice" || typeof answer.choice !== "string") {
    invalid("Answer must be a choice assessment with a string choice");
  }
  if (!Number.isFinite(answer.confidence) || answer.confidence < 0 || answer.confidence > 1) {
    invalid("Choice confidence must be a finite number in [0, 1]");
  }
  if (!isRecord(answer.probabilities)) invalid("Choice probabilities must be an object");
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance >= 1) {
    invalid("Distribution tolerance must be finite and in [0, 1)");
  }

  const alternatives = [...new Set(allowedAlternatives)];
  if (alternatives.length === 0 || alternatives.some(item => !item)) {
    invalid("At least one non-empty allowed alternative is required");
  }
  const expected = new Set(alternatives);
  const actual = Object.keys(answer.probabilities);
  if (actual.length !== expected.size || actual.some(key => !expected.has(key))) {
    invalid("Probability keys must exactly match the allowed alternatives");
  }
  if (!expected.has(answer.choice)) invalid("Selected choice is not an allowed alternative");

  let total = 0;
  for (const [alternative, probability] of Object.entries(answer.probabilities)) {
    if (!expected.has(alternative) || typeof probability !== "number" || !Number.isFinite(probability) || probability < 0 || probability > 1) {
      invalid(`Probability for ${alternative} must be finite and in [0, 1]`);
    }
    total += probability;
  }
  if (Math.abs(total - 1) > tolerance) {
    invalid(`Choice probabilities must sum to 1 within ${tolerance}; received ${total}`);
  }
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): never {
  throw new DomainError("ASSESSMENT_INVALID", message);
}
