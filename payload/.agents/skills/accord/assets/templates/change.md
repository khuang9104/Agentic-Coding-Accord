---
accord_version: "0.9"
id: CHG-EXAMPLE
title: Replace with concise outcome
status: draft
risk: L2
owner: human-user
design_input_status: pending
implementation_authority: pending
execution_authority: not-required
---

# Change Title

Keep one outcome across messages. Replace prompts with durable conclusions and
references, not a transcript. Add frontmatter authority_basis when authorized,
evidence_basis for delivery, acceptance_basis for human acceptance and
archive_basis when awaiting-archive. These reference actual evidence/decisions;
copying a flag never creates approval.

## Intent and Scope

State the direct request, current → target behavior, scope, preserve boundaries
and success conditions. An explicit instruction can supply both decision and
implementation authority; do not ask again unless a material choice is missing.

## Need and Design Input

Link existing need/input owners and describe only the affected delta as
preserve, extend, modify, supersede or unresolved. Include normal and material
boundary/failure scenarios and their expected results. Keep approved targets
distinct from observed implementation. Ready means specified, not executed.

## Context and Impact

Keep the bounded map here: implementation, contracts/dependencies, tests and
checked unaffected boundaries. Reuse the map while its inputs remain valid.
Name affected documentation owners and changed facts; one scoped no-update
basis may cover all unchanged owners. Add architecture, compatibility, security,
recovery or parallel-work analysis only where triggered.

### Capability Use

Use one JSON array with actual per-method states; keep long evidence in its
owner. Empty is permitted only with frontmatter method_use_basis. Every row
has method, requirement (required/conditional), state and basis. Applied,
verified and reused also need evidence. Execution may be not-run before work;
at delivery required contributions need verified or supported reused evidence.

```json
[
  {"method":"context-engineering","requirement":"required","state":"not-run","basis":"Bound the requested implementation and dependencies."}
]
```

## Decisions and Authority

Link the human's decision owner or retain a scoped summary of who decided what
and when. Separate Confirmed decision, Proposal, Assumption and Open question
only where relevant. Existing decision owners remain authoritative; do not
copy their whole content here. Unresolved choices block only affected work.

## Git and Recovery

| Item | Value |
| --- | --- |
| Base revision and branch | Pending before authorization to implement |
| Starting worktree | Observed state and disclosed limitations |
| Checkpoint and recovery | Full checkpoint required for L3/L4; otherwise scoped basis |
| Result revision | Not committed yet; keep awaiting-archive if human accepted but commit is deferred |
| Commit / push | Actual state and existing human authority; neither is automatic |

## Verification and Validation

Link requirements/Design Inputs → verification and needs/scenarios → validation
in the existing V&V owner. Before execution retain the plan and not-run result;
after execution name observed revision or base + scoped worktree digest, method,
result and limitations. Record deviations and residual-risk disposition once.
Update changed canonical facts before delivery, not at every message.

## Acceptance

Record actual human acceptance and its scope, or say it is outstanding. Distinguish
implemented, verified, validated, accepted, committed, pushed and archived.
An awaiting-archive Change retains evidence until a result commit and compact
Record exist; do not delete it or invent a future SHA.
