import { ConfigRevision, RuleResult, ThreadSnapshot } from "./contracts";
import { assertConfigRevisionDigest } from "./revision-validation";
import { assertRuleSetValid, selectApprovedRule } from "./rule-matching";
import { labelsForDecision } from "./labels";

/** Conservative deterministic classifier using only a verified approved-rule revision. */
export function evaluateThreadRules(
  snapshot: ThreadSnapshot,
  config: ConfigRevision,
  sha256Hex: (canonicalText: string) => string,
): RuleResult {
  assertConfigRevisionDigest(config, sha256Hex);
  assertRuleSetValid(config.rules);

  if (snapshot.preservedLabels.length > 0) {
    return result("none", "none", [], [], true, false, "preserve-label");
  }

  const selection = selectApprovedRule(snapshot.senderAddress, config.rules);
  if (selection.conflict) {
    return result("review", "none", selection.matchedRuleIds, [], true, true, "rule-conflict");
  }
  if (!selection.rule) return result("review", "none", [], [], true, false, "no-approved-rule");

  let workflow = selection.rule.workflow;
  let reasonCode = "approved-sender-rule";
  if (workflow === "to-respond" && isNoReplyAddress(snapshot.senderAddress)) {
    workflow = "notification";
    reasonCode = "no-reply-downgrade";
  }
  labelsForDecision(selection.rule.category, workflow);
  return result(
    selection.rule.category,
    workflow,
    [selection.rule.id],
    latestInboundEvidenceId(snapshot),
    false,
    false,
    reasonCode,
  );
}

function latestInboundEvidenceId(snapshot: ThreadSnapshot): string[] {
  const inbound = snapshot.evidence
    .filter(item => item.direction === "inbound")
    .sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt));
  return inbound.length > 0 ? [inbound[0].id] : [];
}

function isNoReplyAddress(address: string): boolean {
  return /(no[\s._-]*reply|do[\s._-]*not[\s._-]*reply|donotreply)/i.test(address);
}

function result(
  category: RuleResult["category"],
  workflow: RuleResult["workflow"],
  matchedRuleIds: string[],
  evidenceIds: string[],
  abstained: boolean,
  conflict: boolean,
  reasonCode: string,
): RuleResult {
  return { category, workflow, matchedRuleIds, evidenceIds, abstained, conflict, reasonCode };
}
