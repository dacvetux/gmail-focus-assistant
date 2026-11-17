import { Approval, ApprovalAuditEvent, ConfigRevision, ThreadSnapshot } from "./contracts";
import { canonicalSha256 } from "./canonical-json";
import { DomainError } from "./errors";

type ConfigRevisionContent = Omit<ConfigRevision, "digest">;
type ThreadSnapshotContent = Omit<ThreadSnapshot, "snapshotFingerprint">;

export function computeThreadSnapshotFingerprint(
  snapshot: ThreadSnapshotContent,
  sha256Hex: (canonicalText: string) => string,
): string {
  return `sha256:${canonicalSha256(snapshot, sha256Hex)}`;
}

export function assertThreadSnapshotIntegrity(
  snapshot: ThreadSnapshot,
  sha256Hex: (canonicalText: string) => string,
): void {
  if (snapshot.snapshotFingerprint !== computeThreadSnapshotFingerprint(stripSnapshotFingerprint(snapshot), sha256Hex)) {
    throw new DomainError("INVALID_RECORD", "Thread snapshot fingerprint does not match its content");
  }
  const evidenceIds = snapshot.evidence.map(evidence => evidence.id);
  if (new Set(evidenceIds).size !== evidenceIds.length) {
    throw new DomainError("INVALID_RECORD", "Thread snapshot evidence IDs must be unique");
  }
  const labelSet = new Set(snapshot.labels);
  if (snapshot.preservedLabels.some(label => !labelSet.has(label))) {
    throw new DomainError("INVALID_RECORD", "Preserved labels must also be present on the snapshot");
  }
}

/** Compute a revision digest over all config content except its digest field. */
export function computeConfigRevisionDigest(
  revision: ConfigRevisionContent,
  sha256Hex: (canonicalText: string) => string,
): string {
  return canonicalSha256(revision, sha256Hex);
}

export function assertConfigRevisionDigest(
  revision: ConfigRevision,
  sha256Hex: (canonicalText: string) => string,
): void {
  const { digest, ...content } = revision;
  if (digest !== computeConfigRevisionDigest(content, sha256Hex)) {
    throw new DomainError("CONFIG_CONFLICT", "Config revision digest does not match its content");
  }
}

/** Create one hash-chained approval event; persistence must still be append-only. */
export function createApprovalAuditEvent(
  event: Omit<ApprovalAuditEvent, "eventDigest">,
  sha256Hex: (canonicalText: string) => string,
): ApprovalAuditEvent {
  return { ...event, eventDigest: canonicalSha256(event, sha256Hex) };
}

/** Verify event order, unique IDs, links, and content digests in a complete chain. */
export function assertApprovalAuditChain(
  events: readonly ApprovalAuditEvent[],
  sha256Hex: (canonicalText: string) => string,
): void {
  const eventIds = new Set<string>();
  const approvalIds = new Set<string>();
  let previousDigest: string | null = null;

  events.forEach((event, index) => {
    if (event.sequence !== index + 1) tampered("Approval audit sequence is not contiguous");
    if (event.previousDigest !== previousDigest) tampered("Approval audit previous-digest link is invalid");
    if (eventIds.has(event.eventId) || approvalIds.has(event.approval.approvalId)) {
      tampered("Approval audit contains a duplicate event or approval ID");
    }
    eventIds.add(event.eventId);
    approvalIds.add(event.approval.approvalId);

    const { eventDigest, ...content } = event;
    if (eventDigest !== canonicalSha256(content, sha256Hex)) tampered("Approval audit event digest is invalid");
    previousDigest = eventDigest;
  });
}

export function createApprovalAuditEventFromApproval(
  eventId: string,
  sequence: number,
  previousDigest: string | null,
  approval: Approval,
  sha256Hex: (canonicalText: string) => string,
): ApprovalAuditEvent {
  return createApprovalAuditEvent(
    { schemaVersion: "focuna.v2", eventId, sequence, previousDigest, approval },
    sha256Hex,
  );
}

function tampered(message: string): never {
  throw new DomainError("POLICY_REJECTED", message);
}

function stripSnapshotFingerprint(snapshot: ThreadSnapshot): ThreadSnapshotContent {
  const { snapshotFingerprint: _snapshotFingerprint, ...content } = snapshot;
  return content;
}
