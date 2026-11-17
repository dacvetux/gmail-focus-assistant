import type { StructuralCategory, WorkflowIntent } from "./contracts";
import { DomainError } from "./errors";

const STRUCTURAL_TO_GMAIL: Record<Exclude<StructuralCategory, "none">, string> = {
  review: "Review/Ambiguous",
  services: "Important/Services",
  finance: "Important/Finance",
  shipping: "Important/Shipping",
  calendar: "Important/Calendar",
  opportunities: "Important/Opportunities",
  news: "News/Digest",
  "commercial-newsletter": "Commercial/Newsletters",
  "commercial-ad": "Commercial/Ads",
  "commercial-campaign": "Commercial/Campaigns",
};

const WORKFLOW_TO_GMAIL: Record<Exclude<WorkflowIntent, "none">, string> = {
  "to-respond": "1: to respond",
  fyi: "2: FYI",
  notification: "3: notification",
};

export function structuralLabel(category: StructuralCategory): string | null {
  if (category === "none") return null;
  const label = STRUCTURAL_TO_GMAIL[category];
  if (!label) throw new DomainError("UNKNOWN_ENUM", `Unknown structural category: ${category}`);
  return label;
}

export function workflowLabel(intent: WorkflowIntent): string | null {
  if (intent === "none") return null;
  const label = WORKFLOW_TO_GMAIL[intent];
  if (!label) throw new DomainError("UNKNOWN_ENUM", `Unknown workflow intent: ${intent}`);
  return label;
}

export function labelsForDecision(category: StructuralCategory, workflow: WorkflowIntent): string[] {
  if (category === "review" && workflow !== "none") {
    throw new DomainError("POLICY_REJECTED", "Review decisions must not add a workflow label");
  }
  if (category.startsWith("commercial-") && workflow !== "none") {
    throw new DomainError("POLICY_REJECTED", "Commercial decisions must not add a workflow label");
  }
  return [structuralLabel(category), workflowLabel(workflow)].filter(
    (label): label is string => label !== null,
  );
}
