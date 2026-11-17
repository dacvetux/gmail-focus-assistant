const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;
const {
  canonicalJson,
  canonicalSha256,
  CHOICE_DISTRIBUTION_TOLERANCE,
  actionEventSchema,
  actionPlanSchema,
  approvalSchema,
  assessmentJobSchema,
  assessmentResultSchema,
  assertAssessmentResultMatchesJob,
  configRevisionSchema,
  decisionProposalSchema,
  labelsForDecision,
  ruleResultSchema,
  threadSnapshotSchema,
  validateChoiceAssessment,
} = require("../dist/domain/src");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

test("schemas accept the synthetic v2 snapshot and reject unknown fields", () => {
  const validate = ajv.compile(threadSnapshotSchema);
  const snapshot = {
    schemaVersion: "focuna.v2",
    accountRef: "acct-test",
    threadRef: "thread-1",
    snapshotFingerprint: "sha256:test",
    capturedAt: "2026-01-01T00:00:00.000Z",
    senderAddress: "alerts@example.test",
    subject: "Synthetic delivery update",
    labels: [],
    preservedLabels: [],
    evidence: [{ id: "msg-1", direction: "inbound", sentAt: "2026-01-01T00:00:00.000Z", text: "Parcel delayed." }],
  };
  assert.equal(validate(snapshot), true);
  assert.equal(validate({ ...snapshot, executable: "archive" }), false);
  assert.equal(validate({ ...snapshot, capturedAt: "yesterday" }), false);
});

test("config schema only accepts explicit supported policy values", () => {
  const validate = ajv.compile(configRevisionSchema);
  const config = {
    schemaVersion: "focuna.v2",
    revision: "cfg-1",
    publishedAt: "2026-01-01T00:00:00.000Z",
    publishedBy: "operator-test",
    rules: [{
      id: "rule-1",
      match: { kind: "sender-domain", value: "example.test" },
      category: "shipping",
      workflow: "notification",
      approvedAt: "2026-01-01T00:00:00.000Z",
      approvedBy: "operator-test",
    }],
  };
  assert.equal(validate(config), true);
  assert.equal(validate({ ...config, rules: [{ ...config.rules[0], category: "delete" }] }), false);
});

test("canonical JSON is key-order independent and rejects ambiguous values", () => {
  assert.equal(canonicalJson({ z: 1, a: { y: true, x: null } }), '{"a":{"x":null,"y":true},"z":1}');
  assert.equal(canonicalJson({ a: 0, b: -0 }), '{"a":0,"b":0}');
  assert.throws(() => canonicalJson({ bad: Number.NaN }));
  assert.throws(() => canonicalJson({ bad: undefined }));
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => canonicalJson(sparse), { code: "INVALID_RECORD" });
  assert.throws(() => canonicalJson({ get x() { return 1; } }), { code: "INVALID_RECORD" });
});

test("canonical SHA-256 uses the host adapter and binds canonical bytes", () => {
  const digest = text => createHash("sha256").update(text, "utf8").digest("hex");
  assert.equal(canonicalSha256({ z: 2, a: 1 }, digest), canonicalSha256({ a: 1, z: 2 }, digest));
  assert.equal(canonicalSha256({ a: 1 }, digest), "015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862");
  assert.throws(() => canonicalSha256({ a: 1 }, () => "not-a-digest"), { code: "INVALID_RECORD" });
});

test("label mapping preserves review and commercial workflow invariants", () => {
  assert.deepEqual(labelsForDecision("news", "none"), ["News/Digest"]);
  assert.deepEqual(labelsForDecision("none", "fyi"), ["2: FYI"]);
  assert.throws(() => labelsForDecision("review", "fyi"), { code: "POLICY_REJECTED" });
  assert.throws(() => labelsForDecision("commercial-ad", "to-respond"), { code: "POLICY_REJECTED" });
});

test("all v2 record schemas compile under JSON Schema 2020-12", () => {
  for (const schema of [assessmentJobSchema, assessmentResultSchema, ruleResultSchema,
    decisionProposalSchema, approvalSchema, actionPlanSchema, actionEventSchema]) {
    assert.doesNotThrow(() => ajv.compile(schema));
  }
});

test("action plans reject send and archive operations by schema", () => {
  const validate = ajv.compile(actionPlanSchema);
  const common = {
    schemaVersion: "focuna.v2", planId: "plan-1", snapshotFingerprint: "sha256:x",
    configRevision: "cfg-1", policyRevision: "policy-1", expiresAt: "2026-01-01T00:01:00Z",
  };
  assert.equal(validate({ ...common, operations: [{ kind: "add-label", label: "News/Digest" }] }), true);
  assert.equal(validate({ ...common, operations: [{ kind: "send-reply", body: "no" }] }), false);
  assert.equal(validate({ ...common, operations: [{ kind: "archive" }] }), false);
});

test("choice assessments enforce alternatives, bounds, and normalized distributions", () => {
  const valid = { type: "choice", choice: "shipping", confidence: 0.9, probabilities: { shipping: 0.8, review: 0.2 } };
  assert.doesNotThrow(() => validateChoiceAssessment(valid, ["shipping", "review"]));
  assert.equal(CHOICE_DISTRIBUTION_TOLERANCE, 0.01);
  assert.throws(() => validateChoiceAssessment({ ...valid, probabilities: { shipping: 0.8, review: 0.1 } }, ["shipping", "review"]), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => validateChoiceAssessment({ ...valid, probabilities: { shipping: 1.1, review: -0.1 } }, ["shipping", "review"]), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => validateChoiceAssessment({ ...valid, probabilities: { shipping: 0.8, review: 0.2, finance: 0 } }, ["shipping", "review"]), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => validateChoiceAssessment({ ...valid, choice: "finance" }, ["shipping", "review"]), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => validateChoiceAssessment({ ...valid, confidence: Number.NaN }, ["shipping", "review"]), { code: "ASSESSMENT_INVALID" });
});

test("assessment results are bound to job inputs and deadlines", () => {
  const job = { jobId: "job-1", snapshotFingerprint: "sha256:s1", configRevision: "cfg-1", createdAt: "2026-01-01T00:00:00Z", deadlineAt: "2026-01-01T00:01:00Z" };
  const result = { jobId: "job-1", snapshotFingerprint: "sha256:s1", configRevision: "cfg-1", completedAt: "2026-01-01T00:00:30Z" };
  assert.doesNotThrow(() => assertAssessmentResultMatchesJob(job, result));
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, snapshotFingerprint: "sha256:changed" }), { code: "STALE_SNAPSHOT" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, configRevision: "cfg-2" }), { code: "STALE_SNAPSHOT" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, completedAt: "2026-01-01T00:02:00Z" }), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, jobId: "job-other" }), { code: "ASSESSMENT_INVALID" });
});
