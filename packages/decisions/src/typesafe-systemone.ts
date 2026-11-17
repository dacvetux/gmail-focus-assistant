import { AssessmentJob, AssessmentResult, ChoiceQuestionSet, ThreadSnapshot } from "../../domain/src/contracts";
import { assertAssessmentResultForQuestionSet, assertQuestionSetMatchesJob } from "../../domain/src/assessment-validation";
import { DomainError } from "../../domain/src/errors";
import { assertThreadSnapshotIntegrity } from "../../domain/src/revision-validation";

export const TYPESAFE_SYSTEMONE_ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_PROVIDER_ID = "typesafe-systemone";

export interface TypeSafeHttpRequest {
  url: string;
  method: "POST";
  headers: { Authorization: string; "Content-Type": "application/json" };
  body: {
    model: string;
    state: string;
    questions: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }>;
  };
}

export interface TypeSafeHttpResponse {
  status: number;
  body: unknown;
}

export type TypeSafeTransport = (request: TypeSafeHttpRequest) => Promise<TypeSafeHttpResponse>;

/** TypeSafe System One adapter. It makes exactly one request and never retries. */
export class TypeSafeSystemOneClient {
  constructor(
    private readonly apiKey: string,
    private readonly transport: TypeSafeTransport,
    private readonly maxStateChars: number,
    private readonly sha256Hex: (canonicalText: string) => string,
    private readonly nowIso: () => string = () => new Date().toISOString(),
  ) {
    if (!apiKey || !apiKey.trim()) throw new DomainError("INVALID_RECORD", "TypeSafe API key is required at runtime");
    if (!Number.isSafeInteger(maxStateChars) || maxStateChars < 1) throw new DomainError("INVALID_RECORD", "A positive state-size limit is required");
  }

  async assess(
    job: AssessmentJob,
    snapshot: ThreadSnapshot,
    questionSet: ChoiceQuestionSet,
    minimizedState: string,
  ): Promise<AssessmentResult> {
    assertThreadSnapshotIntegrity(snapshot, this.sha256Hex);
    if (job.provider !== TYPESAFE_PROVIDER_ID || job.model.length === 0) {
      throw new DomainError("ASSESSMENT_INVALID", "Job provider/model does not target the TypeSafe System One adapter");
    }
    if (job.snapshotFingerprint !== snapshot.snapshotFingerprint || job.accountRef !== snapshot.accountRef) {
      throw new DomainError("STALE_SNAPSHOT", "Assessment job does not match the supplied account snapshot");
    }
    assertQuestionSetMatchesJob(job, questionSet);
    if (!minimizedState || minimizedState.length > this.maxStateChars) {
      throw new DomainError("ASSESSMENT_INVALID", "Prepared state is empty or exceeds the configured character limit");
    }

    const questions: TypeSafeHttpRequest["body"]["questions"] = {};
    for (const question of questionSet.questions) {
      questions[question.id] = { type: "choice", instructions: question.instructions, criteria: { ...question.criteria } };
    }
    const request: TypeSafeHttpRequest = {
      url: TYPESAFE_SYSTEMONE_ENDPOINT,
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: { model: job.model, state: minimizedState, questions },
    };

    let response: TypeSafeHttpResponse;
    try {
      response = await this.transport(request);
    } catch {
      throw new DomainError("PROVIDER_UNAVAILABLE", "TypeSafe request failed before a response was received");
    }
    if (response.status === 429) throw new DomainError("PROVIDER_RATE_LIMITED", "TypeSafe rate limit response");
    if (response.status < 200 || response.status >= 300) {
      throw new DomainError(response.status >= 500 ? "PROVIDER_UNAVAILABLE" : "ASSESSMENT_INVALID", `TypeSafe returned HTTP ${response.status}`);
    }

    const result = mapChoiceResponse(response.body, job, this.nowIso());
    assertAssessmentResultForQuestionSet(job, result, questionSet);
    return result;
  }
}

function mapChoiceResponse(body: unknown, job: AssessmentJob, completedAt: string): AssessmentResult {
  if (!isRecord(body) || typeof body.model !== "string" || !isRecord(body.answers)) {
    throw new DomainError("ASSESSMENT_INVALID", "TypeSafe response envelope is malformed");
  }
  assertOnlyKeys(body, ["model", "answers", "usage"], "response");
  const answers: AssessmentResult["answers"] = {};
  for (const [id, answer] of Object.entries(body.answers)) {
    if (!isRecord(answer) || answer.type !== "choice" || typeof answer.choice !== "string" ||
      typeof answer.confidence !== "number" || !isRecord(answer.probabilities)) {
      throw new DomainError("ASSESSMENT_INVALID", `TypeSafe choice answer is malformed: ${id}`);
    }
    assertOnlyKeys(answer, ["type", "choice", "confidence", "probabilities"], `answer ${id}`);
    const probabilities: Record<string, number> = {};
    for (const [alternative, probability] of Object.entries(answer.probabilities)) {
      if (typeof probability !== "number") throw new DomainError("ASSESSMENT_INVALID", `TypeSafe probability is not numeric: ${id}`);
      probabilities[alternative] = probability;
    }
    answers[id] = { type: "choice", choice: answer.choice, confidence: answer.confidence, probabilities };
  }

  let usage: AssessmentResult["usage"];
  if (body.usage !== undefined) {
    if (!isRecord(body.usage)) throw new DomainError("ASSESSMENT_INVALID", "TypeSafe usage metadata is malformed");
    assertOnlyKeys(body.usage, ["input_tokens", "output_tokens"], "usage");
    const inputTokens = body.usage.input_tokens;
    const outputTokens = body.usage.output_tokens;
    if ((inputTokens !== undefined && (!Number.isInteger(inputTokens) || inputTokens < 0)) ||
      (outputTokens !== undefined && (!Number.isInteger(outputTokens) || outputTokens < 0))) {
      throw new DomainError("ASSESSMENT_INVALID", "TypeSafe usage token counts are invalid");
    }
    usage = {
      ...(inputTokens === undefined ? {} : { inputTokens }),
      ...(outputTokens === undefined ? {} : { outputTokens }),
    };
  }

  return {
    schemaVersion: "focuna.v2",
    jobId: job.jobId,
    snapshotFingerprint: job.snapshotFingerprint,
    configRevision: job.configRevision,
    provider: TYPESAFE_PROVIDER_ID,
    model: body.model,
    completedAt,
    answers,
    ...(usage === undefined ? {} : { usage }),
  };
}

function assertOnlyKeys(record: Record<string, unknown>, allowed: readonly string[], label: string): void {
  const unexpected = Object.keys(record).find(key => !allowed.includes(key));
  if (unexpected) throw new DomainError("ASSESSMENT_INVALID", `Unexpected TypeSafe ${label} field: ${unexpected}`);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
