export const CONTRACT_VERSION = "focuna.v2" as const;

export const STRUCTURAL_CATEGORIES = [
  "review",
  "services",
  "finance",
  "shipping",
  "calendar",
  "opportunities",
  "news",
  "commercial-newsletter",
  "commercial-ad",
  "commercial-campaign",
  "none",
] as const;

export type StructuralCategory = (typeof STRUCTURAL_CATEGORIES)[number];

export const WORKFLOW_INTENTS = [
  "to-respond",
  "fyi",
  "notification",
  "none",
] as const;

export type WorkflowIntent = (typeof WORKFLOW_INTENTS)[number];

export type MessageDirection = "inbound" | "outbound" | "unknown";

export interface EvidenceExcerpt {
  id: string;
  direction: MessageDirection;
  sentAt: string;
  text: string;
}

export interface ThreadSnapshot {
  schemaVersion: typeof CONTRACT_VERSION;
  accountRef: string;
  threadRef: string;
  snapshotFingerprint: string;
  capturedAt: string;
  senderAddress: string;
  subject: string;
  labels: string[];
  preservedLabels: string[];
  evidence: EvidenceExcerpt[];
}

export interface ApprovedRule {
  id: string;
  match: { kind: "exact-sender" | "sender-domain"; value: string };
  category: StructuralCategory;
  workflow: WorkflowIntent;
  approvedAt: string;
  approvedBy: string;
}

export interface ConfigRevision {
  schemaVersion: typeof CONTRACT_VERSION;
  revision: string;
  digest: string;
  rules: ApprovedRule[];
  publishedAt: string;
  publishedBy: string;
}

export interface ChoiceAssessment {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface AssessmentResult {
  schemaVersion: typeof CONTRACT_VERSION;
  jobId: string;
  snapshotFingerprint: string;
  configRevision: string;
  provider: string;
  model: string;
  completedAt: string;
  answers: Record<string, ChoiceAssessment>;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AssessmentJob {
  schemaVersion: typeof CONTRACT_VERSION;
  jobId: string;
  snapshotFingerprint: string;
  configRevision: string;
  task: "classification" | "workflow" | "rule-suggestion";
  questionSetVersion: string;
  createdAt: string;
  deadlineAt: string;
}

export interface RuleResult {
  category: StructuralCategory;
  workflow: WorkflowIntent;
  matchedRuleIds: string[];
  evidenceIds: string[];
  abstained: boolean;
  conflict: boolean;
  reasonCode: string;
}

export interface DecisionProposal {
  schemaVersion: typeof CONTRACT_VERSION;
  proposalId: string;
  jobId: string;
  snapshotFingerprint: string;
  configRevision: string;
  category: StructuralCategory;
  workflow: WorkflowIntent;
  evidenceIds: string[];
  abstained: boolean;
  expiresAt: string;
}

export interface Approval {
  schemaVersion: typeof CONTRACT_VERSION;
  approvalId: string;
  proposalId: string;
  proposalDigest: string;
  actor: string;
  outcome: "approved" | "rejected" | "corrected";
  occurredAt: string;
}

export interface ApprovalAuditEvent {
  schemaVersion: typeof CONTRACT_VERSION;
  eventId: string;
  sequence: number;
  previousDigest: string | null;
  approval: Approval;
  eventDigest: string;
}

export type ActionOperation =
  | { kind: "add-label"; label: string }
  | { kind: "remove-owned-label"; label: string };

export interface ActionPlan {
  schemaVersion: typeof CONTRACT_VERSION;
  planId: string;
  snapshotFingerprint: string;
  configRevision: string;
  policyRevision: string;
  operations: ActionOperation[];
  expiresAt: string;
}

export interface ActionEvent {
  schemaVersion: typeof CONTRACT_VERSION;
  eventId: string;
  planId: string;
  operationIndex: number;
  status: "planned" | "applying" | "applied" | "partial" | "failed" | "stale";
  occurredAt: string;
  errorCode?: string;
}
