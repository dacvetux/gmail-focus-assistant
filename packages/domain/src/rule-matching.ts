import { ApprovedRule } from "./contracts";
import { DomainError } from "./errors";

export interface RuleSelection {
  rule?: ApprovedRule;
  matchedRuleIds: string[];
  conflict: boolean;
}

/** Normalize a parsed mailbox address without changing its case-sensitive local part. */
export function normalizeEmailAddress(address: string): string {
  if (address !== address.trim() || /\s/.test(address)) invalid("Sender address must be a parsed mailbox address without whitespace");
  const at = address.lastIndexOf("@");
  if (at <= 0 || at !== address.indexOf("@") || at === address.length - 1) invalid("Sender address must contain exactly one @");
  const local = address.slice(0, at);
  const domain = normalizeDomain(address.slice(at + 1));
  if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..") || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    invalid("Sender address local part is not a supported dot-atom mailbox");
  }
  return `${local}@${domain}`;
}

export function normalizeRuleMatch(match: ApprovedRule["match"]): string {
  if (match.kind === "exact-sender") return normalizeEmailAddress(match.value);
  if (match.kind === "sender-domain") return normalizeDomain(match.value);
  return invalid("Unsupported sender match kind");
}

/** Reject duplicate IDs and selectors after normalization before config publication. */
export function assertRuleSetValid(rules: readonly ApprovedRule[]): void {
  const ids = new Set<string>();
  const selectors = new Set<string>();
  for (const rule of rules) {
    if (!rule.id || ids.has(rule.id)) throw new DomainError("CONFIG_CONFLICT", `Duplicate or empty rule ID: ${rule.id}`);
    ids.add(rule.id);
    const selector = `${rule.match.kind}:${normalizeRuleMatch(rule.match)}`;
    if (selectors.has(selector)) throw new DomainError("CONFIG_CONFLICT", `Duplicate normalized rule selector: ${selector}`);
    selectors.add(selector);
  }
}

/** Exact senders win; otherwise choose the most-specific matching domain suffix. */
export function selectApprovedRule(senderAddress: string, rules: readonly ApprovedRule[]): RuleSelection {
  assertRuleSetValid(rules);
  const sender = normalizeEmailAddress(senderAddress);
  const senderDomain = sender.slice(sender.lastIndexOf("@") + 1);
  const candidates = rules.flatMap(rule => {
    const value = normalizeRuleMatch(rule.match);
    if (rule.match.kind === "exact-sender") {
      return value === sender ? [{ rule, specificity: Number.MAX_SAFE_INTEGER }] : [];
    }
    if (senderDomain === value || senderDomain.endsWith(`.${value}`)) {
      return [{ rule, specificity: value.length }];
    }
    return [];
  });
  if (candidates.length === 0) return { matchedRuleIds: [], conflict: false };
  const best = Math.max(...candidates.map(candidate => candidate.specificity));
  const winners = candidates.filter(candidate => candidate.specificity === best).map(candidate => candidate.rule);
  if (winners.length > 1) {
    const first = winners[0];
    const conflict = winners.some(rule => rule.category !== first.category || rule.workflow !== first.workflow);
    return { matchedRuleIds: winners.map(rule => rule.id), conflict, rule: conflict ? undefined : first };
  }
  return { rule: winners[0], matchedRuleIds: [winners[0].id], conflict: false };
}

function normalizeDomain(domain: string): string {
  if (domain !== domain.trim() || domain.length === 0 || domain.length > 253 || /[^\x00-\x7F]/.test(domain)) {
    invalid("Domain must be an ASCII DNS name (use IDNA A-label form) without whitespace");
  }
  const normalized = domain.toLowerCase();
  const labels = normalized.split(".");
  if (labels.some(label => label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    invalid("Domain contains an invalid DNS label");
  }
  return normalized;
}

function invalid(message: string): never {
  throw new DomainError("INVALID_RECORD", message);
}
