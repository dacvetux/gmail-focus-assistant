import { DomainError } from "./errors";
import { Approval, AssessmentJob, AssessmentResult, AssessmentSubmission, ChoiceQuestionSet, ConfigRevision, DecisionProposal, ThreadSnapshot } from "./contracts";
import { canonicalSha256 } from "./canonical-json";
import { assertConfigRevisionDigest, assertThreadSnapshotIntegrity } from "./revision-validation";
import { normalizeEmailAddress } from "./rule-matching";

/** Maximum absolute error allowed when a provider's choice distribution sums to 1. */
export const CHOICE_DISTRIBUTION_TOLERANCE = 0.01;

const FOCUNA_MANAGED_LABELS = new Set([
  "1: to respond", "2: FYI", "3: notification", "Review/Ambiguous",
  "Important/Services", "Important/Finance", "Important/Shipping",
  "Important/Calendar", "Important/Opportunities", "News/Digest",
  "Commercial/Newsletters", "Commercial/Ads", "Commercial/Campaigns",
]);

/** Enforce accepted Stage 1 data minimization after JSON Schema validation. */
export function assertAssessmentSubmissionPolicy(
  submission: AssessmentSubmission,
  sha256Hex: (canonicalText: string) => string,
  nowIso: string,
): void {
  if (submission.schemaVersion !== "focuna.v2") invalid("Assessment submission schema version is unsupported");
  const { job, snapshot, questionSet, ruleEvidence } = submission;
  assertThreadSnapshotIntegrity(snapshot, sha256Hex);
  assertQuestionSetMatchesJob(job, questionSet);
  if (job.accountRef !== snapshot.accountRef || job.snapshotFingerprint !== snapshot.snapshotFingerprint) {
    throw new DomainError("STALE_SNAPSHOT", "Assessment job is not bound to its submitted snapshot");
  }
  assertAssessmentJobRunnable(job, nowIso);

  if (snapshot.accountRef.includes("@") || snapshot.threadRef.includes("@") ||
      !/^acct_[A-Za-z0-9_-]{8,64}$/.test(snapshot.accountRef) || !/^thr_[A-Za-z0-9_-]{8,64}$/.test(snapshot.threadRef)) {
    invalid("Assessment snapshot references must be opaque, non-mailbox identifiers");
  }
  try {
    normalizeEmailAddress(snapshot.senderAddress);
  } catch (_error) {
    invalid("Assessment sender must be a parsed mailbox address");
  }
  if (snapshot.subject.length > 250) invalid("Assessment subject exceeds the Stage 1 limit");
  if (snapshot.preservedLabels.length !== 0 || snapshot.labels.some(label => !FOCUNA_MANAGED_LABELS.has(label))) {
    invalid("Only Focuna-managed labels may be submitted; preserved/personal labels are excluded");
  }
  if (snapshot.evidence.length < 1 || snapshot.evidence.length > 2) invalid("Assessment may contain at most two meaningful-message excerpts");
  if (snapshot.evidence.some(item => !/^e_[A-Za-z0-9_-]{8,64}$/.test(item.id))) {
    invalid("Evidence IDs must be opaque references, not Gmail message IDs");
  }
  const totalExcerptChars = snapshot.evidence.reduce((total, item) => total + item.text.length, 0);
  const inbound = snapshot.evidence.filter(item => item.direction === "inbound");
  if (inbound.length !== 1 || inbound[0].text.length > 4000 || totalExcerptChars > 6000) {
    invalid("Stage 1 requires one inbound excerpt (at most 4,000 chars) and 6,000 total excerpt chars");
  }
  const preceding = snapshot.evidence.filter(item => item.id !== inbound[0].id);
  if (preceding.length > 1 || preceding.some(item => item.text.length > 2000)) {
    invalid("The preceding meaningful-message excerpt is limited to 2,000 chars");
  }
  if (preceding.some(item => Date.parse(item.sentAt) >= Date.parse(inbound[0].sentAt))) {
    invalid("The contextual message must precede the latest inbound message");
  }
  if (!Array.isArray(ruleEvidence.matchedRuleIds) || ruleEvidence.matchedRuleIds.length > 50) {
    invalid("Rule evidence exceeds its Stage 1 limit");
  }
  if (job.task !== "classification" || ruleEvidence.category !== "review" || ruleEvidence.workflow !== "none") {
    throw new DomainError("POLICY_REJECTED", "Stage 1 JEV assessment is restricted to unresolved classification cases");
  }
}

/** Stable idempotency key; the key itself contains no account or message content. */
export function computeAssessmentIdempotencyKey(
  snapshot: ThreadSnapshot,
  config: ConfigRevision,
  task: AssessmentJob["task"],
  questionSetVersion: string,
  provider: string,
  model: string,
  sha256Hex: (canonicalText: string) => string,
): string {
  assertThreadSnapshotIntegrity(snapshot, sha256Hex);
  assertConfigRevisionDigest(config, sha256Hex);
  if (!questionSetVersion || !provider || !model) invalid("Assessment idempotency requires question-set, provider, and model versions");
  return `sha256:${canonicalSha256({
    accountRef: snapshot.accountRef,
    snapshotFingerprint: snapshot.snapshotFingerprint,
    configDigest: config.digest,
    task,
    questionSetVersion,
    provider,
    model,
  }, sha256Hex)}`;
}

export function assertAssessmentResultForQuestionSet(
  job: AssessmentJob,
  result: AssessmentResult,
  questionSet: ChoiceQuestionSet,
): void {
  assertAssessmentResultMatchesJob(job, result);
  assertQuestionSetMatchesJob(job, questionSet);
  const questionIds = questionSet.questions.map(question => question.id);
  const answers = Object.keys(result.answers);
  if (answers.length !== questionIds.length || questionIds.some(id => !Object.prototype.hasOwnProperty.call(result.answers, id))) {
    invalid("Assessment answers must exactly match the question-set IDs");
  }
  for (const question of questionSet.questions) {
    validateChoiceAssessment(result.answers[question.id], Object.keys(question.criteria));
  }
}

/** Validate question/task bindings before making a provider request. */
export function assertQuestionSetMatchesJob(job: AssessmentJob, questionSet: ChoiceQuestionSet): void {
  if (questionSet.schemaVersion !== "focuna.v2" || job.questionSetVersion !== questionSet.version || job.task !== questionSet.task) {
    invalid("Assessment job does not match the question-set version or task");
  }
  const questionIds = questionSet.questions.map(question => question.id);
  if (questionIds.length === 0 || new Set(questionIds).size !== questionIds.length || questionIds.some(id => !id)) {
    invalid("Question set must have unique non-empty question IDs");
  }
  for (const question of questionSet.questions) {
    const alternatives = Object.keys(question.criteria);
    if (!question.instructions || question.instructions.length > 2000 || alternatives.length < 2 ||
      alternatives.some(id => !id || !question.criteria[id]) || new Set(alternatives).size !== alternatives.length) {
      invalid(`Question ${question.id} must define at least two unique alternatives`);
    }
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

/** Reject malformed, future, or expired jobs before they can trigger paid provider work. */
export function assertAssessmentJobRunnable(
  job: Pick<AssessmentJob, "createdAt" | "deadlineAt">,
  nowIso: string,
): void {
  const createdAt = Date.parse(job.createdAt);
  const deadlineAt = Date.parse(job.deadlineAt);
  const now = Date.parse(nowIso);
  if (![createdAt, deadlineAt, now].every(Number.isFinite) || deadlineAt < createdAt) {
    invalid("Assessment job timestamps are invalid");
  }
  if (now < createdAt) invalid("Assessment job cannot run before its creation time");
  if (now >= deadlineAt) {
    throw new DomainError("ASSESSMENT_INVALID", "Assessment job deadline has expired");
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
