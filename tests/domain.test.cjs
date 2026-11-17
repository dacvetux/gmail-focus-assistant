const test = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const Ajv2020 = require("ajv/dist/2020").default;
const addFormats = require("ajv-formats").default;
const vm = require("node:vm");
const {
  canonicalJson,
  canonicalSha256,
  CHOICE_DISTRIBUTION_TOLERANCE,
  actionEventSchema,
  actionPlanSchema,
  approvalSchema,
  approvalAuditEventSchema,
  assessmentJobSchema,
  assessmentResultSchema,
  assertAssessmentResultMatchesJob,
  assertApprovalForExecution,
  assertApprovalAuditChain,
  assertConfigRevisionDigest,
  computeConfigRevisionDigest,
  createApprovalAuditEventFromApproval,
  evaluateThreadRules,
  configRevisionSchema,
  decisionProposalSchema,
  labelsForDecision,
  assertRuleSetValid,
  normalizeEmailAddress,
  selectApprovedRule,
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
  const content = {
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
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const config = { ...content, digest: computeConfigRevisionDigest(content, sha256) };
  assert.equal(validate(config), true);
  assert.doesNotThrow(() => assertConfigRevisionDigest(config, sha256));
  assert.equal(validate({ ...config, rules: [{ ...config.rules[0], category: "delete" }] }), false);
  assert.throws(() => assertConfigRevisionDigest({ ...config, publishedBy: "changed" }, sha256), { code: "CONFIG_CONFLICT" });
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
    decisionProposalSchema, approvalSchema, approvalAuditEventSchema, actionPlanSchema, actionEventSchema]) {
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

test("execution approval is bound to exact proposal digest and current revisions", () => {
  const proposal = {
    schemaVersion: "focuna.v2", proposalId: "proposal-1", jobId: "job-1",
    snapshotFingerprint: "sha256:s1", configRevision: "cfg-1", category: "shipping",
    workflow: "notification", evidenceIds: ["msg-1"], abstained: false,
    expiresAt: "2026-01-01T01:00:00Z",
  };
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const approval = { proposalId: proposal.proposalId, proposalDigest: canonicalSha256(proposal, sha256), actorType: "human", scope: "proposal-execution", outcome: "approved", occurredAt: "2026-01-01T00:30:00Z" };
  const current = { snapshotFingerprint: "sha256:s1", configRevision: "cfg-1", now: "2026-01-01T00:45:00Z" };
  assert.doesNotThrow(() => assertApprovalForExecution(approval, proposal, current, sha256));
  assert.throws(() => assertApprovalForExecution({ ...approval, outcome: "rejected" }, proposal, current, sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalForExecution({ ...approval, actorType: "service" }, proposal, current, sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalForExecution({ ...approval, scope: "config-publication" }, proposal, current, sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalForExecution({ ...approval, proposalDigest: "0".repeat(64) }, proposal, current, sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalForExecution(approval, proposal, { ...current, configRevision: "cfg-2" }, sha256), { code: "STALE_SNAPSHOT" });
  assert.throws(() => assertApprovalForExecution(approval, proposal, { ...current, now: "2026-01-01T01:00:01Z" }, sha256), { code: "STALE_SNAPSHOT" });
});

test("Apps Script bundle loads in an isolated JavaScript context without Node globals", () => {
  const bundle = fs.readFileSync("dist/apps-script/focuna-domain.gs", "utf8");
  const sandbox = {};
  vm.runInNewContext(bundle, sandbox);
  assert.equal(typeof sandbox.require, "undefined");
  assert.equal(vm.runInNewContext('FocunaDomain.canonicalJson({ z: 2, a: 1 })', sandbox), '{"a":1,"z":2}');
  assert.equal(sandbox.FocunaDomain.labelsForDecision("news", "none")[0], "News/Digest");
});

test("sender rules normalize safely, reject duplicates, and use deterministic specificity", () => {
  const rule = (id, kind, value, category) => ({
    id, match: { kind, value }, category, workflow: "notification",
    approvedAt: "2026-01-01T00:00:00Z", approvedBy: "operator-test",
  });
  const broad = rule("broad", "sender-domain", "EXAMPLE.COM", "services");
  const narrow = rule("narrow", "sender-domain", "mail.example.com", "shipping");
  const exact = rule("exact", "exact-sender", "Orders@mail.example.com", "finance");
  assert.equal(normalizeEmailAddress("Orders@MAIL.EXAMPLE.COM"), "Orders@mail.example.com");
  assertRuleSetValid([broad, narrow, exact]);
  assert.equal(selectApprovedRule("Orders@mail.example.com", [broad, narrow, exact]).rule.id, "exact");
  assert.equal(selectApprovedRule("alerts@mail.example.com", [broad, narrow]).rule.id, "narrow");
  assert.equal(selectApprovedRule("alerts@example.com", [broad, narrow]).rule.id, "broad");
  assert.equal(selectApprovedRule("alerts@notexample.com", [broad]).rule, undefined);
  assert.throws(() => assertRuleSetValid([broad, rule("duplicate", "sender-domain", "example.com", "news")]), { code: "CONFIG_CONFLICT" });
  assert.throws(() => normalizeEmailAddress("bad@@example.com"), { code: "INVALID_RECORD" });
  assert.throws(() => normalizeEmailAddress("name@exa mple.com"), { code: "INVALID_RECORD" });
});

test("approval audit events form a verifiable ordered hash chain", () => {
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const firstApproval = {
    schemaVersion: "focuna.v2", approvalId: "approval-1", proposalId: "proposal-1",
    proposalDigest: "a".repeat(64), actor: "operator-1", actorType: "human", scope: "proposal-execution", outcome: "approved", occurredAt: "2026-01-01T00:00:00Z",
  };
  const first = createApprovalAuditEventFromApproval("event-1", 1, null, firstApproval, sha256);
  const secondApproval = { ...firstApproval, approvalId: "approval-2", outcome: "rejected", occurredAt: "2026-01-01T00:01:00Z" };
  const second = createApprovalAuditEventFromApproval("event-2", 2, first.eventDigest, secondApproval, sha256);
  assert.doesNotThrow(() => assertApprovalAuditChain([first, second], sha256));
  assert.equal(ajv.compile(approvalAuditEventSchema)(first), true);
  assert.throws(() => assertApprovalAuditChain([second, first], sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalAuditChain([{ ...first, approval: { ...first.approval, outcome: "rejected" } }], sha256), { code: "POLICY_REJECTED" });
  assert.throws(() => assertApprovalAuditChain([first, { ...second, previousDigest: "0".repeat(64) }], sha256), { code: "POLICY_REJECTED" });
});

test("rules-first evaluation preserves manual state, abstains safely, and guards no-reply", () => {
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const makeRule = (id, sender, category, workflow) => ({
    id, match: { kind: "exact-sender", value: sender }, category, workflow,
    approvedAt: "2026-01-01T00:00:00Z", approvedBy: "operator-test",
  });
  const content = {
    schemaVersion: "focuna.v2", revision: "cfg-engine-1", publishedAt: "2026-01-01T00:00:00Z", publishedBy: "operator-test",
    rules: [
      makeRule("reply-rule", "person@example.test", "services", "to-respond"),
      makeRule("no-reply-rule", "no-reply@example.test", "services", "to-respond"),
    ],
  };
  const config = { ...content, digest: computeConfigRevisionDigest(content, sha256) };
  const snapshot = {
    schemaVersion: "focuna.v2", accountRef: "acct-test", threadRef: "thread-1",
    snapshotFingerprint: "sha256:test", capturedAt: "2026-01-01T00:00:00Z",
    senderAddress: "person@example.test", subject: "Question", labels: [], preservedLabels: [],
    evidence: [{ id: "msg-in", direction: "inbound", sentAt: "2026-01-01T00:00:00Z", text: "Can you help?" }],
  };
  assert.deepEqual(evaluateThreadRules(snapshot, config, sha256), {
    category: "services", workflow: "to-respond", matchedRuleIds: ["reply-rule"], evidenceIds: ["msg-in"],
    abstained: false, conflict: false, reasonCode: "approved-sender-rule",
  });
  assert.equal(evaluateThreadRules({ ...snapshot, preservedLabels: ["2: FYI"] }, config, sha256).reasonCode, "preserve-label");
  assert.equal(evaluateThreadRules({ ...snapshot, senderAddress: "unknown@example.test" }, config, sha256).category, "review");
  const noReply = evaluateThreadRules({ ...snapshot, senderAddress: "no-reply@example.test" }, config, sha256);
  assert.equal(noReply.workflow, "notification");
  assert.equal(noReply.reasonCode, "no-reply-downgrade");
  assert.throws(() => evaluateThreadRules(snapshot, { ...config, revision: "mutated" }, sha256), { code: "CONFIG_CONFLICT" });
  assert.throws(() => assertRuleSetValid([makeRule("invalid", "shop@example.test", "commercial-ad", "fyi")]), { code: "POLICY_REJECTED" });
});
