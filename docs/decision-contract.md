# Decision and JEV integration contracts

Status: implementation specification. Machine-readable schemas and fixtures are
V2-P1 deliverables; none currently exist. Unknown fields and invalid enums must
be rejected at all external boundaries, not coerced into plausible decisions.

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

Idempotency key for assessment: account + thread snapshot fingerprint + config,
rules, task, and question-set versions. Plan key also binds approved proposal and
policy revision. Canonical serialization/hash algorithms are fixed in V2-P1.
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
(tolerance fixed by the schema). For boolean retain probabilityTrue; for score
retain the rubric version and fractional position. Preserve optional provider
confidence separately: it is not a correctness probability or permission.
If the confirmed provider has a different interface, adapter translation and
semantic equivalence require an ADR and contract fixtures before rollout.

Do not require the provider to fabricate a rationale or evidence it cannot return.
An explanation may be a deterministic summary of questions, evidence references,
and policy reasons, clearly marked as such. Any returned rationale is untrusted
and cannot introduce actions, facts, or evidence IDs outside the request.

## Validation and policy gates

- Check schema, input hashes, job status, deadline, model metadata availability,
  allowed categories, finite probabilities, evidence membership, and content limits.
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
