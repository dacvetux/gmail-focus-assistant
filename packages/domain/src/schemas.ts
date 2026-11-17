export const threadSnapshotSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/thread-snapshot-v2.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "accountRef", "threadRef", "snapshotFingerprint", "capturedAt", "senderAddress", "subject", "labels", "preservedLabels", "evidence"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    accountRef: { type: "string", minLength: 1 },
    threadRef: { type: "string", minLength: 1 },
    snapshotFingerprint: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    capturedAt: { type: "string", format: "date-time" },
    senderAddress: { type: "string", minLength: 1 },
    subject: { type: "string" },
    labels: { type: "array", items: { type: "string" }, uniqueItems: true },
    preservedLabels: { type: "array", items: { type: "string" }, uniqueItems: true },
    evidence: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "direction", "sentAt", "text"],
        properties: {
          id: { type: "string", minLength: 1 },
          direction: { enum: ["inbound", "outbound", "unknown"] },
          sentAt: { type: "string", format: "date-time" },
          text: { type: "string", maxLength: 4000 },
        },
      },
    },
  },
} as const;

export const configRevisionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/config-revision-v2.json",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "revision", "parentRevision", "digest", "rules", "publishedAt", "publishedBy"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    revision: { type: "string", minLength: 1 },
    parentRevision: { anyOf: [{ type: "null" }, { type: "string", minLength: 1 }] },
    digest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    publishedAt: { type: "string", format: "date-time" },
    publishedBy: { type: "string", minLength: 1 },
    rules: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "match", "category", "workflow", "approvedAt", "approvedBy"],
        properties: {
          id: { type: "string", minLength: 1 },
          match: {
            type: "object", additionalProperties: false, required: ["kind", "value"],
            properties: {
              kind: { enum: ["exact-sender", "sender-domain"] },
              value: { type: "string", minLength: 1 },
            },
          },
          category: { enum: ["review", "services", "finance", "shipping", "calendar", "opportunities", "news", "commercial-newsletter", "commercial-ad", "commercial-campaign", "none"] },
          workflow: { enum: ["to-respond", "fyi", "notification", "none"] },
          approvedAt: { type: "string", format: "date-time" },
          approvedBy: { type: "string", minLength: 1 },
        },
      },
    },
  },
} as const;

export const assessmentJobSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/assessment-job-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "jobId", "snapshotFingerprint", "configRevision", "task", "questionSetVersion", "createdAt", "deadlineAt"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    jobId: { type: "string", minLength: 1 },
    snapshotFingerprint: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    configRevision: { type: "string", minLength: 1 },
    task: { enum: ["classification", "workflow", "rule-suggestion"] },
    questionSetVersion: { type: "string", minLength: 1 },
    createdAt: { type: "string", format: "date-time" },
    deadlineAt: { type: "string", format: "date-time" },
  },
} as const;

export const choiceQuestionSetSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/choice-question-set-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "version", "task", "questions"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    version: { type: "string", minLength: 1 },
    task: { enum: ["classification", "workflow", "rule-suggestion"] },
    questions: {
      type: "array", minItems: 1,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "alternatives"],
        properties: {
          id: { type: "string", minLength: 1 },
          alternatives: { type: "array", minItems: 2, uniqueItems: true, items: { type: "string", minLength: 1 } },
        },
      },
    },
  },
} as const;

export const assessmentResultSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/assessment-result-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "jobId", "snapshotFingerprint", "configRevision", "provider", "model", "completedAt", "answers"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    jobId: { type: "string", minLength: 1 },
    snapshotFingerprint: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    configRevision: { type: "string", minLength: 1 },
    provider: { type: "string", minLength: 1 },
    model: { type: "string", minLength: 1 },
    completedAt: { type: "string", format: "date-time" },
    answers: { type: "object", minProperties: 1, additionalProperties: {
      type: "object", additionalProperties: false,
      required: ["type", "choice", "confidence", "probabilities"],
      properties: {
        type: { const: "choice" },
        choice: { type: "string", minLength: 1 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        probabilities: { type: "object", minProperties: 1, additionalProperties: { type: "number", minimum: 0, maximum: 1 } },
      },
    } },
    usage: { type: "object", additionalProperties: false, properties: {
      inputTokens: { type: "integer", minimum: 0 },
      outputTokens: { type: "integer", minimum: 0 },
    } },
  },
} as const;

export const ruleResultSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/rule-result-v2.json",
  type: "object", additionalProperties: false,
  required: ["category", "workflow", "matchedRuleIds", "evidenceIds", "abstained", "conflict", "reasonCode"],
  properties: {
    category: { enum: ["review", "services", "finance", "shipping", "calendar", "opportunities", "news", "commercial-newsletter", "commercial-ad", "commercial-campaign", "none"] },
    workflow: { enum: ["to-respond", "fyi", "notification", "none"] },
    matchedRuleIds: { type: "array", items: { type: "string" } },
    evidenceIds: { type: "array", items: { type: "string" } },
    abstained: { type: "boolean" },
    conflict: { type: "boolean" },
    reasonCode: { type: "string", minLength: 1 },
  },
} as const;

export const decisionProposalSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/decision-proposal-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "proposalId", "jobId", "snapshotFingerprint", "configRevision", "category", "workflow", "evidenceIds", "abstained", "expiresAt"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    proposalId: { type: "string", minLength: 1 },
    jobId: { type: "string", minLength: 1 },
    snapshotFingerprint: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    configRevision: { type: "string", minLength: 1 },
    category: { enum: ["review", "services", "finance", "shipping", "calendar", "opportunities", "news", "commercial-newsletter", "commercial-ad", "commercial-campaign", "none"] },
    workflow: { enum: ["to-respond", "fyi", "notification", "none"] },
    evidenceIds: { type: "array", uniqueItems: true, items: { type: "string", minLength: 1 } },
    abstained: { type: "boolean" },
    expiresAt: { type: "string", format: "date-time" },
  },
} as const;

export const approvalSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/approval-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "approvalId", "proposalId", "proposalDigest", "actor", "actorType", "scope", "outcome", "occurredAt"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    approvalId: { type: "string", minLength: 1 },
    proposalId: { type: "string", minLength: 1 },
    proposalDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
    actor: { type: "string", minLength: 1 },
    actorType: { enum: ["human", "service"] },
    scope: { const: "proposal-execution" },
    outcome: { enum: ["approved", "rejected", "corrected"] },
    occurredAt: { type: "string", format: "date-time" },
  },
} as const;

export const approvalAuditEventSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/approval-audit-event-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "eventId", "sequence", "previousDigest", "approval", "eventDigest"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    eventId: { type: "string", minLength: 1 },
    sequence: { type: "integer", minimum: 1 },
    previousDigest: { anyOf: [{ type: "null" }, { type: "string", pattern: "^[a-f0-9]{64}$" }] },
    approval: {
      type: "object", additionalProperties: false,
      required: ["schemaVersion", "approvalId", "proposalId", "proposalDigest", "actor", "actorType", "scope", "outcome", "occurredAt"],
      properties: {
        schemaVersion: { const: "focuna.v2" },
        approvalId: { type: "string", minLength: 1 },
        proposalId: { type: "string", minLength: 1 },
        proposalDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
        actor: { type: "string", minLength: 1 },
        actorType: { enum: ["human", "service"] },
        scope: { const: "proposal-execution" },
        outcome: { enum: ["approved", "rejected", "corrected"] },
        occurredAt: { type: "string", format: "date-time" },
      },
    },
    eventDigest: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
} as const;

export const actionPlanSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/action-plan-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "planId", "snapshotFingerprint", "configRevision", "policyRevision", "operations", "expiresAt"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    planId: { type: "string", minLength: 1 },
    snapshotFingerprint: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
    configRevision: { type: "string", minLength: 1 },
    policyRevision: { type: "string", minLength: 1 },
    operations: { type: "array", items: { oneOf: [
      { type: "object", additionalProperties: false, required: ["kind", "label"], properties: { kind: { const: "add-label" }, label: { type: "string", minLength: 1 } } },
      { type: "object", additionalProperties: false, required: ["kind", "label"], properties: { kind: { const: "remove-owned-label" }, label: { type: "string", minLength: 1 } } },
    ] } },
    expiresAt: { type: "string", format: "date-time" },
  },
} as const;

export const actionEventSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "focuna://schemas/action-event-v2.json",
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "eventId", "planId", "operationIndex", "status", "occurredAt"],
  properties: {
    schemaVersion: { const: "focuna.v2" },
    eventId: { type: "string", minLength: 1 },
    planId: { type: "string", minLength: 1 },
    operationIndex: { type: "integer", minimum: 0 },
    status: { enum: ["planned", "applying", "applied", "partial", "failed", "stale"] },
    occurredAt: { type: "string", format: "date-time" },
    errorCode: { type: "string" },
  },
} as const;
