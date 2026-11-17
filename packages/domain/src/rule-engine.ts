import { ConfigRevision, RuleResult, ThreadSnapshot } from "./contracts";
import { assertConfigRevisionDigest } from "./revision-validation";
import { assertRuleSetValid, selectApprovedRule } from "./rule-matching";
import { guardThreadDecision } from "./thread-policy";

/** Conservative deterministic classifier using only a verified approved-rule revision. */
export function evaluateThreadRules(
  snapshot: ThreadSnapshot,
  config: ConfigRevision,
  sha256Hex: (canonicalText: string) => string,
): RuleResult {
  assertConfigRevisionDigest(config, sha256Hex);
  assertRuleSetValid(config.rules);

  const preserveGuard = guardThreadDecision(snapshot, { category: "none", workflow: "none" });
  if (preserveGuard.reasonCode === "preserve-label") return result("none", "none", [], [], true, false, preserveGuard.reasonCode);

  const selection = selectApprovedRule(snapshot.senderAddress, config.rules);
  if (selection.conflict) {
    return result("review", "none", selection.matchedRuleIds, [], true, true, "rule-conflict");
  }
  if (!selection.rule) return result("review", "none", [], [], true, false, "no-approved-rule");

  const guarded = guardThreadDecision(snapshot, { category: selection.rule.category, workflow: selection.rule.workflow });
  return result(
    guarded.category,
    guarded.workflow,
    [selection.rule.id],
    latestInboundEvidenceId(snapshot),
    guarded.abstained,
    false,
    guarded.reasonCode === "accepted" ? "approved-sender-rule" : guarded.reasonCode,
  );
}

function latestInboundEvidenceId(snapshot: ThreadSnapshot): string[] {
  const inbound = snapshot.evidence
    .filter(item => item.direction === "inbound")
    .sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt));
  return inbound.length > 0 ? [inbound[0].id] : [];
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
