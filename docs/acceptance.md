# Acceptance and rollout evidence

These checks are future implementation requirements, not results already obtained.
Use synthetic fixtures by default and separately authorized staging integrations.
P0 must fix sample coverage, measurable targets and observation windows before
provider comparison. Do not select thresholds after seeing favorable results.

## Required behavior matrix

| Capability | Required evidence / phase |
| --- | --- |
| Preserve/manual labels | Rules and JEV cannot remove or override them; test changes after snapshot (P2, P5) |
| Exact/domain sender routing | Boundary matching, aliases, overlap/conflict and spoofed display-name cases (P2) |
| Important-mail visibility | Finance/security/shipping/calendar/opportunity remain visible; false-commercial cases reviewed (P2–P5) |
| Workflow semantics | Review and news stay workflow-blank by default; no-reply cannot become to-respond in either path (P2–P5) |
| News vs commercial | Curated news, excluded social digests and transactional store traffic remain distinct (P2–P4) |
| JEV assessment | Valid distributions, dependent-question context, abstain, malformed/unknown output and version mismatch (P3) |
| Untrusted email | Instructions in email, quoted malicious text, unknown evidence IDs and oversized input cannot alter policy (P3) |
| Provider reliability | Timeout, rate limit, outage, budget exhaustion and restart leave ambiguous mail visible (P3) |
| Approval | Actor/scope/proposal hash recorded; stale and duplicate imports do not activate rules (P4) |
| Executor | Preflight, partial write, lost response, intent-log failure, repeated job and manual edit races reconcile without extra writes (P5) |
| Archive | JEV-only proposal cannot archive; approved commercial rule plus policy required; inverse preserves later manual changes (P5) |
| Main/news digests | Stable window keys, DST, late classifications, deduplication and ambiguous delivery recovery (P6) |
| Follow-ups | Last meaningful sender, acknowledgements, quoted text, stale/closed transitions and manual correction (P6) |
| Draft assistance | Narrow eligibility, no duplicate drafts, stale-thread rejection, fabricated facts avoided, no reply-send path (P6) |
| Operations | Backup restore, auth/key rotation, kill switch, stale jobs, single-writer cutover and rollback (P7) |

## Quality measures

Track structural/workflow correctness by category, important-mail false-commercial
rate, operator correction/acceptance/abstention rates, rule/JEV disagreements,
probability calibration against held-out outcomes, latency, cost per assessment,
provider failure rate, and backlog age. Separate dry-run from applied outcomes;
split evaluation by thread/sender family to avoid duplicate-example leakage.

Hard gates: zero prohibited sends/deletes, zero preserve-label violations, zero
JEV-only archives, zero known duplicate action application, and rejection of stale
or unauthenticated plans. Any violation blocks rollout regardless of average quality.
Numerical quality/cost targets beyond those invariants remain P0 deliverables;
do not claim readiness without recording their values and actual measured results.

## Stage progression

Offline contracts -> read-only staging rules -> shadow JEV -> review-only proposals
-> label-only staging/canary -> independently gated archive/digest/draft capabilities
-> agreed soak -> full cutover. Each record identifies dataset/config/model/question
versions, sample size, category coverage, errors, owner, date and stop conditions.
Production stages require explicit confirmation. A new provider or material question/
policy change returns to the affected evaluation gate, not automatic promotion.
