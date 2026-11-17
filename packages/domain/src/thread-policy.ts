import { StructuralCategory, ThreadSnapshot, WorkflowIntent } from "./contracts";
import { labelsForDecision } from "./labels";

export interface ThreadDecisionCandidate {
  category: StructuralCategory;
  workflow: WorkflowIntent;
}

export interface GuardedThreadDecision extends ThreadDecisionCandidate {
  abstained: boolean;
  reasonCode: "preserve-label" | "invalid-category-workflow" | "no-reply-downgrade" | "accepted";
}

/** Shared safety policy for deterministic rules and future JEV decision candidates. */
export function guardThreadDecision(
  snapshot: ThreadSnapshot,
  candidate: ThreadDecisionCandidate,
): GuardedThreadDecision {
  if (snapshot.preservedLabels.length > 0) {
    return { category: "none", workflow: "none", abstained: true, reasonCode: "preserve-label" };
  }

  try {
    labelsForDecision(candidate.category, candidate.workflow);
  } catch {
    return { category: "review", workflow: "none", abstained: true, reasonCode: "invalid-category-workflow" };
  }

  if (candidate.workflow === "to-respond" && isNoReplyAddress(snapshot.senderAddress)) {
    return { category: candidate.category, workflow: "notification", abstained: false, reasonCode: "no-reply-downgrade" };
  }
  return { ...candidate, abstained: false, reasonCode: "accepted" };
}

function isNoReplyAddress(address: string): boolean {
  return /(no[\s._-]*reply|do[\s._-]*not[\s._-]*reply|donotreply)/i.test(address);
}
