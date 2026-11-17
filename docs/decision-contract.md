# Decision and JEV integration contracts

Status: implementation specification. Initial machine-readable schemas for all
records exist under `packages/domain/src/schemas.ts`; host adapters must enforce
them at external boundaries. The pure domain choice validator additionally checks
alternative membership, finite [0,1] values, and normalization. Unknown fields and
invalid enums must be rejected, not coerced into plausible decisions.

## Core records

| Record | Required content |
| --- | --- |
| ThreadSnapshot | schema version, account/thread/message IDs, snapshot fingerprint, capturedAt, parsed sender/recipients, inbound/outbound direction, current labels and manual/preserve flags, bounded meaningful-message excerpts with stable evidence IDs |
| ConfigRevision | immutable revision/hash, validated rules with IDs/precedence, label mappings, policy flags, effective timestamp, author and approval record |
| RuleResult | matched rule IDs, category/workflow or abstain, conflicts, evidence references, preserve constraints; no imperative Gmail calls |
| AssessmentJob | job ID, snapshot/config/rule/question-set versions, task kind, minimized state, deadline, data-retention class |
| AssessmentResult | job ID and input hashes, provider/model/version when available, question results, optional usage and provider confidence, status/error category; no Gmail action |
| DecisionProposal | proposal ID, assessment and rule references, proposed category/workflow, abstain/disagreement flags, supporting evidence IDs, expiry, explanation source |
| Approval | actor, timestamp, proposal ID/hash, exact scope, snapshot/config/policy revisions, approve/reject/correct outcome; edits create a new approval event |
| ActionPlan | plan ID, proposal/approval references where required, expected snapshot, config/policy revisions, allowlisted operations, preconditions, expiry |
| ActionEvent | plan/operation/run IDs, observed before/after state, attempt, status, timestamps and redacted error; append-only |

## Config publication and approval audit

Every `ConfigRevision` includes a lowercase SHA-256 digest over the canonical JSON
of the complete revision content excluding only the `digest` field. The publisher
must validate the record and its rules before accepting that digest. A digest
mismatch rejects publication; changing any rule or publication metadata requires a
new revision and digest. Each revision also names its parent revision (null only for
the initial revision). `previewConfigRevision` is a read-only import preview: exact
duplicates are idempotent, candidate successors must name the current revision,
revision IDs cannot be reused for changed content, and the preview lists added,
removed, and modified rule IDs. It does not publish or persist the candidate.

An `ApprovalAuditEvent` records one immutable approval decision, sequence number,
previous event digest, and digest of the event content. A valid chain begins at
sequence 1 with `previousDigest: null`; every later event increments sequence and
links to the preceding digest. The domain verifier detects mutation, reordering,
duplicate IDs, and broken links. This is tamper-evidence, not storage immutability:
the future repository must deny update/delete, authenticate actors, and anchor the
latest chain digest outside the mutable event store to detect truncation/rewrite.
Retention period and permitted actor/approval scopes remain deployment policy; the
current records do not imply a durable audit store or access-control implementation.
Current approvals carry a stable actor subject, actor type (`human` or `service`),
and the narrow `proposal-execution` scope. The pure execution gate rejects service
actors and any other scope. Host authentication must establish that the subject is a
real authorized operator; a caller-supplied actor string is not proof of identity.
The domain exposes an `ApprovalAuditRepository` port that only reads and appends;
append is guarded by an expected sequence/digest head and must be atomic in the
adapter. `appendApprovalAuditEvent` validates the chain, treats an exact duplicate
approval ID/content as idempotent, rejects conflicting reuse, and checks that the
append is observable. No concrete repository is implemented yet.

Idempotency key for assessment: account + thread snapshot fingerprint + config,
rules, task, and question-set versions. Plan key also binds approved proposal and
policy revision. Canonical JSON sorts object keys and rejects ambiguous values;
`canonicalSha256` passes that exact text to a host SHA-256 adapter. The adapter must
UTF-8 encode it and return 64 lowercase hexadecimal characters. An Apps Script
`Utilities.computeDigest` adapter is implemented; a worker adapter and signature/key
management remain to be implemented. The isolated test uses a fake Utilities port,
not a live Apps Script execution.
A new incoming message, changed manual label, or revised rule makes an old plan
stale, not something to silently re-approve.

## Classification enums

Structural category: `review`, `services`, `finance`, `shipping`, `calendar`,
`opportunities`, `news`, `commercial-newsletter`, `commercial-ad`,
`commercial-campaign`, or `none` for an intentional workflow-only rule.

Workflow: `to-respond`, `fyi`, `notification`, or `none`.
`awaiting-reply` and `actioned` are explicit workflow state, not classifier guesses.
Preserve existing v1 names at the Gmail boundary, including `News/Digest`.
Review defaults to no workflow; news defaults to no workflow. Commercial mail
does not gain a response workflow. Unknown/invalid results fall back to visible review.

Sender matching accepts parsed ASCII dot-atom mailbox addresses and DNS domains in
IDNA A-label form. Domain rules match the domain itself and subdomains only at a
label boundary; exact sender rules take precedence, then the longest matching domain
suffix. Exact local-part case is preserved. Duplicate rule IDs or normalized
selectors reject the config revision; broad and narrower domains are resolved by
the documented specificity order.

`evaluateThreadRules` consumes only a schema-checked, digest-verified config
revision. It abstains when preserved labels are present, returns visible review for
unmatched senders, and prevents no-reply-like senders from receiving `to-respond`.
This is the initial sender-rule subset, not a port of the full legacy pattern
classifier; until parity is demonstrated, unknown mail stays in review.
`guardThreadDecision` is the shared safety policy for rule and future model
candidates; it enforces preservation, no-reply downgrade, and category/workflow
compatibility independent of the decision source.
`snapshotFingerprint` is `sha256:<lowercase-hex>` over canonical snapshot content
excluding only the fingerprint field. The pure integrity check rejects changed
content, duplicate evidence IDs, and preserved labels absent from the current label
set before the evaluator acts on the snapshot.

## JEV tasks and output adaptation

1. **Ambiguous-thread assessment:** choice distribution over supported structural
   alternatives; workflow assessment is a dependent second call using the accepted
   structural result explicitly. Questions about response intent may use boolean
   probability; importance/urgency may use documented rubric scores.
2. **Rule/news suggestions:** aggregate repeated evidence for an exact sender/domain;
   return a typed candidate into the operator queue, never write active rules.
3. **Workflow/follow-up support:** advisory only, introduced after classification
   evidence is satisfactory. Draft text is a separate capability, not assumed.

For a choice result, retain every competing probability, not only the winner.
Check alternative IDs, finite numbers in [0,1], and distribution normalization
(absolute sum error at most 0.01, implemented by the domain validator). The host
must run JSON Schema validation before this semantic validator. For boolean,
retain probabilityTrue; for score retain the rubric version and fractional
position. Preserve optional provider confidence separately: it is not a correctness
probability or permission.
If the confirmed provider has a different interface, adapter translation and
semantic equivalence require an ADR and contract fixtures before rollout.
The offline fixture provider implements the provider boundary for tests only. It
requires exact job/snapshot/config/question-set bindings, exact question IDs and
alternative sets, valid distributions, and a completion within the job deadline;
missing fixtures fail closed rather than falling through to a network provider.

Do not require the provider to fabricate a rationale or evidence it cannot return.
An explanation may be a deterministic summary of questions, evidence references,
and policy reasons, clearly marked as such. Any returned rationale is untrusted
and cannot introduce actions, facts, or evidence IDs outside the request.

## Validation and policy gates

- Check schema, input hashes, job status, deadline, model metadata availability,
  allowed categories, finite probabilities, evidence membership, and content limits.
- Bind each result's job ID, snapshot fingerprint, and config revision to its job;
  reject mismatches and results completed before job creation or after its deadline
  (implemented by `assertAssessmentResultMatchesJob`).
- Before execution, require an `approved` outcome whose digest matches the exact
  proposal and whose snapshot/config revisions are still current; reject future,
  malformed, or expired approval timestamps (`assertApprovalForExecution`).
- Preserve/manual constraints always override both rule and AI results.
- Model/rule disagreement enters review. Missing evidence or a weak/close choice
  distribution leads to abstention. Thresholds are versioned policy parameters
  calibrated against operator-labeled data, not hardcoded claims of accuracy.
- Enforce no-reply, news/workflow, commercial/archive, and structural/workflow
  consistency centrally. Reject `archive: "false"` and other coercion traps.
- Unsupported output, provider failure, budget exhaustion, or stale state leaves
  the rule result intact; ambiguous mail stays visible and unarchived.
- Unknown proposed rule actions cannot be marked applied. Rule activation uses
  validation, conflict preview, explicit approval, and a new config revision.

## Transport and storage

Worker endpoints are proposed as `POST /v1/assessments` and
`GET /v1/assessments/{jobId}`; these are Focuna endpoints to build, not existing
JEV endpoints. Submission returns an idempotent job receipt; status returns
`queued | running | completed | failed | expired` and a versioned result envelope.
Authenticate/authorize account ownership on both operations. Duplicate submission
must return the original job rather than create another paid assessment.

No raw email or credentials in URLs. Sign responses bound to request/job and expiry.
Use durable job state across restarts; expire evidence/results according to the
P0 retention agreement, while keeping non-content audit identifiers as needed.
Never fall back to another provider without explicitly configured consent and
recorded provenance. Mock adapter must support deterministic offline replay.
