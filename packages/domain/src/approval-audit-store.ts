import { Approval, ApprovalAuditEvent } from "./contracts";
import { canonicalJson } from "./canonical-json";
import { DomainError } from "./errors";
import { assertApprovalAuditChain, createApprovalAuditEventFromApproval } from "./revision-validation";

export interface ApprovalAuditHead {
  sequence: number;
  digest: string | null;
}

/**
 * Storage port for append-only audit history. Implementations must atomically
 * compare expectedHead and append, reject updates/deletes, and durably commit.
 */
export interface ApprovalAuditRepository {
  readEvents(): ApprovalAuditEvent[];
  appendEvent(event: ApprovalAuditEvent, expectedHead: ApprovalAuditHead): void;
}

/** Append one event with chain validation and optimistic concurrency protection. */
export function appendApprovalAuditEvent(
  repository: ApprovalAuditRepository,
  approval: Approval,
  eventId: string,
  sha256Hex: (canonicalText: string) => string,
): ApprovalAuditEvent {
  const current = repository.readEvents();
  assertApprovalAuditChain(current, sha256Hex);

  const existing = current.find(event => event.approval.approvalId === approval.approvalId);
  if (existing) {
    if (canonicalJson(existing.approval) === canonicalJson(approval)) return existing;
    throw new DomainError("CONFIG_CONFLICT", "Approval ID already exists with different content");
  }
  if (current.some(event => event.eventId === eventId)) {
    throw new DomainError("CONFIG_CONFLICT", "Approval audit event ID already exists");
  }

  const last = current[current.length - 1];
  const expectedHead: ApprovalAuditHead = {
    sequence: current.length,
    digest: last?.eventDigest ?? null,
  };
  const event = createApprovalAuditEventFromApproval(
    eventId,
    expectedHead.sequence + 1,
    expectedHead.digest,
    approval,
    sha256Hex,
  );
  repository.appendEvent(event, expectedHead);

  const persisted = repository.readEvents();
  assertApprovalAuditChain(persisted, sha256Hex);
  if (persisted.length !== current.length + 1 || persisted[persisted.length - 1]?.eventDigest !== event.eventDigest) {
    throw new DomainError("POLICY_REJECTED", "Approval audit append was not durably observable");
  }
  return event;
}
