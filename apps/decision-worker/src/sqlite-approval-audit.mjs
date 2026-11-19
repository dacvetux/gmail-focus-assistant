import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const domain = require("../../../dist/domain/src/index.js");
const Ajv2020 = require("ajv/dist/2020.js").default;
const validateEvent = new Ajv2020({ allErrors: true, strict: true }).compile(domain.approvalAuditEventSchema);

/** Append-only SQLite approval audit. Human identity must be verified by caller. */
export class SqliteApprovalAuditRepository {
  constructor(database) {
    this.database = database;
    this.readRows = database.prepare("SELECT record_json FROM approval_audit_events ORDER BY sequence");
    this.findApproval = database.prepare("SELECT record_json FROM approval_audit_events WHERE approval_id = ?");
    this.insertApproval = database.prepare(`
      INSERT INTO approvals (approval_id, proposal_id, proposal_digest, actor, actor_type, scope, outcome, occurred_at, record_json)
      VALUES (@approvalId, @proposalId, @proposalDigest, @actor, @actorType, @scope, @outcome, @occurredAt, @recordJson)
    `);
    this.insertEvent = database.prepare(`
      INSERT INTO approval_audit_events (sequence, event_id, approval_id, previous_digest, event_digest, occurred_at, record_json)
      VALUES (@sequence, @eventId, @approvalId, @previousDigest, @eventDigest, @occurredAt, @recordJson)
    `);
  }

  readVerified() {
    const events = this.readRows.all().map(row => JSON.parse(row.record_json));
    domain.assertApprovalAuditChain(events, sha256Hex);
    return events;
  }

  append(approval, eventId, expectedHeadDigest) {
    if (approval?.actorType !== "human" || approval.scope !== "proposal-execution") {
      throw policyError("Only an authenticated human may append a proposal decision");
    }
    if (typeof eventId !== "string" || eventId.length === 0 || eventId.length > 120) {
      throw new TypeError("A valid audit event ID is required");
    }
    const append = this.database.transaction(() => {
      const existingRow = this.findApproval.get(approval.approvalId);
      if (existingRow) {
        const existing = JSON.parse(existingRow.record_json);
        if (domain.canonicalJson(existing) !== domain.canonicalJson(approval)) throw policyError("Approval ID was reused with different content");
        const event = this.readVerified().find(candidate => candidate.approval.approvalId === approval.approvalId);
        return { appended: false, event };
      }

      const events = this.readVerified();
      const actualHead = events.at(-1)?.eventDigest ?? null;
      if (actualHead !== expectedHeadDigest) throw policyError("Approval audit head changed");
      const event = domain.createApprovalAuditEventFromApproval(
        eventId, events.length + 1, actualHead, approval, sha256Hex,
      );
      if (!validateEvent(event)) throw policyError("Approval audit event is invalid");
      domain.assertApprovalAuditChain([...events, event], sha256Hex);
      this.insertApproval.run({
        approvalId: approval.approvalId,
        proposalId: approval.proposalId,
        proposalDigest: approval.proposalDigest,
        actor: approval.actor,
        actorType: approval.actorType,
        scope: approval.scope,
        outcome: approval.outcome,
        occurredAt: approval.occurredAt,
        recordJson: JSON.stringify(approval),
      });
      this.insertEvent.run({
        sequence: event.sequence,
        eventId: event.eventId,
        approvalId: approval.approvalId,
        previousDigest: event.previousDigest,
        eventDigest: event.eventDigest,
        occurredAt: approval.occurredAt,
        recordJson: JSON.stringify(event),
      });
      return { appended: true, event };
    });
    return append.immediate();
  }
}

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function policyError(message) {
  const error = new Error(message);
  error.code = "POLICY_REJECTED";
  return error;
}
