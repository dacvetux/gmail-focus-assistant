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
  appendApprovalAuditEvent,
  assertConfigRevisionDigest,
  assertThreadSnapshotIntegrity,
  computeConfigRevisionDigest,
  computeThreadSnapshotFingerprint,
  createApprovalAuditEventFromApproval,
  evaluateThreadRules,
  guardThreadDecision,
  previewConfigRevision,
  configRevisionSchema,
  decisionProposalSchema,
  labelsForDecision,
  assertRuleSetValid,
  normalizeEmailAddress,
  selectApprovedRule,
  previewLegacyApprovedRules,
  ruleResultSchema,
  threadSnapshotSchema,
  validateChoiceAssessment,
} = require("../dist/domain/src");

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const hostSha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
const withSnapshotFingerprint = content => {
  const { snapshotFingerprint: _oldFingerprint, ...snapshotContent } = content;
  return { ...snapshotContent, snapshotFingerprint: computeThreadSnapshotFingerprint(snapshotContent, hostSha256) };
};

test("schemas accept the synthetic v2 snapshot and reject unknown fields", () => {
  const validate = ajv.compile(threadSnapshotSchema);
  const snapshotContent = {
    schemaVersion: "focuna.v2",
    accountRef: "acct-test",
    threadRef: "thread-1",
    capturedAt: "2026-01-01T00:00:00.000Z",
    senderAddress: "alerts@example.test",
    subject: "Synthetic delivery update",
    labels: [],
    preservedLabels: [],
    evidence: [{ id: "msg-1", direction: "inbound", sentAt: "2026-01-01T00:00:00.000Z", text: "Parcel delayed." }],
  };
  const snapshot = withSnapshotFingerprint(snapshotContent);
  assert.equal(validate(snapshot), true);
  assert.equal(validate({ ...snapshot, snapshotFingerprint: "sha256:bad" }), false);
  assert.doesNotThrow(() => assertThreadSnapshotIntegrity(snapshot, hostSha256));
  assert.equal(validate({ ...snapshot, executable: "archive" }), false);
  assert.equal(validate({ ...snapshot, capturedAt: "yesterday" }), false);
  assert.throws(() => assertThreadSnapshotIntegrity({ ...snapshot, subject: "modified" }, hostSha256), { code: "INVALID_RECORD" });
  assert.throws(() => assertThreadSnapshotIntegrity({ ...snapshot, preservedLabels: ["missing"] }, hostSha256), { code: "INVALID_RECORD" });
  const duplicateEvidence = withSnapshotFingerprint({ ...snapshot, evidence: [snapshot.evidence[0], snapshot.evidence[0]] });
  assert.throws(() => assertThreadSnapshotIntegrity(duplicateEvidence, hostSha256), { code: "INVALID_RECORD" });
});

test("config schema only accepts explicit supported policy values", () => {
  const validate = ajv.compile(configRevisionSchema);
  const content = {
    schemaVersion: "focuna.v2",
    revision: "cfg-1",
    parentRevision: null,
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

test("config revision preview handles duplicate, successor, and stale imports", () => {
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const rule = (id, value, workflow = "notification") => ({
    id, match: { kind: "sender-domain", value }, category: "shipping", workflow,
    approvedAt: "2026-01-01T00:00:00Z", approvedBy: "operator-test",
  });
  const firstContent = {
    schemaVersion: "focuna.v2", revision: "cfg-1", parentRevision: null,
    publishedAt: "2026-01-01T00:00:00Z", publishedBy: "operator-test", rules: [rule("r1", "ship.example.test")],
  };
  const current = { ...firstContent, digest: computeConfigRevisionDigest(firstContent, sha256) };
  assert.equal(previewConfigRevision(null, current, sha256).status, "initial");
  assert.equal(previewConfigRevision(current, current, sha256).status, "duplicate");

  const nextContent = {
    ...firstContent, revision: "cfg-2", parentRevision: "cfg-1", publishedAt: "2026-01-02T00:00:00Z",
    rules: [rule("r1", "ship.example.test", "fyi"), rule("r2", "parcel.example.test")],
  };
  const next = { ...nextContent, digest: computeConfigRevisionDigest(nextContent, sha256) };
  assert.deepEqual(previewConfigRevision(current, next, sha256), {
    status: "advance", currentRevision: "cfg-1", candidateRevision: "cfg-2",
    addedRuleIds: ["r2"], removedRuleIds: [], modifiedRuleIds: ["r1"],
  });

  const staleContent = { ...nextContent, revision: "cfg-3", parentRevision: "cfg-old" };
  const stale = { ...staleContent, digest: computeConfigRevisionDigest(staleContent, sha256) };
  assert.throws(() => previewConfigRevision(current, stale, sha256), { code: "STALE_SNAPSHOT" });
  const reusedContent = { ...firstContent, rules: [rule("r1", "changed.example.test")] };
  const reusedId = { ...reusedContent, digest: computeConfigRevisionDigest(reusedContent, sha256) };
  assert.throws(() => previewConfigRevision(current, reusedId, sha256), { code: "CONFIG_CONFLICT" });
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
    schemaVersion: "focuna.v2", planId: "plan-1", snapshotFingerprint: `sha256:${"a".repeat(64)}`,
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
  const fingerprint = `sha256:${"1".repeat(64)}`;
  const job = { jobId: "job-1", snapshotFingerprint: fingerprint, configRevision: "cfg-1", createdAt: "2026-01-01T00:00:00Z", deadlineAt: "2026-01-01T00:01:00Z" };
  const result = { jobId: "job-1", snapshotFingerprint: fingerprint, configRevision: "cfg-1", completedAt: "2026-01-01T00:00:30Z" };
  assert.doesNotThrow(() => assertAssessmentResultMatchesJob(job, result));
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, snapshotFingerprint: `sha256:${"2".repeat(64)}` }), { code: "STALE_SNAPSHOT" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, configRevision: "cfg-2" }), { code: "STALE_SNAPSHOT" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, completedAt: "2026-01-01T00:02:00Z" }), { code: "ASSESSMENT_INVALID" });
  assert.throws(() => assertAssessmentResultMatchesJob(job, { ...result, jobId: "job-other" }), { code: "ASSESSMENT_INVALID" });
});

test("execution approval is bound to exact proposal digest and current revisions", () => {
  const proposal = {
    schemaVersion: "focuna.v2", proposalId: "proposal-1", jobId: "job-1",
    snapshotFingerprint: `sha256:${"1".repeat(64)}`, configRevision: "cfg-1", category: "shipping",
    workflow: "notification", evidenceIds: ["msg-1"], abstained: false,
    expiresAt: "2026-01-01T01:00:00Z",
  };
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const approval = { proposalId: proposal.proposalId, proposalDigest: canonicalSha256(proposal, sha256), actorType: "human", scope: "proposal-execution", outcome: "approved", occurredAt: "2026-01-01T00:30:00Z" };
  const current = { snapshotFingerprint: proposal.snapshotFingerprint, configRevision: "cfg-1", now: "2026-01-01T00:45:00Z" };
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

test("Apps Script Utilities adapter hashes exact UTF-8 and normalizes signed bytes", () => {
  const bundle = fs.readFileSync("dist/apps-script/google-sha256.gs", "utf8");
  const utilities = {
    DigestAlgorithm: { SHA_256: "sha-256" },
    Charset: { UTF_8: "utf-8" },
    computeDigest(algorithm, text, charset) {
      assert.equal(algorithm, "sha-256");
      assert.equal(charset, "utf-8");
      return [...createHash("sha256").update(text, "utf8").digest()].map(byte => byte > 127 ? byte - 256 : byte);
    },
  };
  const sandbox = { Utilities: utilities };
  vm.runInNewContext(bundle, sandbox);
  const actual = sandbox.FocunaGoogleSha256.createAppsScriptSha256Hex(utilities)("Focuna π 🍌");
  assert.equal(actual, hostSha256("Focuna π 🍌"));
  assert.match(actual, /^[a-f0-9]{64}$/);
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

test("approval audit repository port appends with compare-and-swap and deduplicates IDs", () => {
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const events = [];
  const repository = {
    readEvents: () => events.slice(),
    appendEvent(event, expectedHead) {
      const last = events[events.length - 1];
      if (expectedHead.sequence !== events.length || expectedHead.digest !== (last?.eventDigest ?? null)) {
        const error = new Error("stale audit head");
        error.code = "STALE_SNAPSHOT";
        throw error;
      }
      events.push(event);
    },
  };
  const approval = {
    schemaVersion: "focuna.v2", approvalId: "approval-store-1", proposalId: "proposal-1",
    proposalDigest: "b".repeat(64), actor: "operator-1", actorType: "human", scope: "proposal-execution",
    outcome: "approved", occurredAt: "2026-01-01T00:00:00Z",
  };
  const first = appendApprovalAuditEvent(repository, approval, "store-event-1", sha256);
  assert.equal(events.length, 1);
  assert.equal(appendApprovalAuditEvent(repository, approval, "ignored-duplicate-event", sha256).eventId, first.eventId);
  assert.equal(events.length, 1);
  assert.throws(() => appendApprovalAuditEvent(repository, { ...approval, outcome: "rejected" }, "store-event-2", sha256), { code: "CONFIG_CONFLICT" });
  assert.throws(() => appendApprovalAuditEvent(repository, { ...approval, approvalId: "approval-other" }, "store-event-1", sha256), { code: "CONFIG_CONFLICT" });
  assert.throws(() => repository.appendEvent(first, { sequence: 0, digest: null }), { code: "STALE_SNAPSHOT" });
});

test("rules-first evaluation preserves manual state, abstains safely, and guards no-reply", () => {
  const sha256 = text => createHash("sha256").update(text, "utf8").digest("hex");
  const makeRule = (id, sender, category, workflow) => ({
    id, match: { kind: "exact-sender", value: sender }, category, workflow,
    approvedAt: "2026-01-01T00:00:00Z", approvedBy: "operator-test",
  });
  const content = {
    schemaVersion: "focuna.v2", revision: "cfg-engine-1", parentRevision: null, publishedAt: "2026-01-01T00:00:00Z", publishedBy: "operator-test",
    rules: [
      makeRule("reply-rule", "person@example.test", "services", "to-respond"),
      makeRule("no-reply-rule", "no-reply@example.test", "services", "to-respond"),
    ],
  };
  const config = { ...content, digest: computeConfigRevisionDigest(content, sha256) };
  const snapshot = withSnapshotFingerprint({
    schemaVersion: "focuna.v2", accountRef: "acct-test", threadRef: "thread-1",
    capturedAt: "2026-01-01T00:00:00Z",
    senderAddress: "person@example.test", subject: "Question", labels: [], preservedLabels: [],
    evidence: [{ id: "msg-in", direction: "inbound", sentAt: "2026-01-01T00:00:00Z", text: "Can you help?" }],
  });
  assert.deepEqual(evaluateThreadRules(snapshot, config, sha256), {
    category: "services", workflow: "to-respond", matchedRuleIds: ["reply-rule"], evidenceIds: ["msg-in"],
    abstained: false, conflict: false, reasonCode: "approved-sender-rule",
  });
  const preserved = withSnapshotFingerprint({ ...snapshot, labels: ["2: FYI"], preservedLabels: ["2: FYI"] });
  assert.equal(evaluateThreadRules(preserved, config, sha256).reasonCode, "preserve-label");
  assert.equal(evaluateThreadRules(withSnapshotFingerprint({ ...snapshot, senderAddress: "unknown@example.test" }), config, sha256).category, "review");
  const noReply = evaluateThreadRules(withSnapshotFingerprint({ ...snapshot, senderAddress: "no-reply@example.test" }), config, sha256);
  assert.equal(noReply.workflow, "notification");
  assert.equal(noReply.reasonCode, "no-reply-downgrade");
  assert.throws(() => evaluateThreadRules(snapshot, { ...config, revision: "mutated" }, sha256), { code: "CONFIG_CONFLICT" });
  assert.throws(() => assertRuleSetValid([makeRule("invalid", "shop@example.test", "commercial-ad", "fyi")]), { code: "POLICY_REJECTED" });
});

test("shared thread policy guards model-style decisions the same as rule decisions", () => {
  const snapshot = {
    schemaVersion: "focuna.v2", accountRef: "acct-test", threadRef: "thread-2",
    snapshotFingerprint: "sha256:test-2", capturedAt: "2026-01-01T00:00:00Z",
    senderAddress: "do-not-reply@example.test", subject: "Synthetic alert", labels: [], preservedLabels: [], evidence: [],
  };
  assert.deepEqual(guardThreadDecision(snapshot, { category: "services", workflow: "to-respond" }), {
    category: "services", workflow: "notification", abstained: false, reasonCode: "no-reply-downgrade",
  });
  assert.deepEqual(guardThreadDecision({ ...snapshot, preservedLabels: ["1: to respond"] }, { category: "finance", workflow: "notification" }), {
    category: "none", workflow: "none", abstained: true, reasonCode: "preserve-label",
  });
  assert.deepEqual(guardThreadDecision(snapshot, { category: "commercial-ad", workflow: "fyi" }), {
    category: "review", workflow: "none", abstained: true, reasonCode: "invalid-category-workflow",
  });
});

test("legacy ApprovedRules import is preview-only and refuses ambiguous categories/targets", () => {
  const rows = [
    { category: "fyi-sender", target: "person@example.test", action: "add", approved: "Yes" },
    { category: "shipping-sender", target: "ship.example.test", approved: true },
    { category: "notification-sender", target: "alerts@example.test", action: "remove", approved: "approved" },
    { category: "commercial-sender", target: "shop.example.test", approved: true },
    { category: "fyi-sender", target: "noreply@", approved: true },
    { category: "news-exclude-sender", target: "digest@example.test", approved: true },
    { category: "fyi-sender", target: "ignored@example.test", approved: "No" },
  ];
  const preview = previewLegacyApprovedRules(rows, hostSha256);
  assert.equal(preview.additions.length, 2);
  assert.equal(preview.additions[0].category, "none");
  assert.equal(preview.additions[0].workflow, "fyi");
  assert.equal(preview.additions[0].requiresReapproval, true);
  assert.equal(preview.additions[1].category, "shipping");
  assert.deepEqual(preview.removals, [{ sourceRow: 3, match: { kind: "exact-sender", value: "alerts@example.test" } }]);
  assert.equal(preview.ignoredUnapproved, 1);
  assert.deepEqual(preview.unresolved.map(row => row.reason), [
    "category-requires-policy-review", "invalid-or-ambiguous-target", "category-requires-policy-review",
  ]);
  const reordered = previewLegacyApprovedRules([rows[1], rows[0]], hostSha256);
  assert.equal(reordered.additions[1].candidateId, preview.additions[0].candidateId);
});
