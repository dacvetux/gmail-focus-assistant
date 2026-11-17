import { ApprovedRule } from "./contracts";
import { canonicalJson, canonicalSha256 } from "./canonical-json";
import { normalizeEmailAddress, normalizeRuleMatch } from "./rule-matching";

export interface LegacyApprovedRuleRow {
  category: string;
  target: string;
  action?: string;
  approved?: string | boolean | null;
}

export interface LegacyRuleImportCandidate {
  candidateId: string;
  sourceRow: number;
  sourceCategory: string;
  sourceTarget: string;
  match: ApprovedRule["match"];
  category: ApprovedRule["category"];
  workflow: ApprovedRule["workflow"];
  requiresReapproval: true;
}

export interface LegacyRuleRemovalCandidate {
  sourceRow: number;
  match: ApprovedRule["match"];
}

export interface LegacyRuleImportPreview {
  additions: LegacyRuleImportCandidate[];
  removals: LegacyRuleRemovalCandidate[];
  ignoredUnapproved: number;
  unresolved: Array<{ sourceRow: number; category: string; target: string; reason: string }>;
}

/**
 * Preview only the legacy ApprovedRules meanings that map without guessing.
 * This never returns publishable ApprovedRule records or changes active config.
 */
export function previewLegacyApprovedRules(
  rows: readonly LegacyApprovedRuleRow[],
  sha256Hex: (canonicalText: string) => string,
): LegacyRuleImportPreview {
  const preview: LegacyRuleImportPreview = { additions: [], removals: [], ignoredUnapproved: 0, unresolved: [] };
  rows.forEach((row, index) => {
    const sourceRow = index + 1;
    if (!isApproved(row.approved)) {
      preview.ignoredUnapproved += 1;
      return;
    }
    const action = (row.action || "add").trim().toLowerCase();
    if (!["add", "remove", "delete"].includes(action)) {
      unresolved(preview, sourceRow, row, "unsupported-action");
      return;
    }

    const meaning = legacyMeaning(row.category.trim().toLowerCase());
    if (!meaning) {
      unresolved(preview, sourceRow, row, "category-requires-policy-review");
      return;
    }

    let match: ApprovedRule["match"];
    try {
      const target = row.target.trim();
      if (target.includes("@")) match = { kind: "exact-sender", value: normalizeEmailAddress(target) };
      else if (target.includes(".")) {
        const domainMatch: ApprovedRule["match"] = { kind: "sender-domain", value: target };
        normalizeRuleMatch(domainMatch);
        match = domainMatch;
      } else {
        unresolved(preview, sourceRow, row, "substring-target-requires-explicit-rule");
        return;
      }
    } catch {
      unresolved(preview, sourceRow, row, "invalid-or-ambiguous-target");
      return;
    }

    if (action === "remove" || action === "delete") {
      preview.removals.push({ sourceRow, match });
      return;
    }

    const identity = canonicalJson({ sourceCategory: row.category.trim(), match, meaning });
    preview.additions.push({
      candidateId: `legacy-${canonicalSha256(identity, sha256Hex).slice(0, 24)}`,
      sourceRow,
      sourceCategory: row.category,
      sourceTarget: row.target,
      match,
      category: meaning.category,
      workflow: meaning.workflow,
      requiresReapproval: true,
    });
  });
  return preview;
}

function legacyMeaning(category: string): Pick<LegacyRuleImportCandidate, "category" | "workflow"> | null {
  if (["fyi-sender", "forcefyisenders"].includes(category)) return { category: "none", workflow: "fyi" };
  if (["notification-sender", "forcenotificationsenders"].includes(category)) return { category: "none", workflow: "notification" };
  if (["shipping-sender", "forceshippingsenders"].includes(category)) return { category: "shipping", workflow: "notification" };
  if (["news-sender", "newssenders"].includes(category)) return { category: "news", workflow: "none" };
  // Important/commercial/news-exclude categories depend on subject patterns,
  // inferred workflow, or negative matching that this sender-rule contract lacks.
  return null;
}

function isApproved(value: LegacyApprovedRuleRow["approved"]): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  return ["yes", "true", "1", "approved", "approve"].includes(String(value).trim().toLowerCase());
}

function unresolved(
  preview: LegacyRuleImportPreview,
  sourceRow: number,
  row: LegacyApprovedRuleRow,
  reason: string,
): void {
  preview.unresolved.push({ sourceRow, category: row.category, target: row.target, reason });
}
