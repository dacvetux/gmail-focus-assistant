import { AssessmentJob, AssessmentResult, ChoiceQuestionSet, ThreadSnapshot } from "../../domain/src/contracts";
import { canonicalJson } from "../../domain/src/canonical-json";
import { DomainError } from "../../domain/src/errors";
import { assertAssessmentResultForQuestionSet } from "../../domain/src/assessment-validation";
import { assertThreadSnapshotIntegrity } from "../../domain/src/revision-validation";

export interface AssessmentProvider {
  assess(job: AssessmentJob, snapshot: ThreadSnapshot, questionSet: ChoiceQuestionSet): AssessmentResult;
}

/** Deterministic offline provider. Missing fixtures fail closed; no network fallback exists. */
export class FixtureAssessmentProvider implements AssessmentProvider {
  private readonly fixtures = new Map<string, AssessmentResult>();

  constructor(
    fixtures: readonly AssessmentResult[],
    private readonly sha256Hex: (canonicalText: string) => string,
  ) {
    for (const fixture of fixtures) {
      if (this.fixtures.has(fixture.jobId)) {
        throw new DomainError("ASSESSMENT_INVALID", `Duplicate assessment fixture for job ${fixture.jobId}`);
      }
      this.fixtures.set(fixture.jobId, fixture);
    }
  }

  assess(job: AssessmentJob, snapshot: ThreadSnapshot, questionSet: ChoiceQuestionSet): AssessmentResult {
    assertThreadSnapshotIntegrity(snapshot, this.sha256Hex);
    if (job.snapshotFingerprint !== snapshot.snapshotFingerprint) {
      throw new DomainError("STALE_SNAPSHOT", "Fixture request does not match the supplied thread snapshot");
    }
    const fixture = this.fixtures.get(job.jobId);
    if (!fixture) throw new DomainError("ASSESSMENT_INVALID", `No offline fixture for job ${job.jobId}`);
    assertAssessmentResultForQuestionSet(job, fixture, questionSet);
    return JSON.parse(canonicalJson(fixture)) as AssessmentResult;
  }
}
